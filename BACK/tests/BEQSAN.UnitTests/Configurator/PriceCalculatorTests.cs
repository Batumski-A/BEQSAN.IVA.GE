using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Configurator;

public class PriceCalculatorTests
{
    // Use the deterministic seeded ids so test fixtures match production data shapes.
    private static readonly Guid WindowId = Guid.Parse("66242680-01f2-125b-a8db-02681c98c0b9");
    private static readonly Guid DoorId = Guid.Parse("9fc941a2-da7e-d954-a71d-87636cf810d0");

    private static ProductType WindowProductType() => MakePt(WindowId, "window");
    private static ProductType DoorProductType() => MakePt(DoorId, "door");

    private static ProductType MakePt(Guid id, string slug)
    {
        var c = DimensionConstraints.ForProductType(slug);
        return new ProductType
        {
            Id = id,
            Slug = slug,
            Name = LocalizedText.Create(slug).Value,
            ShortDescription = LocalizedText.Create("...").Value,
            HeroImageUrl = string.Empty,
            SortOrder = 1,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            MinWidthCm = c.MinWidthCm,
            MaxWidthCm = c.MaxWidthCm,
            MinHeightCm = c.MinHeightCm,
            MaxHeightCm = c.MaxHeightCm,
        };
    }

    private static Material MakeMaterial(Guid productTypeId, int priceMinor) =>
        Material.Create(
            productTypeId: productTypeId,
            slug: "aluminum-thermal",
            name: LocalizedText.Create("ალუმინი თერმო").Value,
            shortDescription: LocalizedText.Create("...").Value,
            family: MaterialFamily.Aluminum,
            thermalRating: ThermalRating.Thermal,
            basePricePerSqmMinor: priceMinor,
            currency: Currency.Gel,
            sortOrder: 1).Value;

    [Fact]
    public void Compute_Window_120x140_AluminumThermal_Matches_753_31()
    {
        // Reference computation from Step 2 spec — regression canary in ADR-0002:
        //   area = 1.68 m², material 63 840 tetri, vat 11 491, total 75 331 = 753.31 ₾.
        var result = PriceCalculator.Compute(
            WindowProductType(), MakeMaterial(WindowId, 38000), 120, 140);

        result.IsSuccess.Should().BeTrue();
        var b = result.Value;
        b.AreaSqm.Should().Be(1.68m);
        b.Lines.Should().HaveCount(2);
        b.Lines[0].Should().Be(new PriceLine("material", "მასალა", 63840L));
        b.Lines[1].Should().Be(new PriceLine("vat", "დღგ (18%)", 11491L));
        b.TotalMinor.Should().Be(75331L);
        b.Currency.Should().Be("GEL");
    }

    [Fact]
    public void Compute_Door_80x210_AluminumThermal_Matches_851_47()
    {
        // Step 3 regression canary — door at 80×210 cm with 42 000 tetri/m²:
        //   area  = 80 * 210 / 10000 = 1.68 m²
        //   mat   = 1.68 * 42000   = 70 560 tetri = 705.60 ₾
        //   vat   = 70 560 * 0.18  = 12 700.8 → 12 701 tetri (banker's)
        //   total = 83 261 tetri   = 832.61 ₾
        var result = PriceCalculator.Compute(
            DoorProductType(), MakeMaterial(DoorId, 42000), 80, 210);

        result.IsSuccess.Should().BeTrue();
        result.Value.AreaSqm.Should().Be(1.68m);
        result.Value.Lines[0].AmountMinor.Should().Be(70560L);
        result.Value.Lines[1].AmountMinor.Should().Be(12701L);
        result.Value.TotalMinor.Should().Be(83261L);
    }

    [Theory]
    [InlineData(100, 100, 38000, 1.00, 38000L, 6840L, 44840L)]
    [InlineData(60, 60, 17000, 0.36, 6120L, 1102L, 7222L)]
    [InlineData(200, 200, 26000, 4.00, 104000L, 18720L, 122720L)]
    public void Compute_KnownPairs_ProduceExpectedBreakdown(
        int w, int h, int priceMinor, decimal areaSqm, long matMinor, long vatMinor, long totalMinor)
    {
        var result = PriceCalculator.Compute(WindowProductType(), MakeMaterial(WindowId, priceMinor), w, h);

        result.IsSuccess.Should().BeTrue();
        var b = result.Value;
        b.AreaSqm.Should().Be(areaSqm);
        b.Lines[0].AmountMinor.Should().Be(matMinor);
        b.Lines[1].AmountMinor.Should().Be(vatMinor);
        b.TotalMinor.Should().Be(totalMinor);
    }

