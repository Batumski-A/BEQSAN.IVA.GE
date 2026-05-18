using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Configurator;

/// <summary>
/// Step-8 domain-level tests — installation pricing table, lead-time
/// estimator, warranty estimator. Three small classes folded into one
/// file because each is a tight invariants surface.
/// </summary>
public class InstallationPricingTests
{
    [Theory]
    [InlineData(InstallationRegion.Batumi, 0)]
    [InlineData(InstallationRegion.KobuletiCoast, 10_000)]
    [InlineData(InstallationRegion.Guria, 15_000)]
    [InlineData(InstallationRegion.Imereti, 22_000)]
    [InlineData(InstallationRegion.Samegrelo, 28_000)]
    [InlineData(InstallationRegion.EastGeorgia, 40_000)]
    [InlineData(InstallationRegion.Other, 0)]
    public void SurchargeMinor_MatchesRomanLockedTable(InstallationRegion region, int expected)
    {
        InstallationPricing.SurchargeMinor(region).Should().Be(expected);
    }

    [Theory]
    [InlineData(InstallationRegion.Batumi, false)]
    [InlineData(InstallationRegion.Imereti, false)]
    [InlineData(InstallationRegion.Other, true)]
    public void RequiresManualQuote_OnlyForOther(InstallationRegion region, bool expected)
    {
        InstallationPricing.RequiresManualQuote(region).Should().Be(expected);
    }

    [Fact]
    public void SurchargeMinor_AllRegionsAreNonNegative()
    {
        foreach (InstallationRegion r in Enum.GetValues<InstallationRegion>())
        {
            InstallationPricing.SurchargeMinor(r).Should().BeGreaterThanOrEqualTo(0);
        }
    }
}

public class LeadTimeEstimatorTests
{
    private static ProductType WindowPt(int min = 10, int max = 14) => new()
    {
        Id = Guid.NewGuid(),
        Slug = "window",
        Name = LocalizedText.Create("ფანჯარა").Value,
        ShortDescription = LocalizedText.Create("...").Value,
        HeroImageUrl = string.Empty,
        SortOrder = 1, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
        MinWidthCm = 30, MaxWidthCm = 300, MinHeightCm = 30, MaxHeightCm = 250,
        WarrantyMonths = 36, LeadTimeDaysMin = min, LeadTimeDaysMax = max,
    };

    private static IReadOnlyList<ConfigurationPane> Panes(int n) =>
        Enumerable.Range(1, n)
            .Select(i => new ConfigurationPane(i, 1.0m / n, PaneOpeningType.Fixed, null, false))
            .ToList();

    [Fact]
    public void SinglePane_Batumi_BaselineWindow()
    {
        var e = LeadTimeEstimator.Estimate(WindowPt(), Panes(1),
            hasBlind: false, hasSmartLock: false, region: InstallationRegion.Batumi);
        e.ProductionDaysMin.Should().Be(10);
        e.ProductionDaysMax.Should().Be(14);
        e.InstallationDays.Should().Be(1);
        e.TotalDaysMin.Should().Be(11);
        e.TotalDaysMax.Should().Be(15);
    }

    [Theory]
    [InlineData(1, 0, 0)]
    [InlineData(2, 1, 2)]
    [InlineData(3, 3, 4)]
    [InlineData(4, 5, 6)]
    [InlineData(5, 5, 6)]
    public void PaneCount_ScalesProductionWindow(int count, int extraMin, int extraMax)
    {
        var e = LeadTimeEstimator.Estimate(WindowPt(), Panes(count),
            hasBlind: false, hasSmartLock: false, region: InstallationRegion.Batumi);
        e.ProductionDaysMin.Should().Be(10 + extraMin);
        e.ProductionDaysMax.Should().Be(14 + extraMax);
    }

    [Fact]
    public void Blind_Adds_2to3_Days()
    {
        var e = LeadTimeEstimator.Estimate(WindowPt(), Panes(1),
            hasBlind: true, hasSmartLock: false, region: InstallationRegion.Batumi);
        e.ProductionDaysMin.Should().Be(12);
        e.ProductionDaysMax.Should().Be(17);
    }

