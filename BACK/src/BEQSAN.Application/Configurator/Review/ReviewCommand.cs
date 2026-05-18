using BEQSAN.Application.Configurator.ComputePrice;
using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Configurator.Review;

/// <summary>
/// Step-8 review request — same wire shape as <see cref="ComputePriceCommand"/>
/// plus an installation block, returning a richer grouped breakdown +
/// delivery info. The FRONT calls <c>/price</c> for live recompute on
/// earlier steps and switches to <c>/review</c> on Step 8 to render the
/// full summary screen with grouped totals, warranty, and lead time.
/// </summary>
public sealed record ReviewCommand(
    Guid ProductTypeId,
    Guid MaterialId,
    int WidthCm,
    int HeightCm,
    IReadOnlyList<ConfigurationPaneInput>? Panes = null,
    ColorSelectionInput? Color = null,
    AccessorySelectionInput? Accessories = null,
    InstallationOptionInput? Installation = null) : IRequest<Result<ReviewResponseDto>>;
