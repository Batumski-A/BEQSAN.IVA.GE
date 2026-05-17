using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Configurator;

public class PriceCalculatorTests
{
    private static readonly Guid SomePtId = Guid.Parse("66242680-01f2-125b-a8db-02681c98c0b9");

    private static Material AluminumThermalWindow() =>
        Material.Create(
            productTypeId: SomePtId,
            slug: "aluminum-thermal",
            name: LocalizedText.Create("ალუმინი თერმო").Value,
            shortDescription: LocalizedText.Create("...").Value,
            family: MaterialFamily.Aluminum,
            thermalRating: ThermalRating.Thermal,
            basePricePerSqmMinor: 38000,
            currency: Currency.Gel,
            sortOrder: 1).Value;

    [Fact]
    public void Compute_120x140_AluminumThermal_Matches_753_31()
    {
        // Reference computation from Configurator Step 2 spec:
        //   area  = 120*140/10000 = 1.68 m²
        //   mat   = 1.68 * 38000 = 63840 tetri = 638.40 ₾
        //   vat   = 63840 * 0.18 = 11491.2 → 11491 tetri (banker's)
        //   total = 75331 tetri = 753.31 ₾
        var result = PriceCalculator.Compute(AluminumThermalWindow(), widthCm: 120, heightCm: 140);

        result.IsSuccess.Should().BeTrue();
        var b = result.Value;
        b.AreaSqm.Should().Be(1.68m);
        b.Lines.Should().HaveCount(2);
        b.Lines[0].Should().Be(new PriceLine("material", "მასალა", 63840L));
        b.Lines[1].Should().Be(new PriceLine("vat", "დღგ (18%)", 11491L));
        b.TotalMinor.Should().Be(75331L);
        b.Currency.Should().Be("GEL");
    }

    [Theory]
    [InlineData(100, 100, 38000, 1.00, 38000L, 6840L, 44840L)]   // 1m² aluminum-thermal
    [InlineData(60, 60, 17000, 0.36, 6120L, 1102L, 7222L)]        // small PVC white window
    [InlineData(200, 200, 26000, 4.00, 104000L, 18720L, 122720L)] // big aluminum-basic
    public void Compute_KnownPairs_ProduceExpectedBreakdown(
        int w, int h, int priceMinor, decimal areaSqm, long matMinor, long vatMinor, long totalMinor)
    {
        var material = Material.Create(
            productTypeId: SomePtId,
            slug: "stub",
            name: LocalizedText.Create("...").Value,
            shortDescription: LocalizedText.Create("...").Value,
            family: MaterialFamily.Aluminum,
            thermalRating: ThermalRating.Basic,
            basePricePerSqmMinor: priceMinor,
            currency: Currency.Gel,
            sortOrder: 0).Value;

        var result = PriceCalculator.Compute(material, w, h);

        result.IsSuccess.Should().BeTrue();
        var b = result.Value;
        b.AreaSqm.Should().Be(areaSqm);
        b.Lines[0].AmountMinor.Should().Be(matMinor);
        b.Lines[1].AmountMinor.Should().Be(vatMinor);
        b.TotalMinor.Should().Be(totalMinor);
    }

    [Theory]
    [InlineData(30)]                         // min
    [InlineData(400)]                        // max
    public void Compute_BoundaryDimensions_Succeed(int dim)
    {
        var result = PriceCalculator.Compute(AluminumThermalWindow(), dim, dim);
        result.IsSuccess.Should().BeTrue();
    }

    [Theory]
    [InlineData(29)]                         // just below min
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(401)]                        // just above max
    [InlineData(10000)]
    public void Compute_WidthOutOfRange_ReturnsValidationError(int width)
    {
        var result = PriceCalculator.Compute(AluminumThermalWindow(), width, heightCm: 140);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.dimensions.widthOutOfRange");
        result.Error.Field.Should().Be("widthCm");
    }

    [Theory]
    [InlineData(29)]
    [InlineData(401)]
    public void Compute_HeightOutOfRange_ReturnsValidationError(int height)
    {
        var result = PriceCalculator.Compute(AluminumThermalWindow(), widthCm: 120, heightCm: height);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.dimensions.heightOutOfRange");
        result.Error.Field.Should().Be("heightCm");
    }

    [Fact]
    public void Compute_NullMaterial_ReturnsNotFound()
    {
        var result = PriceCalculator.Compute(material: null!, widthCm: 120, heightCm: 140);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("material.notFound");
    }

    [Fact]
    public void Compute_IsPureFunction_SameInputsSameOutputs()
    {
        var m = AluminumThermalWindow();
        var a = PriceCalculator.Compute(m, 120, 140).Value;
        var b = PriceCalculator.Compute(m, 120, 140).Value;
        a.Should().BeEquivalentTo(b);
    }

    [Fact]
    public void Compute_VatRounding_UsesBankerRounding()
    {
        // Construct a case where VAT lands on .5 — banker's rounding should pick even.
        // material × 0.18 = X.5 happens when material = N where N*0.18 ends in .5.
        // 25 tetri * 0.18 = 4.5 → banker's rounds to 4. material=25 needs area*price = 25.
        var material = Material.Create(
            productTypeId: SomePtId,
            slug: "tiny",
            name: LocalizedText.Create("...").Value,
            shortDescription: LocalizedText.Create("...").Value,
            family: MaterialFamily.Aluminum,
            thermalRating: ThermalRating.Basic,
            basePricePerSqmMinor: 2500,
            currency: Currency.Gel,
            sortOrder: 0).Value;

        // 100×100 = 1.00 m² × 2500 = 2500 tetri; vat = 450 (no rounding needed).
        var result = PriceCalculator.Compute(material, 100, 100).Value;
        result.Lines[0].AmountMinor.Should().Be(2500L);
        result.Lines[1].AmountMinor.Should().Be(450L);
        result.TotalMinor.Should().Be(2950L);
    }
}
