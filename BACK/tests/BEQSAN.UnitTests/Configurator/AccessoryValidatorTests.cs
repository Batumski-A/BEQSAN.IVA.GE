using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.Configurator;

/// <summary>
/// Step-7 accessory validation rules — door-required handle/lock, multi-
/// point lock vs opening type, sill length sanity, blind product compat,
/// blind control vs capability.
/// </summary>
public class AccessoryValidatorTests
{
    private static readonly Guid HandleModernId = Guid.Parse("cccccccc-0000-0000-0000-000000000001");
    private static readonly Guid HandlePremiumId = Guid.Parse("cccccccc-0000-0000-0000-000000000002");
    private static readonly Guid LockBasicId = Guid.Parse("dddddddd-0000-0000-0000-000000000001");
    private static readonly Guid LockMulti3Id = Guid.Parse("dddddddd-0000-0000-0000-000000000002");
    private static readonly Guid LockSmartId = Guid.Parse("dddddddd-0000-0000-0000-000000000003");
    private static readonly Guid BlindExtElectricId = Guid.Parse("eeeeeeee-0000-0000-0000-000000000001");
    private static readonly Guid BlindIntRomanId = Guid.Parse("eeeeeeee-0000-0000-0000-000000000002");
    private static readonly Guid BlindExtManualId = Guid.Parse("eeeeeeee-0000-0000-0000-000000000003");

    private static ProductType Pt(string slug) => new()
    {
        Id = Guid.NewGuid(),
        Slug = slug,
        Name = LocalizedText.Create(slug).Value,
        ShortDescription = LocalizedText.Create("...").Value,
        HeroImageUrl = string.Empty,
        SortOrder = 1, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
        MinWidthCm = 30, MaxWidthCm = 400, MinHeightCm = 30, MaxHeightCm = 400,
    };

    private static Material AluMaterial(Guid productTypeId) => Material.Create(
        productTypeId: productTypeId, slug: "aluminum-thermal",
        name: LocalizedText.Create("ალუმინი").Value, shortDescription: LocalizedText.Create("...").Value,
        family: MaterialFamily.Aluminum, thermalRating: ThermalRating.Thermal,
        basePricePerSqmMinor: 38000, currency: Currency.Gel, sortOrder: 1).Value;

    private static Material PvcMaterial(Guid productTypeId) => Material.Create(
        productTypeId: productTypeId, slug: "pvc-white",
        name: LocalizedText.Create("PVC").Value, shortDescription: LocalizedText.Create("...").Value,
        family: MaterialFamily.Pvc, thermalRating: ThermalRating.Basic,
        basePricePerSqmMinor: 17000, currency: Currency.Gel, sortOrder: 1).Value;

    private static HandleStyle Handle(Guid id, string slug, string family = "modern") => new()
    {
        Id = id, Slug = slug, Family = family,
        Name = LocalizedText.Create(slug).Value,
        ShortDescription = LocalizedText.Create("...").Value,
        SurchargePerPaneMinor = 4500, Currency = Currency.Gel,
        SortOrder = 0, IsDefault = false, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
    };

    private static LockType Lock(Guid id, string slug, LockGrade g, bool requiresFull) => new()
    {
        Id = id, Slug = slug, Grade = g,
        Name = LocalizedText.Create(slug).Value,
        ShortDescription = LocalizedText.Create("...").Value,
        SecurityRating = (int)g + 1,
        RequiresCasementOrTurn = requiresFull,
        SurchargePerPaneMinor = 3500, Currency = Currency.Gel,
        SortOrder = 0, IsDefault = false, IsActive = true, CreatedAtUtc = DateTime.UtcNow,
    };

    private static BlindType Blind(Guid id, string slug, BlindPlacement p, bool electric) => new()
    {
        Id = id, Slug = slug, Placement = p, SupportsElectric = electric,
        Name = LocalizedText.Create(slug).Value,
        ShortDescription = LocalizedText.Create("...").Value,
        BaseMountingMinor = 18000, SurchargePerSqmMinor = 6500,
        Currency = Currency.Gel, SortOrder = 0, IsActive = true,
        CreatedAtUtc = DateTime.UtcNow,
    };

