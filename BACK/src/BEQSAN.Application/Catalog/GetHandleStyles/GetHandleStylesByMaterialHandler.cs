using BEQSAN.Application.Catalog.GetMaterialsByProductType;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Catalog.GetHandleStyles;

internal sealed class GetHandleStylesByMaterialHandler(
    IHandleStyleReader reader,
    IMaterialReader materialReader,
    ICacheService cache,
    ILogger<GetHandleStylesByMaterialHandler> logger)
    : IRequestHandler<GetHandleStylesByMaterialQuery, Result<IReadOnlyList<HandleStyleDto>>>
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public async Task<Result<IReadOnlyList<HandleStyleDto>>> Handle(
        GetHandleStylesByMaterialQuery request,
        CancellationToken ct)
    {
        var material = await materialReader.GetByIdAsync(request.MaterialId, ct).ConfigureAwait(false);
        if (material is null || !material.IsActive)
        {
            return Result.Failure<IReadOnlyList<HandleStyleDto>>(MaterialErrors.NotFound);
        }

        var cacheKey = $"catalog:handle-styles:{request.MaterialId:N}:v1";
        var dtos = await cache.GetOrCreateAsync(
            cacheKey,
            async innerCt =>
            {
                logger.LogInformation(
                    "Cache miss for {CacheKey} — loading handles compatible with Material {MaterialId}",
                    cacheKey, request.MaterialId);
                return await reader.ListActiveByMaterialAsync(request.MaterialId, innerCt)
                    .ConfigureAwait(false);
            },
            CacheTtl,
            ct).ConfigureAwait(false);

        return Result.Success<IReadOnlyList<HandleStyleDto>>(dtos);
    }
}

/// <summary>
/// Reader for handle-style catalog data. <see cref="ListActiveByMaterialAsync"/>
/// returns the per-material compat set ordered by SortOrder + default flag;
/// <see cref="LoadAllAsync"/> + <see cref="LoadCompatibilityAsync"/> back the
/// AccessoryCatalog bag the pricing pipeline uses.
/// </summary>
public interface IHandleStyleReader
{
    Task<IReadOnlyList<HandleStyleDto>> ListActiveByMaterialAsync(Guid materialId, CancellationToken ct = default);
    Task<IReadOnlyList<HandleStyle>> LoadAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<(Guid HandleId, Guid MaterialId)>> LoadCompatibilityAsync(CancellationToken ct = default);
}
