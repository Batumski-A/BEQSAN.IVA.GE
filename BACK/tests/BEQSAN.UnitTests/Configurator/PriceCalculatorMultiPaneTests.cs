using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Configurator;

/// <summary>
/// Multi-pane pricing tests. The original PriceCalculatorTests covered the
/// single-fixed-pane default + ADR-0002 canary #1 (753.31) and canary #2
/// (832.61); this file owns the panes-aware behaviour and locks ADR-0002
/// canary #3.
/// </summary>
public class PriceCalculatorMultiPaneTests
{
    private static readonly Guid WindowId = Guid.Parse("66242680-01f2-125b-a8db-02681c98c0b9");

    private static ProductType WindowPt() =>
        new()
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

    private static Material AluThermal(int priceMinor = 38000) =>
        Material.Create(
            productTypeId: WindowId,
            slug: "aluminum-thermal",
            name: LocalizedText.Create("ალუმინი თერმო").Value,
            shortDescription: LocalizedText.Create("...").Value,
            family: MaterialFamily.Aluminum,
            thermalRating: ThermalRating.Thermal,
            basePricePerSqmMinor: priceMinor,
            currency: Currency.Gel,
            sortOrder: 1).Value;

    [Fact]
    public void NullPanes_FallsBackToSingleFixed_PreservesCanary1()
    {
        // Window 120×140 aluminum-thermal — ADR-0002 canary #1 = 753.31 ₾
        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 120, 140, panes: null);

