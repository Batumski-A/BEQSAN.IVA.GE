using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Catalog.GetProductTypes;

/// <summary>
/// Returns all active product types in display order. Hot read path —
/// the handler routes through Dapper + a 5-minute IMemoryCache layer.
/// </summary>
public sealed record GetProductTypesQuery : IRequest<Result<IReadOnlyList<ProductTypeDto>>>;
