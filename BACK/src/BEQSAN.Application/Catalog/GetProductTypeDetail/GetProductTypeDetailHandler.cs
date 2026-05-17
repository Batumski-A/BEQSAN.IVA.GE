using System.Globalization;
using BEQSAN.Application.Catalog.GetProductTypes;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Catalog.GetProductTypeDetail;

internal sealed class GetProductTypeDetailHandler(
    IProductTypeReader reader,
    ICacheService cache)
    : IRequestHandler<GetProductTypeDetailQuery, Result<ProductTypeDetailDto>>
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    private readonly IProductTypeReader _reader = reader;
    private readonly ICacheService _cache = cache;

    public async Task<Result<ProductTypeDetailDto>> Handle(
        GetProductTypeDetailQuery request,
        CancellationToken ct)
    {
        var key = $"catalog:product-type:detail:{request.IdOrSlug.ToLowerInvariant()}:v1";
        var dto = await _cache.GetOrCreateAsync(
            key,
            innerCt => LoadAsync(request.IdOrSlug, innerCt),
            CacheTtl,
            ct).ConfigureAwait(false);

        return dto is null
            ? Result.Failure<ProductTypeDetailDto>(ProductTypeErrors.NotFound)
            : Result.Success(dto);
    }

    private async Task<ProductTypeDetailDto?> LoadAsync(string idOrSlug, CancellationToken ct)
    {
        ProductType? entity = Guid.TryParse(idOrSlug, CultureInfo.InvariantCulture, out var id)
            ? await _reader.GetByIdAsync(id, ct).ConfigureAwait(false)
            : await _reader.GetBySlugAsync(idOrSlug, ct).ConfigureAwait(false);

        if (entity is null || !entity.IsActive)
        {
            return null;
        }

        var c = entity.GetConstraints();
        return new ProductTypeDetailDto(
            Id: entity.Id,
            Slug: entity.Slug,
            Name: entity.Name,
            ShortDescription: entity.ShortDescription,
            HeroImageUrl: entity.HeroImageUrl,
            SortOrder: entity.SortOrder,
            Constraints: new DimensionConstraintsDto(
                MinWidthCm: c.MinWidthCm,
                MaxWidthCm: c.MaxWidthCm,
                MinHeightCm: c.MinHeightCm,
                MaxHeightCm: c.MaxHeightCm));
    }
}
