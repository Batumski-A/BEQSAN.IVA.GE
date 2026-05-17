using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Configurator;

/// <summary>
/// Step-5 glass + extras pricing tests. Locks ADR-0002 canary #4 and verifies
/// the back-compat path (Steps 1-4 callers that don't supply a glass set)
/// remains byte-for-byte identical.
/// </summary>
public class PriceCalculatorGlassTests
{
    private static readonly Guid WindowId = Guid.Parse("66242680-01f2-125b-a8db-02681c98c0b9");
    private static readonly Guid DoubleStandardId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid TripleLowEId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003");

    private static ProductType WindowPt() => new()
    {
        Id = WindowId,
        Slug = "window",
        Name = LocalizedText.Create("ფანჯარა").Value,
        ShortDescription = LocalizedText.Create("...").Value,
        HeroImageUrl = string.Empty,
        SortOrder = 1,
        IsActive = true,
        CreatedAtUtc = DateTime.UtcNow,
        MinWidthCm = 30,
        MaxWidthCm = 300,
        MinHeightCm = 30,
        MaxHeightCm = 250,
    };

    private static Material AluThermal() => Material.Create(
        productTypeId: WindowId,
        slug: "aluminum-thermal",
        name: LocalizedText.Create("ალუმინი თერმო").Value,
        shortDescription: LocalizedText.Create("...").Value,
        family: MaterialFamily.Aluminum,
        thermalRating: ThermalRating.Thermal,
        basePricePerSqmMinor: 38000,
        currency: Currency.Gel,
        sortOrder: 1).Value;

    private static GlassType GlassDoubleStandard() => new()
    {
        Id = DoubleStandardId,
        Slug = "double-standard",
        Name = LocalizedText.Create("ორმაგი მინა").Value,
        ShortDescription = LocalizedText.Create("...").Value,
        PaneCount = 2,
        SurchargePerSqmMinor = 0,
        Currency = Currency.Gel,
        UValue = 2.8m,
        SortOrder = 1,
        IsDefault = true,
        IsActive = true,
        CreatedAtUtc = DateTime.UtcNow,
    };

    private static GlassType GlassTripleLowE() => new()
    {
        Id = TripleLowEId,
        Slug = "triple-low-e",
        Name = LocalizedText.Create("სამმაგი Low-E").Value,
        ShortDescription = LocalizedText.Create("...").Value,
        PaneCount = 3,
        SurchargePerSqmMinor = 6000,
        Currency = Currency.Gel,
        UValue = 1.0m,
        SortOrder = 3,
        IsDefault = false,
        IsActive = true,
        CreatedAtUtc = DateTime.UtcNow,
    };

    private static Dictionary<Guid, GlassType> GlassSet(params GlassType[] gs) =>
        gs.ToDictionary(g => g.Id);