    [Fact]
    public void SmartLock_Adds_3to5_Days()
    {
        var e = LeadTimeEstimator.Estimate(WindowPt(), Panes(1),
            hasBlind: false, hasSmartLock: true, region: InstallationRegion.Batumi);
        e.ProductionDaysMin.Should().Be(13);
        e.ProductionDaysMax.Should().Be(19);
    }

    [Theory]
    [InlineData(InstallationRegion.Batumi, 1)]
    [InlineData(InstallationRegion.KobuletiCoast, 2)]
    [InlineData(InstallationRegion.Guria, 2)]
    [InlineData(InstallationRegion.Imereti, 3)]
    [InlineData(InstallationRegion.Samegrelo, 3)]
    [InlineData(InstallationRegion.EastGeorgia, 4)]
    [InlineData(InstallationRegion.Other, 2)]
    public void Region_DrivesInstallationDays(InstallationRegion region, int expected)
    {
        var e = LeadTimeEstimator.Estimate(WindowPt(), Panes(1),
            hasBlind: false, hasSmartLock: false, region: region);
        e.InstallationDays.Should().Be(expected);
    }

    [Fact]
    public void TotalDays_IsAlwaysSumOfProductionAndInstall()
    {
        var e = LeadTimeEstimator.Estimate(WindowPt(), Panes(3),
            hasBlind: true, hasSmartLock: true, region: InstallationRegion.Imereti);
        e.TotalDaysMin.Should().Be(e.ProductionDaysMin + e.InstallationDays);
        e.TotalDaysMax.Should().Be(e.ProductionDaysMax + e.InstallationDays);
    }

    [Fact]
    public void Canary6_WindowConfig_ProducesExpectedLeadTime()
    {
        // Canary #6: 2-pane window Batumi (just to lock the formula
        // against the spec example).
        var e = LeadTimeEstimator.Estimate(WindowPt(), Panes(2),
            hasBlind: true, hasSmartLock: false, region: InstallationRegion.Imereti);
        // base 10-14 + paneFactor 1/2 + blind 2/3 + install 3 (Imereti)
        e.ProductionDaysMin.Should().Be(13); // 10 + 1 + 2
        e.ProductionDaysMax.Should().Be(19); // 14 + 2 + 3
        e.InstallationDays.Should().Be(3);
        e.TotalDaysMin.Should().Be(16);
        e.TotalDaysMax.Should().Be(22);
    }

    [Fact]
    public void EmptyPanes_TreatedAsSingle()
    {
        var e = LeadTimeEstimator.Estimate(WindowPt(), [],
            hasBlind: false, hasSmartLock: false, region: InstallationRegion.Batumi);
        e.ProductionDaysMin.Should().Be(10);
        e.ProductionDaysMax.Should().Be(14);
    }
}

public class WarrantyEstimatorTests
{
    private static ProductType Pt(int warranty) => new()
    {
        Id = Guid.NewGuid(),
        Slug = "window",
        Name = LocalizedText.Create("...").Value,
        ShortDescription = LocalizedText.Create("...").Value,
        HeroImageUrl = string.Empty,
        SortOrder = 1, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
        MinWidthCm = 30, MaxWidthCm = 300, MinHeightCm = 30, MaxHeightCm = 250,
        WarrantyMonths = warranty,
    };

    [Theory]
    [InlineData(24)]
    [InlineData(36)]
    [InlineData(60)]
    public void For_BaseFromProductType(int months)
    {
        var w = WarrantyEstimator.For(Pt(months), hasSmartLock: false);
        w.Months.Should().Be(months);
        w.Notes.Should().BeEmpty();
    }

    [Fact]
    public void For_WithSmartLock_AttachesVendorNote()
    {
        var w = WarrantyEstimator.For(Pt(36), hasSmartLock: true);
        w.Months.Should().Be(36);
        w.Notes.Should().Contain("smart-lock.vendor.24mo");
    }

    [Fact]
    public void SmartLockVendorWarrantyMonths_Constant_Is24()
    {
        WarrantyEstimator.SmartLockVendorWarrantyMonths.Should().Be(24);
    }
}
