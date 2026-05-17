# Skill: dotnet-clean-arch

**Trigger:** any .NET / backend work — controllers, handlers, EF entities, Dapper queries, validators, middleware, DI registration.

**Source:** [docs/kickoff.md §3, §4, §13](../../../docs/kickoff.md).

---

## Layer rules (non-negotiable)

| Layer | Can reference | Cannot reference |
|---|---|---|
| `BEQSAN.Domain` | Nothing | Anything |
| `BEQSAN.Application` | Domain | Infrastructure, Api |
| `BEQSAN.Infrastructure` | Domain, Application | Api |
| `BEQSAN.Api` | Domain, Application, Infrastructure | (top of pyramid) |
| `BEQSAN.Worker` | Domain, Application, Infrastructure | Api |

Enforce via `Directory.Build.props` `<ProjectReference>` constraints and ArchUnit-style tests in `BEQSAN.UnitTests`.

## CQRS + Result pattern

**Every** Command/Query returns `Result<T>` or `Result`. **No** raw exceptions cross the API boundary.

```csharp
// Application/Configurator/CalculatePrice/CalculatePriceCommand.cs
public sealed record CalculatePriceCommand(
    string ProductTypeId,
    string MaterialId,
    int WidthCm,
    int HeightCm,
    // ...
) : IRequest<Result<PriceBreakdownDto>>;

// Application/Configurator/CalculatePrice/CalculatePriceHandler.cs
internal sealed class CalculatePriceHandler(
    IPricingRepository pricing,
    ILogger<CalculatePriceHandler> logger
) : IRequestHandler<CalculatePriceCommand, Result<PriceBreakdownDto>>
{
    public async Task<Result<PriceBreakdownDto>> Handle(
        CalculatePriceCommand cmd, CancellationToken ct)
    {
        // Validators ran in pipeline already
        var rule = await pricing.GetRuleAsync(cmd.MaterialId, cmd.ProductTypeId, ct);
        if (rule is null)
            return Result.Failure<PriceBreakdownDto>(PricingErrors.RuleNotFound);

        var breakdown = PricingService.Calculate(rule, cmd);
        return Result.Success(breakdown);
    }
}

// Api/Controllers/ConfiguratorController.cs
[HttpPost("price")]
public async Task<IActionResult> CalculatePrice(
    CalculatePriceCommand cmd, CancellationToken ct)
{
    var result = await sender.Send(cmd, ct);
    return result.ToActionResult();
}
```

**Mapping conventions:**
- `Success` → 200 OK (or 201 Created for `POST` returning Location)
- `Failure(ValidationError)` → 400 Bad Request (FluentValidation auto-converted by pipeline)
- `Failure(NotFoundError)` → 404
- `Failure(ConflictError)` → 409
- `Failure(BusinessRuleError)` → 422
- `Failure(Internal)` → 500 (caught by middleware, logged with correlation id)

## EF Core vs Dapper — when to use which

**EF Core** for:
- Admin writes (orders, configurations, pricing rules, content)
- Anything with relationships (Configuration → Panes → Order → Customer)
- Audit logging, soft delete, change tracking
- Migrations are source of truth for schema

**Dapper** for:
- Public catalog reads (product types, materials, gallery)
- Configurator price lookup (hot path, sub-50ms target)
- List pages with > 50 items
- Anything user-facing on the read path where EF's tracker is overhead

**Both** live in `BEQSAN.Infrastructure`. **Never** mix in the same handler — pick one per use case.

## Logging (Serilog)

