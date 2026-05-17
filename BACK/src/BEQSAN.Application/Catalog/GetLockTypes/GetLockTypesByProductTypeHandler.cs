using BEQSAN.Application.Catalog.GetMaterialsByProductType;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Catalog.GetLockTypes;

internal sealed class GetLockTypesByProductTypeHandler(
    ILockTypeReader reader,
    IProductTypeExistsCheck productTypeExists,
    ICacheService cache,
    ILogger<GetLockTypesByProductTypeHandler> logger)
    : IRequestHandler<GetLockTypesByProductTypeQuery, Result<IReadOnlyList<LockTypeDto>>>
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public async Task<Result<IReadOnlyList<LockTypeDto>>> Handle(
        GetLockTypesByProductTypeQuery request,
        CancellationToken ct)
    {
        var exists = await productTypeExists.ExistsAsync(request.ProductTypeId, ct).ConfigureAwait(false);
        if (!exists)
        {
            return Result.Failure<IReadOnlyList<LockTypeDto>>(ProductTypeErrors.NotFound);
        }

        var cacheKey = $"catalog:lock-types:{request.ProductTypeId:N}:v1";
        var dtos = await cache.GetOrCreateAsync(
            cacheKey,
            async innerCt =>
            {
                logger.LogInformation(
                    "Cache miss for {CacheKey} — loading locks compatible with ProductType {ProductTypeId}",
                    cacheKey, request.ProductTypeId);
                return await reader.ListActiveByProductTypeAsync(request.ProductTypeId, innerCt)
                    .ConfigureAwait(false);
            },
            CacheTtl,
            ct).ConfigureAwait(false);

        return Result.Success<IReadOnlyList<LockTypeDto>>(dtos);
    }
}

public interface ILockTypeReader
{
    Task<IReadOnlyList<LockTypeDto>> ListActiveByProductTypeAsync(Guid productTypeId, CancellationToken ct = default);
    Task<IReadOnlyList<LockType>> LoadAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<(Guid LockId, Guid ProductTypeId)>> LoadCompatibilityAsync(CancellationToken ct = default);
}
