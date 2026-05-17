using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Catalog.GetProductTypeDetail;

/// <summary>
/// Loads a single product type by id OR slug. The endpoint detects which
/// from the route param shape (a parseable Guid → by-id; otherwise → by-slug).
/// Returns Result&lt;ProductTypeDetailDto&gt; with the full constraints payload.
/// </summary>
public sealed record GetProductTypeDetailQuery(string IdOrSlug)
    : IRequest<Result<ProductTypeDetailDto>>;
