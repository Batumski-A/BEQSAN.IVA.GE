using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Infrastructure.Persistence.Seed;

/// <summary>
/// Idempotent seed of the 13 initial materials across the 5 product types.
/// Prices in tetri (₾×100) are the 2026-05-19 BEQSAN baseline ratified in
/// ADR-0004 (see docs/adr/0004-pricing-baseline-2026.md + the research
/// note docs/research/2026-pricing-baseline.md). The baseline is set 5–10%
/// above the Georgian competitor mid (window.ge / gns.ge / alu.ge /
/// fanjrebi.ge / exclusive-geo.ge) to reflect direct-workshop positioning,
/// German hardware standard, and the 10-year warranty.
/// Aluminum rows stayed at the canary-pinned values because they were
/// already congruent with the market mid; PVC rows lifted ~13% to align
/// with Rehau Synego entry-tier reality.
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
        // 2026-05-19 baseline: window.ge/exclusive-geo.ge ALU thermal ₾340–430/m², mid ₾385, BEQSAN −1% = ₾380/m²
        yield return new("window", "aluminum-thermal", 1, MaterialFamily.Aluminum, ThermalRating.Thermal, 38000,
            "ალუმინი თერმო",
            "თერმოწყვეტიანი პროფილი, ბათუმის ცხელი ზაფხულისთვის და დეკემბრის ქარისთვის.");
        // 2026-05-19 baseline: exclusive-geo.ge/gns.ge ALU non-thermal mid ₾260/m², BEQSAN ±0% = ₾260/m²
        yield return new("window", "aluminum-basic", 2, MaterialFamily.Aluminum, ThermalRating.Basic, 26000,
            "ალუმინი არათერმო",
            "მუშა ვარიანტი — სათავსოები, აივნები, კომერციული ფართები.");
        // 2026-05-19 baseline: gns.ge Synego entry-tier mid ₾195/m², BEQSAN +0% = ₾195/m² (was 170; +14.7% to match market reality)
        yield return new("window", "pvc-white", 3, MaterialFamily.Pvc, ThermalRating.Basic, 19500,
            "PVC თეთრი",
            "კლასიკური თეთრი, ხელმისაწვდომი, საცხოვრებლისთვის ნაცადი.");
        // 2026-05-19 baseline: Synego laminate mid ₾275/m², BEQSAN ±0% = ₾275/m² (was 240; +14.6% to align with PVC bump)
        yield return new("window", "pvc-laminated", 4, MaterialFamily.Pvc, ThermalRating.Thermal, 27500,
            "PVC ლამინირებული",
            "ხის ფაქტურა ან ფერი — PVC-ის ფასი, ხის სტილი.");

        // door — 4 materials, sturdier profiles, higher per-m² price
        // 2026-05-19 baseline: Alumil S77/M11000-door dealer mid ₾440/m², BEQSAN −5% = ₾420/m² (canary-pinned ₾832.61)
        yield return new("door", "aluminum-thermal", 1, MaterialFamily.Aluminum, ThermalRating.Thermal, 42000,
            "ალუმინი თერმო",
            "უსაფრთხო შესასვლელი კარი — თერმოწყვეტა და სიმტკიცე ერთად.");
        // 2026-05-19 baseline: ALU non-thermal door mid ₾285/m², BEQSAN +1.8% = ₾290/m²
        yield return new("door", "aluminum-basic", 2, MaterialFamily.Aluminum, ThermalRating.Basic, 29000,
            "ალუმინი არათერმო",
            "შიდა და სამეურნეო კარები — გამძლე, მსუბუქი.");
        // 2026-05-19 baseline: Synego door section mid ₾220/m², BEQSAN ±0% = ₾220/m² (was 195; +12.8% door reinforcement)
        yield return new("door", "pvc-white", 3, MaterialFamily.Pvc, ThermalRating.Basic, 22000,
            "PVC თეთრი",
            "კლასიკური PVC კარი — საცხოვრებლის შიდა ან აივნის გასასვლელი.");
        // 2026-05-19 baseline: Synego laminate door mid ₾295/m², BEQSAN ±0% = ₾295/m² (was 265; +11.3%)
        yield return new("door", "pvc-laminated", 4, MaterialFamily.Pvc, ThermalRating.Thermal, 29500,
            "PVC ლამინირებული",
            "ხის ფაქტურით — PVC-ის ფასი, ხის სტილის შესასვლელი.");

        // sliding — 2 materials, aluminum only (PVC sliding rare at this scale)
        // 2026-05-19 baseline: Alumil S560/PHOS dealer mid ₾500/m², BEQSAN −4% = ₾480/m²
        yield return new("sliding", "aluminum-thermal", 1, MaterialFamily.Aluminum, ThermalRating.Thermal, 48000,
            "ალუმინი თერმო",
            "სლაიდინგ სისტემა თერმოწყვეტით — საცხოვრებლის ფართო გახსნისთვის.");
        // 2026-05-19 baseline: commercial non-thermal slider mid ₾330/m², BEQSAN +6.1% = ₾350/m²
        yield return new("sliding", "aluminum-basic", 2, MaterialFamily.Aluminum, ThermalRating.Basic, 35000,
            "ალუმინი არათერმო",
            "კომერციული სლაიდინგი — მაღაზიები, ოფისები, კაფეები.");

        // panoramic — 1 material, top-thermal only (the whole point is large glass)
        // 2026-05-19 baseline: Alumil M11500 high-thermal dealer mid ₾530/m², BEQSAN −1.9% = ₾520/m²
        yield return new("panoramic", "aluminum-high-thermal", 1, MaterialFamily.Aluminum, ThermalRating.HighThermal, 52000,
            "ალუმინი თერმო (პრემიუმ)",
            "მინიმალური ჩარჩო, მაქსიმუმი მინა. პრემიუმ თერმოწყვეტა დიდი ფართებისთვის.");

        // balcony — 2 materials
        // 2026-05-19 baseline: ALU balcony glazing mid ₾220/m², BEQSAN ±0% = ₾220/m²
        yield return new("balcony", "aluminum-basic", 1, MaterialFamily.Aluminum, ThermalRating.Basic, 22000,
            "ალუმინი არათერმო",
            "აივნის შემინვის ეკონომიური ვარიანტი — ღია ნახევრად-დახურული.");
        // 2026-05-19 baseline: PVC balcony Brillant entry mid ₾165/m², BEQSAN ±0% = ₾165/m² (was 150; +10%)
        yield return new("balcony", "pvc-white", 2, MaterialFamily.Pvc, ThermalRating.Basic, 16500,
            "PVC თეთრი",
            "ჩარჩოიანი აივნის შემინვა — სითბოს და ხმის იზოლაცია.");

        // veranda — 2 materials. U-shape costs ~front + 2 side walls × area;
        // pricing mirrors panoramic per m² since the system is similar (large
        // glass + slim frame) plus the extra corner mullions are absorbed in
        // pane-count via the layout, not the per-m² rate.
        yield return new("veranda", "aluminum-thermal", 1, MaterialFamily.Aluminum, ThermalRating.Thermal, 46000,
            "ალუმინი თერმო",
            "სამმხრიდან შემოსაზღვრული ვერანდა — ფრონტი + 2 გვერდითი კედელი.");
        yield return new("veranda", "aluminum-high-thermal", 2, MaterialFamily.Aluminum, ThermalRating.HighThermal, 52000,
            "ალუმინი თერმო (პრემიუმ)",
            "სრულწლიური ექსპლუატაცია — გათბობის და კონდიცირების მქონე ვერანდისთვის.");
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
