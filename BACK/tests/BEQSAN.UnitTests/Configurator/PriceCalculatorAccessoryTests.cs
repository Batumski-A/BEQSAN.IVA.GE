using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Configurator;

/// <summary>
/// Step-7 accessory pricing tests. Locks ADR-0002 canary #6 and re-asserts
/// every earlier canary byte-for-byte under the new 7-parameter signature.
/// </summary>
public class PriceCalculatorAccessoryTests
{
    private static readonly Guid WindowId = Guid.Parse("66242680-01f2-125b-a8db-02681c98c0b9");

    private static readonly Guid DoubleStandardId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid TripleLowEId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003");
    private static readonly Guid WhiteId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
    private static readonly Guid AnthraciteId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
    private static readonly Guid HandleModernId = Guid.Parse("cccccccc-0000-0000-0000-000000000001");
    private static readonly Guid LockMulti3Id = Guid.Parse("dddddddd-0000-0000-0000-000000000002");
    private static readonly Guid LockBasicId = Guid.Parse("dddddddd-0000-0000-0000-000000000001");
    private static readonly Guid BlindExtElectricId = Guid.Parse("eeeeeeee-0000-0000-0000-000000000001");

    private static ProductType WindowPt() => new()
    {
        Id = WindowId,
        Slug = "window",
        Name = LocalizedText.Create("ფანჯარა").Value,
        ShortDescription = LocalizedText.Create("...").Value,
        HeroImageUrl = string.Empty,
        SortOrder = 1, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
        MinWidthCm = 30, MaxWidthCm = 300, MinHeightCm = 30, MaxHeightCm = 250,
    };

    private static Material AluThermal() => Material.Create(
        productTypeId: WindowId, slug: "aluminum-thermal",
        name: LocalizedText.Create("ალუმინი თერმო").Value,
        shortDescription: LocalizedText.Create("...").Value,
        family: MaterialFamily.Aluminum, thermalRating: ThermalRating.Thermal,
        basePricePerSqmMinor: 38000, currency: Currency.Gel, sortOrder: 1).Value;

    private static GlassType MakeGlass(Guid id, string slug, int surcharge, bool isDefault) => new()
    {
        Id = id, Slug = slug, PaneCount = 2 + (surcharge > 5000 ? 1 : 0),
        Name = LocalizedText.Create(slug).Value,
        ShortDescription = LocalizedText.Create("...").Value,
        SurchargePerSqmMinor = surcharge, Currency = Currency.Gel,
        UValue = 2.0m, SortOrder = 0, IsDefault = isDefault, IsActive = true,
        CreatedAtUtc = DateTime.UtcNow,
    };

    private static ColorOption MakeColor(Guid id, string slug, int surcharge, bool isDefault, ColorFamily f = ColorFamily.Standard) => new()
    {
        Id = id, Slug = slug, Family = f,
        Name = LocalizedText.Create(slug).Value,
        ShortDescription = LocalizedText.Create("...").Value,
        HexCode = "#FFFFFF", SurchargeMinor = surcharge, Currency = Currency.Gel,
        SortOrder = 0, IsDefault = isDefault, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
    };

    private static HandleStyle MakeHandle(Guid id, string slug, int surcharge) => new()
    {
        Id = id, Slug = slug, Family = "modern",
        Name = LocalizedText.Create(slug).Value,
        ShortDescription = LocalizedText.Create("...").Value,
        SurchargePerPaneMinor = surcharge, Currency = Currency.Gel,
        SortOrder = 0, IsDefault = false, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
    };

    private static LockType MakeLock(Guid id, string slug, LockGrade g, bool requiresFull, int surcharge) => new()
    {
        Id = id, Slug = slug, Grade = g, RequiresCasementOrTurn = requiresFull,
        Name = LocalizedText.Create(slug).Value,
        ShortDescription = LocalizedText.Create("...").Value,
        SecurityRating = 3, SurchargePerPaneMinor = surcharge,
        Currency = Currency.Gel, SortOrder = 0, IsDefault = false, IsActive = true,
        CreatedAtUtc = DateTime.UtcNow,
    };

    private static BlindType MakeBlind(Guid id, string slug, BlindPlacement p, bool electric, int baseMount, int perSqm) => new()
    {
        Id = id, Slug = slug, Placement = p, SupportsElectric = electric,
        Name = LocalizedText.Create(slug).Value,
        ShortDescription = LocalizedText.Create("...").Value,
        BaseMountingMinor = baseMount, SurchargePerSqmMinor = perSqm,
        Currency = Currency.Gel, SortOrder = 0, IsActive = true,
        CreatedAtUtc = DateTime.UtcNow,
    };

