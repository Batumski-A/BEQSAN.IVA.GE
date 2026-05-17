using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Infrastructure.Persistence.Seed;

/// <summary>
/// Seeds the Phase-1 color catalog (14 rows) + the material-compatibility
/// mesh. Idempotent — skips by slug for color rows and by (material, color)
/// pair for compat rows. UUIDv5-style deterministic ids keep rebuilds stable.
/// <para>
/// Per ADR-0002 amendment 2026-05-18: surcharges are flat per order
/// (Roman-locked), not per m². Phase-2 promotes the rates to a
/// PricingRule entity.
/// </para>
/// </summary>
internal static class ColorOptionSeeder
{
    private const string Namespace = "BEQSAN-CATALOG-2026";

    public static async Task SeedAsync(BeqsanDbContext db, CancellationToken ct = default)
    {
        // 1. Colors.
        var toInsert = new List<ColorOption>();
        foreach (var spec in ColorSpecs())
        {
            var exists = await db.ColorOptions.AnyAsync(c => c.Slug == spec.Slug, ct).ConfigureAwait(false);
            if (exists)
            {
                continue;
            }
            toInsert.Add(BuildColor(spec));
        }

        if (toInsert.Count > 0)
        {
            await db.ColorOptions.AddRangeAsync(toInsert, ct).ConfigureAwait(false);
            await db.SaveChangesAsync(ct).ConfigureAwait(false);
        }

        // 2. Compatibility mesh.
        var materials = await db.Materials
            .Select(m => new { m.Id, m.Slug })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        var colorIdBySlug = await db.ColorOptions
            .ToDictionaryAsync(c => c.Slug, c => c.Id, ct)
            .ConfigureAwait(false);

        var compatRows = new List<(Guid MaterialId, Guid ColorOptionId)>();
        foreach (var mat in materials)
        {
            foreach (var colorSlug in CompatibleColorSlugs(mat.Slug))
            {
                if (colorIdBySlug.TryGetValue(colorSlug, out var colorId))
                {
                    compatRows.Add((mat.Id, colorId));
                }
            }
        }

        if (compatRows.Count == 0)
        {
            return;
        }

        var connection = db.Database.GetDbConnection();
        await connection.OpenAsync(ct).ConfigureAwait(false);

        var existingSet = new HashSet<(Guid, Guid)>();
        using (var readCmd = connection.CreateCommand())
        {
            readCmd.CommandText = "SELECT material_id, color_option_id FROM material_color_compatibility";
            using var reader = await readCmd.ExecuteReaderAsync(ct).ConfigureAwait(false);
            while (await reader.ReadAsync(ct).ConfigureAwait(false))
            {
                existingSet.Add((Guid.Parse(reader.GetString(0)), Guid.Parse(reader.GetString(1))));
            }
        }

        var newRows = compatRows
            .Where(r => !existingSet.Contains((r.MaterialId, r.ColorOptionId)))
            .ToList();
        if (newRows.Count == 0)
        {
            return;
        }

        using var tx = await connection.BeginTransactionAsync(ct).ConfigureAwait(false);
        foreach (var (materialId, colorOptionId) in newRows)
        {
            using var cmd = connection.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = "INSERT INTO material_color_compatibility (material_id, color_option_id) VALUES ($m, $c)";
            var mp = cmd.CreateParameter();
            mp.ParameterName = "$m";
            mp.Value = materialId.ToString("D").ToUpperInvariant();
            cmd.Parameters.Add(mp);
            var cp = cmd.CreateParameter();
            cp.ParameterName = "$c";
            cp.Value = colorOptionId.ToString("D").ToUpperInvariant();
            cmd.Parameters.Add(cp);
            await cmd.ExecuteNonQueryAsync(ct).ConfigureAwait(false);
        }
        await tx.CommitAsync(ct).ConfigureAwait(false);
    }

