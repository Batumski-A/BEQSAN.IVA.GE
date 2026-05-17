using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Catalog;

public class GlassTypeTests
{
    private static LocalizedText T(string ka) => LocalizedText.Create(ka).Value;

    [Fact]
    public void Create_WithValidInputs_Succeeds()
    {
        var r = GlassType.Create(
            slug: "triple-low-e",
            name: T("სამმაგი Low-E"),
            shortDescription: T("მაქს ენერგო-ეფექტურობა."),
            paneCount: 3,
            surchargePerSqmMinor: 6000,
            currency: Currency.Gel,
            uValue: 1.0m,
            sortOrder: 3,
            isDefault: false);

        r.IsSuccess.Should().BeTrue();
        var g = r.Value;
        g.Slug.Should().Be("triple-low-e");
        g.PaneCount.Should().Be(3);
        g.SurchargePerSqmMinor.Should().Be(6000);
        g.UValue.Should().Be(1.0m);
        g.IsDefault.Should().BeFalse();
        g.IsActive.Should().BeTrue();
        g.Id.Should().NotBe(Guid.Empty);
    }

    [Fact]
    public void Create_DefaultGlass_FlagsIsDefault()
    {
        var r = GlassType.Create(
            slug: "double-standard", name: T("ორმაგი მინა"), shortDescription: T("..."),
            paneCount: 2, surchargePerSqmMinor: 0, currency: Currency.Gel,
            uValue: 2.8m, sortOrder: 1, isDefault: true);

        r.Value.IsDefault.Should().BeTrue();
        r.Value.SurchargePerSqmMinor.Should().Be(0);
    }

    [Fact]
    public void Create_NullSlug_ReturnsSlugRequired()
    {
        var r = GlassType.Create(
            slug: null, name: T("ა"), shortDescription: T("ა"),
            paneCount: 2, surchargePerSqmMinor: 0, currency: Currency.Gel,
            uValue: 2.5m, sortOrder: 0, isDefault: false);
        r.IsFailure.Should().BeTrue();
        r.Error.Code.Should().Be("glassType.slug.required");
    }

    [Theory]
    [InlineData("Triple-LowE", true)]   // uppercase lower-cased automatically
    [InlineData("triple_low_e", false)] // underscore not allowed
    [InlineData("-triple", false)]      // leading hyphen
    [InlineData("triple-", false)]      // trailing hyphen
    [InlineData("a", false)]            // too short
    [InlineData("triple-low-e", true)]
    [InlineData("ab", true)]            // 2 chars allowed (the minimum)
    public void Create_SlugValidation(string slug, bool expectSuccess)
    {
        var r = GlassType.Create(
            slug: slug, name: T("ა"), shortDescription: T("ა"),
            paneCount: 2, surchargePerSqmMinor: 0, currency: Currency.Gel,
            uValue: 2.5m, sortOrder: 0, isDefault: false);
        r.IsSuccess.Should().Be(expectSuccess);
        if (!expectSuccess)
        {
            r.Error.Code.Should().Be("glassType.slug.invalid");
        }
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(5, false)]
    [InlineData(1, true)]
    [InlineData(4, true)]
    public void Create_PaneCount_OutsideOneToFour_Fails(int paneCount, bool expectSuccess)
    {
        var r = GlassType.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            paneCount: paneCount, surchargePerSqmMinor: 0, currency: Currency.Gel,
            uValue: 2.5m, sortOrder: 0, isDefault: false);
        r.IsSuccess.Should().Be(expectSuccess);
        if (!expectSuccess)
        {
            r.Error.Code.Should().Be("glassType.paneCount.outOfRange");
        }
    }

    [Fact]
    public void Create_NegativeSurcharge_ReturnsError()
    {
        var r = GlassType.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            paneCount: 2, surchargePerSqmMinor: -1, currency: Currency.Gel,
            uValue: 2.5m, sortOrder: 0, isDefault: false);
        r.IsFailure.Should().BeTrue();
        r.Error.Code.Should().Be("glassType.surcharge.negative");
    }

    [Theory]
    [InlineData(-0.5, false)]
    [InlineData(0.0, false)]
    [InlineData(0.7, true)]   // best Low-E gets ~0.7
    [InlineData(10.0, true)]
    [InlineData(10.1, false)]
    public void Create_UValue_OutOfRange_Fails(double uValue, bool expectSuccess)
    {
        var r = GlassType.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            paneCount: 2, surchargePerSqmMinor: 0, currency: Currency.Gel,
            uValue: (decimal)uValue, sortOrder: 0, isDefault: false);
        r.IsSuccess.Should().Be(expectSuccess);
    }
}
