using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Catalog.GetBlindTypes;

public sealed record GetBlindTypesByProductTypeQuery(Guid ProductTypeId)
    : IRequest<Result<IReadOnlyList<BlindTypeDto>>>;