    private static IEnumerable<ColorSpec> ColorSpecs()
    {
        // Standard — 4, all surcharge 0. White is the default for every
        // material (gets flagged IsDefault).
        yield return new("white-ral9016", ColorFamily.Standard, "#F4F4F4", "RAL 9016", null, 0, 1, true,
            "თეთრი", "კლასიკური RAL 9016 — ნებისმიერი ფასადისთვის.");
        yield return new("cream-ral9001", ColorFamily.Standard, "#EDE5D8", "RAL 9001", null, 0, 2, false,
            "კრემისფერი", "თბილი თეთრის გადახრა, ფასადებზე გადასვლის გარეშე.");
        yield return new("brown-ral8014", ColorFamily.Standard, "#4D3A2C", "RAL 8014", null, 0, 3, false,
            "ყავისფერი", "მუქი ბუნებრივი — ხის ფაქტურის გვერდით კარგად ხდება.");
        yield return new("gray-ral7035", ColorFamily.Standard, "#D2D5D9", "RAL 7035", null, 0, 4, false,
            "ღია ნაცრისფერი", "თანამედროვე ნეიტრალური ფერი ფასადებისთვის.");

        // Premium — 5, flat 75 ₾ (dark green and wine red join anthracite/black).
        yield return new("anthracite-ral7016", ColorFamily.Premium, "#293133", "RAL 7016", null, 7500, 10, false,
            "ანტრაციტი", "თანამედროვე RAL 7016 — Bauhaus-ის სტილისთვის.");
        yield return new("black-ral9005", ColorFamily.Premium, "#0A0A0A", "RAL 9005", null, 7500, 11, false,
            "შავი", "სრული შავი RAL 9005 — მძაფრი არქიტექტურა.");
        yield return new("bronze-custom", ColorFamily.Premium, "#5C4A38", null, null, 9000, 12, false,
            "ბრინჯაო", "მეტალური ბრინჯაო — სანაპირო ფასადებისთვის.");
        yield return new("dark-green-ral6009", ColorFamily.Premium, "#27352A", "RAL 6009", null, 7500, 13, false,
            "მუქი მწვანე", "RAL 6009 — ბუნებრივ გარემოში შემოდის.");
        yield return new("wine-red-ral3005", ColorFamily.Premium, "#5E2129", "RAL 3005", null, 7500, 14, false,
            "ღვინისფერი", "RAL 3005 — ძველი ფასადებისთვის რესტავრაცია.");

        // Wood laminates — PVC laminated only, 180 ₾ unless rare.
        yield return new("oak-laminate", ColorFamily.WoodLaminate, "#C7A878", null, "/textures/wood/oak.jpg", 18000, 20, false,
            "მუხის ფაქტურა", "ხის რეალური ფაქტურა, 25-წლიანი UV-მდგრადობა.");
        yield return new("walnut-laminate", ColorFamily.WoodLaminate, "#5C3A21", null, "/textures/wood/walnut.jpg", 18000, 21, false,
            "კაკლის ფაქტურა", "მუქი კაკალი — კლასიკური საცხოვრებლისთვის.");
        yield return new("golden-oak-laminate", ColorFamily.WoodLaminate, "#B8884A", null, "/textures/wood/golden-oak.jpg", 18000, 22, false,
            "ოქროსფერი მუხა", "ნათელი მუხის ფაქტურა — სიცოცხლის ფერი.");
        yield return new("mahogany-laminate", ColorFamily.WoodLaminate, "#6B2E1F", null, "/textures/wood/mahogany.jpg", 21000, 23, false,
            "მაჰოგანი", "მაჰოგანის მუქი წითელი — ისტორიული შენობებისთვის.");

        // RAL Custom placeholder — surcharge captured here; the actual hex/code
        // arrive on the request when picked from the modal.
        yield return new("ral-custom", ColorFamily.RalCustom, "#000000", null, null, 25000, 99, false,
            "RAL პალიტრა", "200+ ფერი — შენი არქიტექტორის ფანტაზიისთვის.");
    }

