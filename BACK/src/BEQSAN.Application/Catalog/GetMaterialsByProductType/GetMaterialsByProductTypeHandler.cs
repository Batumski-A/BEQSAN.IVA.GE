using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Catalog.GetMaterialsByProductType;

internal sealed class GetMaterialsByProductTypeHandler(
    IMaterialReader reader,
    IProductTypeExistsCheck productTypeExists,
    ICacheService cache,
    ILogger<GetMaterialsByProductTypeHandler> logger)
    : IRequestHandler<GetMaterialsByProductTypeQuery, Result<IReadOnlyList<MaterialDto>>>
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public async Task<Result<IReadOnlyList<MaterialDto>>> Handle(
        GetMaterialsByProductTypeQuery request,
        CancellationToken ct)
    {
        var exists = await productTypeExists.ExistsAsync(request.ProductTypeId, ct).ConfigureAwait(false);
        if (!exists)
        {
            return Result.Failure<IReadOnlyList<MaterialDto>>(ProductTypeErrors.NotFound);
        }

        var cacheKey = $"catalog:materials:{request.ProductTypeId:N}:v1";
        var dtos = await cache.GetOrCreateAsync(
            cacheKey,
            async innerCt =>
            {
                logger.LogInformation(
                    "Cache miss for {CacheKey} — loading materials for ProductType {ProductTypeId}",
                    cacheKey, request.ProductTypeId);
                return await reader.ListActiveByProductTypeAsync(request.ProductTypeId, innerCt)
                    .ConfigureAwait(false);
            },
            CacheTtl,
            ct).ConfigureAwait(false);

        return Result.Success<IReadOnlyList<MaterialDto>>(dtos);
    }
}

public interface IMaterialReader
{
    Task<IReadOnlyList<MaterialDto>> ListActiveByProductTypeAsync(Guid productTypeId, CancellationToken ct = default);

    /// <summary>
    /// Loads a single material's domain shape (not the DTO) — used by the
    /// pricing endpoint where we need BasePricePerSqmMinor + ProductTypeId
    /// for cross-field validation.
    /// </summary>
    Task<Material?> GetByIdAsync(Guid id, CancellationToken ct = default);
}

/// <summary>
/// Narrow existence check so the materials handler doesn't pull the full
/// IProductTypeReader contract just to assert a foreign key.
/// </summary>
public interface IProductTypeExistsCheck
{
    Task<bool> ExistsAsync(Guid productTypeId, CancellationToken ct = default);
}
