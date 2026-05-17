using System.Globalization;
using System.Text.Json;
using BEQSAN.Application.Catalog.GetMaterialsByProductType;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Dapper;

namespace BEQSAN.Infrastructure.Catalog;

internal sealed class MaterialDapperReader(IDbConnectionFactory factory) : IMaterialReader
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    // Active materials for one product type, ordered by sort_order then ka name.
    private const string ListSql = """
        SELECT
            id                          AS Id,
            product_type_id             AS ProductTypeId,
            slug                        AS Slug,
            name                        AS NameJson,
            short_description           AS ShortDescriptionJson,
            family                      AS Family,
            thermal_rating              AS ThermalRating,
            base_price_per_sqm_minor    AS BasePricePerSqmMinor,
            currency                    AS Currency,
            sort_order                  AS SortOrder
        FROM materials
        WHERE is_active = 1
          AND product_type_id = @ProductTypeId
        ORDER BY sort_order, json_extract(name, '$.ka');
        """;

    private const string GetByIdSql = """
        SELECT
            id                          AS Id,
            product_type_id             AS ProductTypeId,
            slug                        AS Slug,
            name                        AS NameJson,
            short_description           AS ShortDescriptionJson,
            family                      AS Family,
            thermal_rating              AS ThermalRating,
            base_price_per_sqm_minor    AS BasePricePerSqmMinor,
            currency                    AS Currency,
            sort_order                  AS SortOrder,
            is_active                   AS IsActive,
            created_at_utc              AS CreatedAtUtc
        FROM materials
        WHERE id = @Id;
        """;

    private readonly IDbConnectionFactory _factory = factory;

    public async Task<IReadOnlyList<MaterialDto>> ListActiveByProductTypeAsync(
        Guid productTypeId, CancellationToken ct = default)
    {
        using var connection = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await connection
            .QueryAsync<ListRow>(ListSql, new { ProductTypeId = productTypeId.ToString("D", CultureInfo.InvariantCulture).ToUpperInvariant() })
            .ConfigureAwait(false);

        return rows.Select(r => new MaterialDto(
                Id: Guid.Parse(r.Id, CultureInfo.InvariantCulture),
                ProductTypeId: Guid.Parse(r.ProductTypeId, CultureInfo.InvariantCulture),
                Slug: r.Slug,
                Name: DeserializeLocalized(r.NameJson),
                ShortDescription: DeserializeLocalized(r.ShortDescriptionJson),
                Family: FamilyToString((MaterialFamily)r.Family),
                ThermalRating: ThermalRatingToString((ThermalRating)r.ThermalRating),
                BasePricePerSqmMinor: r.BasePricePerSqmMinor,
                BasePricePerSqmDisplay: Money.FromMinor(r.BasePricePerSqmMinor, ParseCurrency(r.Currency))
                    .Amount.ToString("0.00", CultureInfo.InvariantCulture),
                Currency: r.Currency,
                SortOrder: r.SortOrder))
            .ToList();
    }

    public async Task<Material?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        using var connection = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var row = await connection
            .QuerySingleOrDefaultAsync<GetByIdRow?>(GetByIdSql, new { Id = id.ToString("D", CultureInfo.InvariantCulture).ToUpperInvariant() })
            .ConfigureAwait(false);
        if (row is null)
        {
            return null;
        }

        return new Material
        {
            Id = Guid.Parse(row.Id, CultureInfo.InvariantCulture),
            ProductTypeId = Guid.Parse(row.ProductTypeId, CultureInfo.InvariantCulture),
            Slug = row.Slug,
            Name = DeserializeLocalized(row.NameJson),
            ShortDescription = DeserializeLocalized(row.ShortDescriptionJson),
            Family = (MaterialFamily)row.Family,
            ThermalRating = (ThermalRating)row.ThermalRating,
            BasePricePerSqmMinor = row.BasePricePerSqmMinor,
            Currency = ParseCurrency(row.Currency),
            SortOrder = row.SortOrder,
            IsActive = row.IsActive,
            CreatedAtUtc = DateTime.Parse(
                row.CreatedAtUtc, CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal),
        };
    }

    private static LocalizedText DeserializeLocalized(string json) =>
        JsonSerializer.Deserialize<LocalizedText>(json, JsonOptions) ?? new LocalizedText();

    private static Currency ParseCurrency(string s) =>
        Enum.TryParse<Currency>(s, ignoreCase: true, out var c) ? c : Currency.Gel;

    private static string FamilyToString(MaterialFamily family) => family switch
    {
        MaterialFamily.Aluminum => "aluminum",
        MaterialFamily.Pvc => "pvc",
        _ => "aluminum",
    };

    private static string ThermalRatingToString(ThermalRating rating) => rating switch
    {
        ThermalRating.None => "none",
        ThermalRating.Basic => "basic",
        ThermalRating.Thermal => "thermal",
        ThermalRating.HighThermal => "highThermal",
        _ => "none",
    };

    private sealed class ListRow
    {
        public string Id { get; set; } = string.Empty;
        public string ProductTypeId { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string NameJson { get; set; } = "{}";
        public string ShortDescriptionJson { get; set; } = "{}";
        public int Family { get; set; }
        public int ThermalRating { get; set; }
        public int BasePricePerSqmMinor { get; set; }
        public string Currency { get; set; } = "GEL";
        public int SortOrder { get; set; }
    }

    private sealed class GetByIdRow
    {
        public string Id { get; set; } = string.Empty;
        public string ProductTypeId { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string NameJson { get; set; } = "{}";
        public string ShortDescriptionJson { get; set; } = "{}";
        public int Family { get; set; }
        public int ThermalRating { get; set; }
        public int BasePricePerSqmMinor { get; set; }
        public string Currency { get; set; } = "GEL";
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public string CreatedAtUtc { get; set; } = string.Empty;
    }
}

internal sealed class ProductTypeExistsCheckDapper(IDbConnectionFactory factory) : IProductTypeExistsCheck
{
    private const string Sql = "SELECT 1 FROM product_types WHERE id = @Id AND is_active = 1 LIMIT 1;";

    private readonly IDbConnectionFactory _factory = factory;

    public async Task<bool> ExistsAsync(Guid productTypeId, CancellationToken ct = default)
    {
        using var connection = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var hit = await connection
            .QueryFirstOrDefaultAsync<int?>(
                Sql,
                new { Id = productTypeId.ToString("D", CultureInfo.InvariantCulture).ToUpperInvariant() })
            .ConfigureAwait(false);
        return hit.HasValue;
    }
}
