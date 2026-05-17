using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Configurator;

/// <summary>
/// Step-6 layout rules — color compatibility against the per-material allow
/// list, dual-color PVC-only, and RAL Custom hex+code validation.
/// </summary>
public class LayoutValidatorColorTests
{
    private static readonly Guid WhiteId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
    private static readonly Guid AnthraciteId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
    private static readonly Guid OakId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000003");
    private static readonly Guid RalCustomId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000099");
    private static readonly Guid UnknownColorId = Guid.Parse("99999999-9999-9999-9999-999999999999");

    private static ProductType WindowPt() => new()
    {
        Id = Guid.NewGuid(),
        Slug = "window",
        Name = LocalizedText.Create("window").Value,
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

    private static Material AluThermal(Guid productTypeId) => Material.Create(
        productTypeId: productTypeId, slug: "aluminum-thermal",
        name: LocalizedText.Create("ალუმინი თერმო").Value,
        shortDescription: LocalizedText.Create("...").Value,
        family: MaterialFamily.Aluminum, thermalRating: ThermalRating.Thermal,
        basePricePerSqmMinor: 38000, currency: Currency.Gel, sortOrder: 1).Value;

    private static Material PvcLaminated(Guid productTypeId) => Material.Create(
        productTypeId: productTypeId, slug: "pvc-laminated",
        name: LocalizedText.Create("PVC ლამინირებული").Value,
        shortDescription: LocalizedText.Create("...").Value,
        family: MaterialFamily.Pvc, thermalRating: ThermalRating.Thermal,
        basePricePerSqmMinor: 24000, currency: Currency.Gel, sortOrder: 1).Value;

    private static ColorOption MakeColor(Guid id, string slug, ColorFamily family, int surcharge, bool isDefault) => new()
    {
        Id = id, Slug = slug, Family = family,
        Name = LocalizedText.Create(slug).Value,
        ShortDescription = LocalizedText.Create("...").Value,
        HexCode = "#F4F4F4", RalCode = "RAL 9016",
        WoodTextureUrl = family == ColorFamily.WoodLaminate ? "/textures/wood/oak.jpg" : null,
        SurchargeMinor = surcharge, Currency = Currency.Gel,
        SortOrder = 0, IsDefault = isDefault, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
    };

    private static Dictionary<Guid, ColorOption> ColorSet(params ColorOption[] cs) =>
        cs.ToDictionary(c => c.Id);

    private static List<ConfigurationPane> OnePane() =>
    [
        new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false),
    ];

    [Fact]
    public void NoColorSelection_SkipsAllColorChecks_StepFiveBehaviour()
    {
        var result = LayoutValidator.Validate(WindowPt(), OnePane(),
            availableGlassTypes: null,
            material: null,
            colorSelection: null,
            availableColorOptions: null);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void ColorSelection_Without_Catalog_ReturnsCatalogMissing()
    {
        var pt = WindowPt();
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: AluThermal(pt.Id),
            colorSelection: new ColorSelection(WhiteId),
            availableColorOptions: null);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.color.catalogMissing");
    }

    [Fact]
    public void OuterColorNotInCompatSet_Returns_NotCompatible_WithOuterMetadata()
    {
        var pt = WindowPt();
        var colors = ColorSet(MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: AluThermal(pt.Id),
            colorSelection: new ColorSelection(UnknownColorId),
            availableColorOptions: colors);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.color.notCompatibleWithMaterial");
        result.Error.Metadata!["which"].Should().Be("outer");
    }

    [Fact]
    public void InnerColorNotInCompatSet_Returns_NotCompatible_WithInnerMetadata()
    {
        var pt = WindowPt();
        var colors = ColorSet(MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: PvcLaminated(pt.Id),
            colorSelection: new ColorSelection(WhiteId, InnerColorOptionId: UnknownColorId),
            availableColorOptions: colors);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.color.notCompatibleWithMaterial");
        result.Error.Metadata!["which"].Should().Be("inner");
    }

