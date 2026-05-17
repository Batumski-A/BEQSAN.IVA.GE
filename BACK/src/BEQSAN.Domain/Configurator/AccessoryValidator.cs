using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;

namespace BEQSAN.Domain.Configurator;

/// <summary>
/// Pure validation of an <see cref="AccessorySelection"/> against the
/// chosen product type, material, and pane layout. Split out from
/// <see cref="LayoutValidator"/> at the Step-7 size threshold — same
/// shape, same "no I/O, no time, no randomness" contract.
///
/// <para>
/// Caller hands in an <see cref="AccessoryCatalog"/> bag with the
/// per-material / per-product-type allow-lists already resolved by the
/// pricing handler. Returns <see cref="Result.Success"/> when the
/// selection is null (whole step is optional) OR every present field
/// passes its compatibility + per-product rules.
/// </para>
/// </summary>
public static class AccessoryValidator
{
    public static Result Validate(
        ProductType productType,
        Material material,
        IReadOnlyList<ConfigurationPane> panes,
        AccessorySelection? accessories,
        AccessoryCatalog catalog)
    {
        if (accessories is null)
        {
            return Result.Success();
        }

        var openablePanes = panes
            .Where(p => p.OpeningType != PaneOpeningType.Fixed)
            .ToList();
        var hasOpenable = openablePanes.Count > 0;

        var isDoor = string.Equals(productType.Slug, "door", StringComparison.Ordinal);

        // Door — handle + lock required when any pane opens (essentially
        // always; a door without any opening pane is a wall).
        if (isDoor && hasOpenable)
        {
            if (accessories.HandleStyleId is null)
            {
                return Result.Failure(
                    AccessoryErrors.HandleRequired
                        .WithMetadata("reason", "door"));
            }
            if (accessories.LockTypeId is null)
            {
                return Result.Failure(
                    AccessoryErrors.LockRequired
                        .WithMetadata("reason", "door"));
            }
        }

        // Handle without any openable pane is nonsense — no surface to
        // mount on. The price calculator would silently skip it; the
        // validator surfaces it as a clearer error.
        if (accessories.HandleStyleId is not null && !hasOpenable)
        {
            return Result.Failure(AccessoryErrors.HandleNoOpenablePane);
        }

        // Handle compatibility with material (rare gating — e.g. premium-
        // secustic is ALU-only).
        if (accessories.HandleStyleId is { } handleId
            && !catalog.HandleAvailableForMaterial(handleId, material.Id))
        {
            var slug = catalog.TryGetHandle(handleId)?.Slug ?? string.Empty;
            return Result.Failure(
                AccessoryErrors.HandleNotCompatible
                    .WithMetadata("materialSlug", material.Slug)
                    .WithMetadata("handleSlug", slug));
        }

        // Lock compatibility — per product type (smart-fingerprint is door-
        // only Phase 1) AND per opening-type set (multi-point needs full-
        // perimeter opening).
        if (accessories.LockTypeId is { } lockId)
        {
            var lockType = catalog.TryGetLock(lockId);
            if (lockType is null)
            {
                return Result.Failure(LockTypeErrors.NotFound);
            }

            if (!catalog.LockAvailableForProductType(lockId, productType.Id))
            {
                return Result.Failure(
                    AccessoryErrors.LockNotCompatibleProduct
                        .WithMetadata("productTypeSlug", productType.Slug)
                        .WithMetadata("lockSlug", lockType.Slug));
            }

            if (lockType.RequiresCasementOrTurn)
            {
                var hasRequiredOpening = openablePanes.Any(p =>
                    p.OpeningType is PaneOpeningType.Casement or PaneOpeningType.TiltAndTurn);
                if (!hasRequiredOpening)
                {
                    return Result.Failure(
                        AccessoryErrors.LockRequiresFullOpening
                            .WithMetadata("lockSlug", lockType.Slug));
                }
            }
        }

        // Sill — custom length sanity (auto-from-frame-width is unbounded
        // because PriceCalculator clamps via configurator dimension range
        // upstream).
        if (accessories.Sill is { } sill
            && sill.CustomLengthCm is { } customLen
            && customLen is < 30 or > 800)
        {
            return Result.Failure(
                AccessoryErrors.SillLengthOutOfRange
                    .WithMetadata("min", 30)
                    .WithMetadata("max", 800)
                    .WithMetadata("actual", customLen));
        }

        // Blind — per-product-type compatibility + control-vs-capability
        // pairing.
        if (accessories.Blind is { } blind)
        {
            var blindType = catalog.TryGetBlind(blind.BlindTypeId);
            if (blindType is null)
            {
                return Result.Failure(BlindTypeErrors.NotFound);
            }

            if (!catalog.BlindAvailableForProductType(blind.BlindTypeId, productType.Id))
            {
                return Result.Failure(
                    AccessoryErrors.BlindNotCompatibleProduct
                        .WithMetadata("productTypeSlug", productType.Slug)
                        .WithMetadata("blindSlug", blindType.Slug));
            }

            if (blind.Control != BlindControl.Manual && !blindType.SupportsElectric)
            {
                return Result.Failure(
                    AccessoryErrors.BlindControlNotSupported
                        .WithMetadata("blindSlug", blindType.Slug)
                        .WithMetadata("requestedControl", blind.Control.ToString().ToLowerInvariant()));
            }
        }

        return Result.Success();
    }
}

