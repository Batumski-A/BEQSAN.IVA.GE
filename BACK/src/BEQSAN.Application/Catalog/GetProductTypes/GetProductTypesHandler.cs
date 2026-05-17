using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Catalog.GetProductTypes;

internal sealed class GetProductTypesHandler(
    IProductTypeReader reader,
    ICacheService cache,
    ILogger<GetProductTypesHandler> logger)
    : IRequestHandler<GetProductTypesQuery, Result<IReadOnlyList<ProductTypeDto>>>
{
    internal const string CacheKey = "catalog:product-types:v1";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    private readonly IProductTypeReader _reader = reader;
    private readonly ICacheService _cache = cache;
    private readonly ILogger<GetProductTypesHandler> _logger = logger;

    public async Task<Result<IReadOnlyList<ProductTypeDto>>> Handle(
        GetProductTypesQuery request,
        CancellationToken cancellationToken)
    {
        var dtos = await _cache.GetOrCreateAsync(
            CacheKey,
            async ct =>
            {
                _logger.LogInformation("Cache miss for {CacheKey} — loading product types from DB", CacheKey);
                return await _reader.ListActiveAsync(ct).ConfigureAwait(false);
            },
            CacheTtl,
            cancellationToken).ConfigureAwait(false);

        return Result.Success<IReadOnlyList<ProductTypeDto>>(dtos);
    }
}

/// <summary>
/// Read-side abstraction for catalog product types. Implemented by
/// Infrastructure using Dapper. Kept narrow so handlers don't take a
/// dependency on a generic repository.
/// </summary>
public interface IProductTypeReader
{
    /// <summary>Wire-shape DTO list for the public catalog endpoint.</summary>
    Task<IReadOnlyList<ProductTypeDto>> ListActiveAsync(CancellationToken ct = default);

    /// <summary>Loads the full domain entity by id — for handlers that need
    /// fields like dimension constraints that the list DTO doesn't carry.</summary>
    Task<ProductType?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Same shape as GetByIdAsync, but keyed by slug. Used by the
    /// detail endpoint when the FRONT navigates with a slug URL.</summary>
    Task<ProductType?> GetBySlugAsync(string slug, CancellationToken ct = default);
}