    [Theory]
    [InlineData("window", 30, 30)]      // min × min
    [InlineData("window", 300, 250)]    // max × max
    [InlineData("door", 60, 180)]       // door min × min
    [InlineData("door", 140, 260)]      // door max × max
    [InlineData("sliding", 120, 180)]
    [InlineData("panoramic", 150, 200)]
    [InlineData("balcony", 80, 80)]
    public void Compute_PerTypeBoundaries_Succeed(string slug, int w, int h)
    {
        var pt = MakePt(Guid.NewGuid(), slug);
        var material = MakeMaterial(pt.Id, 30000);
        PriceCalculator.Compute(pt, material, w, h).IsSuccess.Should().BeTrue();
    }

    [Theory]
    [InlineData("door", 30, 200)]       // door min width is 60
    [InlineData("door", 50, 200)]
    [InlineData("door", 200, 200)]      // door max width is 140
    [InlineData("window", 29, 100)]
    [InlineData("window", 301, 100)]    // window max width 300
    public void Compute_WidthOutOfRange_ReturnsErrorWithMetadata(string slug, int width, int height)
    {
        var pt = MakePt(Guid.NewGuid(), slug);
        var material = MakeMaterial(pt.Id, 30000);
        var c = pt.GetConstraints();

        var result = PriceCalculator.Compute(pt, material, width, height);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.dimensions.widthOutOfRange");
        result.Error.Field.Should().Be("widthCm");
        result.Error.Metadata.Should().NotBeNull();
        result.Error.Metadata!["min"].Should().Be(c.MinWidthCm);
        result.Error.Metadata["max"].Should().Be(c.MaxWidthCm);
        result.Error.Metadata["actual"].Should().Be(width);
    }

    [Theory]
    [InlineData("door", 100, 170)]      // door min height 180
    [InlineData("door", 100, 261)]      // door max height 260
    [InlineData("window", 120, 29)]
    [InlineData("window", 120, 251)]
    public void Compute_HeightOutOfRange_ReturnsErrorWithMetadata(string slug, int width, int height)
    {
        var pt = MakePt(Guid.NewGuid(), slug);
        var material = MakeMaterial(pt.Id, 30000);
        var c = pt.GetConstraints();

        var result = PriceCalculator.Compute(pt, material, width, height);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.dimensions.heightOutOfRange");
        result.Error.Field.Should().Be("heightCm");
        result.Error.Metadata.Should().NotBeNull();
        result.Error.Metadata!["min"].Should().Be(c.MinHeightCm);
        result.Error.Metadata["max"].Should().Be(c.MaxHeightCm);
        result.Error.Metadata["actual"].Should().Be(height);
    }

    [Fact]
    public void Compute_NullMaterial_ReturnsMaterialNotFound()
    {
        var result = PriceCalculator.Compute(WindowProductType(), material: null!, 120, 140);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("material.notFound");
    }

    [Fact]
    public void Compute_NullProductType_ReturnsProductTypeNotFound()
    {
        var result = PriceCalculator.Compute(productType: null!, MakeMaterial(WindowId, 38000), 120, 140);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("productType.notFound");
    }

    [Fact]
    public void Compute_MaterialBelongsToDifferentProductType_Returns_NotInProductType()
    {
        // Material claims it lives under DoorId; pricing call says WindowProductType.
        var result = PriceCalculator.Compute(
            WindowProductType(), MakeMaterial(DoorId, 38000), 120, 140);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.material.notInProductType");
        result.Error.Type.Should().Be(BEQSAN.Domain.Common.ErrorType.BusinessRule);
    }

    [Fact]
    public void Compute_IsPureFunction_SameInputsSameOutputs()
    {
        var pt = WindowProductType();
        var m = MakeMaterial(WindowId, 38000);
        var a = PriceCalculator.Compute(pt, m, 120, 140).Value;
        var b = PriceCalculator.Compute(pt, m, 120, 140).Value;
        a.Should().BeEquivalentTo(b);
    }

    [Fact]
    public void Compute_VatRounding_UsesBankerRounding()
    {
        // 100×100 = 1 m² × 2500 = 2500 tetri; vat = 450 (no rounding needed).
        var pt = WindowProductType();
        var material = MakeMaterial(WindowId, 2500);
        var result = PriceCalculator.Compute(pt, material, 100, 100).Value;
        result.Lines[0].AmountMinor.Should().Be(2500L);
        result.Lines[1].AmountMinor.Should().Be(450L);
        result.TotalMinor.Should().Be(2950L);
    }
}
