using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Infrastructure.Persistence.Seed;

/// <summary>
/// Seeds the Phase-1 accessory catalog (12 rows: 4 handle styles + 4 lock
/// types + 4 blind types) and the three compatibility meshes. Idempotent —
/// skips by slug for catalog rows, by composite pair for compat rows.
/// </summary>
internal static class AccessoryCatalogSeeder
{
    private const string Namespace = "BEQSAN-CATALOG-2026";

    public static async Task SeedAsync(BeqsanDbContext db, CancellationToken ct = default)
    {
        await SeedHandlesAsync(db, ct).ConfigureAwait(false);
        await SeedLocksAsync(db, ct).ConfigureAwait(false);
        await SeedBlindsAsync(db, ct).ConfigureAwait(false);
        await SeedCompatAsync(db, ct).ConfigureAwait(false);
    }

    // ── Handles ────────────────────────────────────────────────────────
    private static async Task SeedHandlesAsync(BeqsanDbContext db, CancellationToken ct)
    {
        var toInsert = new List<HandleStyle>();
        foreach (var spec in HandleSpecs())
        {
            if (await db.HandleStyles.AnyAsync(h => h.Slug == spec.Slug, ct).ConfigureAwait(false))
            {
                continue;
            }
            toInsert.Add(BuildHandle(spec));
        }
        if (toInsert.Count > 0)
        {
            await db.HandleStyles.AddRangeAsync(toInsert, ct).ConfigureAwait(false);
            await db.SaveChangesAsync(ct).ConfigureAwait(false);
        }
    }

    private static IEnumerable<HandleSpec> HandleSpecs()
    {
        yield return new("modern-aluminum", "modern", 4500, 1, IsDefault: true,
            "Modern ალუმინი",
            "თანამედროვე გეომეტრიული სახელური, ნებისმიერი მინიმალისტური ფასადისთვის.");
        yield return new("classic-curved", "classic", 6000, 2, IsDefault: true,
            "Classic მრუდი",
            "ერგონომიკული მრუდი ფორმა, კლასიკური ხანდაზმული გრძნობით.");
        yield return new("premium-secustic", "premium", 12000, 3, IsDefault: true,
            "Premium Secustic",
            "გერმანული უსაფრთხო ბორბალი — ანტი-ვანდალური, თერმო-იზოლირებული.");
        yield return new("minimal-recessed", "minimal", 8500, 4, IsDefault: true,
            "Minimal ჩაკრული",
            "უხილავი სახელური ფასადის სუფთა ხედვისთვის.");
    }

    private static HandleStyle BuildHandle(HandleSpec spec)
    {
        var name = LocalizedText.Create(spec.NameKa).Value;
        var desc = LocalizedText.Create(spec.DescriptionKa).Value;
        var built = HandleStyle.Create(
            slug: spec.Slug,
            name: name,
            shortDescription: desc,
            family: spec.Family,
            imageUrl: null,
            surchargePerPaneMinor: spec.SurchargeMinor,
            currency: Currency.Gel,
            sortOrder: spec.SortOrder,
            isDefault: spec.IsDefault).Value;
        return new HandleStyle
        {
            Id = DeterministicGuid("handle-style", spec.Slug),
            Slug = built.Slug,
            Name = built.Name,
            ShortDescription = built.ShortDescription,
            Family = built.Family,
            ImageUrl = null,
            SurchargePerPaneMinor = built.SurchargePerPaneMinor,
            Currency = built.Currency,
            SortOrder = built.SortOrder,
            IsDefault = built.IsDefault,
            IsActive = built.IsActive,
            CreatedAtUtc = new DateTime(2026, 5, 19, 0, 0, 0, DateTimeKind.Utc),
        };
    }

    // ── Locks ──────────────────────────────────────────────────────────
    private static async Task SeedLocksAsync(BeqsanDbContext db, CancellationToken ct)
    {
        var toInsert = new List<LockType>();
        foreach (var spec in LockSpecs())
        {
            if (await db.LockTypes.AnyAsync(l => l.Slug == spec.Slug, ct).ConfigureAwait(false))
            {
                continue;
            }
            toInsert.Add(BuildLock(spec));
        }
        if (toInsert.Count > 0)
        {
            await db.LockTypes.AddRangeAsync(toInsert, ct).ConfigureAwait(false);
            await db.SaveChangesAsync(ct).ConfigureAwait(false);
        }
    }

