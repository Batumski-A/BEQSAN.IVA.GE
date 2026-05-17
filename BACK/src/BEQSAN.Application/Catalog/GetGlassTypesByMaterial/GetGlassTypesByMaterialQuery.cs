using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Catalog.GetGlassTypesByMaterial;

public sealed record GetGlassTypesByMaterialQuery(Guid MaterialId)
    : IRequest<Result<IReadOnlyList<GlassTypeDto>>>;
