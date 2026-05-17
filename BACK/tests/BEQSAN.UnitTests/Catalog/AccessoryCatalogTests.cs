using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Catalog;

/// <summary>
/// Step-7 catalog entity factory tests — three classes (Handle, Lock,
/// Blind) folded into one file because each is a small invariants surface.
/// </summary>
public class HandleStyleTests
{
    private static LocalizedText T(string ka) => LocalizedText.Create(ka).Value;

    [Fact]
    public void Create_WithValidInputs_Succeeds()
    {
        var r = HandleStyle.Create(
            slug: "modern-aluminum",
            name: T("Modern ალუმინი"),
            shortDescription: T("..."),
            family: "modern",
            imageUrl: null,
            surchargePerPaneMinor: 4500,
            currency: Currency.Gel,
            sortOrder: 1,
            isDefault: true);
        r.IsSuccess.Should().BeTrue();
        r.Value.SurchargePerPaneMinor.Should().Be(4500);
        r.Value.IsDefault.Should().BeTrue();
    }

    [Theory]
    [InlineData("modern", true)]
    [InlineData("classic", true)]
    [InlineData("premium", true)]
    [InlineData("minimal", true)]
    [InlineData("vintage", false)]
    [InlineData("", false)]
    public void Create_FamilyValidation(string family, bool ok)
    {
        var r = HandleStyle.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            family: family, imageUrl: null,
            surchargePerPaneMinor: 0, currency: Currency.Gel,
            sortOrder: 0, isDefault: false);
        r.IsSuccess.Should().Be(ok);
    }

    [Fact]
    public void Create_NegativeSurcharge_Rejected()
    {
        var r = HandleStyle.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            family: "modern", imageUrl: null,
            surchargePerPaneMinor: -1, currency: Currency.Gel,
            sortOrder: 0, isDefault: false);
        r.IsFailure.Should().BeTrue();
        r.Error.Code.Should().Be("handleStyle.surcharge.negative");
    }

    [Fact]
    public void Create_LowercasesSlug()
    {
        var r = HandleStyle.Create(
            slug: "  MODERN-Aluminum  ", name: T("ა"), shortDescription: T("ა"),
            family: "modern", imageUrl: null,
            surchargePerPaneMinor: 0, currency: Currency.Gel,
            sortOrder: 0, isDefault: false);
        r.Value.Slug.Should().Be("modern-aluminum");
    }
}

public class LockTypeTests
{
    private static LocalizedText T(string ka) => LocalizedText.Create(ka).Value;

    [Fact]
    public void Create_BasicLock_Succeeds()
    {
        var r = LockType.Create(
            slug: "basic-cam",
            name: T("Basic"),
            shortDescription: T("..."),
            grade: LockGrade.Basic,
            securityRating: 2,
            requiresCasementOrTurn: false,
            surchargePerPaneMinor: 3500,
            currency: Currency.Gel,
            sortOrder: 1,
            isDefault: true);
        r.IsSuccess.Should().BeTrue();
        r.Value.Grade.Should().Be(LockGrade.Basic);
    }

