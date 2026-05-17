using BEQSAN.Domain.Configurator;

namespace BEQSAN.UnitTests.Configurator;

public class ConfigurationPaneTests
{
    [Fact]
    public void Construction_AssignsAllFields()
    {
        var p = new ConfigurationPane(
            Position: 1,
            WidthRatio: 0.5m,
            OpeningType: PaneOpeningType.Casement,
            HingeSide: HingeSide.Right,
            HasMosquitoNet: false);

        p.Position.Should().Be(1);
        p.WidthRatio.Should().Be(0.5m);
        p.OpeningType.Should().Be(PaneOpeningType.Casement);
        p.HingeSide.Should().Be(HingeSide.Right);
        p.HasMosquitoNet.Should().BeFalse();
    }

    [Fact]
    public void EqualityIsValueBased()
    {
        var a = new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false);
        var b = new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false);

        a.Should().Be(b);
        a.GetHashCode().Should().Be(b.GetHashCode());
        (a == b).Should().BeTrue();
    }

    [Fact]
    public void DifferingFields_BreakEquality()
    {
        var baseline = new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false);

        baseline.Should().NotBe(baseline with { Position = 2 });
        baseline.Should().NotBe(baseline with { WidthRatio = 0.4m });
        baseline.Should().NotBe(baseline with { OpeningType = PaneOpeningType.Tilt });
        baseline.Should().NotBe(baseline with { HingeSide = HingeSide.Left });
        baseline.Should().NotBe(baseline with { HasMosquitoNet = true });
    }

    [Fact]
    public void FixedPane_HingeSideNull_IsValid()
    {
        var p = new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, HingeSide: null, HasMosquitoNet: false);
        p.HingeSide.Should().BeNull();
        // Validation that Fixed must not have a hinge lives in LayoutValidator, not in the record.
    }

    [Fact]
    public void WithExpression_AllowsImmutableUpdate()
    {
        var p = new ConfigurationPane(1, 0.5m, PaneOpeningType.Fixed, null, false);
        var upgraded = p with { OpeningType = PaneOpeningType.Casement, HingeSide = HingeSide.Left };

        upgraded.Position.Should().Be(1);
        upgraded.OpeningType.Should().Be(PaneOpeningType.Casement);
        upgraded.HingeSide.Should().Be(HingeSide.Left);
        p.OpeningType.Should().Be(PaneOpeningType.Fixed); // original unchanged
    }
}
