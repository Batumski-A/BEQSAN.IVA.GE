using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Catalog.GetMaterialsByProductType;

public sealed record GetMaterialsByProductTypeQuery(Guid ProductTypeId)
    : IRequest<Result<IReadOnlyList<MaterialDto>>>;
