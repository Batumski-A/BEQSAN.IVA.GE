using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Infrastructure.Persistence.Seed;

/// <summary>
/// Idempotent seed of the 5 initial product types. Runs after EnsureCreatedAsync /
/// migrations on every startup. Two kinds of work:
///   1. Insert any rows missing by slug.
///   2. Backfill dimension constraint columns (Min/Max Width/Height) on rows
///      whose values are zero — covers data created before the AddDimensionConstraints
///      migration landed.
/// Real photos replace the placeholder hero URLs once Roman provides them.
/// </summary>
internal static class ProductTypeSeeder
{
    public static async Task SeedAsync(BeqsanDbContext db, CancellationToken ct = default)
    {
        var seedSlugs = SeedData().Select(p => p.Slug).ToHashSet(StringComparer.Ordinal);
        var existing = await db.ProductTypes
            .Where(p => seedSlugs.Contains(p.Slug))
            .ToListAsync(ct)
            .ConfigureAwait(false);
        var existingBySlug = existing.ToDictionary(p => p.Slug, StringComparer.Ordinal);

        var toInsert = new List<ProductType>();
        var mutatedAny = false;
        foreach (var seed in SeedData())
        {
            if (!existingBySlug.TryGetValue(seed.Slug, out var current))
            {
                toInsert.Add(seed);
                continue;
            }

            // Backfill constraint columns on legacy rows.
            if (current.MinWidthCm == 0 || current.MaxWidthCm == 0
                || current.MinHeightCm == 0 || current.MaxHeightCm == 0)
            {
                db.Entry(current).Property(p => p.MinWidthCm).CurrentValue = seed.MinWidthCm;
                db.Entry(current).Property(p => p.MaxWidthCm).CurrentValue = seed.MaxWidthCm;
                db.Entry(current).Property(p => p.MinHeightCm).CurrentValue = seed.MinHeightCm;
                db.Entry(current).Property(p => p.MaxHeightCm).CurrentValue = seed.MaxHeightCm;
                mutatedAny = true;
            }

            // Backfill delivery-terms columns on rows that came in via the
            // AddDeliveryTerms migration's default value (36/10/14) but
            // should carry the per-slug specifics from SeedData.
            if (current.WarrantyMonths != seed.WarrantyMonths
                || current.LeadTimeDaysMin != seed.LeadTimeDaysMin
                || current.LeadTimeDaysMax != seed.LeadTimeDaysMax)
            {
                db.Entry(current).Property(p => p.WarrantyMonths).CurrentValue = seed.WarrantyMonths;
                db.Entry(current).Property(p => p.LeadTimeDaysMin).CurrentValue = seed.LeadTimeDaysMin;
                db.Entry(current).Property(p => p.LeadTimeDaysMax).CurrentValue = seed.LeadTimeDaysMax;
                mutatedAny = true;
            }
        }

        if (toInsert.Count > 0)
        {
            await db.ProductTypes.AddRangeAsync(toInsert, ct).ConfigureAwait(false);
            mutatedAny = true;
        }

        if (mutatedAny)
        {
            await db.SaveChangesAsync(ct).ConfigureAwait(false);
        }
    }

    private static IEnumerable<ProductType> SeedData()
    {
        // Real Georgian copy per .claude/skills/content-voice — confident,
        // manufacturing, no marketing fluff. Order is the order users see.
        // Constraints are market-realistic 2026 baselines; Roman locks final
        // numbers before public preview (see docs/questions.md).
        // Delivery terms per slug — Roman-locked Phase 1.
        //   window:    36 mo warranty, 10-14 day lead
        //   door:      60 mo warranty, 14-21 day lead (secure + longer install)
        //   sliding:   36 mo warranty, 14-18 day lead
        //   panoramic: 36 mo warranty, 18-25 day lead (larger system)
        //   balcony:   24 mo warranty, 7-12 day lead (simpler)
        yield return Build("window", "ფანჯარა",
            "ბათუმის ფაბრიკაში აწყობილი ალუმინის და PVC ფანჯრები.", 1,
            warrantyMonths: 36, leadMin: 10, leadMax: 14);

        yield return Build("door", "კარი",
            "შესასვლელი და შიდა კარები — თერმო და უსაფრთხო.", 2,
            warrantyMonths: 60, leadMin: 14, leadMax: 21);

        yield return Build("sliding", "სლაიდინგ სისტემა",
            "ფართო გახსნა, მცირე ფარდობა — დიდი სივრცეებისთვის.", 3,
            warrantyMonths: 36, leadMin: 14, leadMax: 18);

        yield return Build("panoramic", "პანორამული შემინვა",
            "მინიმალური ჩარჩო, მაქსიმუმი ხედვა.", 4,
            warrantyMonths: 36, leadMin: 18, leadMax: 25);

        yield return Build("balcony", "აივნის შემინვა",
            "უტიხრო ან ჩარჩოიანი, ბათუმის ქარისთვის ნაგები.", 5,
            warrantyMonths: 24, leadMin: 7, leadMax: 12);

        yield return Build("veranda", "ვერანდა",
            "U-ფორმის ჩარჩო — ფრონტი + ორი გვერდითი კედელი ერთად.", 6,
            warrantyMonths: 36, leadMin: 21, leadMax: 30);
    }

    private static ProductType Build(
        string slug, string ka, string shortKa, int sortOrder,
        int warrantyMonths, int leadMin, int leadMax)
    {
        var id = DeterministicGuid(slug);
        var nameResult = LocalizedText.Create(ka);
        var descResult = LocalizedText.Create(shortKa);
        var constraints = DimensionConstraints.ForProductType(slug);
        var typeResult = ProductType.Create(
            slug: slug,
            name: nameResult.Value,
            shortDescription: descResult.Value,
            heroImageUrl: $"/images/catalog/{slug}.jpg",
            sortOrder: sortOrder,
            constraints: constraints);

        var pt = typeResult.Value;
        return new ProductType
        {
            Id = id,
            Slug = pt.Slug,
            Name = pt.Name,
            ShortDescription = pt.ShortDescription,
            HeroImageUrl = pt.HeroImageUrl,
            SortOrder = pt.SortOrder,
            IsActive = pt.IsActive,
            CreatedAtUtc = new DateTime(2026, 5, 17, 0, 0, 0, DateTimeKind.Utc),
            MinWidthCm = constraints.MinWidthCm,
            MaxWidthCm = constraints.MaxWidthCm,
            MinHeightCm = constraints.MinHeightCm,
            MaxHeightCm = constraints.MaxHeightCm,
            WarrantyMonths = warrantyMonths,
            LeadTimeDaysMin = leadMin,
            LeadTimeDaysMax = leadMax,
        };
    }

    private static Guid DeterministicGuid(string seed)
    {
        const string Namespace = "BEQSAN-CATALOG-2026";
        var input = System.Text.Encoding.UTF8.GetBytes(Namespace + ":" + seed);
#pragma warning disable CA5350
        var hash = System.Security.Cryptography.SHA1.HashData(input);
#pragma warning restore CA5350
        var bytes = new byte[16];
        Array.Copy(hash, bytes, 16);
        bytes[6] = (byte)((bytes[6] & 0x0F) | 0x50);
        bytes[8] = (byte)((bytes[8] & 0x3F) | 0x80);
        return new Guid(bytes);
    }
}
