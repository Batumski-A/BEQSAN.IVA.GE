using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Configurator.ComputePrice;

/// <summary>
/// Configurator price input. The endpoint hits this command on every meaningful
/// change in the FRONT (debounced).
///
/// <para>
/// <see cref="Panes"/> is OPTIONAL: when omitted (null), the calculator
/// synthesizes a single full-width Fixed pane so Step 2/3 request bodies
/// (no panes field) keep producing their regression-canary numbers.
/// </para>
/// </summary>
public sealed record ComputePriceCommand(
    Guid ProductTypeId,
    Guid MaterialId,
    int WidthCm,
    int HeightCm,
    IReadOnlyList<ConfigurationPaneInput>? Panes = null,
    ColorSelectionInput? Color = null,
    AccessorySelectionInput? Accessories = null) : IRequest<Result<PriceBreakdownDto>>;
