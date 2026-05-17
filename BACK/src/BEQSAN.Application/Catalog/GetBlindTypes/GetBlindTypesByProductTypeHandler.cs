using BEQSAN.Application.Catalog.GetMaterialsByProductType;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Catalog.GetBlindTypes;

internal sealed class GetBlindTypesByProductTypeHandler(
    IBlindTypeReader reader,
    IProductTypeExistsCheck productTypeExists,
    ICacheService cache,
    ILogger<GetBlindTypesByProductTypeHandler> logger)
    : IRequestHandler<GetBlindTypesByProductTypeQuery, Result<IReadOnlyList<BlindTypeDto>>>
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public async Task<Result<IReadOnlyList<BlindTypeDto>>> Handle(
        GetBlindTypesByProductTypeQuery request,
        CancellationToken ct)
    {
        var exists = await productTypeExists.ExistsAsync(request.ProductTypeId, ct).ConfigureAwait(false);
        if (!exists)
        {
            return Result.Failure<IReadOnlyList<BlindTypeDto>>(ProductTypeErrors.NotFound);
        }

        var cacheKey = $"catalog:blind-types:{request.ProductTypeId:N}:v1";
        var dtos = await cache.GetOrCreateAsync(
            cacheKey,
            async innerCt =>
            {
                logger.LogInformation(
                    "Cache miss for {CacheKey} — loading blinds compatible with ProductType {ProductTypeId}",
                    cacheKey, request.ProductTypeId);
                return await reader.ListActiveByProductTypeAsync(request.ProductTypeId, innerCt)
                    .ConfigureAwait(false);
            },
            CacheTtl,
            ct).ConfigureAwait(false);

        return Result.Success<IReadOnlyList<BlindTypeDto>>(dtos);
    }
}

public interface IBlindTypeReader
{
    Task<IReadOnlyList<BlindTypeDto>> ListActiveByProductTypeAsync(Guid productTypeId, CancellationToken ct = default);
    Task<IReadOnlyList<BlindType>> LoadAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<(Guid BlindId, Guid ProductTypeId)>> LoadCompatibilityAsync(CancellationToken ct = default);
}
