using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Configurator;

/// <summary>
/// Step-8 installation pricing tests. Locks ADR-0002 canary #7
/// (Imereti = 2 592.77 ₾) and canary #7b (Batumi = 2 333.17 ₾, byte-for-byte
/// canary #6 because Batumi is free).
/// </summary>
public class PriceCalculatorInstallationTests
{
    private static readonly Guid WindowId = Guid.Parse("66242680-01f2-125b-a8db-02681c98c0b9");
    private static readonly Guid TripleLowEId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003");
    private static readonly Guid DoubleStandardId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid WhiteId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
    private static readonly Guid AnthraciteId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
    private static readonly Guid HandleModernId = Guid.Parse("cccccccc-0000-0000-0000-000000000001");
    private static readonly Guid LockMulti3Id = Guid.Parse("dddddddd-0000-0000-0000-000000000002");
    private static readonly Guid BlindExtElectricId = Guid.Parse("eeeeeeee-0000-0000-0000-000000000001");

    private static ProductType WindowPt() => new()
    {
        Id = WindowId, Slug = "window",
        Name = LocalizedText.Create("ფანჯარა").Value,
        ShortDescription = LocalizedText.Create("...").Value,
        HeroImageUrl = string.Empty,
        SortOrder = 1, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
        MinWidthCm = 30, MaxWidthCm = 300, MinHeightCm = 30, MaxHeightCm = 250,
        WarrantyMonths = 36, LeadTimeDaysMin = 10, LeadTimeDaysMax = 14,
    };

    private static Material AluThermal() => Material.Create(
        productTypeId: WindowId, slug: "aluminum-thermal",
        name: LocalizedText.Create("ალუმინი თერმო").Value,
        shortDescription: LocalizedText.Create("...").Value,
        family: MaterialFamily.Aluminum, thermalRating: ThermalRating.Thermal,
        basePricePerSqmMinor: 38000, currency: Currency.Gel, sortOrder: 1).Value;