    private static IEnumerable<LockSpec> LockSpecs()
    {
        yield return new("basic-cam", LockGrade.Basic, 2, RequiresFull: false, 3500, 1, IsDefault: true,
            "Basic ცილინდრი",
            "სტანდარტული საკეტი — საცხოვრებლისთვის საკმარისი.");
        yield return new("multi-point-3", LockGrade.MultiPoint, 4, RequiresFull: true, 9000, 2, IsDefault: false,
            "Multi-point 3 წერტილი",
            "სამ-წერტილოვანი ჩაკეტვა — გაუმჯობესებული უსაფრთხოება.");
        yield return new("multi-point-5", LockGrade.MultiPoint, 5, RequiresFull: true, 14000, 3, IsDefault: false,
            "Multi-point 5 წერტილი",
            "ხუთ-წერტილოვანი ჩაკეტვა — საუკეთესო ანტი-ვანდალური.");
        yield return new("smart-fingerprint", LockGrade.Smart, 5, RequiresFull: false, 35000, 4, IsDefault: false,
            "Smart Fingerprint",
            "თითის ანაბეჭდი + Bluetooth — გასაღების გარეშე.");
    }

    private static LockType BuildLock(LockSpec spec)
    {
        var name = LocalizedText.Create(spec.NameKa).Value;
        var desc = LocalizedText.Create(spec.DescriptionKa).Value;
        var built = LockType.Create(
            slug: spec.Slug,
            name: name,
            shortDescription: desc,
            grade: spec.Grade,
            securityRating: spec.SecurityRating,
            requiresCasementOrTurn: spec.RequiresFull,
            surchargePerPaneMinor: spec.SurchargeMinor,
            currency: Currency.Gel,
            sortOrder: spec.SortOrder,
            isDefault: spec.IsDefault).Value;
        return new LockType
        {
            Id = DeterministicGuid("lock-type", spec.Slug),
            Slug = built.Slug,
            Name = built.Name,
            ShortDescription = built.ShortDescription,
            Grade = built.Grade,
            SecurityRating = built.SecurityRating,
            RequiresCasementOrTurn = built.RequiresCasementOrTurn,
            SurchargePerPaneMinor = built.SurchargePerPaneMinor,
            Currency = built.Currency,
            SortOrder = built.SortOrder,
            IsDefault = built.IsDefault,
            IsActive = built.IsActive,
            CreatedAtUtc = new DateTime(2026, 5, 19, 0, 0, 0, DateTimeKind.Utc),
        };
    }

    // ── Blinds ─────────────────────────────────────────────────────────
    private static async Task SeedBlindsAsync(BeqsanDbContext db, CancellationToken ct)
    {
        var toInsert = new List<BlindType>();
        foreach (var spec in BlindSpecs())
        {
            if (await db.BlindTypes.AnyAsync(b => b.Slug == spec.Slug, ct).ConfigureAwait(false))
            {
                continue;
            }
            toInsert.Add(BuildBlind(spec));
        }
        if (toInsert.Count > 0)
        {
            await db.BlindTypes.AddRangeAsync(toInsert, ct).ConfigureAwait(false);
            await db.SaveChangesAsync(ct).ConfigureAwait(false);
        }
    }

    private static IEnumerable<BlindSpec> BlindSpecs()
    {
        yield return new("external-aluminum-manual", BlindPlacement.External, SupportsElectric: false,
            BaseMounting: 18000, SurchargePerSqm: 6500, SortOrder: 1,
            "გარეთა ალუმინი (მექანიკური)",
            "გარეთა ალუმინის ჟალუზი — ხელით მართვა, ფასადის დაცვა.");
        yield return new("external-aluminum-electric", BlindPlacement.External, SupportsElectric: true,
            BaseMounting: 25000, SurchargePerSqm: 9000, SortOrder: 2,
            "გარეთა ალუმინი (ელექტრო)",
            "ელექტრო-მართვადი გარეთა ჟალუზი — დისტანციური მართვის ვარიანტით.");
        yield return new("internal-roman", BlindPlacement.Internal, SupportsElectric: false,
            BaseMounting: 8000, SurchargePerSqm: 4000, SortOrder: 3,
            "შიდა Roman",
            "ფარდისებური შიდა ჟალუზი — ქსოვილოვანი, კლასიკური ინტერიერისთვის.");
        yield return new("internal-roller", BlindPlacement.Internal, SupportsElectric: true,
            BaseMounting: 6000, SurchargePerSqm: 3500, SortOrder: 4,
            "შიდა Roller",
            "გრაგნილი შიდა ჟალუზი — მექანიკური ან ელექტრო-მართვადი.");
    }

