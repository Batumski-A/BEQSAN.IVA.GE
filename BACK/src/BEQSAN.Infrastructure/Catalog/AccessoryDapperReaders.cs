using System.Globalization;
using System.Text.Json;
using BEQSAN.Application.Catalog.GetBlindTypes;
using BEQSAN.Application.Catalog.GetHandleStyles;
using BEQSAN.Application.Catalog.GetLockTypes;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Dapper;

namespace BEQSAN.Infrastructure.Catalog;

/// <summary>
/// Dapper readers for the Step-7 accessory catalogs. Same pattern as the
/// glass / color readers — list-by-parent for the public endpoints,
/// load-all + load-compat for the AccessoryCatalog bag the pricing
/// pipeline uses.
/// </summary>
internal sealed class HandleStyleDapperReader(IDbConnectionFactory factory) : IHandleStyleReader
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IDbConnectionFactory _factory = factory;

    private const string ListSql = """
        SELECT
            h.id                          AS Id,
            h.slug                        AS Slug,
            h.name                        AS NameJson,
            h.short_description           AS ShortDescriptionJson,
            h.family                      AS Family,
            h.image_url                   AS ImageUrl,
            h.surcharge_per_pane_minor    AS SurchargePerPaneMinor,
            h.currency                    AS Currency,
            h.sort_order                  AS SortOrder,
            h.is_default                  AS IsDefault
        FROM handle_styles h
        INNER JOIN material_handle_compatibility m ON m.handle_style_id = h.id
        WHERE h.is_active = 1
          AND m.material_id = @MaterialId
        ORDER BY h.is_default DESC, h.sort_order, json_extract(h.name, '$.ka');
        """;

    private const string LoadAllSql = """
        SELECT id AS Id, slug AS Slug, name AS NameJson, short_description AS ShortDescriptionJson,
               family AS Family, image_url AS ImageUrl,
               surcharge_per_pane_minor AS SurchargePerPaneMinor,
               currency AS Currency, sort_order AS SortOrder,
               is_default AS IsDefault, is_active AS IsActive, created_at_utc AS CreatedAtUtc
        FROM handle_styles WHERE is_active = 1;
        """;

    private const string CompatSql = "SELECT handle_style_id, material_id FROM material_handle_compatibility;";

    public async Task<IReadOnlyList<HandleStyleDto>> ListActiveByMaterialAsync(Guid materialId, CancellationToken ct = default)
    {
        using var conn = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await conn.QueryAsync<ListRow>(ListSql,
            new { MaterialId = materialId.ToString("D", CultureInfo.InvariantCulture).ToUpperInvariant() })
            .ConfigureAwait(false);
        return rows.Select(r => new HandleStyleDto(
                Id: Guid.Parse(r.Id, CultureInfo.InvariantCulture),
                Slug: r.Slug,
                Name: DeserializeLocalized(r.NameJson),
                ShortDescription: DeserializeLocalized(r.ShortDescriptionJson),
                Family: r.Family,
                ImageUrl: r.ImageUrl,
                SurchargePerPaneMinor: r.SurchargePerPaneMinor,
                SurchargeDisplay: Money.FromMinor(r.SurchargePerPaneMinor, ParseCurrency(r.Currency))
                    .Amount.ToString("0.00", CultureInfo.InvariantCulture),
                Currency: r.Currency,
                IsDefault: r.IsDefault,
                SortOrder: r.SortOrder))
            .ToList();
    }

    public async Task<IReadOnlyList<HandleStyle>> LoadAllAsync(CancellationToken ct = default)
    {
        using var conn = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await conn.QueryAsync<DomainRow>(LoadAllSql).ConfigureAwait(false);
        return rows.Select(r => new HandleStyle
        {
            Id = Guid.Parse(r.Id, CultureInfo.InvariantCulture),
            Slug = r.Slug,
            Name = DeserializeLocalized(r.NameJson),
            ShortDescription = DeserializeLocalized(r.ShortDescriptionJson),
            Family = r.Family,
            ImageUrl = r.ImageUrl,
            SurchargePerPaneMinor = r.SurchargePerPaneMinor,
            Currency = ParseCurrency(r.Currency),
            SortOrder = r.SortOrder,
            IsDefault = r.IsDefault,
            IsActive = r.IsActive,
            CreatedAtUtc = ParseDateTime(r.CreatedAtUtc),
        }).ToList();
    }

    public async Task<IReadOnlyList<(Guid HandleId, Guid MaterialId)>> LoadCompatibilityAsync(CancellationToken ct = default)
    {
        using var conn = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await conn.QueryAsync<(string HandleId, string MaterialId)>(CompatSql).ConfigureAwait(false);
        return rows.Select(r => (
            Guid.Parse(r.HandleId, CultureInfo.InvariantCulture),
            Guid.Parse(r.MaterialId, CultureInfo.InvariantCulture))).ToList();
    }

    private static LocalizedText DeserializeLocalized(string json) =>
        JsonSerializer.Deserialize<LocalizedText>(json, JsonOptions) ?? new LocalizedText();

    private static Currency ParseCurrency(string s) =>
        Enum.TryParse<Currency>(s, ignoreCase: true, out var c) ? c : Currency.Gel;

    private static DateTime ParseDateTime(string s) => DateTime.Parse(s, CultureInfo.InvariantCulture,
        System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal);

    private class ListRow
    {
        public string Id { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string NameJson { get; set; } = "{}";
        public string ShortDescriptionJson { get; set; } = "{}";
        public string Family { get; set; } = "modern";
        public string? ImageUrl { get; set; }
        public int SurchargePerPaneMinor { get; set; }
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

internal sealed class LockTypeDapperReader(IDbConnectionFactory factory) : ILockTypeReader
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IDbConnectionFactory _factory = factory;

    private const string ListSql = """
        SELECT
            l.id                          AS Id,
            l.slug                        AS Slug,
            l.name                        AS NameJson,
            l.short_description           AS ShortDescriptionJson,
            l.grade                       AS Grade,
            l.security_rating             AS SecurityRating,
            l.requires_casement_or_turn   AS RequiresCasementOrTurn,
            l.surcharge_per_pane_minor    AS SurchargePerPaneMinor,
            l.currency                    AS Currency,
            l.sort_order                  AS SortOrder,
            l.is_default                  AS IsDefault
        FROM lock_types l
        INNER JOIN product_type_lock_compatibility p ON p.lock_type_id = l.id
        WHERE l.is_active = 1
          AND p.product_type_id = @ProductTypeId
        ORDER BY l.is_default DESC, l.sort_order, json_extract(l.name, '$.ka');
        """;

    private const string LoadAllSql = """
        SELECT id AS Id, slug AS Slug, name AS NameJson, short_description AS ShortDescriptionJson,
               grade AS Grade, security_rating AS SecurityRating,
               requires_casement_or_turn AS RequiresCasementOrTurn,
               surcharge_per_pane_minor AS SurchargePerPaneMinor,
               currency AS Currency, sort_order AS SortOrder,
               is_default AS IsDefault, is_active AS IsActive, created_at_utc AS CreatedAtUtc
        FROM lock_types WHERE is_active = 1;
        """;

    private const string CompatSql = "SELECT lock_type_id, product_type_id FROM product_type_lock_compatibility;";

    public async Task<IReadOnlyList<LockTypeDto>> ListActiveByProductTypeAsync(Guid productTypeId, CancellationToken ct = default)
    {
        using var conn = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await conn.QueryAsync<ListRow>(ListSql,
            new { ProductTypeId = productTypeId.ToString("D", CultureInfo.InvariantCulture).ToUpperInvariant() })
            .ConfigureAwait(false);
        return rows.Select(r => new LockTypeDto(
                Id: Guid.Parse(r.Id, CultureInfo.InvariantCulture),
                Slug: r.Slug,
                Name: DeserializeLocalized(r.NameJson),
                ShortDescription: DeserializeLocalized(r.ShortDescriptionJson),
                Grade: GradeToString((LockGrade)r.Grade),
                SecurityRating: r.SecurityRating,
                RequiresCasementOrTurn: r.RequiresCasementOrTurn,
                SurchargePerPaneMinor: r.SurchargePerPaneMinor,
                SurchargeDisplay: Money.FromMinor(r.SurchargePerPaneMinor, ParseCurrency(r.Currency))
                    .Amount.ToString("0.00", CultureInfo.InvariantCulture),
                Currency: r.Currency,
                IsDefault: r.IsDefault,
                SortOrder: r.SortOrder))
            .ToList();
    }

    public async Task<IReadOnlyList<LockType>> LoadAllAsync(CancellationToken ct = default)
    {
        using var conn = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await conn.QueryAsync<DomainRow>(LoadAllSql).ConfigureAwait(false);
        return rows.Select(r => new LockType
        {
            Id = Guid.Parse(r.Id, CultureInfo.InvariantCulture),
            Slug = r.Slug,
            Name = DeserializeLocalized(r.NameJson),
            ShortDescription = DeserializeLocalized(r.ShortDescriptionJson),
            Grade = (LockGrade)r.Grade,
            SecurityRating = r.SecurityRating,
            RequiresCasementOrTurn = r.RequiresCasementOrTurn,
            SurchargePerPaneMinor = r.SurchargePerPaneMinor,
            Currency = ParseCurrency(r.Currency),
            SortOrder = r.SortOrder,
            IsDefault = r.IsDefault,
            IsActive = r.IsActive,
            CreatedAtUtc = ParseDateTime(r.CreatedAtUtc),
        }).ToList();
    }

    public async Task<IReadOnlyList<(Guid LockId, Guid ProductTypeId)>> LoadCompatibilityAsync(CancellationToken ct = default)
    {
        using var conn = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await conn.QueryAsync<(string LockId, string ProductTypeId)>(CompatSql).ConfigureAwait(false);
        return rows.Select(r => (
            Guid.Parse(r.LockId, CultureInfo.InvariantCulture),
            Guid.Parse(r.ProductTypeId, CultureInfo.InvariantCulture))).ToList();
    }

    private static LocalizedText DeserializeLocalized(string json) =>
        JsonSerializer.Deserialize<LocalizedText>(json, JsonOptions) ?? new LocalizedText();

    private static Currency ParseCurrency(string s) =>
        Enum.TryParse<Currency>(s, ignoreCase: true, out var c) ? c : Currency.Gel;

    private static DateTime ParseDateTime(string s) => DateTime.Parse(s, CultureInfo.InvariantCulture,
        System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal);

    private static string GradeToString(LockGrade g) => g switch
    {
        LockGrade.Basic => "basic",
        LockGrade.MultiPoint => "multiPoint",
        LockGrade.Smart => "smart",
        _ => "basic",
    };

    private class ListRow
    {
        public string Id { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string NameJson { get; set; } = "{}";
        public string ShortDescriptionJson { get; set; } = "{}";
        public int Grade { get; set; }
        public int SecurityRating { get; set; }
        public bool RequiresCasementOrTurn { get; set; }
        public int SurchargePerPaneMinor { get; set; }
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

internal sealed class BlindTypeDapperReader(IDbConnectionFactory factory) : IBlindTypeReader
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IDbConnectionFactory _factory = factory;

    private const string ListSql = """
        SELECT
            b.id                          AS Id,
            b.slug                        AS Slug,
            b.name                        AS NameJson,
            b.short_description           AS ShortDescriptionJson,
            b.placement                   AS Placement,
            b.supports_electric           AS SupportsElectric,
            b.base_mounting_minor         AS BaseMountingMinor,
            b.surcharge_per_sqm_minor     AS SurchargePerSqmMinor,
            b.currency                    AS Currency,
            b.sort_order                  AS SortOrder
        FROM blind_types b
        INNER JOIN product_type_blind_compatibility p ON p.blind_type_id = b.id
        WHERE b.is_active = 1
          AND p.product_type_id = @ProductTypeId
        ORDER BY b.sort_order, json_extract(b.name, '$.ka');
        """;

    private const string LoadAllSql = """
        SELECT id AS Id, slug AS Slug, name AS NameJson, short_description AS ShortDescriptionJson,
               placement AS Placement, supports_electric AS SupportsElectric,
               base_mounting_minor AS BaseMountingMinor,
               surcharge_per_sqm_minor AS SurchargePerSqmMinor,
               currency AS Currency, sort_order AS SortOrder,
               is_active AS IsActive, created_at_utc AS CreatedAtUtc
        FROM blind_types WHERE is_active = 1;
        """;

    private const string CompatSql = "SELECT blind_type_id, product_type_id FROM product_type_blind_compatibility;";

    public async Task<IReadOnlyList<BlindTypeDto>> ListActiveByProductTypeAsync(Guid productTypeId, CancellationToken ct = default)
    {
        using var conn = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await conn.QueryAsync<ListRow>(ListSql,
            new { ProductTypeId = productTypeId.ToString("D", CultureInfo.InvariantCulture).ToUpperInvariant() })
            .ConfigureAwait(false);
        return rows.Select(r => new BlindTypeDto(
                Id: Guid.Parse(r.Id, CultureInfo.InvariantCulture),
                Slug: r.Slug,
                Name: DeserializeLocalized(r.NameJson),
                ShortDescription: DeserializeLocalized(r.ShortDescriptionJson),
                Placement: PlacementToString((BlindPlacement)r.Placement),
                SupportsElectric: r.SupportsElectric,
                BaseMountingMinor: r.BaseMountingMinor,
                BaseMountingDisplay: Money.FromMinor(r.BaseMountingMinor, ParseCurrency(r.Currency))
                    .Amount.ToString("0.00", CultureInfo.InvariantCulture),
                SurchargePerSqmMinor: r.SurchargePerSqmMinor,
                SurchargePerSqmDisplay: Money.FromMinor(r.SurchargePerSqmMinor, ParseCurrency(r.Currency))
                    .Amount.ToString("0.00", CultureInfo.InvariantCulture),
                Currency: r.Currency,
                SortOrder: r.SortOrder))
            .ToList();
    }

    public async Task<IReadOnlyList<BlindType>> LoadAllAsync(CancellationToken ct = default)
    {
        using var conn = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await conn.QueryAsync<DomainRow>(LoadAllSql).ConfigureAwait(false);
        return rows.Select(r => new BlindType
        {
            Id = Guid.Parse(r.Id, CultureInfo.InvariantCulture),
            Slug = r.Slug,
            Name = DeserializeLocalized(r.NameJson),
            ShortDescription = DeserializeLocalized(r.ShortDescriptionJson),
            Placement = (BlindPlacement)r.Placement,
            SupportsElectric = r.SupportsElectric,
            BaseMountingMinor = r.BaseMountingMinor,
            SurchargePerSqmMinor = r.SurchargePerSqmMinor,
            Currency = ParseCurrency(r.Currency),
            SortOrder = r.SortOrder,
            IsActive = r.IsActive,
            CreatedAtUtc = ParseDateTime(r.CreatedAtUtc),
        }).ToList();
    }

    public async Task<IReadOnlyList<(Guid BlindId, Guid ProductTypeId)>> LoadCompatibilityAsync(CancellationToken ct = default)
    {
        using var conn = await _factory.OpenAsync(ct).ConfigureAwait(false);
        var rows = await conn.QueryAsync<(string BlindId, string ProductTypeId)>(CompatSql).ConfigureAwait(false);
        return rows.Select(r => (
            Guid.Parse(r.BlindId, CultureInfo.InvariantCulture),
            Guid.Parse(r.ProductTypeId, CultureInfo.InvariantCulture))).ToList();
    }

    private static LocalizedText DeserializeLocalized(string json) =>
        JsonSerializer.Deserialize<LocalizedText>(json, JsonOptions) ?? new LocalizedText();

    private static Currency ParseCurrency(string s) =>
        Enum.TryParse<Currency>(s, ignoreCase: true, out var c) ? c : Currency.Gel;

    private static DateTime ParseDateTime(string s) => DateTime.Parse(s, CultureInfo.InvariantCulture,
        System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal);

    private static string PlacementToString(BlindPlacement p) => p switch
    {
        BlindPlacement.External => "external",
        BlindPlacement.Internal => "internal",
        _ => "external",
    };

    private class ListRow
    {
        public string Id { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string NameJson { get; set; } = "{}";
        public string ShortDescriptionJson { get; set; } = "{}";
        public int Placement { get; set; }
        public bool SupportsElectric { get; set; }
        public int BaseMountingMinor { get; set; }
        public int SurchargePerSqmMinor { get; set; }
        public string Currency { get; set; } = "GEL";
        public int SortOrder { get; set; }
    }

    private sealed class DomainRow : ListRow
    {
        public bool IsActive { get; set; }
        public string CreatedAtUtc { get; set; } = string.Empty;
    }
}