    [Fact]
    public void Canary4_Window_165x140_TripleLowE_Plus_Tempered_Equals_1336_18()
    {
        // ADR-0002 canary #4 — window 165×140 ALU-thermal, 2-pane:
        //   pane 1: 50% Casement Right + triple-low-e + tempered extra
        //   pane 2: 50% Fixed + triple-low-e (no extras)
        // Composition:
        //   material        = round(2.31 × 38000)        = 87 780
        //   pane1 casement  = round(1.155 × 38000 × 0.08) = 3 511
        //   pane1 glass     = round(1.155 × 6000)         = 6 930
        //   pane1 tempered  = round(1.155 × 7000)         = 8 085
        //   pane2 glass     = round(1.155 × 6000)         = 6 930
        //   subtotal        = 87 780 + 3 511 + 6 930 + 8 085 + 6 930 = 113 236
        //   vat             = round(113 236 × 0.18)       = 20 382
        //   total           = 133 618 tetri = 1336.18 ₾
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false,
                TripleLowEId, [GlassExtra.Tempered]),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false,
                TripleLowEId, []),
        };
        var glassSet = GlassSet(GlassDoubleStandard(), GlassTripleLowE());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 165, 140, panes, glassSet);

        result.IsSuccess.Should().BeTrue();
        var b = result.Value;
        b.AreaSqm.Should().Be(2.31m);
        b.TotalMinor.Should().Be(133618L);

        // Itemised lines — one material, one opening, two glass surcharges,
        // one tempered extra, one vat.
        var lines = b.Lines;
        lines.Should().HaveCount(6);
        lines[0].Code.Should().Be("material");
        lines[0].AmountMinor.Should().Be(87780L);
        lines[1].Code.Should().Be("pane.1.opening.casement");
        lines[1].AmountMinor.Should().Be(3511L);
        lines.Should().ContainSingle(l => l.Code == "pane.1.glass.triple-low-e" && l.AmountMinor == 6930L);
        lines.Should().ContainSingle(l => l.Code == "pane.1.glass.extra.tempered" && l.AmountMinor == 8085L);
        lines.Should().ContainSingle(l => l.Code == "pane.2.glass.triple-low-e" && l.AmountMinor == 6930L);
        lines[^1].Code.Should().Be("vat");
        lines[^1].AmountMinor.Should().Be(20382L);
    }

    [Fact]
    public void NoGlassSet_StepFourCanary3_StillReturns_1077_23()
    {
        // Step-4 canary #3 with glass omitted from the call → identical
        // result because the calculator's glass branch is skipped.
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false),
        };

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 165, 140, panes,
            availableGlassTypes: null);

        result.Value.TotalMinor.Should().Be(107723L);
    }

    [Fact]
    public void DefaultGlass_Auto_Resolves_Guid_Empty()
    {
        // Empty GlassTypeId on pane + glass set provided → calculator picks
        // the IsDefault entry and emits no glass line (surcharge = 0 for
        // double-standard).
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                Guid.Empty, []),
        };
        var glassSet = GlassSet(GlassDoubleStandard(), GlassTripleLowE());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 120, 140, panes, glassSet);

        result.IsSuccess.Should().BeTrue();
        // No glass line — surcharge for default is 0, line is suppressed.
        result.Value.Lines.Should().NotContain(l => l.Code.StartsWith("pane.1.glass.", StringComparison.Ordinal));
    }

    [Fact]
    public void DefaultGlass_Backcompat_Canary1_StillReturns_753_31()
    {
        // Existing 5-arg pane construction + glass set = default-glass
        // resolution → same 753.31 ₾ as Step 2.
        var glassSet = GlassSet(GlassDoubleStandard(), GlassTripleLowE());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 120, 140,
            panes: null, availableGlassTypes: glassSet);

        result.IsSuccess.Should().BeTrue();
        result.Value.TotalMinor.Should().Be(75331L);
    }

    [Fact]
    public void TripleLowE_AlonePane_AddsSurchargeLine()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                TripleLowEId, []),
        };
        var glassSet = GlassSet(GlassDoubleStandard(), GlassTripleLowE());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 120, 140, panes, glassSet);

        result.IsSuccess.Should().BeTrue();
        var glassLine = result.Value.Lines.Single(l => l.Code == "pane.1.glass.triple-low-e");
        // area = 1.68 m², glass = round(1.68 × 6000) = 10 080
        glassLine.AmountMinor.Should().Be(10080L);
    }

    [Fact]
    public void MixedGlassAcrossPanes_EmitsLinePerPane()
    {
        // Pane 1 takes triple-low-e, pane 2 stays on default.
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Fixed, null, false,
                TripleLowEId, []),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId, []),
        };
        var glassSet = GlassSet(GlassDoubleStandard(), GlassTripleLowE());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 120, 140, panes, glassSet);

        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Should().ContainSingle(l => l.Code == "pane.1.glass.triple-low-e");
        result.Value.Lines.Should().NotContain(l => l.Code == "pane.2.glass.double-standard"); // 0 surcharge → suppressed
    }

    [Fact]
    public void DuplicateExtras_OnSamePane_AreDeDuped()
    {
        // UI bug double-charges by including Tempered twice — the calculator
        // de-dupes before applying so the line appears exactly once.
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId, [GlassExtra.Tempered, GlassExtra.Tempered]),
        };
        var glassSet = GlassSet(GlassDoubleStandard());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 120, 140, panes, glassSet);

        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Count(l => l.Code == "pane.1.glass.extra.tempered").Should().Be(1);
    }

    [Fact]
    public void FrostedAndTinted_OnSamePane_FailsValidation()
    {
        // Layout-level conflict propagates as a calculator failure.
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId, [GlassExtra.Frosted, GlassExtra.Tinted]),
        };
        var glassSet = GlassSet(GlassDoubleStandard());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 120, 140, panes, glassSet);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.glass.frostedTintedConflict");
        result.Error.Metadata!["position"].Should().Be(1);
    }

    [Fact]
    public void GlassTypeNotInAvailableSet_Fails()
    {
        // A glass id that isn't in the material's compat set short-circuits
        // with the BusinessRule code.
        var unknownGlassId = Guid.Parse("99999999-9999-9999-9999-999999999999");
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                unknownGlassId, []),
        };
        var glassSet = GlassSet(GlassDoubleStandard());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 120, 140, panes, glassSet);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.glass.notCompatibleWithMaterial");
        result.Error.Metadata!["position"].Should().Be(1);
    }

    [Fact]
    public void EachExtra_PriceAddsCorrectly_AreaPro_Rata()
    {
        // 1 m² test pane (100×100 cm window) × tempered (7000) = 7000.
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId, [GlassExtra.Tempered]),
        };
        var glassSet = GlassSet(GlassDoubleStandard());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 100, 100, panes, glassSet);

        result.IsSuccess.Should().BeTrue();
        var line = result.Value.Lines.Single(l => l.Code == "pane.1.glass.extra.tempered");
        line.AmountMinor.Should().Be(7000L);
    }

    [Fact]
    public void StackedExtras_SamePane_EachEmitsItsOwnLine()
    {
        // Low-E + Tempered on the same pane → two lines, neither double-counted.
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId, [GlassExtra.LowECoating, GlassExtra.Tempered]),
        };
        var glassSet = GlassSet(GlassDoubleStandard());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 100, 100, panes, glassSet);

        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Should().ContainSingle(l => l.Code == "pane.1.glass.extra.lowecoating" && l.AmountMinor == 4500L);
        result.Value.Lines.Should().ContainSingle(l => l.Code == "pane.1.glass.extra.tempered" && l.AmountMinor == 7000L);
    }

    [Theory]
    [InlineData(GlassExtra.LowECoating, 4500)]
    [InlineData(GlassExtra.Tempered, 7000)]
    [InlineData(GlassExtra.Frosted, 3500)]
    [InlineData(GlassExtra.Tinted, 4000)]
    public void SingleExtra_OneSquareMetre_PriceMatchesPricingTable(GlassExtra extra, int expectedMinor)
    {
        // 1 m² pane × extra rate = expected line value.
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId, [extra]),
        };
        var glassSet = GlassSet(GlassDoubleStandard());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 100, 100, panes, glassSet);

        result.IsSuccess.Should().BeTrue();
        var line = result.Value.Lines.Single(l => l.Code.StartsWith("pane.1.glass.extra.", StringComparison.Ordinal));
        line.AmountMinor.Should().Be(expectedMinor);
    }

    [Fact]
    public void GlassLineLabel_UsesKaName()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                TripleLowEId, []),
        };
        var glassSet = GlassSet(GlassDoubleStandard(), GlassTripleLowE());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 100, 100, panes, glassSet);

        result.Value.Lines.Single(l => l.Code == "pane.1.glass.triple-low-e")
            .Label.Should().Contain("სამმაგი");
    }

    [Fact]
    public void VatIsAppliedToFullSubtotal_IncludingGlass()
    {
        // 1 m² × ALU-thermal = 38 000 material.
        // 1 m² × triple-low-e = 6 000 glass.
        // 1 m² × tempered = 7 000 extra.
        // subtotal = 51 000; vat = round(51 000 × 0.18) = 9 180; total = 60 180.
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                TripleLowEId, [GlassExtra.Tempered]),
        };
        var glassSet = GlassSet(GlassDoubleStandard(), GlassTripleLowE());

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 100, 100, panes, glassSet);

        result.IsSuccess.Should().BeTrue();
        var vat = result.Value.Lines.Single(l => l.Code == "vat");
        vat.AmountMinor.Should().Be(9180L);
        result.Value.TotalMinor.Should().Be(60180L);
    }
}
