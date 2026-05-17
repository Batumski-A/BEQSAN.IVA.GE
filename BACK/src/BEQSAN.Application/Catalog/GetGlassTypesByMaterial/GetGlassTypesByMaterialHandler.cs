using BEQSAN.Application.Catalog.GetMaterialsByProductType;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Catalog.GetGlassTypesByMaterial;

internal sealed class GetGlassTypesByMaterialHandler(
    IGlassTypeReader reader,
    IMaterialReader materialReader,
    ICacheService cache,
    ILogger<GetGlassTypesByMaterialHandler> logger)
    : IRequestHandler<GetGlassTypesByMaterialQuery, Result<IReadOnlyList<GlassTypeDto>>>
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public async Task<Result<IReadOnlyList<GlassTypeDto>>> Handle(
        GetGlassTypesByMaterialQuery request,
        CancellationToken ct)
    {
        // We need the material to exist + be active before answering. The
        // reader does the join itself, but a 404 for missing material is a
        // friendlier response than an empty list (which is a legitimate
        // success state for an existing material with no compat rows yet).
        var material = await materialReader.GetByIdAsync(request.MaterialId, ct).ConfigureAwait(false);
        if (material is null || !material.IsActive)
        {
            return Result.Failure<IReadOnlyList<GlassTypeDto>>(MaterialErrors.NotFound);
        }

        var cacheKey = $"catalog:glass-types:{request.MaterialId:N}:v1";
        var dtos = await cache.GetOrCreateAsync(
            cacheKey,
            async innerCt =>
            {
                logger.LogInformation(
                    "Cache miss for {CacheKey} — loading glass types compatible with Material {MaterialId}",
                    cacheKey, request.MaterialId);
                return await reader.ListActiveByMaterialAsync(request.MaterialId, innerCt)
                    .ConfigureAwait(false);
            },
            CacheTtl,
            ct).ConfigureAwait(false);

        return Result.Success<IReadOnlyList<GlassTypeDto>>(dtos);
    }
}

/// <summary>
/// Reader for glass-type catalog data. List variant returns the per-material
/// compatible set ordered for display (default first, then SortOrder).
/// LoadById variants are used by the pricing handler to hand the calculator
/// the dictionary it needs for per-pane glass resolution.
/// </summary>
public interface IGlassTypeReader
{
    Task<IReadOnlyList<GlassTypeDto>> ListActiveByMaterialAsync(Guid materialId, CancellationToken ct = default);

    /// <summary>
    /// Returns the domain entities (not DTOs) for the glass types compatible
    /// with the given material. Used by the pricing pipeline so the
    /// calculator can resolve Guid.Empty → IsDefault and price per pane.
    /// </summary>
    Task<IReadOnlyList<GlassType>> LoadDomainByMaterialAsync(Guid materialId, CancellationToken ct = default);
}