    private static List<ConfigurationPane> OneCasement() =>
    [
        new ConfigurationPane(1, 1.0m, PaneOpeningType.Casement, HingeSide.Right, false),
    ];

    private static List<ConfigurationPane> OneFixed() =>
    [
        new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false),
    ];

    private static List<ConfigurationPane> OneTilt() =>
    [
        new ConfigurationPane(1, 1.0m, PaneOpeningType.Tilt, null, false),
    ];

    private static AccessoryCatalog BuildCatalog(
        Material material, ProductType productType,
        IReadOnlyList<HandleStyle> handles,
        IReadOnlyList<LockType> locks,
        IReadOnlyList<BlindType> blinds,
        bool premiumOnAlu = true,
        bool smartOnDoorOnly = true)
    {
        var handleCompat = new List<(Guid, Guid)>();
        foreach (var h in handles)
        {
            if (h.Slug == "premium-secustic" && premiumOnAlu && material.Family != MaterialFamily.Aluminum)
            {
                continue;
            }
            handleCompat.Add((h.Id, material.Id));
        }
        var lockCompat = new List<(Guid, Guid)>();
        foreach (var l in locks)
        {
            if (l.Grade == LockGrade.Smart && smartOnDoorOnly && productType.Slug != "door")
            {
                continue;
            }
            lockCompat.Add((l.Id, productType.Id));
        }
        var blindCompat = blinds.Select(b => (b.Id, productType.Id)).ToList();
        return new AccessoryCatalog(
            handles.ToDictionary(h => h.Id),
            locks.ToDictionary(l => l.Id),
            blinds.ToDictionary(b => b.Id),
            handleCompat, lockCompat, blindCompat);
    }

    [Fact]
    public void NullAccessories_IsSuccess()
    {
        var pt = Pt("window");
        var result = AccessoryValidator.Validate(
            pt, AluMaterial(pt.Id), OneFixed(), null, AccessoryCatalog.Empty);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Door_WithoutHandle_Returns_HandleRequired()
    {
        var pt = Pt("door");
        var mat = AluMaterial(pt.Id);
        var catalog = BuildCatalog(mat, pt,
            [Handle(HandleModernId, "modern-aluminum")],
            [Lock(LockBasicId, "basic-cam", LockGrade.Basic, false)],
            []);
        var result = AccessoryValidator.Validate(
            pt, mat, OneCasement(),
            new AccessorySelection(HandleStyleId: null, LockTypeId: LockBasicId),
            catalog);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.accessory.handleRequired");
        result.Error.Metadata!["reason"].Should().Be("door");
    }

    [Fact]
    public void Door_WithoutLock_Returns_LockRequired()
    {
        var pt = Pt("door");
        var mat = AluMaterial(pt.Id);
        var catalog = BuildCatalog(mat, pt,
            [Handle(HandleModernId, "modern-aluminum")],
            [Lock(LockBasicId, "basic-cam", LockGrade.Basic, false)],
            []);
        var result = AccessoryValidator.Validate(
            pt, mat, OneCasement(),
            new AccessorySelection(HandleStyleId: HandleModernId, LockTypeId: null),
            catalog);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.accessory.lockRequired");
    }

    [Fact]
    public void Door_AllFixed_DoesNotRequireHandleOrLock()
    {
        // A door with no openable pane is structurally weird but not the
        // validator's concern — pane-level layout rules already would've
        // caught it. Accessories are optional in this edge case.
        var pt = Pt("door");
        var mat = AluMaterial(pt.Id);
        var result = AccessoryValidator.Validate(
            pt, mat, OneFixed(),
            new AccessorySelection(),
            AccessoryCatalog.Empty);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Window_AllFixed_PlusHandle_Returns_HandleNoOpenablePane()
    {
        var pt = Pt("window");
        var mat = AluMaterial(pt.Id);
        var catalog = BuildCatalog(mat, pt,
            [Handle(HandleModernId, "modern-aluminum")],
            [], []);
        var result = AccessoryValidator.Validate(
            pt, mat, OneFixed(),
            new AccessorySelection(HandleStyleId: HandleModernId),
            catalog);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.accessory.handleNoOpenablePane");
    }

    [Fact]
    public void Window_HandleAlone_Casement_IsValid()
    {
        var pt = Pt("window");
        var mat = AluMaterial(pt.Id);
        var catalog = BuildCatalog(mat, pt,
            [Handle(HandleModernId, "modern-aluminum")],
            [], []);
        var result = AccessoryValidator.Validate(
            pt, mat, OneCasement(),
            new AccessorySelection(HandleStyleId: HandleModernId),
            catalog);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Handle_NotCompatibleWithMaterial_Returns_HandleNotCompatible_WithSlugs()
    {
        var pt = Pt("window");
        var mat = PvcMaterial(pt.Id); // PVC — premium-secustic not in compat set
        var catalog = BuildCatalog(mat, pt,
            [Handle(HandlePremiumId, "premium-secustic", "premium")],
            [], [],
            premiumOnAlu: true);
        var result = AccessoryValidator.Validate(
            pt, mat, OneCasement(),
            new AccessorySelection(HandleStyleId: HandlePremiumId),
            catalog);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.accessory.handleNotCompatible");
        result.Error.Metadata!["materialSlug"].Should().Be("pvc-white");
        result.Error.Metadata["handleSlug"].Should().Be("premium-secustic");
    }

    [Fact]
    public void MultiPointLock_OnTiltOnly_Returns_RequiresFullOpening()
    {
        var pt = Pt("window");
        var mat = AluMaterial(pt.Id);
        var catalog = BuildCatalog(mat, pt,
            [],
            [Lock(LockMulti3Id, "multi-point-3", LockGrade.MultiPoint, true)],
            []);
        var result = AccessoryValidator.Validate(
            pt, mat, OneTilt(),
            new AccessorySelection(LockTypeId: LockMulti3Id),
            catalog);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.accessory.lockRequiresFullOpening");
        result.Error.Metadata!["lockSlug"].Should().Be("multi-point-3");
    }

    [Fact]
    public void MultiPointLock_OnCasement_IsValid()
    {
        var pt = Pt("window");
        var mat = AluMaterial(pt.Id);
        var catalog = BuildCatalog(mat, pt,
            [],
            [Lock(LockMulti3Id, "multi-point-3", LockGrade.MultiPoint, true)],
            []);
        var result = AccessoryValidator.Validate(
            pt, mat, OneCasement(),
            new AccessorySelection(LockTypeId: LockMulti3Id),
            catalog);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void SmartLock_OnWindow_Returns_LockNotCompatibleProduct()
    {
        var pt = Pt("window");
        var mat = AluMaterial(pt.Id);
        var catalog = BuildCatalog(mat, pt,
            [],
            [Lock(LockSmartId, "smart-fingerprint", LockGrade.Smart, false)],
            [],
            smartOnDoorOnly: true);
        var result = AccessoryValidator.Validate(
            pt, mat, OneCasement(),
            new AccessorySelection(LockTypeId: LockSmartId),
            catalog);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.accessory.lockNotCompatibleProduct");
        result.Error.Metadata!["productTypeSlug"].Should().Be("window");
        result.Error.Metadata["lockSlug"].Should().Be("smart-fingerprint");
    }

    [Theory]
    [InlineData(29, false)]
    [InlineData(30, true)]
    [InlineData(800, true)]
    [InlineData(801, false)]
    public void Sill_CustomLength_RangeValidation(int len, bool ok)
    {
        var pt = Pt("window");
        var mat = AluMaterial(pt.Id);
        var sill = new SillSelection(SillPosition.Inner, CustomLengthCm: len);
        var result = AccessoryValidator.Validate(
            pt, mat, OneFixed(),
            new AccessorySelection(Sill: sill),
            AccessoryCatalog.Empty);
        result.IsSuccess.Should().Be(ok);
        if (!ok)
        {
            result.Error.Code.Should().Be("configurator.accessory.sillLengthOutOfRange");
            result.Error.Metadata!["min"].Should().Be(30);
            result.Error.Metadata["max"].Should().Be(800);
            result.Error.Metadata["actual"].Should().Be(len);
        }
    }

    [Fact]
    public void Sill_AutoLength_NoRangeCheck()
    {
        // CustomLengthCm is null → calculator uses widthCm; no validator
        // bound applies because dimension range is already enforced upstream.
        var pt = Pt("window");
        var mat = AluMaterial(pt.Id);
        var sill = new SillSelection(SillPosition.Outer);
        var result = AccessoryValidator.Validate(
            pt, mat, OneFixed(),
            new AccessorySelection(Sill: sill),
            AccessoryCatalog.Empty);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Blind_NotCompatibleProduct_Returns_BlindNotCompatibleProduct()
    {
        // External blind on a product type the compat mesh omits (here:
        // empty mesh — anything is rejected).
        var pt = Pt("door");
        var mat = AluMaterial(pt.Id);
        var blind = Blind(BlindExtElectricId, "external-aluminum-electric", BlindPlacement.External, electric: true);
        var catalog = new AccessoryCatalog(
            new Dictionary<Guid, HandleStyle>(),
            new Dictionary<Guid, LockType>(),
            new Dictionary<Guid, BlindType> { [blind.Id] = blind },
            [], [], []); // empty compat mesh
        var result = AccessoryValidator.Validate(
            pt, mat, OneCasement(),
            new AccessorySelection(
                HandleStyleId: HandleModernId, LockTypeId: LockBasicId,
                Blind: new BlindSelection(blind.Id, BlindControl.Electric)),
            catalog);
        result.IsFailure.Should().BeTrue();
        // Door requires handle/lock first; need to swap order. Try with all
        // required slots filled but blind absent from compat.
        var pt2 = Pt("window");
        var mat2 = AluMaterial(pt2.Id);
        var catalog2 = new AccessoryCatalog(
            new Dictionary<Guid, HandleStyle>(),
            new Dictionary<Guid, LockType>(),
            new Dictionary<Guid, BlindType> { [blind.Id] = blind },
            [], [], []); // empty compat
        var result2 = AccessoryValidator.Validate(
            pt2, mat2, OneCasement(),
            new AccessorySelection(Blind: new BlindSelection(blind.Id, BlindControl.Electric)),
            catalog2);
        result2.IsFailure.Should().BeTrue();
        result2.Error.Code.Should().Be("configurator.accessory.blindNotCompatibleProduct");
        result2.Error.Metadata!["productTypeSlug"].Should().Be("window");
        result2.Error.Metadata["blindSlug"].Should().Be("external-aluminum-electric");
    }

    [Fact]
    public void Blind_ElectricControl_OnManualOnlyType_Returns_BlindControlNotSupported()
    {
        var pt = Pt("window");
        var mat = AluMaterial(pt.Id);
        var blind = Blind(BlindExtManualId, "external-aluminum-manual", BlindPlacement.External, electric: false);
        var catalog = new AccessoryCatalog(
            new Dictionary<Guid, HandleStyle>(),
            new Dictionary<Guid, LockType>(),
            new Dictionary<Guid, BlindType> { [blind.Id] = blind },
            [], [], [(blind.Id, pt.Id)]);
        var result = AccessoryValidator.Validate(
            pt, mat, OneCasement(),
            new AccessorySelection(Blind: new BlindSelection(blind.Id, BlindControl.Electric)),
            catalog);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.accessory.blindControlNotSupported");
        result.Error.Metadata!["blindSlug"].Should().Be("external-aluminum-manual");
        result.Error.Metadata["requestedControl"].Should().Be("electric");
    }

    [Fact]
    public void Blind_ManualControl_OnManualOnlyType_IsValid()
    {
        var pt = Pt("window");
        var mat = AluMaterial(pt.Id);
        var blind = Blind(BlindExtManualId, "external-aluminum-manual", BlindPlacement.External, electric: false);
        var catalog = new AccessoryCatalog(
            new Dictionary<Guid, HandleStyle>(),
            new Dictionary<Guid, LockType>(),
            new Dictionary<Guid, BlindType> { [blind.Id] = blind },
            [], [], [(blind.Id, pt.Id)]);
        var result = AccessoryValidator.Validate(
            pt, mat, OneCasement(),
            new AccessorySelection(Blind: new BlindSelection(blind.Id, BlindControl.Manual)),
            catalog);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Blind_ElectricOnElectricCapableType_IsValid()
    {
        var pt = Pt("window");
        var mat = AluMaterial(pt.Id);
        var blind = Blind(BlindExtElectricId, "external-aluminum-electric", BlindPlacement.External, electric: true);
        var catalog = new AccessoryCatalog(
            new Dictionary<Guid, HandleStyle>(),
            new Dictionary<Guid, LockType>(),
            new Dictionary<Guid, BlindType> { [blind.Id] = blind },
            [], [], [(blind.Id, pt.Id)]);
        var result = AccessoryValidator.Validate(
            pt, mat, OneFixed(),
            new AccessorySelection(Blind: new BlindSelection(blind.Id, BlindControl.Electric)),
            catalog);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Door_HandleAndLockAndInternalBlind_HappyPath()
    {
        var pt = Pt("door");
        var mat = AluMaterial(pt.Id);
        var blind = Blind(BlindIntRomanId, "internal-roman", BlindPlacement.Internal, electric: false);
        var handle = Handle(HandleModernId, "modern-aluminum");
        var lockT = Lock(LockBasicId, "basic-cam", LockGrade.Basic, false);
        var catalog = new AccessoryCatalog(
            new Dictionary<Guid, HandleStyle> { [handle.Id] = handle },
            new Dictionary<Guid, LockType> { [lockT.Id] = lockT },
            new Dictionary<Guid, BlindType> { [blind.Id] = blind },
            [(handle.Id, mat.Id)],
            [(lockT.Id, pt.Id)],
            [(blind.Id, pt.Id)]);
        var result = AccessoryValidator.Validate(
            pt, mat, OneCasement(),
            new AccessorySelection(
                HandleStyleId: handle.Id,
                LockTypeId: lockT.Id,
                Sill: new SillSelection(SillPosition.Inner),
                Blind: new BlindSelection(blind.Id, BlindControl.Manual)),
            catalog);
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Handle_UnknownId_PropagatesGracefully()
    {
        // Handle id absent from the catalog: TryGetHandle returns null,
        // and the compat lookup also fails → handleNotCompatible.
        var pt = Pt("window");
        var mat = AluMaterial(pt.Id);
        var unknown = Guid.Parse("99999999-9999-9999-9999-999999999999");
        var result = AccessoryValidator.Validate(
            pt, mat, OneCasement(),
            new AccessorySelection(HandleStyleId: unknown),
            AccessoryCatalog.Empty);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.accessory.handleNotCompatible");
    }

    [Fact]
    public void Lock_UnknownId_Returns_LockNotFound()
    {
        var pt = Pt("door");
        var mat = AluMaterial(pt.Id);
        var unknown = Guid.Parse("99999999-9999-9999-9999-999999999998");
        var handle = Handle(HandleModernId, "modern-aluminum");
        var catalog = new AccessoryCatalog(
            new Dictionary<Guid, HandleStyle> { [handle.Id] = handle },
            new Dictionary<Guid, LockType>(),
            new Dictionary<Guid, BlindType>(),
            [(handle.Id, mat.Id)], [], []);
        var result = AccessoryValidator.Validate(
            pt, mat, OneCasement(),
            new AccessorySelection(HandleStyleId: handle.Id, LockTypeId: unknown),
            catalog);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("lockType.notFound");
    }
}