    private static BlindType BuildBlind(BlindSpec spec)
    {
        var name = LocalizedText.Create(spec.NameKa).Value;
        var desc = LocalizedText.Create(spec.DescriptionKa).Value;
        var built = BlindType.Create(
            slug: spec.Slug,
            name: name,
            shortDescription: desc,
            placement: spec.Placement,
            supportsElectric: spec.SupportsElectric,
            baseMountingMinor: spec.BaseMounting,
            surchargePerSqmMinor: spec.SurchargePerSqm,
            currency: Currency.Gel,
            sortOrder: spec.SortOrder).Value;
        return new BlindType
        {
            Id = DeterministicGuid("blind-type", spec.Slug),
            Slug = built.Slug,
            Name = built.Name,
            ShortDescription = built.ShortDescription,
            Placement = built.Placement,
            SupportsElectric = built.SupportsElectric,
            BaseMountingMinor = built.BaseMountingMinor,
            SurchargePerSqmMinor = built.SurchargePerSqmMinor,
            Currency = built.Currency,
            SortOrder = built.SortOrder,
            IsActive = built.IsActive,
            CreatedAtUtc = new DateTime(2026, 5, 19, 0, 0, 0, DateTimeKind.Utc),
        };
    }

    // ── Compatibility mesh ─────────────────────────────────────────────
    private static async Task SeedCompatAsync(BeqsanDbContext db, CancellationToken ct)
    {
        var materials = await db.Materials
            .Select(m => new { m.Id, m.Slug, m.Family })
            .ToListAsync(ct).ConfigureAwait(false);
        var productTypes = await db.ProductTypes
            .Select(p => new { p.Id, p.Slug })
            .ToListAsync(ct).ConfigureAwait(false);
        var handleIds = await db.HandleStyles.ToDictionaryAsync(h => h.Slug, h => h.Id, ct).ConfigureAwait(false);
        var lockIds = await db.LockTypes.ToDictionaryAsync(l => l.Slug, l => l.Id, ct).ConfigureAwait(false);
        var blindIds = await db.BlindTypes.ToDictionaryAsync(b => b.Slug, b => b.Id, ct).ConfigureAwait(false);

        // Handles × Materials: all 4 handles work on all materials EXCEPT
        // premium-secustic, which is aluminum-only.
        var handleCompat = new List<(Guid M, Guid H)>();
        foreach (var mat in materials)
        {
            foreach (var (slug, hid) in handleIds)
            {
                if (slug == "premium-secustic" && mat.Family != MaterialFamily.Aluminum)
                {
                    continue;
                }
                handleCompat.Add((mat.Id, hid));
            }
        }

        // Locks × ProductTypes:
        //  - door: all 4 (including smart-fingerprint)
        //  - window / panoramic / balcony: basic + multi-point-3 + multi-point-5
        //  - sliding: basic + multi-point-3 (slim profile, no 5-point or smart)
        var lockCompat = new List<(Guid P, Guid L)>();
        foreach (var pt in productTypes)
        {
            foreach (var (slug, lid) in lockIds)
            {
                var include = pt.Slug switch
                {
                    "door" => true,
                    "sliding" => slug is "basic-cam" or "multi-point-3",
                    _ => slug != "smart-fingerprint",
                };
                if (include)
                {
                    lockCompat.Add((pt.Id, lid));
                }
            }
        }

        // Blinds × ProductTypes:
        //  - door: internal-roman + internal-roller (no external — doors swing)
        //  - window / sliding / panoramic: all 4
        //  - balcony: internal only (external not standard for balcony glazing)
        var blindCompat = new List<(Guid P, Guid B)>();
        foreach (var pt in productTypes)
        {
            foreach (var (slug, bid) in blindIds)
            {
                var include = pt.Slug switch
                {
                    "door" => slug.StartsWith("internal-", StringComparison.Ordinal),
                    "balcony" => slug.StartsWith("internal-", StringComparison.Ordinal),
                    _ => true,
                };
                if (include)
                {
                    blindCompat.Add((pt.Id, bid));
                }
            }
        }

        await InsertCompatAsync(db, "material_handle_compatibility",
            "material_id", "handle_style_id", handleCompat, ct).ConfigureAwait(false);
        await InsertCompatAsync(db, "product_type_lock_compatibility",
            "product_type_id", "lock_type_id", lockCompat, ct).ConfigureAwait(false);
        await InsertCompatAsync(db, "product_type_blind_compatibility",
            "product_type_id", "blind_type_id", blindCompat, ct).ConfigureAwait(false);
    }

