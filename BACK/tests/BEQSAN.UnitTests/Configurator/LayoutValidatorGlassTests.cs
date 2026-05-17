using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Configurator;

/// <summary>
/// Step-5 layout rules — glass compatibility against the per-material allow
/// list + Frosted/Tinted conflict per pane. The Step-4 LayoutValidatorTests
/// file owns the count / ratio / hinge tests.
/// </summary>
public class LayoutValidatorGlassTests
{
    private static readonly Guid DoubleStandardId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
    private static readonly Guid TripleLowEId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000003");
    private static readonly Guid UnknownGlassId = Guid.Parse("99999999-9999-9999-9999-999999999999");

    private static ProductType Pt(string slug) => new()
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

    private static GlassType MakeGlass(Guid id, string slug, bool isDefault, int surcharge) => new()
    {
        Id = id,
        Slug = slug,
        Name = LocalizedText.Create(slug).Value,
        ShortDescription = LocalizedText.Create("...").Value,
        PaneCount = 2,
        SurchargePerSqmMinor = surcharge,
        Currency = Currency.Gel,
        UValue = 2.0m,
        SortOrder = 0,
        IsDefault = isDefault,
        IsActive = true,
        CreatedAtUtc = DateTime.UtcNow,
    };

    private static Dictionary<Guid, GlassType> GlassSet(params GlassType[] gs) =>
        gs.ToDictionary(g => g.Id);

    [Fact]
    public void NoGlassSet_SkipsAllGlassChecks_StepFourBehaviour()
    {
        // Pane with Guid.Empty glass id would normally trip GlassRequired,
        // but the absent set means Step-4 behaviour — no glass enforcement.
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false),
        };

        var result = LayoutValidator.Validate(Pt("window"), panes, availableGlassTypes: null);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void PaneWithUnknownGlass_ReturnsNotCompatible_WithPosition()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                UnknownGlassId, []),
        };
        var glassSet = GlassSet(MakeGlass(DoubleStandardId, "double-standard", isDefault: true, surcharge: 0));

        var result = LayoutValidator.Validate(Pt("window"), panes, glassSet);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.glass.notCompatibleWithMaterial");
        result.Error.Metadata!["position"].Should().Be(1);
    }

    [Fact]
    public void PaneWithEmptyGlassId_ReturnsGlassRequired()
    {
        // Reaches the validator with Guid.Empty (handler didn't resolve
        // the default for some reason). Defensive — never expected in
        // production but the validator should not silently accept it.
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                Guid.Empty, []),
        };
        var glassSet = GlassSet(MakeGlass(DoubleStandardId, "double-standard", isDefault: true, surcharge: 0));

        var result = LayoutValidator.Validate(Pt("window"), panes, glassSet);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.glass.required");
        result.Error.Metadata!["position"].Should().Be(1);
    }

    [Fact]
    public void FrostedAndTinted_OnSamePane_ReturnsConflict_WithPosition()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId, [GlassExtra.Frosted, GlassExtra.Tinted]),
        };
        var glassSet = GlassSet(MakeGlass(DoubleStandardId, "double-standard", isDefault: true, surcharge: 0));

        var result = LayoutValidator.Validate(Pt("window"), panes, glassSet);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.glass.frostedTintedConflict");
        result.Error.Metadata!["position"].Should().Be(1);
    }

    [Fact]
    public void FrostedAlone_IsValid()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId, [GlassExtra.Frosted]),
        };
        var glassSet = GlassSet(MakeGlass(DoubleStandardId, "double-standard", isDefault: true, surcharge: 0));

        LayoutValidator.Validate(Pt("window"), panes, glassSet).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void TintedAlone_IsValid()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId, [GlassExtra.Tinted]),
        };
        var glassSet = GlassSet(MakeGlass(DoubleStandardId, "double-standard", isDefault: true, surcharge: 0));

        LayoutValidator.Validate(Pt("window"), panes, glassSet).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void MixedGlass_PaneOneOnePackage_PaneTwoAnother_IsValid()
    {
        // Bathroom-style — pane 1 frosted, pane 2 clear. Both in compat set.
        var panes = new[]
        {
            new ConfigurationPane(1, 0.5m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId, [GlassExtra.Frosted]),
            new ConfigurationPane(2, 0.5m, PaneOpeningType.Fixed, null, false,
                TripleLowEId, []),
        };
        var glassSet = GlassSet(
            MakeGlass(DoubleStandardId, "double-standard", isDefault: true, surcharge: 0),
            MakeGlass(TripleLowEId, "triple-low-e", isDefault: false, surcharge: 6000));

        LayoutValidator.Validate(Pt("window"), panes, glassSet).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void MultipleNonHingeExtras_AreCompatible()
    {
        // Low-E + Tempered stack happily — both energy/safety, no visual
        // conflict like Frosted+Tinted.
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId, [GlassExtra.LowECoating, GlassExtra.Tempered]),
        };
        var glassSet = GlassSet(MakeGlass(DoubleStandardId, "double-standard", isDefault: true, surcharge: 0));

        LayoutValidator.Validate(Pt("window"), panes, glassSet).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void EmptyExtrasList_IsValid()
    {
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId, []),
        };
        var glassSet = GlassSet(MakeGlass(DoubleStandardId, "double-standard", isDefault: true, surcharge: 0));

        LayoutValidator.Validate(Pt("window"), panes, glassSet).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void NullExtras_NormalisedToEmpty_IsValid()
    {
        // 5-arg legacy constructor leaves the GlassExtras nullable underlying
        // value at null; Extras accessor coalesces.
        var panes = new[]
        {
            new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false,
                DoubleStandardId), // 6-arg ctor — GlassExtras param defaults null
        };
        var glassSet = GlassSet(MakeGlass(DoubleStandardId, "double-standard", isDefault: true, surcharge: 0));

        LayoutValidator.Validate(Pt("window"), panes, glassSet).IsSuccess.Should().BeTrue();
    }
}
