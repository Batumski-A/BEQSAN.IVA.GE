using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Infrastructure.Persistence.Seed;

/// <summary>
/// Seeds the 7 glass packages + the material-compatibility mesh. Idempotent —
/// skips inserts when a glass row with the matching slug or a compat row with
/// the matching (material, glass) pair already exists.
/// <para>
/// Surcharges are tetri/m² over the material baseline. The 2026-05-19
/// baseline (ADR-0004 + docs/research/2026-pricing-baseline.md) sits within
/// −11% to +0% of the Georgian glass-fabricator mid (glassline.ge /
/// glassco.ge / Şişecam Trakya dealer), per-canary-pinned to keep ADR-0002
/// Step-5 / Step-6 / Step-7 / Step-8 canaries (₾1336.18 / ₾1424.68 /
/// ₾2333.17 / ₾2592.77) intact.
/// Pricing is Roman-locked at code level for Phase 1; Phase 2 promotes the
/// surcharge rates to admin-editable rows in a PricingRule table.
/// </para>
/// </summary>
internal static class GlassTypeSeeder
{
    private const string Namespace = "BEQSAN-CATALOG-2026";

    public static async Task SeedAsync(BeqsanDbContext db, CancellationToken ct = default)
    {
        // 1. Glass types — one row per slug, deterministic id so seeds line up
        //    across rebuilds (FRONT tests pin one of these by id-from-slug).
        var glassToInsert = new List<GlassType>();
        foreach (var spec in GlassSpecs())
        {
            var alreadyExists = await db.GlassTypes
                .AnyAsync(g => g.Slug == spec.Slug, ct)
                .ConfigureAwait(false);
            if (alreadyExists)
            {
                continue;
            }

            glassToInsert.Add(BuildGlassType(spec));
        }

        if (glassToInsert.Count > 0)
        {
            await db.GlassTypes.AddRangeAsync(glassToInsert, ct).ConfigureAwait(false);
            await db.SaveChangesAsync(ct).ConfigureAwait(false);
        }

        // 2. Compatibility mesh. Read both tables fresh so we have the durable
        //    ids (including any seeded by a prior run). Cross with the static
        //    compat table; insert rows that don't already exist.
        var materials = await db.Materials
            .Select(m => new { m.Id, m.ProductTypeId, m.Slug })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        var productTypeSlugById = await db.ProductTypes
            .ToDictionaryAsync(p => p.Id, p => p.Slug, ct)
            .ConfigureAwait(false);

        var glassIdBySlug = await db.GlassTypes
            .ToDictionaryAsync(g => g.Slug, g => g.Id, ct)
            .ConfigureAwait(false);

        var compatRows = new List<(Guid MaterialId, Guid GlassTypeId)>();
        foreach (var material in materials)
        {
            if (!productTypeSlugById.TryGetValue(material.ProductTypeId, out var ptSlug))
            {
                continue;
            }

            // Compatibility is keyed by (material family + thermal tier),
            // which we approximate via the material slug — same naming
            // convention used across product types.
            var glassSlugsForMaterial = CompatibleGlassSlugs(material.Slug);
            foreach (var glassSlug in glassSlugsForMaterial)
            {
                if (!glassIdBySlug.TryGetValue(glassSlug, out var glassId))
                {
                    continue;
                }
                compatRows.Add((material.Id, glassId));
            }

            _ = ptSlug; // silence the unused-variable lint; slug kept for future per-product overrides
        }

        if (compatRows.Count == 0)
        {
            return;
        }

        // Filter to only-new rows + insert via the DbContext connection.
        // GetDbConnection returns the underlying ADO connection (same one
        // EF uses); we don't dispose it — EF manages its lifecycle.
        var connection = db.Database.GetDbConnection();
        await connection.OpenAsync(ct).ConfigureAwait(false);

        var existingSet = new HashSet<(Guid, Guid)>();
        using (var readCmd = connection.CreateCommand())
        {
            readCmd.CommandText = "SELECT material_id, glass_type_id FROM material_glass_compatibility";
            using var reader = await readCmd.ExecuteReaderAsync(ct).ConfigureAwait(false);
            while (await reader.ReadAsync(ct).ConfigureAwait(false))
            {
                existingSet.Add((Guid.Parse(reader.GetString(0)), Guid.Parse(reader.GetString(1))));
            }
        }

        var newRows = compatRows.Where(r => !existingSet.Contains((r.MaterialId, r.GlassTypeId))).ToList();
        if (newRows.Count == 0)
        {
            return;
        }

        // One INSERT per row inside a single transaction. Seed table is
        // tiny (~25 rows) so the chattier-than-batched approach is fine
        // and keeps the parameter handling simple.
        using var tx = await connection.BeginTransactionAsync(ct).ConfigureAwait(false);
        foreach (var (materialId, glassTypeId) in newRows)
        {
            using var cmd = connection.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = "INSERT INTO material_glass_compatibility (material_id, glass_type_id) VALUES ($m, $g)";
            var mParam = cmd.CreateParameter();
            mParam.ParameterName = "$m";
            mParam.Value = materialId.ToString("D").ToUpperInvariant();
            cmd.Parameters.Add(mParam);
            var gParam = cmd.CreateParameter();
            gParam.ParameterName = "$g";
            gParam.Value = glassTypeId.ToString("D").ToUpperInvariant();
            cmd.Parameters.Add(gParam);
            await cmd.ExecuteNonQueryAsync(ct).ConfigureAwait(false);
        }
        await tx.CommitAsync(ct).ConfigureAwait(false);
    }