    private static Dictionary<Guid, GlassType> GlassSet() => new[]
    {
        new GlassType { Id = DoubleStandardId, Slug = "double-standard",
            Name = LocalizedText.Create("ორმაგი").Value, ShortDescription = LocalizedText.Create("...").Value,
            PaneCount = 2, SurchargePerSqmMinor = 0, Currency = Currency.Gel, UValue = 2.8m,
            SortOrder = 1, IsDefault = true, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
        new GlassType { Id = TripleLowEId, Slug = "triple-low-e",
            Name = LocalizedText.Create("სამმაგი").Value, ShortDescription = LocalizedText.Create("...").Value,
            PaneCount = 3, SurchargePerSqmMinor = 6000, Currency = Currency.Gel, UValue = 1.0m,
            SortOrder = 3, IsDefault = false, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
    }.ToDictionary(g => g.Id);

    private static Dictionary<Guid, ColorOption> ColorSet() => new[]
    {
        new ColorOption { Id = WhiteId, Slug = "white-ral9016", Family = ColorFamily.Standard,
            Name = LocalizedText.Create("თეთრი").Value, ShortDescription = LocalizedText.Create("...").Value,
            HexCode = "#F4F4F4", SurchargeMinor = 0, Currency = Currency.Gel,
            SortOrder = 0, IsDefault = true, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
        new ColorOption { Id = AnthraciteId, Slug = "anthracite-ral7016", Family = ColorFamily.Premium,
            Name = LocalizedText.Create("ანტრაციტი").Value, ShortDescription = LocalizedText.Create("...").Value,
            HexCode = "#293133", SurchargeMinor = 7500, Currency = Currency.Gel,
            SortOrder = 0, IsDefault = false, IsActive = true, CreatedAtUtc = DateTime.UtcNow },
    }.ToDictionary(c => c.Id);

    private static AccessoryCatalog FullCatalog(Material mat, ProductType pt)
    {
        var handle = new HandleStyle
        {
            Id = HandleModernId, Slug = "modern-aluminum", Family = "modern",
            Name = LocalizedText.Create("Modern").Value, ShortDescription = LocalizedText.Create("...").Value,
            SurchargePerPaneMinor = 4500, Currency = Currency.Gel,
            SortOrder = 0, IsDefault = true, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
        };
        var lockMulti = new LockType
        {
            Id = LockMulti3Id, Slug = "multi-point-3", Grade = LockGrade.MultiPoint,
            Name = LocalizedText.Create("Multi-3").Value, ShortDescription = LocalizedText.Create("...").Value,
            SecurityRating = 4, RequiresCasementOrTurn = true,
            SurchargePerPaneMinor = 9000, Currency = Currency.Gel,
            SortOrder = 0, IsDefault = false, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
        };
        var blind = new BlindType
        {
            Id = BlindExtElectricId, Slug = "external-aluminum-electric",
            Placement = BlindPlacement.External, SupportsElectric = true,
            Name = LocalizedText.Create("გარეთა").Value, ShortDescription = LocalizedText.Create("...").Value,
            BaseMountingMinor = 25000, SurchargePerSqmMinor = 9000,
            Currency = Currency.Gel, SortOrder = 0, IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
        };
        return new AccessoryCatalog(
            new Dictionary<Guid, HandleStyle> { [handle.Id] = handle },
            new Dictionary<Guid, LockType> { [lockMulti.Id] = lockMulti },
            new Dictionary<Guid, BlindType> { [blind.Id] = blind },
            [(handle.Id, mat.Id)],
            [(lockMulti.Id, pt.Id)],
            [(blind.Id, pt.Id)]);
    }

    private static ConfigurationPane[] Canary6Panes() =>
    [
        new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false,
            TripleLowEId, [GlassExtra.Tempered]),
        new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false,
            TripleLowEId, []),
    ];

    private static AccessorySelection Canary6Accessories() => new(
        HandleStyleId: HandleModernId,
        LockTypeId: LockMulti3Id,
        Sill: new SillSelection(SillPosition.Outer),
        Blind: new BlindSelection(BlindExtElectricId, BlindControl.Electric));

    [Fact]
    public void Canary7_Window_Full_Plus_Imereti_Install_Equals_2592_77()
    {
        // canary #6 pre-VAT subtotal      = 197 726
        // + Imereti install               =  22 000
        // new subtotal                    = 219 726
        // vat = round(219 726 × 0.18)     =  39 551 (banker's 39 550.68 → up)
        // total                            = 259 277 = 2592.77 ₾
        var pt = WindowPt();
        var mat = AluThermal();
        var result = PriceCalculator.Compute(
            pt, mat, 165, 140,
            Canary6Panes(), GlassSet(),
            new ColorSelection(AnthraciteId), ColorSet(),
            Canary6Accessories(), FullCatalog(mat, pt),
            new InstallationOption(InstallationRegion.Imereti));

        result.IsSuccess.Should().BeTrue();
        result.Value.TotalMinor.Should().Be(259_277L);
        result.Value.Lines.Should().Contain(l => l.Code == "installation.imereti" && l.AmountMinor == 22_000L);
    }

    [Fact]
    public void Canary7b_Window_Full_Plus_Batumi_Install_Equals_Canary6_ByteForByte()
    {
        // Batumi → no installation line, no surcharge. Canary #6 holds.
        var pt = WindowPt();
        var mat = AluThermal();
        var result = PriceCalculator.Compute(
            pt, mat, 165, 140,
            Canary6Panes(), GlassSet(),
            new ColorSelection(AnthraciteId), ColorSet(),
            Canary6Accessories(), FullCatalog(mat, pt),
            new InstallationOption(InstallationRegion.Batumi));

        result.IsSuccess.Should().BeTrue();
        result.Value.TotalMinor.Should().Be(233_317L);
        result.Value.Lines.Should().NotContain(l => l.Code.StartsWith("installation.", StringComparison.Ordinal));
    }

    [Fact]
    public void Other_Region_AddsZeroAmountLine_ForManualQuote()
    {
        var pt = WindowPt();
        var mat = AluThermal();
        var result = PriceCalculator.Compute(
            pt, mat, 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: null, availableColorOptions: null,
            accessories: null, accessoryCatalog: null,
            installation: new InstallationOption(InstallationRegion.Other, CityHint: "ბათუმი"));
        result.IsSuccess.Should().BeTrue();
        var line = result.Value.Lines.Single(l => l.Code == "installation.manual-quote");
        line.AmountMinor.Should().Be(0L);
        // VAT still computed on pre-install subtotal — canary #1 holds.
        result.Value.TotalMinor.Should().Be(75_331L);
    }

    [Theory]
    [InlineData(InstallationRegion.KobuletiCoast, "installation.kobuleticoast", 10_000L)]
    [InlineData(InstallationRegion.Guria, "installation.guria", 15_000L)]
    [InlineData(InstallationRegion.Imereti, "installation.imereti", 22_000L)]
    [InlineData(InstallationRegion.Samegrelo, "installation.samegrelo", 28_000L)]
    [InlineData(InstallationRegion.EastGeorgia, "installation.eastgeorgia", 40_000L)]
    public void ZoneRegions_AddInstallationLine_AtTableRate(InstallationRegion region, string code, long expectedMinor)
    {
        var pt = WindowPt();
        var mat = AluThermal();
        var result = PriceCalculator.Compute(
            pt, mat, 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: null, availableColorOptions: null,
            accessories: null, accessoryCatalog: null,
            installation: new InstallationOption(region));
        result.IsSuccess.Should().BeTrue();
        var line = result.Value.Lines.Single(l => l.Code == code);
        line.AmountMinor.Should().Be(expectedMinor);
    }

    [Fact]
    public void Vat_IsAppliedToInstallationInclusiveSubtotal()
    {
        // 1 m² window + Imereti install:
        //   material = round(1.00 × 38 000) = 38 000
        //   install  = 22 000
        //   subtotal = 60 000
        //   vat = round(60 000 × 0.18) = 10 800
        //   total = 70 800
        var pt = WindowPt();
        var mat = AluThermal();
        var result = PriceCalculator.Compute(
            pt, mat, 100, 100,
            panes: null, availableGlassTypes: null,
            colorSelection: null, availableColorOptions: null,
            accessories: null, accessoryCatalog: null,
            installation: new InstallationOption(InstallationRegion.Imereti));
        result.IsSuccess.Should().BeTrue();
        var vat = result.Value.Lines.Single(l => l.Code == "vat");
        vat.AmountMinor.Should().Be(10_800L);
        result.Value.TotalMinor.Should().Be(70_800L);
    }

    [Fact]
    public void InstallationLine_LabelContainsKaRegionName()
    {
        var pt = WindowPt();
        var mat = AluThermal();
        var result = PriceCalculator.Compute(
            pt, mat, 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: null, availableColorOptions: null,
            accessories: null, accessoryCatalog: null,
            installation: new InstallationOption(InstallationRegion.Imereti));
        result.IsSuccess.Should().BeTrue();
        var line = result.Value.Lines.Single(l => l.Code == "installation.imereti");
        // Label format is "მონტაჟი · {regionLabelKa}"; we just check the
        // prefix + that the region label is interpolated as Georgian.
        line.Label.Should().StartWith("მონტაჟი ·");
        line.Label.Should().Contain("იმერეთი");
    }

    [Fact]
    public void Other_CityHint_PreservedInDomainEntity_NoLineLabelLeak()
    {
        // CityHint isn't surfaced in the breakdown — it's for the back-
        // office crew. The price calculator just emits the manual-quote
        // line and the hint travels in the domain entity.
        var pt = WindowPt();
        var mat = AluThermal();
        var result = PriceCalculator.Compute(
            pt, mat, 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: null, availableColorOptions: null,
            accessories: null, accessoryCatalog: null,
            installation: new InstallationOption(InstallationRegion.Other, CityHint: "ანასეული"));
        result.Value.Lines.Should().NotContain(l => l.Label.Contains("ანასეული"));
    }

    [Fact]
    public void Canaries_1_To_6_HoldByteForByte_WithNullInstallation()
    {
        // Smoke test for back-compat: every earlier canary holds when
        // installation = null.
        var pt = WindowPt();
        var mat = AluThermal();
        var c1 = PriceCalculator.Compute(pt, mat, 120, 140,
            null, null, null, null, null, null, null);
        c1.Value.TotalMinor.Should().Be(75_331L);

        var panes4 = Canary6Panes();
        var c5 = PriceCalculator.Compute(pt, mat, 165, 140,
            panes4, GlassSet(),
            new ColorSelection(AnthraciteId), ColorSet(),
            null, null, null);
        c5.Value.TotalMinor.Should().Be(142_468L);

        var c6 = PriceCalculator.Compute(pt, mat, 165, 140,
            panes4, GlassSet(),
            new ColorSelection(AnthraciteId), ColorSet(),
            Canary6Accessories(), FullCatalog(mat, pt), null);
        c6.Value.TotalMinor.Should().Be(233_317L);
    }
}