    [Fact]
    public void DualColorOnPvc_IsValid()
    {
        var pt = WindowPt();
        var colors = ColorSet(
            MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true),
            MakeColor(OakId, "oak-laminate", ColorFamily.WoodLaminate, 18000, false));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: PvcLaminated(pt.Id),
            colorSelection: new ColorSelection(OakId, InnerColorOptionId: WhiteId),
            availableColorOptions: colors);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void DualColorOnAluminum_Returns_DualOnlyOnPvc()
    {
        var pt = WindowPt();
        var colors = ColorSet(
            MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true),
            MakeColor(AnthraciteId, "anthracite-ral7016", ColorFamily.Premium, 7500, false));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: AluThermal(pt.Id),
            colorSelection: new ColorSelection(AnthraciteId, InnerColorOptionId: WhiteId),
            availableColorOptions: colors);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.color.dualOnlyOnPvc");
        result.Error.Metadata!["materialSlug"].Should().Be("aluminum-thermal");
    }

    [Fact]
    public void InnerEqualsOuter_NotTreatedAsDual_IsValid_OnAluminum()
    {
        // Sending the same id as inner + outer is a no-op (still single color)
        // — must not trip the dual-PVC rule.
        var pt = WindowPt();
        var colors = ColorSet(MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: AluThermal(pt.Id),
            colorSelection: new ColorSelection(WhiteId, InnerColorOptionId: WhiteId),
            availableColorOptions: colors);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void RalCustomWithoutHexOrCode_Returns_RalCustomMissing()
    {
        var pt = WindowPt();
        var colors = ColorSet(MakeColor(RalCustomId, "ral-custom", ColorFamily.RalCustom, 25000, false));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: AluThermal(pt.Id),
            colorSelection: new ColorSelection(RalCustomId), // no hex/code
            availableColorOptions: colors);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.color.ralCustomMissing");
    }

    [Fact]
    public void RalCustomWithInvalidHex_Returns_HexInvalid_WithGotMetadata()
    {
        var pt = WindowPt();
        var colors = ColorSet(MakeColor(RalCustomId, "ral-custom", ColorFamily.RalCustom, 25000, false));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: AluThermal(pt.Id),
            colorSelection: new ColorSelection(RalCustomId,
                CustomRalHex: "not-a-hex", CustomRalCode: "RAL 9016"),
            availableColorOptions: colors);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.color.ralCustomHexInvalid");
        result.Error.Metadata!["got"].Should().Be("not-a-hex");
    }

    [Fact]
    public void RalCustomWithInvalidCode_Returns_CodeInvalid_WithGotMetadata()
    {
        var pt = WindowPt();
        var colors = ColorSet(MakeColor(RalCustomId, "ral-custom", ColorFamily.RalCustom, 25000, false));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: AluThermal(pt.Id),
            colorSelection: new ColorSelection(RalCustomId,
                CustomRalHex: "#F4F4F4", CustomRalCode: "RAL9016"),
            availableColorOptions: colors);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.color.ralCustomCodeInvalid");
        result.Error.Metadata!["got"].Should().Be("RAL9016");
    }

    [Fact]
    public void RalCustomWithValidHexAndCode_IsValid()
    {
        var pt = WindowPt();
        var colors = ColorSet(MakeColor(RalCustomId, "ral-custom", ColorFamily.RalCustom, 25000, false));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: AluThermal(pt.Id),
            colorSelection: new ColorSelection(RalCustomId,
                CustomRalHex: "#27352A", CustomRalCode: "RAL 6009"),
            availableColorOptions: colors);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void NonRalCustomOuter_HexAndCodeIgnored_StillValid()
    {
        // Standard color + spurious hex/code on the request — validator
        // doesn't reject; the calculator just ignores them.
        var pt = WindowPt();
        var colors = ColorSet(MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: AluThermal(pt.Id),
            colorSelection: new ColorSelection(WhiteId,
                CustomRalHex: "#F4F4F4", CustomRalCode: "RAL 9016"),
            availableColorOptions: colors);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void StandardOuterColor_AluminumOk()
    {
        var pt = WindowPt();
        var colors = ColorSet(MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: AluThermal(pt.Id),
            colorSelection: new ColorSelection(WhiteId),
            availableColorOptions: colors);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void PremiumOuterColor_OnPvcCompatibleSet_Ok()
    {
        var pt = WindowPt();
        var colors = ColorSet(
            MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true),
            MakeColor(AnthraciteId, "anthracite-ral7016", ColorFamily.Premium, 7500, false));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: PvcLaminated(pt.Id),
            colorSelection: new ColorSelection(AnthraciteId),
            availableColorOptions: colors);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void DualWithoutMaterial_ReturnsDualOnlyOnPvc_EmptyMaterialSlug()
    {
        // Defensive: caller forgot to pass material but supplied dual color.
        // Validator should refuse the dual rather than blindly accept.
        var pt = WindowPt();
        var colors = ColorSet(
            MakeColor(WhiteId, "white-ral9016", ColorFamily.Standard, 0, true),
            MakeColor(AnthraciteId, "anthracite-ral7016", ColorFamily.Premium, 7500, false));
        var result = LayoutValidator.Validate(pt, OnePane(),
            availableGlassTypes: null,
            material: null,
            colorSelection: new ColorSelection(AnthraciteId, InnerColorOptionId: WhiteId),
            availableColorOptions: colors);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.color.dualOnlyOnPvc");
    }
}