    private static Dictionary<Guid, GlassType> StandardGlassSet() => new[]
    {
        MakeGlass(DoubleStandardId, "double-standard", 0, true),
        MakeGlass(TripleLowEId, "triple-low-e", 6000, false),
    }.ToDictionary(g => g.Id);

    private static Dictionary<Guid, ColorOption> StandardColorSet() => new[]
    {
        MakeColor(WhiteId, "white-ral9016", 0, true),
        MakeColor(AnthraciteId, "anthracite-ral7016", 7500, false, ColorFamily.Premium),
    }.ToDictionary(c => c.Id);

    private static AccessoryCatalog FullCatalog(Material material, ProductType pt)
    {
        var handle = MakeHandle(HandleModernId, "modern-aluminum", 4500);
        var lockBasic = MakeLock(LockBasicId, "basic-cam", LockGrade.Basic, false, 3500);
        var lockMulti3 = MakeLock(LockMulti3Id, "multi-point-3", LockGrade.MultiPoint, true, 9000);
        var blindElectric = MakeBlind(BlindExtElectricId, "external-aluminum-electric",
            BlindPlacement.External, true, baseMount: 25000, perSqm: 9000);
        return new AccessoryCatalog(
            new Dictionary<Guid, HandleStyle> { [handle.Id] = handle },
            new Dictionary<Guid, LockType> { [lockBasic.Id] = lockBasic, [lockMulti3.Id] = lockMulti3 },
            new Dictionary<Guid, BlindType> { [blindElectric.Id] = blindElectric },
            [(handle.Id, material.Id)],
            [(lockBasic.Id, pt.Id), (lockMulti3.Id, pt.Id)],
            [(blindElectric.Id, pt.Id)]);
    }