    private static async Task InsertCompatAsync(
        BeqsanDbContext db,
        string table,
        string leftCol,
        string rightCol,
        List<(Guid Left, Guid Right)> rows,
        CancellationToken ct)
    {
        if (rows.Count == 0)
        {
            return;
        }

        var connection = db.Database.GetDbConnection();
        await connection.OpenAsync(ct).ConfigureAwait(false);

        var existing = new HashSet<(Guid, Guid)>();
        using (var read = connection.CreateCommand())
        {
            read.CommandText = $"SELECT {leftCol}, {rightCol} FROM {table}";
            using var reader = await read.ExecuteReaderAsync(ct).ConfigureAwait(false);
            while (await reader.ReadAsync(ct).ConfigureAwait(false))
            {
                existing.Add((Guid.Parse(reader.GetString(0)), Guid.Parse(reader.GetString(1))));
            }
        }

        var newRows = rows.Where(r => !existing.Contains((r.Left, r.Right))).ToList();
        if (newRows.Count == 0)
        {
            return;
        }

        using var tx = await connection.BeginTransactionAsync(ct).ConfigureAwait(false);
        foreach (var (left, right) in newRows)
        {
            using var cmd = connection.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = $"INSERT INTO {table} ({leftCol}, {rightCol}) VALUES ($l, $r)";
            var lp = cmd.CreateParameter();
            lp.ParameterName = "$l";
            lp.Value = left.ToString("D").ToUpperInvariant();
            cmd.Parameters.Add(lp);
            var rp = cmd.CreateParameter();
            rp.ParameterName = "$r";
            rp.Value = right.ToString("D").ToUpperInvariant();
            cmd.Parameters.Add(rp);
            await cmd.ExecuteNonQueryAsync(ct).ConfigureAwait(false);
        }
        await tx.CommitAsync(ct).ConfigureAwait(false);
    }

    private static Guid DeterministicGuid(string entityKind, string slug)
    {
        var input = System.Text.Encoding.UTF8.GetBytes(Namespace + ":" + entityKind + ":" + slug);
#pragma warning disable CA5350
        var hash = System.Security.Cryptography.SHA1.HashData(input);
#pragma warning restore CA5350
        var bytes = new byte[16];
        Array.Copy(hash, bytes, 16);
        bytes[6] = (byte)((bytes[6] & 0x0F) | 0x50);
        bytes[8] = (byte)((bytes[8] & 0x3F) | 0x80);
        return new Guid(bytes);
    }

    private sealed record HandleSpec(
        string Slug, string Family, int SurchargeMinor, int SortOrder, bool IsDefault,
        string NameKa, string DescriptionKa);

    private sealed record LockSpec(
        string Slug, LockGrade Grade, int SecurityRating, bool RequiresFull,
        int SurchargeMinor, int SortOrder, bool IsDefault,
        string NameKa, string DescriptionKa);

    private sealed record BlindSpec(
        string Slug, BlindPlacement Placement, bool SupportsElectric,
        int BaseMounting, int SurchargePerSqm, int SortOrder,
        string NameKa, string DescriptionKa);
}