    private sealed class CompatRow
    {
        public string MaterialId { get; set; } = string.Empty;
        public string GlassTypeId { get; set; } = string.Empty;
    }

    private static IEnumerable<GlassSpec> GlassSpecs()
    {
        // Surcharge in tetri/m² above material baseline.
        // U-values are market figures for typical Black-Sea climate glazing
        // (Roman to verify against actual ALUPROF / ASAŞ datasheet).
        // 2026-05-19 baseline: included in material/m² (Georgian default).
        yield return new("double-standard", 1, 2, 0, 2.8m, IsDefault: true,
            "ორმაგი მინა",
            "ენერგო-ეფექტური სტანდარტი, საქართველოს კლიმატისთვის სრულიად საკმარისი.");
        // 2026-05-19 baseline: glassline.ge soft-coat Low-E mid ₾26/m², BEQSAN −4% = ₾25/m²
        yield return new("double-low-e", 2, 2, 2500, 1.6m, IsDefault: false,
            "ორმაგი Low-E",
            "თბური საფარი — ცხელი ზაფხული გარეთ, თბილი ზამთარი შიგნით.");
        // 2026-05-19 baseline: glassline.ge triple Low-E mid ₾65/m², BEQSAN −8% = ₾60/m² (canary-pinned ₾1336.18)
        yield return new("triple-low-e", 3, 3, 6000, 1.0m, IsDefault: false,
            "სამმაგი Low-E",
            "მაქს ენერგო-ეფექტურობა — ცენტრალური გათბობის ხარჯი ნახევრდება.");
        // 2026-05-19 baseline: regional quad Low-E dealer mid ₾125/m², BEQSAN −4% = ₾120/m²
        yield return new("quadruple-low-e", 4, 4, 12000, 0.7m, IsDefault: false,
            "ოთხმაგი Low-E",
            "ექსტრემალური თბო-იზოლაცია, მაღალმთიანი რეგიონებისთვის.");
        // 2026-05-19 baseline: glassco.ge tempered uplift mid ₾62/m², BEQSAN −11% = ₾55/m² (canary-coupled via tempered extra)
        yield return new("tempered-double", 5, 2, 5500, 2.7m, IsDefault: false,
            "დაკაჟებული მინა",
            "გადატეხის შემთხვევაში წვრილ ნაწილებად — უსაფრთხო ბავშვებთან.");
        // 2026-05-19 baseline: glassco.ge frosted uplift mid ₾32/m², BEQSAN −6% = ₾30/m²
        yield return new("frosted-double", 6, 2, 3000, 2.7m, IsDefault: false,
            "მქრქალი მინა",
            "კონფიდენციალურობა აბაზანებისთვის, საძინებლებისთვის.");
        // 2026-05-19 baseline: glassco.ge tinted (sun-control) uplift mid ₾37/m², BEQSAN −5% = ₾35/m²
        yield return new("tinted-double", 7, 2, 3500, 2.5m, IsDefault: false,
            "ტონირებული მინა",
            "მზის სხივების შემცირება, სანაპირო ბინებისთვის.");
    }

