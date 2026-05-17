using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Catalog.GetColorsByMaterial;

public sealed record GetColorsByMaterialQuery(Guid MaterialId)
    : IRequest<Result<IReadOnlyList<ColorOptionDto>>>;
