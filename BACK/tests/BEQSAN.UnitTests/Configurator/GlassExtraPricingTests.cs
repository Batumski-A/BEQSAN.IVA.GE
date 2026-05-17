using BEQSAN.Domain.Configurator;

namespace BEQSAN.UnitTests.Configurator;

public class GlassExtraPricingTests
{
    [Theory]
    [InlineData(GlassExtra.LowECoating, 4500)]
    [InlineData(GlassExtra.Tempered, 7000)]
    [InlineData(GlassExtra.Frosted, 3500)]
    [InlineData(GlassExtra.Tinted, 4000)]
    public void SurchargeMinor_MatchesRomanLockedRates(GlassExtra extra, int expected)
    {
        GlassExtraPricing.SurchargeMinor(extra).Should().Be(expected);
    }

    [Fact]
    public void SurchargeMinor_AllExtras_AreNonNegative()
    {
        foreach (GlassExtra e in Enum.GetValues(typeof(GlassExtra)))
        {
            GlassExtraPricing.SurchargeMinor(e).Should().BeGreaterThanOrEqualTo(0);
        }
    }

    [Fact]
    public void SurchargeMinor_IsDeterministic()
    {
        // Same input twice → same output. Belt-and-braces guard against
        // someone introducing time-of-day or random behaviour into the
        // rate lookup.
        var first = GlassExtraPricing.SurchargeMinor(GlassExtra.Tempered);
        var second = GlassExtraPricing.SurchargeMinor(GlassExtra.Tempered);
        first.Should().Be(second);
    }

    [Fact]
    public void SurchargeMinor_UnknownEnum_ReturnsZero()
    {
        // Cast an out-of-range int to the enum; the switch falls through.
        var weird = (GlassExtra)999;
        GlassExtraPricing.SurchargeMinor(weird).Should().Be(0);
    }
}
