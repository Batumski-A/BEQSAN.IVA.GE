using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Configurator.ComputePrice;

/// <summary>
/// Phase 1 price input: which product type, which material, the dimensions.
/// Glass/color/accessory fields land in later slices. The endpoint hits this
/// command on every meaningful change in the FRONT configurator (debounced).
/// </summary>
public sealed record ComputePriceCommand(
    Guid ProductTypeId,
    Guid MaterialId,
    int WidthCm,
    int HeightCm) : IRequest<Result<PriceBreakdownDto>>;