    /// <summary>
    /// Which color slugs each material allows. Wood laminates are exclusive
    /// to pvc-laminated; pvc-white sticks to neutrals; aluminum-high-thermal
    /// gets the full premium palette.
    /// </summary>
    private static IReadOnlyList<string> CompatibleColorSlugs(string materialSlug) => materialSlug switch
    {
        "aluminum-thermal" =>
            ["white-ral9016", "cream-ral9001", "brown-ral8014", "gray-ral7035",
             "anthracite-ral7016", "black-ral9005", "bronze-custom",
             "dark-green-ral6009", "wine-red-ral3005", "ral-custom"],
        "aluminum-high-thermal" =>
            ["white-ral9016", "cream-ral9001", "brown-ral8014", "gray-ral7035",
             "anthracite-ral7016", "black-ral9005", "bronze-custom",
             "dark-green-ral6009", "wine-red-ral3005", "ral-custom"],
        "aluminum-basic" =>
            ["white-ral9016", "cream-ral9001", "brown-ral8014", "gray-ral7035",
             "anthracite-ral7016", "black-ral9005", "bronze-custom", "ral-custom"],
        "pvc-laminated" =>
            ["white-ral9016", "cream-ral9001", "brown-ral8014", "gray-ral7035",
             "oak-laminate", "walnut-laminate", "golden-oak-laminate", "mahogany-laminate",
             "ral-custom"],
        "pvc-white" =>
            ["white-ral9016", "cream-ral9001", "gray-ral7035", "ral-custom"],
        _ => ["white-ral9016"],
    };

    private static ColorOption BuildColor(ColorSpec spec)
    {
        var nameResult = LocalizedText.Create(spec.NameKa);
        var descResult = LocalizedText.Create(spec.DescriptionKa);
        var colorResult = ColorOption.Create(
            slug: spec.Slug,
            name: nameResult.Value,
            shortDescription: descResult.Value,
            family: spec.Family,
            hexCode: spec.HexCode,
            ralCode: spec.RalCode,
            woodTextureUrl: spec.WoodTextureUrl,
            surchargeMinor: spec.SurchargeMinor,
            currency: Currency.Gel,
            sortOrder: spec.SortOrder,
            isDefault: spec.IsDefault);

        var c = colorResult.Value;
        return new ColorOption
        {
            Id = DeterministicGuid(spec.Slug),
            Slug = c.Slug,
            Name = c.Name,
            ShortDescription = c.ShortDescription,
            Family = c.Family,
            HexCode = c.HexCode,
            RalCode = c.RalCode,
            WoodTextureUrl = c.WoodTextureUrl,
            SurchargeMinor = c.SurchargeMinor,
            Currency = c.Currency,
            SortOrder = c.SortOrder,
            IsDefault = c.IsDefault,
            IsActive = c.IsActive,
            CreatedAtUtc = new DateTime(2026, 5, 18, 0, 0, 0, DateTimeKind.Utc),
        };
    }

    private static Guid DeterministicGuid(string seed)
    {
        var input = System.Text.Encoding.UTF8.GetBytes(Namespace + ":color-option:" + seed);
#pragma warning disable CA5350
        var hash = System.Security.Cryptography.SHA1.HashData(input);
#pragma warning restore CA5350
        var bytes = new byte[16];
        Array.Copy(hash, bytes, 16);
        bytes[6] = (byte)((bytes[6] & 0x0F) | 0x50);
        bytes[8] = (byte)((bytes[8] & 0x3F) | 0x80);
        return new Guid(bytes);
    }

    private sealed record ColorSpec(
        string Slug,
        ColorFamily Family,
        string HexCode,
        string? RalCode,
        string? WoodTextureUrl,
        int SurchargeMinor,
        int SortOrder,
        bool IsDefault,
        string NameKa,
        string DescriptionKa);
}