- **No PII at Information level.** Phones, emails, full names → mask or hash.
- Each request gets a correlation ID via `CorrelationIdMiddleware` (added to `LogContext`).
- Slow query warning: any DB call > 200ms logged at Warning.
- Failed external calls (SMS, AI, payment) → Error + alerting.
- Logs ship to Cloud9.ge BATUMSKI (IVA's central log host) via Serilog.Sinks.Seq or Loki.

```csharp
using (LogContext.PushProperty("CorrelationId", ctx.TraceIdentifier))
using (LogContext.PushProperty("PhoneHash", PhoneHasher.Hash(phone)))
{
    logger.LogInformation("Order created {OrderId}", orderId);
}
```

## Validation (FluentValidation)

- One validator per Command/Query, auto-registered via `AddValidatorsFromAssembly`.
- MediatR pipeline behavior runs validators **before** handler.
- Localized messages (Georgian) via `IStringLocalizer` + resource files in `BEQSAN.Api/Resources/`.

```csharp
public sealed class CalculatePriceValidator : AbstractValidator<CalculatePriceCommand>
{
    public CalculatePriceValidator()
    {
        RuleFor(x => x.WidthCm).InclusiveBetween(30, 400);
        RuleFor(x => x.HeightCm).InclusiveBetween(30, 400);
        RuleFor(x => x.ProductTypeId).NotEmpty();
        RuleFor(x => x.MaterialId).NotEmpty();
    }
}
```

## Domain modeling

- Use **value objects** for non-primitive concepts: `Money`, `PhoneNumber`, `Dimensions`, `RalCode`.
- Entities have **private setters**, mutate via methods that emit domain events.
- Aggregates: `Configuration` is an aggregate root; `ConfigurationPane` is an entity inside it; `Order` is its own root.
- **No cross-aggregate references by entity** — reference by id instead. (`Order` holds `ConfigurationId`, not `Configuration`.)

```csharp
public sealed class Order
{
    public OrderId Id { get; private set; }
    public PhoneNumber CustomerPhone { get; private set; }
    public OrderStatus Status { get; private set; }
    public Money Total { get; private set; }
    private readonly List<OrderStatusHistory> _history = new();
    public IReadOnlyList<OrderStatusHistory> History => _history;

    public Result ChangeStatus(OrderStatus next, string? note, UserId changedBy)
    {
        if (!StatusTransitions.IsAllowed(Status, next))
            return Result.Failure(OrderErrors.InvalidTransition(Status, next));

        Status = next;
        _history.Add(new OrderStatusHistory(next, DateTime.UtcNow, changedBy, note));
        AddDomainEvent(new OrderStatusChangedEvent(Id, next));
        return Result.Success();
    }
}
```

## Money & dimensions

- **Money** = `decimal(18,2)` + GEL currency. Never `double`. Never untyped decimal in domain.
- **Dimensions** stored as `int` centimeters. Conversions live in the value object.
- **Phone** normalized at the edge to E.164 (`+995595XXXXXX`).

## Auth & permissions

- JWT Bearer for `/api/v1/admin/*` only.
- **Permissions loaded from DB on every request** (no role embedded in token — cheap to revoke).
- Resource policies via `IAuthorizationHandler`: e.g. `OrdersCanAssignToInstaller` checks the caller is a manager AND the installer is in scope.

## Background work

- **Hangfire** for jobs that need retries + visibility (SMS send, AI requests, PDF generation).
- **BackgroundService** for in-process queues that don't need persistence (e.g. SignalR fan-out).
- All Hangfire jobs declared as `[AutomaticRetry(Attempts = 3, OnAttemptsExceeded = AttemptsExceededAction.Fail)]`.

## File layout (inside each layer)

```
BEQSAN.Application/
├── Common/
│   ├── Behaviors/                # MediatR pipeline behaviors
│   ├── Result.cs                 # Result<T>, Result, Error types
│   └── Extensions/
├── Configurator/
│   ├── CalculatePrice/
│   │   ├── CalculatePriceCommand.cs
│   │   ├── CalculatePriceHandler.cs
│   │   ├── CalculatePriceValidator.cs
│   │   └── PriceBreakdownDto.cs
│   └── SubmitOrder/
│       ├── SubmitOrderCommand.cs
│       ├── SubmitOrderHandler.cs
│       └── ...
├── Catalog/
└── Admin/
```

Each use case is a folder. **Do not** organize by technical type (`Commands/`, `Queries/`, `Validators/`) — organize by feature.

## Anti-patterns (auto-flag)

```
❌ public Task<OrderDto> SubmitOrder(...)         → must return Result<T>
❌ throw new InvalidOperationException(...)       → return Result.Failure(error)
❌ Money price = 1240.50;                         → use Money value object
❌ string phone = "+995595123456";                → use PhoneNumber value object
❌ EF in catalog read endpoint                    → use Dapper
❌ logger.LogInformation("Phone: {Phone}", phone) → mask/hash PII
❌ admin endpoint without [Authorize]             → ALWAYS gate admin routes
❌ Application referencing Microsoft.EntityFrameworkCore → infra concern
❌ Domain entity exposing public setters          → mutate via methods
```

## Related skills

- [testing-strategy](../testing-strategy/SKILL.md) — unit vs integration test boundaries.
- [ai-integration](../ai-integration/SKILL.md) — for `/api/v1/ai/*` endpoints.
- [deployment-ops](../deployment-ops/SKILL.md) — logging sinks, secrets, hosting.
