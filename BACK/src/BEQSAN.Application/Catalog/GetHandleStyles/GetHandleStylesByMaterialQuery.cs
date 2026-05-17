using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Catalog.GetHandleStyles;

public sealed record GetHandleStylesByMaterialQuery(Guid MaterialId)
    : IRequest<Result<IReadOnlyList<HandleStyleDto>>>;
