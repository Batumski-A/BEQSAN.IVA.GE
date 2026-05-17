using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Configurator;

public class LayoutValidatorTests
{
    private static ProductType Pt(string slug) =>
        new()
        {
            Id = Guid.NewGuid(),
            Slug = slug,
            Name = LocalizedText.Create(slug).Value,
            ShortDescription = LocalizedText.Create("...").Value,
            HeroImageUrl = string.Empty,
            SortOrder = 1,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            MinWidthCm = 30,
            MaxWidthCm = 400,
            MinHeightCm = 30,
            MaxHeightCm = 400,
        };

    private static ConfigurationPane SingleFixed() =>
        new(1, 1.0m, PaneOpeningType.Fixed, null, false);

    [Fact]
    public void SinglePane_FullWidth_Fixed_IsValid()
    {
        var result = LayoutValidator.Validate(Pt("window"), [SingleFixed()]);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void TwoPanes_CasementRight_PlusFixed_IsValid()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false),
        };
        LayoutValidator.Validate(Pt("window"), panes).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void NullProductType_ReturnsProductTypeNotFound()
    {
        var result = LayoutValidator.Validate(productType: null!, [SingleFixed()]);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("productType.notFound");
    }

    [Fact]
    public void EmptyPanes_ReturnsPanesRequired()
    {
        var result = LayoutValidator.Validate(Pt("window"), Array.Empty<ConfigurationPane>());
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.layout.panesRequired");
    }

    [Theory]
    [InlineData("window", 1, true)]   // window 1..4
    [InlineData("window", 4, true)]
    [InlineData("window", 5, false)]
    [InlineData("door", 1, true)]     // door 1..2
    [InlineData("door", 2, true)]
    [InlineData("door", 3, false)]
    [InlineData("sliding", 2, true)]  // sliding 2..4
    [InlineData("sliding", 1, false)]
    [InlineData("sliding", 5, false)]
    [InlineData("panoramic", 6, true)] // panoramic 1..6
    [InlineData("panoramic", 7, false)]
    [InlineData("balcony", 8, true)]   // balcony 1..8
    [InlineData("balcony", 9, false)]
    public void PaneCount_RespectsSlugRanges(string slug, int count, bool expectSuccess)
    {
        // Build N equal-ratio panes. Slug-specific opening choice avoids tripping
        // other rules before we hit the pane-count one:
        //   sliding: all Sliding (the only legal non-Fixed opening there)
        //   door:    first pane Casement-Left, rest Fixed — door's at-most-1-Fixed rule
        //            tolerates exactly 1 Fixed alongside other openings.
        //   others:  all Fixed.
        var ratio = decimal.Round(1.0m / count, 4, MidpointRounding.ToEven);
        var panes = Enumerable.Range(1, count)
            .Select(i => new ConfigurationPane(
                Position: i,
                WidthRatio: i == count ? 1.0m - ratio * (count - 1) : ratio,
                OpeningType: OpeningFor(slug, i),
                HingeSide: OpeningFor(slug, i) is PaneOpeningType.Casement or PaneOpeningType.TiltAndTurn
                    ? HingeSide.Left
                    : null,
                HasMosquitoNet: false))
            .ToList();

        static PaneOpeningType OpeningFor(string slug, int index) => slug switch
        {
            "sliding" => PaneOpeningType.Sliding,
            "door" => index == 1 ? PaneOpeningType.Casement : PaneOpeningType.Fixed,
            _ => PaneOpeningType.Fixed,
        };

        var result = LayoutValidator.Validate(Pt(slug), panes);

        if (expectSuccess)
        {
            result.IsSuccess.Should().BeTrue();
        }
        else
        {
            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("configurator.layout.paneCount");
            result.Error.Metadata.Should().NotBeNull();
            result.Error.Metadata!["actual"].Should().Be(count);
        }
    }

    [Fact]
    public void WidthRatioSum_NotOne_ReturnsRatioError_WithMetadata()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Fixed, null, false),
            new ConfigurationPane(2, 0.3m, PaneOpeningType.Fixed, null, false),
            // Σ = 0.8
        };
        var result = LayoutValidator.Validate(Pt("window"), panes);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.layout.widthRatioSum");
        result.Error.Metadata!["expected"].Should().Be("1.000");
        result.Error.Metadata["actual"].Should().Be("0.800");
    }

    [Fact]
    public void WidthRatioSum_WithinTolerance_IsAccepted()
    {
        // 0.333 + 0.333 + 0.334 = 1.000 — exact at 3dp
        var panes = new[]
        {
            new ConfigurationPane(1, 0.333m, PaneOpeningType.Fixed, null, false),
            new ConfigurationPane(2, 0.333m, PaneOpeningType.Fixed, null, false),
            new ConfigurationPane(3, 0.334m, PaneOpeningType.Fixed, null, false),
        };
        LayoutValidator.Validate(Pt("window"), panes).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Positions_GapOrDuplicate_ReturnsPositionsError()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Fixed, null, false),
            new ConfigurationPane(3, 0.5m, PaneOpeningType.Fixed, null, false), // gap
        };
        LayoutValidator.Validate(Pt("window"), panes).Error.Code.Should().Be("configurator.layout.positions");
    }

    [Fact]
    public void Door_WithTwoFixedPanes_TooManyFixed()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Fixed, null, false),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false),
        };
        var result = LayoutValidator.Validate(Pt("door"), panes);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.layout.door.tooManyFixed");
    }

    [Fact]
    public void Door_WithOneFixedOneCasement_IsValid()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false),
        };
        LayoutValidator.Validate(Pt("door"), panes).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Sliding_WithCasementPane_InvalidOpening()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Sliding, null, false),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Casement, HingeSide.Right, false),
        };
        var result = LayoutValidator.Validate(Pt("sliding"), panes);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.layout.sliding.invalidOpening");
        result.Error.Metadata!["position"].Should().Be(2);
        result.Error.Metadata["got"].Should().Be("casement");
    }

    [Theory]
    [InlineData(PaneOpeningType.Casement, true)]
    [InlineData(PaneOpeningType.TiltAndTurn, true)]
    [InlineData(PaneOpeningType.Fixed, false)]
    [InlineData(PaneOpeningType.Tilt, false)]
    [InlineData(PaneOpeningType.Sliding, false)]
    public void HingeRequirement_MatchesOpeningType(PaneOpeningType type, bool hingeNeeded)
    {
        // 2-pane balcony so Sliding stays legal under sliding rule (balcony allows any opening)
        var slug = type == PaneOpeningType.Sliding ? "balcony" : "window";
        var panesNoHinge = new[]
        {
            new ConfigurationPane(1, 0.5m, type, null, false),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false),
        };

        var result = LayoutValidator.Validate(Pt(slug), panesNoHinge);
        if (hingeNeeded)
        {
            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("configurator.layout.pane.hingeRequired");
            result.Error.Metadata!["position"].Should().Be(1);
        }
        else
        {
            result.IsSuccess.Should().BeTrue();
        }
    }

    [Theory]
    [InlineData(PaneOpeningType.Fixed)]
    [InlineData(PaneOpeningType.Tilt)]
    public void HingeForbidden_OnNonHingedOpening_ReturnsError(PaneOpeningType type)
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, type, HingeSide.Left, false),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false),
        };
        var result = LayoutValidator.Validate(Pt("window"), panes);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.layout.pane.hingeForbidden");
    }

    [Fact]
    public void PaneCountRange_ReturnsExpectedTuples()
    {
        LayoutValidator.PaneCountRange("window").Should().Be((1, 4));
        LayoutValidator.PaneCountRange("door").Should().Be((1, 2));
        LayoutValidator.PaneCountRange("sliding").Should().Be((2, 4));
        LayoutValidator.PaneCountRange("panoramic").Should().Be((1, 6));
        LayoutValidator.PaneCountRange("balcony").Should().Be((1, 8));
        LayoutValidator.PaneCountRange("unknown").Should().Be((1, 4));
        LayoutValidator.PaneCountRange(null).Should().Be((1, 4));
    }
}
