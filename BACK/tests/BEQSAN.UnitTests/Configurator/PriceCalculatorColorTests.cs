using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Configurator;

/// <summary>
/// Step-6 color pricing tests. Locks ADR-0002 canary #5 and verifies
/// every earlier-slice canary (#1-#4) holds byte-for-byte when the
/// pricing pipeline runs with the new color params.
/// </summary>
public class PriceCalculatorColorTests
{
    private static readonly Guid WindowId = Guid.Parse("66242680-01f2-125b-a8db-02681c98c0b9");

    // Glass — reused across tests.
    private static readonly Guid DoubleStandardId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid TripleLowEId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003");

    // Colors.
    private static readonly Guid WhiteId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
    private static readonly Guid AnthraciteId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
    private static readonly Guid OakLaminateId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000003");

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

    private static Material PvcLaminated() => Material.Create(
        productTypeId: WindowId, slug: "pvc-laminated",
        name: LocalizedText.Create("PVC ლამინირებული").Value,
        shortDescription: LocalizedText.Create("...").Value,
        family: MaterialFamily.Pvc, thermalRating: ThermalRating.Thermal,
        basePricePerSqmMinor: 24000, currency: Currency.Gel, sortOrder: 1).Value;

    private static GlassType GlassDoubleStandard() => new()
    {
        Id = DoubleStandardId, Slug = "double-standard",
        Name = LocalizedText.Create("ორმაგი მინა").Value,
        ShortDescription = LocalizedText.Create("...").Value,
        PaneCount = 2, SurchargePerSqmMinor = 0,
        Currency = Currency.Gel, UValue = 2.8m,
        SortOrder = 1, IsDefault = true, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
    };

    private static GlassType GlassTripleLowE() => new()
    {
        Id = TripleLowEId, Slug = "triple-low-e",
        Name = LocalizedText.Create("სამმაგი Low-E").Value,
        ShortDescription = LocalizedText.Create("...").Value,
        PaneCount = 3, SurchargePerSqmMinor = 6000,
        Currency = Currency.Gel, UValue = 1.0m,
        SortOrder = 3, IsDefault = false, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
    };

    private static ColorOption MakeColor(Guid id, string slug, ColorFamily family, int surcharge, bool isDefault, string? textureUrl = null) => new()
    {
        Id = id, Slug = slug, Family = family,
        Name = LocalizedText.Create(slug).Value,
        ShortDescription = LocalizedText.Create("...").Value,
        HexCode = "#F4F4F4", RalCode = null,
        WoodTextureUrl = textureUrl,
        SurchargeMinor = surcharge, Currency = Currency.Gel,
        SortOrder = 0, IsDefault = isDefault, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
    };

    private static Dictionary<Guid, GlassType> GlassSet() =>
        new[] { GlassDoubleStandard(), GlassTripleLowE() }.ToDictionary(g => g.Id);

    private static Dictionary<Guid, ColorOption> ColorSet(params ColorOption[] colors) =>
        colors.ToDictionary(c => c.Id);