/// <summary>
/// Lookup bag passed in by the pricing handler. Holds per-material /
/// per-product-type allow-lists + the domain entities the validator
/// + calculator need. Built once per request; immutable.
/// </summary>
public sealed class AccessoryCatalog
{
    private readonly IReadOnlyDictionary<Guid, HandleStyle> _handles;
    private readonly IReadOnlyDictionary<Guid, LockType> _locks;
    private readonly IReadOnlyDictionary<Guid, BlindType> _blinds;
    private readonly HashSet<(Guid HandleId, Guid MaterialId)> _handleMaterial;
    private readonly HashSet<(Guid LockId, Guid ProductTypeId)> _lockProductType;
    private readonly HashSet<(Guid BlindId, Guid ProductTypeId)> _blindProductType;

    public AccessoryCatalog(
        IReadOnlyDictionary<Guid, HandleStyle> handles,
        IReadOnlyDictionary<Guid, LockType> locks,
        IReadOnlyDictionary<Guid, BlindType> blinds,
        IEnumerable<(Guid HandleId, Guid MaterialId)> handleMaterial,
        IEnumerable<(Guid LockId, Guid ProductTypeId)> lockProductType,
        IEnumerable<(Guid BlindId, Guid ProductTypeId)> blindProductType)
    {
        _handles = handles;
        _locks = locks;
        _blinds = blinds;
        _handleMaterial = [.. handleMaterial];
        _lockProductType = [.. lockProductType];
        _blindProductType = [.. blindProductType];
    }

    public static AccessoryCatalog Empty { get; } = new(
        new Dictionary<Guid, HandleStyle>(),
        new Dictionary<Guid, LockType>(),
        new Dictionary<Guid, BlindType>(),
        [], [], []);

    public bool IsEmpty => _handles.Count == 0 && _locks.Count == 0 && _blinds.Count == 0;

    public HandleStyle? TryGetHandle(Guid id) => _handles.GetValueOrDefault(id);
    public LockType? TryGetLock(Guid id) => _locks.GetValueOrDefault(id);
    public BlindType? TryGetBlind(Guid id) => _blinds.GetValueOrDefault(id);

    public bool HandleAvailableForMaterial(Guid handleId, Guid materialId) =>
        _handleMaterial.Contains((handleId, materialId));

    public bool LockAvailableForProductType(Guid lockId, Guid productTypeId) =>
        _lockProductType.Contains((lockId, productTypeId));

    public bool BlindAvailableForProductType(Guid blindId, Guid productTypeId) =>
        _blindProductType.Contains((blindId, productTypeId));
}

public static class AccessoryErrors
{
    public static readonly Error HandleRequired = Error.Validation(
        "configurator.accessory.handleRequired",
        "კარს სახელური სავალდებულოა.",
        field: "accessories");

    public static readonly Error HandleNoOpenablePane = Error.Validation(
        "configurator.accessory.handleNoOpenablePane",
        "სახელური საჭიროა მხოლოდ გასაღებ პანელისთვის.",
        field: "accessories");

    public static readonly Error HandleNotCompatible = Error.BusinessRule(
        "configurator.accessory.handleNotCompatible",
        "ეს სახელური ამ მასალაში არ მუშავდება.") with
    { Field = "accessories" };

    public static readonly Error LockRequired = Error.Validation(
        "configurator.accessory.lockRequired",
        "კარს საკეტი სავალდებულოა.",
        field: "accessories");

    public static readonly Error LockNotCompatibleProduct = Error.BusinessRule(
        "configurator.accessory.lockNotCompatibleProduct",
        "ეს საკეტი ამ პროდუქტისთვის არ მუშავდება.") with
    { Field = "accessories" };

    public static readonly Error LockRequiresFullOpening = Error.BusinessRule(
        "configurator.accessory.lockRequiresFullOpening",
        "ეს საკეტი საჭიროებს გასაღები ან გასაღები+დასაკეცი პანელს.") with
    { Field = "accessories" };

    public static readonly Error SillLengthOutOfRange = Error.Validation(
        "configurator.accessory.sillLengthOutOfRange",
        "ფერთულის სიგრძე დაშვებულ ფარგლებში უნდა იყოს.",
        field: "accessories");

    public static readonly Error BlindNotCompatibleProduct = Error.BusinessRule(
        "configurator.accessory.blindNotCompatibleProduct",
        "ეს ჟალუზი ამ პროდუქტისთვის არ მუშავდება.") with
    { Field = "accessories" };

    public static readonly Error BlindControlNotSupported = Error.Validation(
        "configurator.accessory.blindControlNotSupported",
        "ამ ჟალუზს მითითებული მართვა არ აქვს.",
        field: "accessories");
}
