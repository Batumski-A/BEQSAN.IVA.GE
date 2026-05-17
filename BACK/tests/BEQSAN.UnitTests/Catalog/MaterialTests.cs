using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Catalog;

public class MaterialTests
{
    private static readonly Guid SomeProductTypeId = Guid.Parse("66242680-01f2-125b-a8db-02681c98c0b9");
    private static LocalizedText T(string ka) => LocalizedText.Create(ka).Value;

    [Fact]
    public void Create_WithValidInputs_Succeeds()
    {
        var result = Material.Create(
            productTypeId: SomeProductTypeId,
            slug: "aluminum-thermal",
            name: T("ალუმინი თერმო"),
            shortDescription: T("თერმოწყვეტიანი პროფილი"),
            family: MaterialFamily.Aluminum,
            thermalRating: ThermalRating.Thermal,
            basePricePerSqmMinor: 38000,
            currency: Currency.Gel,
            sortOrder: 1);

        result.IsSuccess.Should().BeTrue();
        var m = result.Value;
        m.Slug.Should().Be("aluminum-thermal");
        m.ProductTypeId.Should().Be(SomeProductTypeId);
        m.Family.Should().Be(MaterialFamily.Aluminum);
        m.ThermalRating.Should().Be(ThermalRating.Thermal);
        m.BasePricePerSqmMinor.Should().Be(38000);
        m.Currency.Should().Be(Currency.Gel);
        m.IsActive.Should().BeTrue();
        m.Id.Should().NotBe(Guid.Empty);
        m.CreatedAtUtc.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void Create_LowercasesAndTrimsSlug()
    {
        var result = Material.Create(
            productTypeId: SomeProductTypeId,
            slug: "  PVC-Laminated  ",
            name: T("PVC ლამინირებული"),
            shortDescription: T("..."),
            family: MaterialFamily.Pvc,
            thermalRating: ThermalRating.Basic,
            basePricePerSqmMinor: 24000,
            currency: Currency.Gel,
            sortOrder: 0);

        result.IsSuccess.Should().BeTrue();
        result.Value.Slug.Should().Be("pvc-laminated");
    }

    [Fact]
    public void Create_EmptyProductTypeId_ReturnsValidationError()
    {
        var result = Material.Create(
            productTypeId: Guid.Empty,
            slug: "aluminum-thermal",
            name: T("ალუმინი"),
            shortDescription: T("..."),
            family: MaterialFamily.Aluminum,
            thermalRating: ThermalRating.Thermal,
            basePricePerSqmMinor: 38000,
            currency: Currency.Gel,
            sortOrder: 0);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("material.productType.required");
        result.Error.Field.Should().Be("productTypeId");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_EmptySlug_ReturnsValidationError(string? slug)
    {
        var result = Material.Create(
            productTypeId: SomeProductTypeId,
            slug: slug,
            name: T("..."),
            shortDescription: T("..."),
            family: MaterialFamily.Aluminum,
            thermalRating: ThermalRating.Basic,
            basePricePerSqmMinor: 1,
            currency: Currency.Gel,
            sortOrder: 0);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("material.slug.required");
    }

    [Theory]
    [InlineData("a")]
    [InlineData("alu minum")]
    [InlineData("-leading")]
    [InlineData("trailing-")]
    [InlineData("upper_case")]
    [InlineData("ალუმინი")]
    public void Create_InvalidSlugShape_ReturnsValidationError(string slug)
    {
        var result = Material.Create(
            productTypeId: SomeProductTypeId,
            slug: slug,
            name: T("..."),
            shortDescription: T("..."),
            family: MaterialFamily.Aluminum,
            thermalRating: ThermalRating.Basic,
            basePricePerSqmMinor: 1,
            currency: Currency.Gel,
            sortOrder: 0);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("material.slug.invalid");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-38000)]
    public void Create_NonPositivePrice_ReturnsValidationError(int priceMinor)
    {
        var result = Material.Create(
            productTypeId: SomeProductTypeId,
            slug: "aluminum-thermal",
            name: T("..."),
            shortDescription: T("..."),
            family: MaterialFamily.Aluminum,
            thermalRating: ThermalRating.Basic,
            basePricePerSqmMinor: priceMinor,
            currency: Currency.Gel,
            sortOrder: 0);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("material.price.mustBePositive");
        result.Error.Field.Should().Be("basePricePerSqmMinor");
    }

    [Theory]
    [InlineData(MaterialFamily.Aluminum, ThermalRating.Thermal, 38000)]
    [InlineData(MaterialFamily.Aluminum, ThermalRating.HighThermal, 52000)]
    [InlineData(MaterialFamily.Aluminum, ThermalRating.Basic, 26000)]
    [InlineData(MaterialFamily.Pvc, ThermalRating.Basic, 17000)]
    [InlineData(MaterialFamily.Pvc, ThermalRating.Thermal, 24000)]
    public void Create_FamilyThermalCombinations_Succeed(
        MaterialFamily family, ThermalRating rating, int price)
    {
        var result = Material.Create(
            productTypeId: SomeProductTypeId,
            slug: $"{family}-{rating}".ToLowerInvariant(),
            name: T("..."),
            shortDescription: T("..."),
            family: family,
            thermalRating: rating,
            basePricePerSqmMinor: price,
            currency: Currency.Gel,
            sortOrder: 0);

        result.IsSuccess.Should().BeTrue();
    }
}

public class MoneyMinorUnitTests
{
    [Theory]
    [InlineData(63840L, 638.40)]
    [InlineData(0L, 0.0)]
    [InlineData(1L, 0.01)]
    [InlineData(99L, 0.99)]
    [InlineData(100L, 1.00)]
    [InlineData(100000L, 1000.00)]
    public void FromMinor_ConvertsToDecimal(long minor, decimal expected)
    {
        var money = Money.FromMinor(minor, Currency.Gel);
        money.Amount.Should().Be(expected);
        money.Currency.Should().Be(Currency.Gel);
    }

    [Theory]
    [InlineData(0.0, 0L)]
    [InlineData(0.01, 1L)]
    [InlineData(0.99, 99L)]
    [InlineData(638.40, 63840L)]
    [InlineData(753.31, 75331L)]
    public void ToMinor_ConvertsToInteger(decimal amount, long expected)
    {
        Money.Gel(amount).ToMinor().Should().Be(expected);
    }

    [Fact]
    public void MinorRoundTrip_IsLossless()
    {
        var original = Money.FromMinor(75331L, Currency.Gel);
        original.ToMinor().Should().Be(75331L);
        original.Amount.Should().Be(753.31m);
    }
}
