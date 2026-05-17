namespace BEQSAN.Domain.Configurator;

/// <summary>
/// Configuration-level color decision. Frame color is unified across all
/// panes — per-pane color was deliberately excluded from the Step 6 scope
/// (mixed-frame-color windows are non-standard).
///
/// <para>
/// <see cref="OuterColorOptionId"/> is the visible-outside color and is
/// always required. <see cref="InnerColorOptionId"/> is optional — when
/// null, "inner = outer" (the typical case). Only PVC frames support a
/// different inner color; aluminum is single-pass painted/anodized so
/// inner ≠ outer is rejected by the layout validator.
/// </para>
/// <para>
/// When the outer slug is <c>ral-custom</c>, <see cref="CustomRalHex"/>
/// and <see cref="CustomRalCode"/> carry the modal-picked values and are
/// both required. For any other selection they should be null.
/// </para>
/// </summary>
public sealed record ColorSelection(
    Guid OuterColorOptionId,
    Guid? InnerColorOptionId = null,
    string? CustomRalHex = null,
    string? CustomRalCode = null);