    [Fact]
    public void Canary6_Window_165x140_Full_Accessories_Equals_2333_17()
    {
        // ADR-0002 canary #6 — Canary #5 + accessories:
        //   handle modern-aluminum × 1 openable = 4 500
        //   lock multi-point-3 × 1 openable     = 9 000
        //   sill Outer 165cm × 80 ₾/m           = 13 200
        //   blind external-aluminum-electric:
        //     base 25 000 + (2.31 × 9 000=20 790) + electric 4 500 = 50 290
        //   accessories total                    = 76 990
        //   canary #5 pre-VAT subtotal           = 120 736
        //   new subtotal                         = 197 726
        //   vat = round(197 726 × 0.18)          = 35 591 (35 590.68)
        //   total                                = 233 317 = 2333.17 ₾
        var pt = WindowPt();
        var mat = AluThermal();
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false,
                TripleLowEId, [GlassExtra.Tempered]),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false,
                TripleLowEId, []),
        };
        var accessories = new AccessorySelection(
            HandleStyleId: HandleModernId,
            LockTypeId: LockMulti3Id,
            Sill: new SillSelection(SillPosition.Outer),
            Blind: new BlindSelection(BlindExtElectricId, BlindControl.Electric));

        var result = PriceCalculator.Compute(
            pt, mat, 165, 140,
            panes, StandardGlassSet(),
            new ColorSelection(AnthraciteId), StandardColorSet(),
            accessories, FullCatalog(mat, pt));

        result.IsSuccess.Should().BeTrue();
        result.Value.TotalMinor.Should().Be(233_317L);
        var lines = result.Value.Lines;
        lines.Should().Contain(l => l.Code == "accessory.handle.modern-aluminum" && l.AmountMinor == 4_500L);
        lines.Should().Contain(l => l.Code == "accessory.lock.multi-point-3" && l.AmountMinor == 9_000L);
        lines.Should().Contain(l => l.Code == "accessory.sill.outer" && l.AmountMinor == 13_200L);
        lines.Should().Contain(l => l.Code == "accessory.blind.external-aluminum-electric" && l.AmountMinor == 50_290L);
    }

    [Fact]
    public void Canary1_Backcompat_NoAccessoryCatalog_Equals_753_31()
    {
        var pt = WindowPt();
        var mat = AluThermal();
        var result = PriceCalculator.Compute(
            pt, mat, 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: null, availableColorOptions: null,
            accessories: null, accessoryCatalog: null);
        result.Value.TotalMinor.Should().Be(75_331L);
    }

    [Fact]
    public void Canary5_Backcompat_NoAccessorySelection_Equals_1424_68()
    {
        // Canary #5 with empty accessory catalog → no validator firing,
        // no accessory lines, total holds.
        var pt = WindowPt();
        var mat = AluThermal();
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false,
                TripleLowEId, [GlassExtra.Tempered]),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false,
                TripleLowEId, []),
        };
        var result = PriceCalculator.Compute(
            pt, mat, 165, 140,
            panes, StandardGlassSet(),
            new ColorSelection(AnthraciteId), StandardColorSet(),
            accessories: null, accessoryCatalog: AccessoryCatalog.Empty);
        result.Value.TotalMinor.Should().Be(142_468L);
    }

    [Fact]
    public void HandlePerPane_ScalesWithOpenableCount()
    {
        var pt = WindowPt();
        var mat = AluThermal();
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Casement, HingeSide.Left, false),
        };
        var result = PriceCalculator.Compute(
            pt, mat, 165, 140, panes, null, null, null,
            new AccessorySelection(HandleStyleId: HandleModernId),
            FullCatalog(mat, pt));
        result.IsSuccess.Should().BeTrue();
        var line = result.Value.Lines.Single(l => l.Code == "accessory.handle.modern-aluminum");
        line.AmountMinor.Should().Be(9_000L); // 2 × 4500
    }

    [Fact]
    public void HandlePerPane_FixedOnly_NoLine()
    {
        // A fixed-only window with a handle would already fail validation;
        // direct calculator call without validation surfaces no line either
        // because openableCount = 0.
        var pt = WindowPt();
        var mat = AluThermal();
        var result = PriceCalculator.Compute(
            pt, mat, 120, 140,
            panes: null, availableGlassTypes: null, colorSelection: null, availableColorOptions: null,
            accessories: new AccessorySelection(),
            accessoryCatalog: FullCatalog(mat, pt));
        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Should().NotContain(l => l.Code.StartsWith("accessory.", StringComparison.Ordinal));
    }

    [Fact]
    public void SillPosition_Both_DoublesLength()
    {
        var pt = WindowPt();
        var mat = AluThermal();
        // 165cm × 8000/m = 13 200 single side
        // Both = 2× = 26 400
        var sill = new SillSelection(SillPosition.Both);
        var result = PriceCalculator.Compute(
            pt, mat, 165, 140,
            panes: null, availableGlassTypes: null, colorSelection: null, availableColorOptions: null,
            accessories: new AccessorySelection(Sill: sill),
            accessoryCatalog: FullCatalog(mat, pt));
        result.IsSuccess.Should().BeTrue();
        var line = result.Value.Lines.Single(l => l.Code == "accessory.sill.both");
        line.AmountMinor.Should().Be(26_400L);
    }

    [Fact]
    public void SillCustomLength_OverridesFrameWidth()
    {
        var pt = WindowPt();
        var mat = AluThermal();
        // 200cm × 8000/m = 16 000 (overrides widthCm = 120)
        var sill = new SillSelection(SillPosition.Inner, CustomLengthCm: 200);
        var result = PriceCalculator.Compute(
            pt, mat, 120, 140,
            panes: null, availableGlassTypes: null, colorSelection: null, availableColorOptions: null,
            accessories: new AccessorySelection(Sill: sill),
            accessoryCatalog: FullCatalog(mat, pt));
        result.IsSuccess.Should().BeTrue();
        var line = result.Value.Lines.Single(l => l.Code == "accessory.sill.inner");
        line.AmountMinor.Should().Be(16_000L);
    }

    [Theory]
    [InlineData("Manual", 0L)]
    [InlineData("Electric", 4500L)]
    [InlineData("Remote", 8500L)]
    public void BlindControlSurcharge_MatchesTable(string control, long expectedExtra)
    {
        var pt = WindowPt();
        var mat = AluThermal();
        var ctl = Enum.Parse<BlindControl>(control);
        var blind = new BlindSelection(BlindExtElectricId, ctl);
        // 1m² window for simple math: area = 1, base = 25000, per-sqm = 9000
        // → blind line = 25000 + 9000 + controlSurcharge
        var result = PriceCalculator.Compute(
            pt, mat, 100, 100,
            panes: null, availableGlassTypes: null, colorSelection: null, availableColorOptions: null,
            accessories: new AccessorySelection(Blind: blind),
            accessoryCatalog: FullCatalog(mat, pt));
        result.IsSuccess.Should().BeTrue();
        var line = result.Value.Lines.Single(l => l.Code == "accessory.blind.external-aluminum-electric");
        line.AmountMinor.Should().Be(25_000L + 9_000L + expectedExtra);
    }

    [Fact]
    public void Lock_PerPane_BasicCam_ScalesWithOpenable()
    {
        var pt = WindowPt();
        var mat = AluThermal();
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Casement, HingeSide.Left, false),
        };
        var result = PriceCalculator.Compute(
            pt, mat, 165, 140, panes, null, null, null,
            new AccessorySelection(LockTypeId: LockBasicId),
            FullCatalog(mat, pt));
        result.IsSuccess.Should().BeTrue();
        var line = result.Value.Lines.Single(l => l.Code == "accessory.lock.basic-cam");
        line.AmountMinor.Should().Be(7_000L); // 2 × 3500
    }

    [Fact]
    public void Vat_IsAppliedToAccessoryInclusiveSubtotal()
    {
        // 1 m² ALU-thermal + 1× Casement opening surcharge + handle + lock:
        //   material        = round(1.00 × 38 000) = 38 000
        //   opening (cas)   = round(1.00 × 38 000 × 0.08) = 3 040
        //   handle          = 4 500 × 1 openable = 4 500
        //   lock (basic)    = 3 500 × 1 openable = 3 500
        //   subtotal        = 49 040
        //   vat             = round(49 040 × 0.18) = 8 827 (banker's 8 827.2)
        //   total           = 57 867
        var pt = WindowPt();
        var mat = AluThermal();
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Casement, HingeSide.Right, false),
        };
        var result = PriceCalculator.Compute(
            pt, mat, 100, 100, panes, null, null, null,
            new AccessorySelection(HandleStyleId: HandleModernId, LockTypeId: LockBasicId),
            FullCatalog(mat, pt));
        result.IsSuccess.Should().BeTrue();
        var vat = result.Value.Lines.Single(l => l.Code == "vat");
        vat.AmountMinor.Should().Be(8_827L);
        result.Value.TotalMinor.Should().Be(57_867L);
    }

    [Fact]
    public void Canaries_1_2_3_4_5_HoldByteForByte_WithFullCatalog_NoSelection()
    {
        // With every Step-7 dependency wired but no accessory selection,
        // earlier canaries must hold byte-for-byte.
        var pt = WindowPt();
        var mat = AluThermal();
        var catalog = FullCatalog(mat, pt);

        // Canary #1
        var c1 = PriceCalculator.Compute(pt, mat, 120, 140,
            null, null, null, null, null, catalog);
        c1.Value.TotalMinor.Should().Be(75_331L);

        // Canary #3
        var panes3 = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false),
        };
        var c3 = PriceCalculator.Compute(pt, mat, 165, 140,
            panes3, null, null, null, null, catalog);
        c3.Value.TotalMinor.Should().Be(107_723L);

        // Canary #4
        var panes45 = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false,
                TripleLowEId, [GlassExtra.Tempered]),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false,
                TripleLowEId, []),
        };
        var c4 = PriceCalculator.Compute(pt, mat, 165, 140,
            panes45, StandardGlassSet(), null, null, null, catalog);
        c4.Value.TotalMinor.Should().Be(133_618L);

        // Canary #5
        var c5 = PriceCalculator.Compute(pt, mat, 165, 140,
            panes45, StandardGlassSet(),
            new ColorSelection(AnthraciteId), StandardColorSet(),
            null, catalog);
        c5.Value.TotalMinor.Should().Be(142_468L);
    }

    [Fact]
    public void AccessoryLines_LabelsContainKaName()
    {
        var pt = WindowPt();
        var mat = AluThermal();
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Casement, HingeSide.Right, false),
        };
        var result = PriceCalculator.Compute(
            pt, mat, 100, 100, panes, null, null, null,
            new AccessorySelection(HandleStyleId: HandleModernId),
            FullCatalog(mat, pt));
        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Single(l => l.Code == "accessory.handle.modern-aluminum")
            .Label.Should().Contain("modern-aluminum");
    }

    [Fact]
    public void EmptyAccessoryCatalog_TreatsAsAbsentCatalog()
    {
        var pt = WindowPt();
        var mat = AluThermal();
        var result = PriceCalculator.Compute(
            pt, mat, 120, 140,
            panes: null, availableGlassTypes: null, colorSelection: null, availableColorOptions: null,
            accessories: null, accessoryCatalog: AccessoryCatalog.Empty);
        result.Value.TotalMinor.Should().Be(75_331L);
    }
}