        result.IsSuccess.Should().BeTrue();
        result.Value.TotalMinor.Should().Be(75331L);
        // Only material + vat lines — single Fixed pane contributes zero surcharge.
        result.Value.Lines.Should().HaveCount(2);
        result.Value.Lines[0].Code.Should().Be("material");
        result.Value.Lines[1].Code.Should().Be("vat");
    }

    [Fact]
    public void EmptyPanesArray_AlsoFallsBackToSingleFixed()
    {
        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 120, 140, Array.Empty<ConfigurationPane>());
        result.IsSuccess.Should().BeTrue();
        result.Value.TotalMinor.Should().Be(75331L);
    }

    [Fact]
    public void Canary3_Window_165x140_AluThermal_TwoPaneCasementFixed_Equals_1077_23()
    {
        // ADR-0002 canary #3 — Step 4 regression lock.
        //   area  = 165 × 140 / 10000 = 2.31 m²
        //   mat   = 2.31 × 38000 = 87 780 tetri = 877.80 ₾
        //   pane1 (Casement 0.5):
        //       area_p1 = 2.31 × 0.5 = 1.155 m²
        //       mat_p1  = 1.155 × 38000 = 43 890
        //       surch   = 43 890 × 0.08 = 3 511.2 → 3 511 (banker's)
        //   pane2 (Fixed 0.5): no surcharge
        //   subtotal = 87 780 + 3 511 = 91 291
        //   vat       = 91 291 × 0.18 = 16 432.38 → 16 432 (banker's)
        //   total    = 91 291 + 16 432 = 107 723 tetri = 1 077.23 ₾
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false),
        };
        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 165, 140, panes);

        result.IsSuccess.Should().BeTrue();
        var b = result.Value;

        b.AreaSqm.Should().Be(2.31m);
        // Material 87780, casement-pane-1 surcharge 3511, vat on subtotal 16432, total 107723
        b.Lines.Should().HaveCount(3);
        b.Lines[0].Code.Should().Be("material");
        b.Lines[0].AmountMinor.Should().Be(87780L);
        b.Lines[1].Code.Should().Be("pane.1.opening.casement");
        b.Lines[1].AmountMinor.Should().Be(3511L);
        b.Lines[2].Code.Should().Be("vat");
        b.Lines[2].AmountMinor.Should().Be(16432L);
        b.TotalMinor.Should().Be(107723L);
    }

    [Theory]
    [InlineData(PaneOpeningType.Fixed, 0.00, 0L)]
    [InlineData(PaneOpeningType.Casement, 0.08, 3040L)]   // 38000 × 1.0 × 0.08
    [InlineData(PaneOpeningType.Tilt, 0.10, 3800L)]
    [InlineData(PaneOpeningType.TiltAndTurn, 0.18, 6840L)]
    public void SinglePaneFullWidth_AppliesOpeningSurcharge(
        PaneOpeningType type, decimal rate, long expectedSurchargeMinor)
    {
        // 100×100 window, 1 pane full-width with the given opening type.
        var hinge = type is PaneOpeningType.Casement or PaneOpeningType.TiltAndTurn
            ? HingeSide.Right
            : (HingeSide?)null;
        var panes = new[] { new ConfigurationPane(1, 1.0m, type, hinge, false) };

        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 100, 100, panes);

        result.IsSuccess.Should().BeTrue();
        PriceCalculator.SurchargeRate(type).Should().Be(rate);
        if (expectedSurchargeMinor == 0)
        {
            // No surcharge line at all when the line would have been 0.
            result.Value.Lines.Should().Contain(l => l.Code == "material");
            result.Value.Lines.Should().NotContain(l => l.Code.StartsWith("pane."));
        }
        else
        {
            result.Value.Lines.Should().Contain(l =>
                l.Code == $"pane.1.opening.{type.ToString().ToLowerInvariant()}"
                && l.AmountMinor == expectedSurchargeMinor);
        }
    }

    [Fact]
    public void MosquitoNet_AddsFlatLine_PerOptedInPane()
    {
        // 1×1 m window, 2 panes Fixed, both with mosquito net → 2 × 8000 = 16000 tetri
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Fixed, null, true),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, true),
        };
        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 100, 100, panes);

        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Should().Contain(l => l.Code == "accessory.mosquito" && l.AmountMinor == 16000L);
    }

    [Fact]
    public void MixedLayout_3Pane_CasementFixedCasement_LinesIncludeBothCasements()
    {
        // 150×140 cm window, 3 panes: 0.4/0.2/0.4 — Casement-Right, Fixed, Casement-Left
        var panes = new[]
        {
            new ConfigurationPane(1, 0.4m, PaneOpeningType.Casement, HingeSide.Right, false),
            new ConfigurationPane(2, 0.2m, PaneOpeningType.Fixed, null, false),
            new ConfigurationPane(3, 0.4m, PaneOpeningType.Casement, HingeSide.Left, false),
        };
        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 150, 140, panes);

        result.IsSuccess.Should().BeTrue();
        var lines = result.Value.Lines;
        lines.Should().Contain(l => l.Code == "pane.1.opening.casement");
        lines.Should().Contain(l => l.Code == "pane.3.opening.casement");
        lines.Should().NotContain(l => l.Code == "pane.2.opening.fixed"); // Fixed never emits a line
    }

    [Fact]
    public void InvalidLayout_PropagatesError_FromLayoutValidator()
    {
        // Casement pane missing hinge → LayoutValidator says hingeRequired.
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Casement, null, false),
        };
        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 120, 140, panes);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.layout.pane.hingeRequired");
        result.Error.Metadata!["position"].Should().Be(1);
    }

    [Fact]
    public void DimensionOutOfRange_BeatsLayout_InErrorPriority()
    {
        // 10 cm wide window — dimensions check fires before layout.
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, null, false), // also invalid
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false),
        };
        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 10, 140, panes);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.dimensions.widthOutOfRange");
    }

    [Fact]
    public void TwoCasementPanes_DifferentWidthRatios_SurchargeProportional()
    {
        // 200×100 cm window, 0.3/0.7 split, both Casement.
        //   area     = 2.00 m²
        //   p1 area  = 0.60 m², mat 22 800, surch 1 824
        //   p2 area  = 1.40 m², mat 53 200, surch 4 256
        var panes = new[]
        {
            new ConfigurationPane(1, 0.3m, PaneOpeningType.Casement, HingeSide.Left, false),
            new ConfigurationPane(2, 0.7m, PaneOpeningType.Casement, HingeSide.Right, false),
        };
        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 200, 100, panes);

        result.IsSuccess.Should().BeTrue();
        result.Value.Lines.Should().Contain(l => l.Code == "pane.1.opening.casement" && l.AmountMinor == 1824L);
        result.Value.Lines.Should().Contain(l => l.Code == "pane.2.opening.casement" && l.AmountMinor == 4256L);
    }

    [Fact]
    public void VatComputed_OnSubtotal_NotOnMaterialAlone()
    {
        // Single Casement pane lets us check VAT includes the surcharge.
        //   100×100 = 1 m², mat 38 000, surch 38 000 × 0.08 = 3 040
        //   subtotal 41 040, vat 41 040 × 0.18 = 7 387.2 → 7 387 (banker's)
        //   total 48 427
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Casement, HingeSide.Right, false),
        };
        var result = PriceCalculator.Compute(WindowPt(), AluThermal(), 100, 100, panes);

        result.IsSuccess.Should().BeTrue();
        var vatLine = result.Value.Lines.Single(l => l.Code == "vat");
        vatLine.AmountMinor.Should().Be(7387L);
        result.Value.TotalMinor.Should().Be(48427L);
    }
}
