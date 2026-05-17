namespace BEQSAN.Domain.Configurator;

/// <summary>
/// Configuration-level accessory bundle. Every field is optional — the
/// customer can pick any subset of (handle, lock, sill, blind) for their
/// configuration. Mosquito net is per-pane (see <see cref="ConfigurationPane.HasMosquitoNet"/>),
/// not in here.
///
/// <para>
/// Handle + lock prices scale with the number of openable panes (per-pane
/// surcharge × count). Sill is config-level (one continuous slab below
/// the frame) priced by linear metres. Blind is a single assembly per
/// frame, priced as base mounting + per-m² + control surcharge.
/// </para>
/// <para>
/// Door product types have <em>required</em> handle + lock (legal +
/// security expectation) — the validator enforces this when any openable
/// pane is present. Window / sliding / etc. treat the whole selection as
/// optional.
/// </para>
/// </summary>
public sealed record AccessorySelection(
    Guid? HandleStyleId = null,
    Guid? LockTypeId = null,
    SillSelection? Sill = null,
    BlindSelection? Blind = null);

public sealed record SillSelection(
    SillPosition Position,
    Guid? ColorOptionId = null,
    int? CustomLengthCm = null);

public sealed record BlindSelection(
    Guid BlindTypeId,
    BlindControl Control,
    Guid? ColorOptionId = null);

public enum SillPosition
{
    Inner = 0,
    Outer = 1,
    Both = 2,
}

public enum BlindControl
{
    Manual = 0,
    Electric = 1,
    Remote = 2,
}