    /// <summary>
    /// Which glass slugs each material allows. Quadruple-Low-E is heavy and
    /// only offered with aluminum-thermal / -high-thermal profiles. PVC tops
    /// out at triple-Low-E for the laminated tier; white PVC stops at double
    /// since the thinner profile can't carry triple weight reliably.
    /// </summary>
    private static IReadOnlyList<string> CompatibleGlassSlugs(string materialSlug) => materialSlug switch
    {
        "aluminum-thermal" =>
            ["double-standard", "double-low-e", "triple-low-e", "quadruple-low-e",
             "tempered-double", "frosted-double", "tinted-double"],
        "aluminum-high-thermal" =>
            ["double-standard", "double-low-e", "triple-low-e", "quadruple-low-e",
             "tempered-double", "frosted-double", "tinted-double"],
        "aluminum-basic" =>
            ["double-standard", "double-low-e", "tempered-double", "frosted-double", "tinted-double"],
        "pvc-laminated" =>
            ["double-standard", "double-low-e", "triple-low-e",
             "tempered-double", "frosted-double"],
        "pvc-white" =>
            ["double-standard", "double-low-e", "tempered-double", "frosted-double"],
        _ => ["double-standard"],
    };

    private static GlassType BuildGlassType(GlassSpec spec)
    {
        var nameResult = LocalizedText.Create(spec.NameKa);
        var descResult = LocalizedText.Create(spec.DescriptionKa);
        var glassResult = GlassType.Create(
            slug: spec.Slug,
            name: nameResult.Value,
            shortDescription: descResult.Value,
            paneCount: spec.PaneCount,
            surchargePerSqmMinor: spec.SurchargeMinor,
            currency: Currency.Gel,
            uValue: spec.UValue,
            sortOrder: spec.SortOrder,
            isDefault: spec.IsDefault);

        var g = glassResult.Value;
        return new GlassType
        {
            Id = DeterministicGuid(spec.Slug),
            Slug = g.Slug,
            Name = g.Name,
            ShortDescription = g.ShortDescription,
            PaneCount = g.PaneCount,
            SurchargePerSqmMinor = g.SurchargePerSqmMinor,
            Currency = g.Currency,
            UValue = g.UValue,
            SortOrder = g.SortOrder,
            IsDefault = g.IsDefault,
            IsActive = g.IsActive,
            CreatedAtUtc = new DateTime(2026, 5, 17, 0, 0, 0, DateTimeKind.Utc),
        };
    }

    private static Guid DeterministicGuid(string seed)
    {
        var input = System.Text.Encoding.UTF8.GetBytes(Namespace + ":glass-type:" + seed);
#pragma warning disable CA5350
        var hash = System.Security.Cryptography.SHA1.HashData(input);
#pragma warning restore CA5350
        var bytes = new byte[16];
        Array.Copy(hash, bytes, 16);
        bytes[6] = (byte)((bytes[6] & 0x0F) | 0x50);
        bytes[8] = (byte)((bytes[8] & 0x3F) | 0x80);
        return new Guid(bytes);
    }

    private sealed record GlassSpec(
        string Slug,
        int SortOrder,
        int PaneCount,
        int SurchargeMinor,
        decimal UValue,
        bool IsDefault,
        string NameKa,
        string DescriptionKa);
}
