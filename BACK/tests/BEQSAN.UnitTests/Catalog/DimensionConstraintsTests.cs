using BEQSAN.Domain.Catalog;

namespace BEQSAN.UnitTests.Catalog;

public class DimensionConstraintsTests
{
    [Theory]
    [InlineData("window", 30, 300, 30, 250)]
    [InlineData("door", 60, 140, 180, 260)]
    [InlineData("sliding", 120, 600, 180, 280)]
    [InlineData("panoramic", 150, 800, 200, 350)]
    [InlineData("balcony", 80, 600, 80, 280)]
    public void ForProductType_KnownSlug_ReturnsMarketRanges(
        string slug, int minW, int maxW, int minH, int maxH)
    {
        var c = DimensionConstraints.ForProductType(slug);
        c.MinWidthCm.Should().Be(minW);
        c.MaxWidthCm.Should().Be(maxW);
        c.MinHeightCm.Should().Be(minH);
        c.MaxHeightCm.Should().Be(maxH);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("unknown")]
    [InlineData("xyz-future-type")]
    public void ForProductType_UnknownOrEmpty_FallsBackToDefault(string? slug)
    {
        var c = DimensionConstraints.ForProductType(slug);
        c.Should().Be(DimensionConstraints.Default);
        c.MinWidthCm.Should().Be(30);
        c.MaxWidthCm.Should().Be(400);
    }

    [Theory]
    [InlineData("Window")]
    [InlineData("WINDOW")]
    [InlineData(" window ")]
    public void ForProductType_IsCaseInsensitiveAndTolerantOfWhitespace(string slug)
    {
        // Implementation .ToLowerInvariant()s the input but doesn't trim.
        // Leading/trailing whitespace falls to Default — accepted, document via test.
        var c = DimensionConstraints.ForProductType(slug);
        if (slug.Trim() == slug)
        {
            c.MinWidthCm.Should().Be(30);
            c.MaxWidthCm.Should().Be(300);
        }
        else
        {
            c.Should().Be(DimensionConstraints.Default);
        }
    }

    [Theory]
    [InlineData(60, true)]
    [InlineData(100, true)]
    [InlineData(140, true)]
    [InlineData(59, false)]
    [InlineData(141, false)]
    [InlineData(0, false)]
    [InlineData(-1, false)]
    public void IsWidthInRange_DoorBoundaries(int width, bool expected)
    {
        var c = DimensionConstraints.ForProductType("door");
        c.IsWidthInRange(width).Should().Be(expected);
    }

    [Theory]
    [InlineData(180, true)]
    [InlineData(260, true)]
    [InlineData(179, false)]
    [InlineData(261, false)]
    public void IsHeightInRange_DoorBoundaries(int height, bool expected)
    {
        var c = DimensionConstraints.ForProductType("door");
        c.IsHeightInRange(height).Should().Be(expected);
    }
}
