using System.Globalization;
using System.Text.Json;
using BEQSAN.Application.Catalog.GetProductTypes;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Dapper;

namespace BEQSAN.Infrastructure.Catalog;

internal sealed class ProductTypeDapperReader(IDbConnectionFactory factory) : IProductTypeReader
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private const string ListSql = """
        SELECT
            id              AS Id,
            slug            AS Slug,
            name            AS NameJson,
            short_description AS ShortDescriptionJson,
            hero_image_url  AS HeroImageUrl,
            sort_order      AS SortOrder
        FROM product_types
        WHERE is_active = 1
        ORDER BY sort_order, json_extract(name, '$.ka');
        """;

    private const string EntityColumns = """
        id                      AS Id,
        slug                    AS Slug,
        name                    AS NameJson,
        short_description       AS ShortDescriptionJson,
        hero_image_url          AS HeroImageUrl,
        sort_order              AS SortOrder,
        is_active               AS IsActive,
        created_at_utc          AS CreatedAtUtc,
        min_width_cm            AS MinWidthCm,
        max_width_cm            AS MaxWidthCm,
        min_height_cm           AS MinHeightCm,
        max_height_cm           AS MaxHeightCm
        """;

    private static readonly string GetByIdSql = $"SELECT {EntityColumns} FROM product_types WHERE id = @Id LIMIT 1;";
    private static readonly string GetBySlugSql = $"SELECT {EntityColumns} FROM product_types WHERE slug = @Slug LIMIT 1;";

    private readonly IDbConnectionFactory _factory = factory;

    public async Task<IReadOnlyList<ProductTypeDto>> ListActiveAsync(CancellationToken ct = default)
    {
        using var connection = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await connection.QueryAsync<ListRow>(ListSql).ConfigureAwait(false);

        return rows.Select(r => new ProductTypeDto(
                Id: Guid.Parse(r.Id, CultureInfo.InvariantCulture),
                Slug: r.Slug,
                Name: Deserialize(r.NameJson),
                ShortDescription: Deserialize(r.ShortDescriptionJson),
                HeroImageUrl: r.HeroImageUrl,
                SortOrder: r.SortOrder))
            .ToList();
    }

    public async Task<ProductType?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        using var connection = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var row = await connection
            .QuerySingleOrDefaultAsync<EntityRow?>(
                GetByIdSql,
                new { Id = id.ToString("D", CultureInfo.InvariantCulture).ToUpperInvariant() })
            .ConfigureAwait(false);
        return Hydrate(row);
    }

    public async Task<ProductType?> GetBySlugAsync(string slug, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return null;
        }

        using var connection = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var row = await connection
            .QuerySingleOrDefaultAsync<EntityRow?>(GetBySlugSql, new { Slug = slug.ToLowerInvariant() })
            .ConfigureAwait(false);
        return Hydrate(row);
    }

    private static ProductType? Hydrate(EntityRow? row)
    {
        if (row is null)
        {
            return null;
        }

        return new ProductType
        {
            Id = Guid.Parse(row.Id, CultureInfo.InvariantCulture),
            Slug = row.Slug,
            Name = Deserialize(row.NameJson),
            ShortDescription = Deserialize(row.ShortDescriptionJson),
            HeroImageUrl = row.HeroImageUrl,
            SortOrder = row.SortOrder,
            IsActive = row.IsActive,
            CreatedAtUtc = DateTime.Parse(
                row.CreatedAtUtc,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal),
            MinWidthCm = row.MinWidthCm,
            MaxWidthCm = row.MaxWidthCm,
            MinHeightCm = row.MinHeightCm,
            MaxHeightCm = row.MaxHeightCm,
        };
    }

    private static LocalizedText Deserialize(string json) =>
        JsonSerializer.Deserialize<LocalizedText>(json, JsonOptions) ?? new LocalizedText();

    private sealed class ListRow
    {
        public string Id { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string NameJson { get; set; } = "{}";
        public string ShortDescriptionJson { get; set; } = "{}";
        public string HeroImageUrl { get; set; } = string.Empty;
        public int SortOrder { get; set; }
    }

    private sealed class EntityRow
    {
        public string Id { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string NameJson { get; set; } = "{}";
        public string ShortDescriptionJson { get; set; } = "{}";
        public string HeroImageUrl { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public string CreatedAtUtc { get; set; } = string.Empty;
        public int MinWidthCm { get; set; }
        public int MaxWidthCm { get; set; }
        public int MinHeightCm { get; set; }
        public int MaxHeightCm { get; set; }
    }
}
