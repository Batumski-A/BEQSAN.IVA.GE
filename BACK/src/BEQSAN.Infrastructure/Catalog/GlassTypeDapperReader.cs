using System.Globalization;
using System.Text.Json;
using BEQSAN.Application.Catalog.GetGlassTypesByMaterial;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Dapper;

namespace BEQSAN.Infrastructure.Catalog;

internal sealed class GlassTypeDapperReader(IDbConnectionFactory factory) : IGlassTypeReader
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    // Glass types compatible with one material, ordered for display:
    // default first (so the FRONT can auto-select it without re-sorting),
    // then sort_order ascending.
    private const string ListSql = """
        SELECT
            g.id                            AS Id,
            g.slug                          AS Slug,
            g.name                          AS NameJson,
            g.short_description             AS ShortDescriptionJson,
            g.pane_count                    AS PaneCount,
            g.surcharge_per_sqm_minor       AS SurchargePerSqmMinor,
            g.currency                      AS Currency,
            g.u_value                       AS UValue,
            g.sort_order                    AS SortOrder,
            g.is_default                    AS IsDefault
        FROM glass_types g
        INNER JOIN material_glass_compatibility c ON c.glass_type_id = g.id
        WHERE g.is_active = 1
          AND c.material_id = @MaterialId
        ORDER BY g.is_default DESC, g.sort_order, json_extract(g.name, '$.ka');
        """;

    // Domain-shaped load for the pricing pipeline. Same join as ListSql but
    // hydrates the full entity (CreatedAtUtc, IsActive) so the calculator's
    // dictionary key lookups are stable.
    private const string LoadDomainSql = """
        SELECT
            g.id                            AS Id,
            g.slug                          AS Slug,
            g.name                          AS NameJson,
            g.short_description             AS ShortDescriptionJson,
            g.pane_count                    AS PaneCount,
            g.surcharge_per_sqm_minor       AS SurchargePerSqmMinor,
            g.currency                      AS Currency,
            g.u_value                       AS UValue,
            g.sort_order                    AS SortOrder,
            g.is_default                    AS IsDefault,
            g.is_active                     AS IsActive,
            g.created_at_utc                AS CreatedAtUtc
        FROM glass_types g
        INNER JOIN material_glass_compatibility c ON c.glass_type_id = g.id
        WHERE g.is_active = 1
          AND c.material_id = @MaterialId;
        """;

    private readonly IDbConnectionFactory _factory = factory;

    public async Task<IReadOnlyList<GlassTypeDto>> ListActiveByMaterialAsync(
        Guid materialId, CancellationToken ct = default)
    {
        using var connection = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await connection
            .QueryAsync<ListRow>(
                ListSql,
                new { MaterialId = materialId.ToString("D", CultureInfo.InvariantCulture).ToUpperInvariant() })
            .ConfigureAwait(false);

        return rows.Select(r => new GlassTypeDto(
                Id: Guid.Parse(r.Id, CultureInfo.InvariantCulture),
                Slug: r.Slug,
                Name: DeserializeLocalized(r.NameJson),
                ShortDescription: DeserializeLocalized(r.ShortDescriptionJson),
                PaneCount: r.PaneCount,
                SurchargePerSqmMinor: r.SurchargePerSqmMinor,
                SurchargePerSqmDisplay: Money.FromMinor(r.SurchargePerSqmMinor, ParseCurrency(r.Currency))
                    .Amount.ToString("0.00", CultureInfo.InvariantCulture),
                Currency: r.Currency,
                UValue: decimal.Parse(r.UValue, CultureInfo.InvariantCulture),
                IsDefault: r.IsDefault,
                SortOrder: r.SortOrder))
            .ToList();
    }

    public async Task<IReadOnlyList<GlassType>> LoadDomainByMaterialAsync(
        Guid materialId, CancellationToken ct = default)
    {
        using var connection = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await connection
            .QueryAsync<DomainRow>(
                LoadDomainSql,
                new { MaterialId = materialId.ToString("D", CultureInfo.InvariantCulture).ToUpperInvariant() })
            .ConfigureAwait(false);

        return rows.Select(r => new GlassType
        {
            Id = Guid.Parse(r.Id, CultureInfo.InvariantCulture),
            Slug = r.Slug,
            Name = DeserializeLocalized(r.NameJson),
            ShortDescription = DeserializeLocalized(r.ShortDescriptionJson),
            PaneCount = r.PaneCount,
            SurchargePerSqmMinor = r.SurchargePerSqmMinor,
            Currency = ParseCurrency(r.Currency),
            UValue = decimal.Parse(r.UValue, CultureInfo.InvariantCulture),
            SortOrder = r.SortOrder,
            IsDefault = r.IsDefault,
            IsActive = r.IsActive,
            CreatedAtUtc = DateTime.Parse(
                r.CreatedAtUtc, CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal),
        })
        .ToList();
    }

    private static LocalizedText DeserializeLocalized(string json) =>
        JsonSerializer.Deserialize<LocalizedText>(json, JsonOptions) ?? new LocalizedText();

    private static Currency ParseCurrency(string s) =>
        Enum.TryParse<Currency>(s, ignoreCase: true, out var c) ? c : Currency.Gel;

    private class ListRow
    {
        public string Id { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string NameJson { get; set; } = "{}";
        public string ShortDescriptionJson { get; set; } = "{}";
        public int PaneCount { get; set; }
        public int SurchargePerSqmMinor { get; set; }
        public string Currency { get; set; } = "GEL";
        public string UValue { get; set; } = "0";
        public int SortOrder { get; set; }
        public bool IsDefault { get; set; }
    }

    private sealed class DomainRow : ListRow
    {
        public bool IsActive { get; set; }
        public string CreatedAtUtc { get; set; } = string.Empty;
    }
}
