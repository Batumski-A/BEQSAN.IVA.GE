using BEQSAN.Application.Catalog.GetMaterialsByProductType;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Catalog.GetColorsByMaterial;

internal sealed class GetColorsByMaterialHandler(
    IColorOptionReader reader,
    IMaterialReader materialReader,
    ICacheService cache,
    ILogger<GetColorsByMaterialHandler> logger)
    : IRequestHandler<GetColorsByMaterialQuery, Result<IReadOnlyList<ColorOptionDto>>>
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public async Task<Result<IReadOnlyList<ColorOptionDto>>> Handle(
        GetColorsByMaterialQuery request,
        CancellationToken ct)
    {
        var material = await materialReader.GetByIdAsync(request.MaterialId, ct).ConfigureAwait(false);
        if (material is null || !material.IsActive)
        {
            return Result.Failure<IReadOnlyList<ColorOptionDto>>(MaterialErrors.NotFound);
        }

        var cacheKey = $"catalog:colors:{request.MaterialId:N}:v1";
        var dtos = await cache.GetOrCreateAsync(
            cacheKey,
            async innerCt =>
            {
                logger.LogInformation(
                    "Cache miss for {CacheKey} — loading colors compatible with Material {MaterialId}",
                    cacheKey, request.MaterialId);
                return await reader.ListActiveByMaterialAsync(request.MaterialId, innerCt)
                    .ConfigureAwait(false);
            },
            CacheTtl,
            ct).ConfigureAwait(false);

        return Result.Success<IReadOnlyList<ColorOptionDto>>(dtos);
    }
}

/// <summary>
/// Reader for color-option catalog data. <see cref="ListActiveByMaterialAsync"/>
/// excludes the <c>ral-custom</c> placeholder slug from the public list
/// (it's modal-only, not browseable). <see cref="LoadDomainByMaterialAsync"/>
/// returns the FULL set including ral-custom so the pricing pipeline can
/// resolve it when the request body picks it.
/// </summary>
public interface IColorOptionReader
{
    Task<IReadOnlyList<ColorOptionDto>> ListActiveByMaterialAsync(Guid materialId, CancellationToken ct = default);

    Task<IReadOnlyList<ColorOption>> LoadDomainByMaterialAsync(Guid materialId, CancellationToken ct = default);
}
