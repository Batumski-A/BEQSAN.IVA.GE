using System.Globalization;
using System.Text.Json;
using BEQSAN.Application.Catalog.GetColorsByMaterial;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Dapper;

namespace BEQSAN.Infrastructure.Catalog;

internal sealed class ColorOptionDapperReader(IDbConnectionFactory factory) : IColorOptionReader
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    // Public list — excludes the ral-custom placeholder (not browseable;
    // FRONT opens the RAL palette modal instead).
    private const string ListSql = """
        SELECT
            c.id                            AS Id,
            c.slug                          AS Slug,
            c.name                          AS NameJson,
            c.short_description             AS ShortDescriptionJson,
            c.family                        AS Family,
            c.hex_code                      AS HexCode,
            c.ral_code                      AS RalCode,
            c.wood_texture_url              AS WoodTextureUrl,
            c.surcharge_minor               AS SurchargeMinor,
            c.currency                      AS Currency,
            c.sort_order                    AS SortOrder,
            c.is_default                    AS IsDefault
        FROM color_options c
        INNER JOIN material_color_compatibility m ON m.color_option_id = c.id
        WHERE c.is_active = 1
          AND m.material_id = @MaterialId
          AND c.slug != 'ral-custom'
        ORDER BY c.is_default DESC, c.sort_order, json_extract(c.name, '$.ka');
        """;

    // Domain load — includes ral-custom (needed by the validator + calculator
    // to resolve the slug check when the user picks from the modal).
    private const string LoadDomainSql = """
        SELECT
            c.id                            AS Id,
            c.slug                          AS Slug,
            c.name                          AS NameJson,
            c.short_description             AS ShortDescriptionJson,
            c.family                        AS Family,
            c.hex_code                      AS HexCode,
            c.ral_code                      AS RalCode,
            c.wood_texture_url              AS WoodTextureUrl,
            c.surcharge_minor               AS SurchargeMinor,
            c.currency                      AS Currency,
            c.sort_order                    AS SortOrder,
            c.is_default                    AS IsDefault,
            c.is_active                     AS IsActive,
            c.created_at_utc                AS CreatedAtUtc
        FROM color_options c
        INNER JOIN material_color_compatibility m ON m.color_option_id = c.id
        WHERE c.is_active = 1
          AND m.material_id = @MaterialId;
        """;

    private readonly IDbConnectionFactory _factory = factory;

    public async Task<IReadOnlyList<ColorOptionDto>> ListActiveByMaterialAsync(
        Guid materialId, CancellationToken ct = default)
    {
        using var connection = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await connection
            .QueryAsync<ListRow>(
                ListSql,
                new { MaterialId = materialId.ToString("D", CultureInfo.InvariantCulture).ToUpperInvariant() })
            .ConfigureAwait(false);

        return rows.Select(r => new ColorOptionDto(
                Id: Guid.Parse(r.Id, CultureInfo.InvariantCulture),
                Slug: r.Slug,
                Name: DeserializeLocalized(r.NameJson),
                ShortDescription: DeserializeLocalized(r.ShortDescriptionJson),
                Family: FamilyToString((ColorFamily)r.Family),
                HexCode: r.HexCode,
                RalCode: r.RalCode,
                WoodTextureUrl: r.WoodTextureUrl,
                SurchargeMinor: r.SurchargeMinor,
                SurchargeDisplay: Money.FromMinor(r.SurchargeMinor, ParseCurrency(r.Currency))
                    .Amount.ToString("0.00", CultureInfo.InvariantCulture),
                Currency: r.Currency,
                IsDefault: r.IsDefault,
                SortOrder: r.SortOrder))
            .ToList();
    }

    public async Task<IReadOnlyList<ColorOption>> LoadDomainByMaterialAsync(
        Guid materialId, CancellationToken ct = default)
    {
        using var connection = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await connection
            .QueryAsync<DomainRow>(
                LoadDomainSql,
                new { MaterialId = materialId.ToString("D", CultureInfo.InvariantCulture).ToUpperInvariant() })
            .ConfigureAwait(false);

        return rows.Select(r => new ColorOption
        {
            Id = Guid.Parse(r.Id, CultureInfo.InvariantCulture),
            Slug = r.Slug,
            Name = DeserializeLocalized(r.NameJson),
            ShortDescription = DeserializeLocalized(r.ShortDescriptionJson),
            Family = (ColorFamily)r.Family,
            HexCode = r.HexCode,
            RalCode = r.RalCode,
            WoodTextureUrl = r.WoodTextureUrl,
            SurchargeMinor = r.SurchargeMinor,
            Currency = ParseCurrency(r.Currency),
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

    private static string FamilyToString(ColorFamily family) => family switch
    {
        ColorFamily.Standard => "standard",
        ColorFamily.Premium => "premium",
        ColorFamily.WoodLaminate => "woodLaminate",
        ColorFamily.RalCustom => "ralCustom",
        _ => "standard",
    };

    private class ListRow
    {
        public string Id { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string NameJson { get; set; } = "{}";
        public string ShortDescriptionJson { get; set; } = "{}";
        public int Family { get; set; }
        public string HexCode { get; set; } = "#FFFFFF";
        public string? RalCode { get; set; }
        public string? WoodTextureUrl { get; set; }
        public int SurchargeMinor { get; set; }
        public string Currency { get; set; } = "GEL";
        public int SortOrder { get; set; }
        public bool IsDefault { get; set; }
    }

    private sealed class DomainRow : ListRow
    {
        public bool IsActive { get; set; }
        public string CreatedAtUtc { get; set; } = string.Empty;
    }
}
