using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Catalog.GetLockTypes;

public sealed record GetLockTypesByProductTypeQuery(Guid ProductTypeId)
    : IRequest<Result<IReadOnlyList<LockTypeDto>>>;
