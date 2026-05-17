# Skill: testing-strategy

**Trigger:** writing tests (unit, integration, E2E, visual regression), reviewing test coverage, before any release.

**Source:** [docs/kickoff.md §4, §13](../../../docs/kickoff.md) and the architectural invariants in [CLAUDE.md](../../../CLAUDE.md).

---

## Test pyramid

```
            ┌──────────────────┐
            │   E2E (Playwright) │   < 30 scenarios — critical user flows only
            └──────────────────┘
         ┌────────────────────────┐
         │  Integration (xUnit +    │   ~100 tests — handler ↔ DB ↔ external (mocked)
         │  TestContainers,         │
         │  React Testing Library)  │
         └────────────────────────┘
      ┌──────────────────────────────┐
      │  Unit                          │   thousands — pure functions, value objects, validators
      └──────────────────────────────┘
```

- **Unit:** fast, deterministic, no I/O. Live next to source.
- **Integration:** real DB (TestContainers postgres or SqlServer), real handler, mocked external (SMS, AI). Slow-ish but not too slow.
- **E2E:** real browser (Playwright Chromium + Webkit + Firefox), against a docker-compose'd full stack. Reserved for top-of-funnel and money paths.

## Coverage targets

| Layer | Target |
|---|---|
| `BEQSAN.Domain` | 95%+ (value objects, entity invariants, domain events) |
| `BEQSAN.Application` | 80%+ (handlers, validators) |
| `BEQSAN.Infrastructure` | best-effort, exercised via integration tests |
| `FRONT` components | smoke tests on critical paths; visual regression for hero, configurator |
| Configurator flow | E2E for happy path + 3 edge cases |

## Backend tests

### Unit tests (`BEQSAN.UnitTests/`)

```csharp
[Fact]
public void Money_Add_SameCurrency_Succeeds()
{
    var a = Money.Gel(1200m);
    var b = Money.Gel(50m);
    (a + b).Should().Be(Money.Gel(1250m));
}

[Fact]
public void Money_Add_DifferentCurrency_Throws()
{
    var act = () => Money.Gel(100m) + Money.Usd(20m);
    act.Should().Throw<CurrencyMismatchException>();
}
```

**Tools:** xUnit + FluentAssertions + NSubstitute (mocks). No Moq — NSubstitute is cleaner.

### Handler tests

```csharp
[Fact]
public async Task CalculatePriceHandler_ValidInput_ReturnsBreakdown()
{
    var pricing = Substitute.For<IPricingRepository>();
    pricing.GetRuleAsync(default, default, default)
        .ReturnsForAnyArgs(PricingRules.AluminumThermalMb70());

    var handler = new CalculatePriceHandler(pricing, NullLogger<CalculatePriceHandler>.Instance);
    var cmd = new CalculatePriceCommand(
        ProductTypeId: "window",
        MaterialId: "aluminum-thermal",
        WidthCm: 120,
        HeightCm: 140,
        // ...
    );

    var result = await handler.Handle(cmd, CancellationToken.None);

    result.IsSuccess.Should().BeTrue();
    result.Value.Total.Should().BeApproximately(1240m, 1m);
}
```

### Integration tests (`BEQSAN.IntegrationTests/`)

Use **TestContainers** to spin up a real Postgres/MSSQL per test class. Reset state between tests via `Respawn` or transaction rollback.

```csharp
public class OrderEndpointTests(BeqsanWebAppFactory factory) : IClassFixture<BeqsanWebAppFactory>
{
    [Fact]
    public async Task SubmitOrder_ValidDraft_ReturnsCreated()
    {
        var client = factory.CreateClient();
        // ... arrange a draft via factory.ExecAsync(...)
        var response = await client.PostAsJsonAsync("/api/v1/configurator/submit", new { /*...*/ });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<SubmitOrderResponse>();
        body!.OrderCode.Should().NotBeNullOrEmpty();
    }
}
```

### Architecture tests

Enforce layering with NetArchTest:

```csharp
[Fact]
public void Domain_Does_Not_Reference_Infrastructure()
{
    var result = Types
        .InAssembly(typeof(Order).Assembly)
        .ShouldNot()
        .HaveDependencyOn("BEQSAN.Infrastructure")
        .GetResult();

    result.IsSuccessful.Should().BeTrue();
}
```

## Frontend tests

### Component tests (`FRONT/src/**/__tests__/`)

Vitest + React Testing Library + `@testing-library/user-event`.

```tsx
test('phone input normalizes various formats to E.164', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<PhoneInput onChange={onChange} />);
  const input = screen.getByRole('textbox', { name: /ტელეფონის ნომერი/ });

  await user.type(input, '595 12 34 56');
  expect(onChange).toHaveBeenLastCalledWith('+995595123456');

  await user.clear(input);
  await user.type(input, '+995-595-123-456');
  expect(onChange).toHaveBeenLastCalledWith('+995595123456');
});
```

### Visual regression

Playwright screenshots for top-level scenes (home hero, configurator steps 1/5/8, order tracking page). Threshold 0.1% pixel diff.

### E2E (Playwright)

Scenarios that **must** work for the business:

1. Visit `/`, click CTA, complete configurator end-to-end with manual dimensions, submit, verify SMS sent (mocked), land on `/order/...` page.
2. Visit `/`, complete configurator with **AI photo measurement**, verify result populates inputs.
3. Visit `/order/.../...` directly, verify status timeline renders with current step.
4. Admin login, change order status, verify SMS triggered (mocked).
5. Configurator draft recovery via SMS link.

E2E runs on every PR against the docker-compose stack. Failures block merge.

## Mocking strategy

- **SMS provider:** real interface, fake implementation that records messages to an in-memory list. Tests assert the list.
- **AI providers:** WireMock.Net or `IHttpClientFactory` swap. Verified by request shape, never live.
- **File storage (MinIO):** TestContainers MinIO instance for integration; fake `IBlobStore` for unit tests.

## Naming

```
{MethodOrFeature}_{Scenario}_{ExpectedOutcome}
```

```
Money_AddSameCurrency_Succeeds
CalculatePriceHandler_DimensionsOutOfRange_ReturnsValidationFailure
SubmitOrder_DraftNotFound_Returns404
PhoneInput_NormalizesGeorgianFormats_EmitsE164
```

## Pre-commit / pre-push checks

- Unit + handler tests run on every commit (< 30s total).
- Integration tests run on every push (< 5 min).
- E2E + visual regression run on PR (< 15 min).
- All three are required to merge.

## Anti-patterns

```
❌ Unit tests that hit a real DB                       → mark as integration
❌ Asserting on log output as the test                 → assert state/return value
❌ Sharing mutable state between tests                 → fresh fixture per test
❌ Stubbing the system under test                      → only stub collaborators
❌ Skipping tests with [Fact(Skip = "...")]            → fix or delete
❌ E2E test for every form field                       → smoke test critical flows only
❌ No test for the happy path                          → always test the obvious
❌ Test names like "Test1", "ItWorks"                  → use the naming convention
```

## Related skills

- [dotnet-clean-arch](../dotnet-clean-arch/SKILL.md) — Result pattern, handler shape.
- [frontend-patterns](../frontend-patterns/SKILL.md) — form/query patterns to test.
- [deployment-ops](../deployment-ops/SKILL.md) — CI pipeline that runs the tests.
