using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Catalog;

public class ColorOptionTests
{
    private static LocalizedText T(string ka) => LocalizedText.Create(ka).Value;

    [Fact]
    public void Create_StandardColor_Succeeds_WithoutRalOrTexture()
    {
        var r = ColorOption.Create(
            slug: "white-ral9016",
            name: T("თეთრი"),
            shortDescription: T("..."),
            family: ColorFamily.Standard,
            hexCode: "#F4F4F4",
            ralCode: "RAL 9016",
            woodTextureUrl: null,
            surchargeMinor: 0,
            currency: Currency.Gel,
            sortOrder: 1,
            isDefault: true);

        r.IsSuccess.Should().BeTrue();
        var c = r.Value;
        c.Slug.Should().Be("white-ral9016");
        c.Family.Should().Be(ColorFamily.Standard);
        c.HexCode.Should().Be("#F4F4F4");
        c.RalCode.Should().Be("RAL 9016");
        c.IsDefault.Should().BeTrue();
    }

    [Fact]
    public void Create_WoodLaminate_RequiresTextureUrl()
    {
        var withTexture = ColorOption.Create(
            slug: "oak-laminate", name: T("მუხის ფაქტურა"), shortDescription: T("..."),
            family: ColorFamily.WoodLaminate, hexCode: "#C7A878", ralCode: null,
            woodTextureUrl: "/textures/wood/oak.jpg",
            surchargeMinor: 18000, currency: Currency.Gel,
            sortOrder: 20, isDefault: false);
        withTexture.IsSuccess.Should().BeTrue();

        var noTexture = ColorOption.Create(
            slug: "oak-laminate", name: T("მუხის ფაქტურა"), shortDescription: T("..."),
            family: ColorFamily.WoodLaminate, hexCode: "#C7A878", ralCode: null,
            woodTextureUrl: null,
            surchargeMinor: 18000, currency: Currency.Gel,
            sortOrder: 20, isDefault: false);
        noTexture.IsFailure.Should().BeTrue();
        noTexture.Error.Code.Should().Be("colorOption.woodTexture.required");
    }

    [Fact]
    public void Create_NonWoodFamily_RejectsTextureUrl()
    {
        var r = ColorOption.Create(
            slug: "anthracite-ral7016", name: T("ანტრაციტი"), shortDescription: T("..."),
            family: ColorFamily.Premium, hexCode: "#293133", ralCode: "RAL 7016",
            woodTextureUrl: "/textures/wood/oak.jpg", // not allowed
            surchargeMinor: 7500, currency: Currency.Gel,
            sortOrder: 10, isDefault: false);
        r.IsFailure.Should().BeTrue();
        r.Error.Code.Should().Be("colorOption.woodTexture.forbidden");
    }

    [Theory]
    [InlineData("#F4F4F4", true)]
    [InlineData("#000000", true)]
    [InlineData("#abcdef", true)]
    [InlineData("F4F4F4", false)]      // missing #
    [InlineData("#F4F4", false)]       // too short
    [InlineData("#F4F4F4F", false)]    // too long
    [InlineData("#GGGGGG", false)]     // non-hex
    public void Create_HexValidation(string hex, bool expectSuccess)
    {
        var r = ColorOption.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            family: ColorFamily.Standard, hexCode: hex, ralCode: null,
            woodTextureUrl: null, surchargeMinor: 0,
            currency: Currency.Gel, sortOrder: 0, isDefault: false);
        r.IsSuccess.Should().Be(expectSuccess);
    }

    [Theory]
    [InlineData("RAL 9016", true)]
    [InlineData("RAL 7016", true)]
    [InlineData("RAL9016", false)]     // missing space
    [InlineData("ral 9016", false)]    // lowercase
    [InlineData("RAL 99", false)]      // wrong digit count
    [InlineData("RAL 90160", false)]   // too many digits
    public void Create_RalCodeValidation(string ralCode, bool expectSuccess)
    {
        var r = ColorOption.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            family: ColorFamily.Standard, hexCode: "#FFFFFF", ralCode: ralCode,
            woodTextureUrl: null, surchargeMinor: 0,
            currency: Currency.Gel, sortOrder: 0, isDefault: false);
        r.IsSuccess.Should().Be(expectSuccess);
        if (!expectSuccess)
        {
            r.Error.Code.Should().Be("colorOption.ralCode.invalid");
        }
    }

    [Fact]
    public void Create_NegativeSurcharge_Rejected()
    {
        var r = ColorOption.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            family: ColorFamily.Standard, hexCode: "#FFFFFF", ralCode: null,
            woodTextureUrl: null, surchargeMinor: -1,
            currency: Currency.Gel, sortOrder: 0, isDefault: false);
        r.IsFailure.Should().BeTrue();
        r.Error.Code.Should().Be("colorOption.surcharge.negative");
    }

    [Fact]
    public void Create_LowercasesAndTrimsSlug()
    {
        var r = ColorOption.Create(
            slug: "  WHITE-RAL9016  ", name: T("თეთრი"), shortDescription: T("..."),
            family: ColorFamily.Standard, hexCode: "#F4F4F4", ralCode: "RAL 9016",
            woodTextureUrl: null, surchargeMinor: 0,
            currency: Currency.Gel, sortOrder: 1, isDefault: true);
        r.IsSuccess.Should().BeTrue();
        r.Value.Slug.Should().Be("white-ral9016");
    }

    [Fact]
    public void Create_HexUppercased()
    {
        var r = ColorOption.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            family: ColorFamily.Standard, hexCode: "#abcdef", ralCode: null,
            woodTextureUrl: null, surchargeMinor: 0,
            currency: Currency.Gel, sortOrder: 0, isDefault: false);
        r.Value.HexCode.Should().Be("#ABCDEF");
    }

    [Fact]
    public void IsValidHex_StaticHelper_ExposedForValidator()
    {
        ColorOption.IsValidHex("#F4F4F4").Should().BeTrue();
        ColorOption.IsValidHex("not-a-hex").Should().BeFalse();
    }

    [Fact]
    public void IsValidRalCode_StaticHelper_ExposedForValidator()
    {
        ColorOption.IsValidRalCode("RAL 9016").Should().BeTrue();
        ColorOption.IsValidRalCode("RAL9016").Should().BeFalse();
    }
}
