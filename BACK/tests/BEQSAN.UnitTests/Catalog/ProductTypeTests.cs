using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Catalog;

public class ProductTypeTests
{
    private static LocalizedText Name(string ka) => LocalizedText.Create(ka).Value;

    [Fact]
    public void Create_WithValidInputs_Succeeds()
    {
        var result = ProductType.Create(
            slug: "window",
            name: Name("ფანჯარა"),
            shortDescription: Name("ალუმინის და PVC ფანჯრები"),
            heroImageUrl: "/images/catalog/window.jpg",
            sortOrder: 1);

        result.IsSuccess.Should().BeTrue();
        result.Value.Slug.Should().Be("window");
        result.Value.SortOrder.Should().Be(1);
        result.Value.IsActive.Should().BeTrue();
        result.Value.Id.Should().NotBe(Guid.Empty);
        result.Value.CreatedAtUtc.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void Create_LowercasesAndTrimsSlug()
    {
        var result = ProductType.Create(
            slug: "  Sliding-Door  ",
            name: Name("სლაიდინგ კარი"),
            shortDescription: Name("..."),
            heroImageUrl: null,
            sortOrder: 0);

        result.IsSuccess.Should().BeTrue();
        result.Value.Slug.Should().Be("sliding-door");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_EmptySlug_ReturnsValidationError(string? slug)
    {
        var result = ProductType.Create(
            slug: slug,
            name: Name("ფანჯარა"),
            shortDescription: Name("..."),
            heroImageUrl: null,
            sortOrder: 0);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("productType.slug.required");
    }

    [Theory]
    [InlineData("a")]                     // too short
    [InlineData("WINDOW")]                // upper-case after normalization → still valid since we lowercase, but the test relies on something else; using -window
    [InlineData("-window")]               // leading dash
    [InlineData("window-")]               // trailing dash
    [InlineData("win dow")]               // space (becomes "win dow" lowercased — space not allowed)
    [InlineData("window!")]               // illegal char
    [InlineData("ფანჯარა")]               // non-ASCII
    public void Create_InvalidSlugShape_ReturnsValidationError(string slug)
    {
        var result = ProductType.Create(
            slug: slug,
            name: Name("ფანჯარა"),
            shortDescription: Name("..."),
            heroImageUrl: null,
            sortOrder: 0);

        if (slug == "WINDOW")
        {
            // After lowercase normalization "window" is valid — adjust expectation
            result.IsSuccess.Should().BeTrue();
            return;
        }

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("productType.slug.invalid");
    }

    [Fact]
    public void Create_HeroImageUrl_DefaultsToEmptyWhenNull()
    {
        var result = ProductType.Create(
            slug: "door",
            name: Name("კარი"),
            shortDescription: Name("..."),
            heroImageUrl: null,
            sortOrder: 2);

        result.IsSuccess.Should().BeTrue();
        result.Value.HeroImageUrl.Should().Be(string.Empty);
    }
}