    [Fact]
    public void Create_MultiPoint_WithoutFullOpeningFlag_Rejected()
    {
        var r = LockType.Create(
            slug: "multi-point-3",
            name: T("Multi"),
            shortDescription: T("..."),
            grade: LockGrade.MultiPoint,
            securityRating: 4,
            requiresCasementOrTurn: false, // mismatch — must be true
            surchargePerPaneMinor: 9000,
            currency: Currency.Gel,
            sortOrder: 2,
            isDefault: false);
        r.IsFailure.Should().BeTrue();
        r.Error.Code.Should().Be("lockType.multiPoint.mustRequireFullOpening");
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(5, true)]
    [InlineData(6, false)]
    public void Create_SecurityRatingValidation(int rating, bool ok)
    {
        var r = LockType.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            grade: LockGrade.Basic, securityRating: rating,
            requiresCasementOrTurn: false,
            surchargePerPaneMinor: 0, currency: Currency.Gel,
            sortOrder: 0, isDefault: false);
        r.IsSuccess.Should().Be(ok);
    }

    [Fact]
    public void Create_SmartGrade_AllowsAnyOpeningFlag()
    {
        // Smart is door-only via compat, not engineering-coupled to the
        // pane opening type, so the invariant is "Multi-point ↔ full opening",
        // not "any non-Basic ↔ full opening".
        var r = LockType.Create(
            slug: "smart-fingerprint", name: T("Smart"), shortDescription: T("..."),
            grade: LockGrade.Smart, securityRating: 5,
            requiresCasementOrTurn: false,
            surchargePerPaneMinor: 35000, currency: Currency.Gel,
            sortOrder: 4, isDefault: false);
        r.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Create_NegativeSurcharge_Rejected()
    {
        var r = LockType.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            grade: LockGrade.Basic, securityRating: 1,
            requiresCasementOrTurn: false,
            surchargePerPaneMinor: -1, currency: Currency.Gel,
            sortOrder: 0, isDefault: false);
        r.IsFailure.Should().BeTrue();
        r.Error.Code.Should().Be("lockType.surcharge.negative");
    }
}

public class BlindTypeTests
{
    private static LocalizedText T(string ka) => LocalizedText.Create(ka).Value;

    [Fact]
    public void Create_ExternalManual_Succeeds()
    {
        var r = BlindType.Create(
            slug: "external-aluminum-manual",
            name: T("გარეთა ალუმინი"),
            shortDescription: T("..."),
            placement: BlindPlacement.External,
            supportsElectric: false,
            baseMountingMinor: 18000,
            surchargePerSqmMinor: 6500,
            currency: Currency.Gel,
            sortOrder: 1);
        r.IsSuccess.Should().BeTrue();
        r.Value.Placement.Should().Be(BlindPlacement.External);
        r.Value.SupportsElectric.Should().BeFalse();
    }

    [Fact]
    public void Create_InternalElectric_Succeeds()
    {
        var r = BlindType.Create(
            slug: "internal-roller", name: T("შიდა Roller"), shortDescription: T("..."),
            placement: BlindPlacement.Internal,
            supportsElectric: true,
            baseMountingMinor: 6000,
            surchargePerSqmMinor: 3500,
            currency: Currency.Gel,
            sortOrder: 4);
        r.IsSuccess.Should().BeTrue();
        r.Value.SupportsElectric.Should().BeTrue();
    }

    [Fact]
    public void Create_NegativeBaseMounting_Rejected()
    {
        var r = BlindType.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            placement: BlindPlacement.External, supportsElectric: false,
            baseMountingMinor: -1, surchargePerSqmMinor: 0,
            currency: Currency.Gel, sortOrder: 0);
        r.IsFailure.Should().BeTrue();
    }

    [Fact]
    public void Create_NegativeSurchargePerSqm_Rejected()
    {
        var r = BlindType.Create(
            slug: "test", name: T("ა"), shortDescription: T("ა"),
            placement: BlindPlacement.External, supportsElectric: false,
            baseMountingMinor: 0, surchargePerSqmMinor: -1,
            currency: Currency.Gel, sortOrder: 0);
        r.IsFailure.Should().BeTrue();
    }

    [Theory]
    [InlineData("external-blind", true)]
    [InlineData("external", true)]
    [InlineData("EXTERNAL", true)]    // lowercased automatically
    [InlineData("ex", true)]
    [InlineData("e", false)]          // too short
    [InlineData("-ex", false)]        // leading hyphen
    public void Create_SlugValidation(string slug, bool ok)
    {
        var r = BlindType.Create(
            slug: slug, name: T("ა"), shortDescription: T("ა"),
            placement: BlindPlacement.Internal, supportsElectric: false,
            baseMountingMinor: 0, surchargePerSqmMinor: 0,
            currency: Currency.Gel, sortOrder: 0);
        r.IsSuccess.Should().Be(ok);
    }
}
