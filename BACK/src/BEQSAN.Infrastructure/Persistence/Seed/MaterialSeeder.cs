using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Infrastructure.Persistence.Seed;

/// <summary>
/// Idempotent seed of the 13 initial materials across the 5 product types.
/// Prices in tetri (₾×100) are market-realistic 2026 baselines pulled from
/// public Georgian competitors (window.ge, gns.ge, alu.ge, fanjrebi.ge) for
/// the Phase 1 launch. Roman locks the final numbers before public preview.
/// Skips inserts when a row with the same (product_type_id, slug) exists.
/// </summary>
internal static class MaterialSeeder
{
    private const string Namespace = "BEQSAN-CATALOG-2026";

    public static async Task SeedAsync(BeqsanDbContext db, CancellationToken ct = default)
    {
        // ProductType rows must be seeded first — caller orders these correctly.
        var productTypes = await db.ProductTypes
            .Select(p => new { p.Id, p.Slug })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        var productTypeIdBySlug = productTypes.ToDictionary(p => p.Slug, p => p.Id, StringComparer.Ordinal);

        var toInsert = new List<Material>();
        foreach (var spec in MaterialSpecs())
        {
            if (!productTypeIdBySlug.TryGetValue(spec.ProductTypeSlug, out var productTypeId))
            {
                continue;
            }

            var alreadyExists = await db.Materials
                .AnyAsync(m => m.ProductTypeId == productTypeId && m.Slug == spec.Slug, ct)
                .ConfigureAwait(false);
            if (alreadyExists)
            {
                continue;
            }

            toInsert.Add(BuildMaterial(productTypeId, spec));
        }

        if (toInsert.Count == 0)
        {
            return;
        }

        await db.Materials.AddRangeAsync(toInsert, ct).ConfigureAwait(false);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    private static IEnumerable<MaterialSpec> MaterialSpecs()
    {
        // window — 4 materials
        yield return new("window", "aluminum-thermal", 1, MaterialFamily.Aluminum, ThermalRating.Thermal, 38000,
            "ალუმინი თერმო",
            "თერმოწყვეტიანი პროფილი, ბათუმის ცხელი ზაფხულისთვის და დეკემბრის ქარისთვის.");
        yield return new("window", "aluminum-basic", 2, MaterialFamily.Aluminum, ThermalRating.Basic, 26000,
            "ალუმინი არათერმო",
            "მუშა ვარიანტი — სათავსოები, აივნები, კომერციული ფართები.");
        yield return new("window", "pvc-white", 3, MaterialFamily.Pvc, ThermalRating.Basic, 17000,
            "PVC თეთრი",
            "კლასიკური თეთრი, ხელმისაწვდომი, საცხოვრებლისთვის ნაცადი.");
        yield return new("window", "pvc-laminated", 4, MaterialFamily.Pvc, ThermalRating.Thermal, 24000,
            "PVC ლამინირებული",
            "ხის ფაქტურა ან ფერი — PVC-ის ფასი, ხის სტილი.");

        // door — 4 materials, sturdier profiles, higher per-m² price
        yield return new("door", "aluminum-thermal", 1, MaterialFamily.Aluminum, ThermalRating.Thermal, 42000,
            "ალუმინი თერმო",
            "უსაფრთხო შესასვლელი კარი — თერმოწყვეტა და სიმტკიცე ერთად.");
        yield return new("door", "aluminum-basic", 2, MaterialFamily.Aluminum, ThermalRating.Basic, 29000,
            "ალუმინი არათერმო",
            "შიდა და სამეურნეო კარები — გამძლე, მსუბუქი.");
        yield return new("door", "pvc-white", 3, MaterialFamily.Pvc, ThermalRating.Basic, 19500,
            "PVC თეთრი",
            "კლასიკური PVC კარი — საცხოვრებლის შიდა ან აივნის გასასვლელი.");
        yield return new("door", "pvc-laminated", 4, MaterialFamily.Pvc, ThermalRating.Thermal, 26500,
            "PVC ლამინირებული",
            "ხის ფაქტურით — PVC-ის ფასი, ხის სტილის შესასვლელი.");

        // sliding — 2 materials, aluminum only (PVC sliding rare at this scale)
        yield return new("sliding", "aluminum-thermal", 1, MaterialFamily.Aluminum, ThermalRating.Thermal, 48000,
            "ალუმინი თერმო",
            "სლაიდინგ სისტემა თერმოწყვეტით — საცხოვრებლის ფართო გახსნისთვის.");
        yield return new("sliding", "aluminum-basic", 2, MaterialFamily.Aluminum, ThermalRating.Basic, 35000,
            "ალუმინი არათერმო",
            "კომერციული სლაიდინგი — მაღაზიები, ოფისები, კაფეები.");

        // panoramic — 1 material, top-thermal only (the whole point is large glass)
        yield return new("panoramic", "aluminum-high-thermal", 1, MaterialFamily.Aluminum, ThermalRating.HighThermal, 52000,
            "ალუმინი თერმო (პრემიუმ)",
            "მინიმალური ჩარჩო, მაქსიმუმი მინა. პრემიუმ თერმოწყვეტა დიდი ფართებისთვის.");

        // balcony — 2 materials
        yield return new("balcony", "aluminum-basic", 1, MaterialFamily.Aluminum, ThermalRating.Basic, 22000,
            "ალუმინი არათერმო",
            "აივნის შემინვის ეკონომიური ვარიანტი — ღია ნახევრად-დახურული.");
        yield return new("balcony", "pvc-white", 2, MaterialFamily.Pvc, ThermalRating.Basic, 15000,
            "PVC თეთრი",
            "ჩარჩოიანი აივნის შემინვა — სითბოს და ხმის იზოლაცია.");
    }

    private static Material BuildMaterial(Guid productTypeId, MaterialSpec spec)
    {
        var nameResult = LocalizedText.Create(spec.NameKa);
        var descResult = LocalizedText.Create(spec.DescriptionKa);
        var materialResult = Material.Create(
            productTypeId: productTypeId,
            slug: spec.Slug,
            name: nameResult.Value,
            shortDescription: descResult.Value,
            family: spec.Family,
            thermalRating: spec.ThermalRating,
            basePricePerSqmMinor: spec.PriceMinor,
            currency: Currency.Gel,
            sortOrder: spec.SortOrder);

        var pt = materialResult.Value;
        // Stable id + creation timestamp so seeds are deterministic across rebuilds.
        return new Material
        {
            Id = DeterministicGuid($"{spec.ProductTypeSlug}:{spec.Slug}"),
            ProductTypeId = productTypeId,
            Slug = pt.Slug,
            Name = pt.Name,
            ShortDescription = pt.ShortDescription,
            Family = pt.Family,
            ThermalRating = pt.ThermalRating,
            BasePricePerSqmMinor = pt.BasePricePerSqmMinor,
            Currency = pt.Currency,
            SortOrder = pt.SortOrder,
            IsActive = pt.IsActive,
            CreatedAtUtc = new DateTime(2026, 5, 17, 0, 0, 0, DateTimeKind.Utc),
        };
    }

    private static Guid DeterministicGuid(string seed)
    {
        var input = System.Text.Encoding.UTF8.GetBytes(Namespace + ":material:" + seed);
#pragma warning disable CA5350
        var hash = System.Security.Cryptography.SHA1.HashData(input);
#pragma warning restore CA5350
        var bytes = new byte[16];
        Array.Copy(hash, bytes, 16);
        bytes[6] = (byte)((bytes[6] & 0x0F) | 0x50);
        bytes[8] = (byte)((bytes[8] & 0x3F) | 0x80);
        return new Guid(bytes);
    }

    private sealed record MaterialSpec(
        string ProductTypeSlug,
        string Slug,
        int SortOrder,
        MaterialFamily Family,
        ThermalRating ThermalRating,
        int PriceMinor,
        string NameKa,
        string DescriptionKa);
}
