namespace BEQSAN.Application.Configurator.ComputePrice;

/// <summary>
/// Wire shape for the configuration-level accessory bundle. Mirrors
/// <see cref="BEQSAN.Domain.Configurator.AccessorySelection"/> with the
/// enums kept as strings the way the FRONT serialises them:
///   sill.position: "Inner" | "Outer" | "Both"
///   blind.control: "Manual" | "Electric" | "Remote"
///
/// <para>
/// Every field is optional — the customer can skip the whole step. Door
/// product types must populate <see cref="HandleStyleId"/> +
/// <see cref="LockTypeId"/> when any pane opens; the validator enforces
/// that with `reason: "door"` metadata.
/// </para>
/// </summary>
public sealed record AccessorySelectionInput(
    Guid? HandleStyleId = null,
    Guid? LockTypeId = null,
    SillSelectionInput? Sill = null,
    BlindSelectionInput? Blind = null);

public sealed record SillSelectionInput(
    string Position,
    Guid? ColorOptionId = null,
    int? CustomLengthCm = null);

public sealed record BlindSelectionInput(
    Guid BlindTypeId,
    string Control,
    Guid? ColorOptionId = null);
