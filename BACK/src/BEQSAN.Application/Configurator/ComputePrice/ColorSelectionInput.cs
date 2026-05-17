namespace BEQSAN.Application.Configurator.ComputePrice;

/// <summary>
/// Wire shape for the configuration-level color decision. Mirrors
/// <see cref="BEQSAN.Domain.Configurator.ColorSelection"/> with the
/// hex/code pair carried as strings the way the FRONT picks them out of
/// the RAL palette modal.
///
/// <para>
/// <see cref="OuterColorOptionId"/> is required when this object is
/// present. <see cref="InnerColorOptionId"/> defaults to null (same as
/// outer). <see cref="CustomRalHex"/> + <see cref="CustomRalCode"/> are
/// required only when the outer option's slug is <c>ral-custom</c>.
/// </para>
/// </summary>
public sealed record ColorSelectionInput(
    Guid OuterColorOptionId,
    Guid? InnerColorOptionId = null,
    string? CustomRalHex = null,
    string? CustomRalCode = null);