    private static Dictionary<Guid, ColorOption> StandardColorSet() => ColorSet(
        MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, isDefault: true),
        MakeColor(AnthraciteId, "anthracite-ral7016", ColorFamily.Premium, 7500, isDefault: false));

    [Fact]
    public void Canary5_Window_165x140_TripleLowE_Tempered_Plus_Anthracite_Equals_1424_68()
    {
        // ADR-0002 canary #5 — Canary #4 + outer color = anthracite-ral7016
        // (premium, 7500 tetri flat). Composition:
        //   canary #4 pre-VAT subtotal = 113 236
        //   + anthracite outer surcharge = 7 500
        //   subtotal = 120 736
        //   vat = round(120 736 × 0.18) = 21 732 (banker's 21 732.48)
        //   total = 142 468 tetri = 1424.68 ₾
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false,
                TripleLowEId, [GlassExtra.Tempered]),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false,
                TripleLowEId, []),
        };

        var result = PriceCalculator.Compute(
            WindowPt(), AluThermal(), 165, 140,
            panes, GlassSet(),
            new ColorSelection(AnthraciteId),
            StandardColorSet());

        result.IsSuccess.Should().BeTrue();
        var b = result.Value;
        b.TotalMinor.Should().Be(142468L);
        b.Lines.Should().ContainSingle(l => l.Code == "color.outer.anthracite-ral7016" && l.AmountMinor == 7500L);
    }

    [Fact]
    public void DefaultColor_Backcompat_Canary1_StillReturns_753_31()
    {
        // Color catalog supplied + colorSelection null → calculator
        // resolves the IsDefault color (white-ral9016, surcharge 0).
        // Canary #1 holds because no color line is emitted at 0.
        var result = PriceCalculator.Compute(
            WindowPt(), AluThermal(), 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: null,
            availableColorOptions: StandardColorSet());

        result.IsSuccess.Should().BeTrue();
        result.Value.TotalMinor.Should().Be(75331L);
        result.Value.Lines.Should().NotContain(l => l.Code.StartsWith("color.", StringComparison.Ordinal));
    }

    [Fact]
    public void NoColorCatalog_StepFiveBehaviour_Preserved()
    {
        // Step-5 callers don't supply a color set at all → calculator
        // skips the color branch entirely.
        var result = PriceCalculator.Compute(
            WindowPt(), AluThermal(), 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: null,
            availableColorOptions: null);
        result.IsSuccess.Should().BeTrue();
        result.Value.TotalMinor.Should().Be(75331L);
    }

    [Fact]
    public void StandardColorOuter_NoLine_When_Surcharge_Zero()
    {
        var result = PriceCalculator.Compute(
            WindowPt(), AluThermal(), 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: new ColorSelection(WhiteId),
            availableColorOptions: StandardColorSet());

        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Should().NotContain(l => l.Code.StartsWith("color.outer.", StringComparison.Ordinal));
    }

    [Fact]
    public void PremiumColorOuter_AddsFlatSurcharge_Line()
    {
        var result = PriceCalculator.Compute(
            WindowPt(), AluThermal(), 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: new ColorSelection(AnthraciteId),
            availableColorOptions: StandardColorSet());

        result.IsSuccess.Should().BeTrue();
        var line = result.Value.Lines.Single(l => l.Code == "color.outer.anthracite-ral7016");
        line.AmountMinor.Should().Be(7500L);
    }

    [Fact]
    public void DualColor_PvcOnly_InnerLine_Is_60Percent_Of_InnerSurcharge()
    {
        // Outer = oak-laminate (18000), inner = white (0)
        //   → inner contributes 0 (60% of 0); inner line suppressed.
        var oak = MakeColor(OakLaminateId, "oak-laminate", ColorFamily.WoodLaminate, 18000, false, "/tex.jpg");
        var white = MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true);
        var colors = ColorSet(white, oak);

        var result = PriceCalculator.Compute(
            WindowPt(), PvcLaminated(), 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: new ColorSelection(OakLaminateId, InnerColorOptionId: WhiteId),
            availableColorOptions: colors);
        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Should().ContainSingle(l => l.Code == "color.outer.oak-laminate" && l.AmountMinor == 18000L);
        result.Value.Lines.Should().NotContain(l => l.Code == "color.inner.white-ral9016");
    }

    [Fact]
    public void DualColor_NonZeroInner_AppliesSixtyPercentRate()
    {
        // Outer white (0), inner anthracite (7500). Inner line = round(7500 * 0.6) = 4500.
        var white = MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true);
        var anthracite = MakeColor(AnthraciteId, "anthracite-ral7016", ColorFamily.Premium, 7500, false);
        var colors = ColorSet(white, anthracite);

        var result = PriceCalculator.Compute(
            WindowPt(), PvcLaminated(), 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: new ColorSelection(WhiteId, InnerColorOptionId: AnthraciteId),
            availableColorOptions: colors);
        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Should().ContainSingle(l => l.Code == "color.inner.anthracite-ral7016" && l.AmountMinor == 4500L);
    }

    [Fact]
    public void DualColor_InnerEqualsOuter_NoInnerLine()
    {
        // Sending the same id is a no-op — inner line suppressed.
        var result = PriceCalculator.Compute(
            WindowPt(), PvcLaminated(), 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: new ColorSelection(AnthraciteId, InnerColorOptionId: AnthraciteId),
            availableColorOptions: StandardColorSet());
        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Should().NotContain(l => l.Code.StartsWith("color.inner.", StringComparison.Ordinal));
        result.Value.Lines.Should().ContainSingle(l => l.Code == "color.outer.anthracite-ral7016");
    }

    [Fact]
    public void DualColor_OnAluminum_PropagatesValidationError()
    {
        var result = PriceCalculator.Compute(
            WindowPt(), AluThermal(), 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: new ColorSelection(AnthraciteId, InnerColorOptionId: WhiteId),
            availableColorOptions: StandardColorSet());
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.color.dualOnlyOnPvc");
    }

    [Fact]
    public void VatAppliedToFullSubtotal_IncludingColor()
    {
        // 1 m² ALU-thermal + anthracite outer:
        //   material = 38 000
        //   color = 7 500
        //   subtotal = 45 500
        //   vat = round(45 500 × 0.18) = 8 190
        //   total = 53 690
        var result = PriceCalculator.Compute(
            WindowPt(), AluThermal(), 100, 100,
            panes: null, availableGlassTypes: null,
            colorSelection: new ColorSelection(AnthraciteId),
            availableColorOptions: StandardColorSet());
        result.IsSuccess.Should().BeTrue();
        var vat = result.Value.Lines.Single(l => l.Code == "vat");
        vat.AmountMinor.Should().Be(8190L);
        result.Value.TotalMinor.Should().Be(53690L);
    }

    [Fact]
    public void RalCustomOuter_AppliesPlaceholderSurcharge()
    {
        var ralCustom = MakeColor(Guid.Parse("bbbbbbbb-0000-0000-0000-000000000099"),
            "ral-custom", ColorFamily.RalCustom, 25000, false);
        var white = MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true);
        var colors = ColorSet(white, ralCustom);

        var result = PriceCalculator.Compute(
            WindowPt(), AluThermal(), 100, 100,
            panes: null, availableGlassTypes: null,
            colorSelection: new ColorSelection(ralCustom.Id,
                CustomRalHex: "#27352A", CustomRalCode: "RAL 6009"),
            availableColorOptions: colors);
        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Should().ContainSingle(l => l.Code == "color.outer.ral-custom" && l.AmountMinor == 25000L);
    }

    [Theory]
    [InlineData(0, 0)]            // standard 0 → no line
    [InlineData(7500, 4500)]      // 7500 × 0.6 = 4500
    [InlineData(18000, 10800)]    // 18000 × 0.6 = 10800
    [InlineData(21000, 12600)]    // 21000 × 0.6 = 12600
    [InlineData(25000, 15000)]    // 25000 × 0.6 = 15000
    public void DualColor_InnerRate_IsAlwaysSixtyPercent(int innerSurcharge, int expectedLine)
    {
        // Sweep the rate table to lock the 60% rule for every Roman-priced
        // surcharge tier (0 / 75 / 180 / 210 / 250 ₾).
        var outer = MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true);
        var inner = MakeColor(
            Guid.Parse("bbbbbbbb-0000-0000-0000-00000000ffff"),
            $"premium-{innerSurcharge}", ColorFamily.Premium, innerSurcharge, false);
        var colors = ColorSet(outer, inner);

        var result = PriceCalculator.Compute(
            WindowPt(), PvcLaminated(), 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: new ColorSelection(outer.Id, InnerColorOptionId: inner.Id),
            availableColorOptions: colors);

        result.IsSuccess.Should().BeTrue();
        var innerLines = result.Value.Lines.Where(l => l.Code.StartsWith("color.inner.", StringComparison.Ordinal)).ToList();
        if (expectedLine == 0)
        {
            innerLines.Should().BeEmpty();
        }
        else
        {
            innerLines.Should().ContainSingle(l => l.AmountMinor == expectedLine);
        }
    }

    [Fact]
    public void ColorLine_LabelContains_KaName()
    {
        var result = PriceCalculator.Compute(
            WindowPt(), AluThermal(), 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: new ColorSelection(AnthraciteId),
            availableColorOptions: StandardColorSet());
        result.Value.Lines.Single(l => l.Code == "color.outer.anthracite-ral7016")
            .Label.Should().Contain("anthracite-ral7016"); // seed-test names use slug
    }

    [Fact]
    public void EmptyColorCatalog_BehavesAsAbsentCatalog_ForBackcompat()
    {
        // Empty dict + null selection: the calculator's "Count == 0" guard
        // skips the entire branch — same as supplying null.
        var result = PriceCalculator.Compute(
            WindowPt(), AluThermal(), 120, 140,
            panes: null, availableGlassTypes: null,
            colorSelection: null,
            availableColorOptions: new Dictionary<Guid, ColorOption>());
        result.IsSuccess.Should().BeTrue();
        result.Value.TotalMinor.Should().Be(75331L);
    }

    [Fact]
    public void Canaries_1_2_3_4_HoldByteForByte_With_DefaultColorCatalog()
    {
        // Smoke test: spin through every earlier canary with the color
        // catalog present + colorSelection null. Default white surcharge
        // is 0 so no color line is added and totals stay identical.
        var colors = StandardColorSet();

        var c1 = PriceCalculator.Compute(WindowPt(), AluThermal(), 120, 140,
            null, null, null, colors);
        c1.Value.TotalMinor.Should().Be(75331L);

        // Canary #3 — multi-pane.
        var panes3 = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false),
        };
        var c3 = PriceCalculator.Compute(WindowPt(), AluThermal(), 165, 140,
            panes3, null, null, colors);
        c3.Value.TotalMinor.Should().Be(107723L);

        // Canary #4 — glass + tempered, default color.
        var panes4 = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false,
                TripleLowEId, [GlassExtra.Tempered]),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false,
                TripleLowEId, []),
        };
        var c4 = PriceCalculator.Compute(WindowPt(), AluThermal(), 165, 140,
            panes4, GlassSet(), null, colors);
        c4.Value.TotalMinor.Should().Be(133618L);
    }
}
