using System.Text.Json;
using BEQSAN.Application.Catalog.GetProductTypes;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.ValueObjects;
using Dapper;

namespace BEQSAN.Infrastructure.Catalog;

internal sealed class ProductTypeDapperReader(IDbConnectionFactory factory) : IProductTypeReader
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    // ORDER BY sort_order primarily, then ka name for ties — uses SQLite's
    // json_extract which is in the json1 extension (included in SQLite ≥ 3.38).
    private const string Sql = """
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

    private readonly IDbConnectionFactory _factory = factory;

    public async Task<IReadOnlyList<ProductTypeDto>> ListActiveAsync(CancellationToken ct = default)
    {
        using var connection = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await connection.QueryAsync<Row>(Sql).ConfigureAwait(false);

        return rows.Select(r => new ProductTypeDto(
                Id: Guid.Parse(r.Id, System.Globalization.CultureInfo.InvariantCulture),
                Slug: r.Slug,
                Name: Deserialize(r.NameJson),
                ShortDescription: Deserialize(r.ShortDescriptionJson),
                HeroImageUrl: r.HeroImageUrl,
                SortOrder: r.SortOrder))
            .ToList();
    }

    private static LocalizedText Deserialize(string json) =>
        JsonSerializer.Deserialize<LocalizedText>(json, JsonOptions) ?? new LocalizedText();

    /// <summary>
    /// Row shape Dapper materializes. Id stays as TEXT (string) because
    /// SQLite stores GUIDs as text and Dapper's default convert path
    /// refuses string → Guid. We parse it once in the projector above.
    /// </summary>
    private sealed class Row
    {
        public string Id { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string NameJson { get; set; } = "{}";
        public string ShortDescriptionJson { get; set; } = "{}";
        public string HeroImageUrl { get; set; } = string.Empty;
        public int SortOrder { get; set; }
    }
}
