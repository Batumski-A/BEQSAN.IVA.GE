using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Infrastructure.Persistence.Seed;

/// <summary>
/// Idempotent seed of the 5 initial product types. Runs after EnsureCreatedAsync /
/// migrations on every startup; skips inserts when a row with the same slug exists.
/// Real photos replace the placeholder hero URLs once Roman provides them.
/// </summary>
internal static class ProductTypeSeeder
{
    public static async Task SeedAsync(BeqsanDbContext db, CancellationToken ct = default)
    {
        var seedSlugs = SeedData().Select(p => p.Slug).ToHashSet(StringComparer.Ordinal);
        var existing = await db.ProductTypes
            .Where(p => seedSlugs.Contains(p.Slug))
            .Select(p => p.Slug)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        var toInsert = SeedData().Where(p => !existing.Contains(p.Slug)).ToList();
        if (toInsert.Count == 0)
        {
            return;
        }

        await db.ProductTypes.AddRangeAsync(toInsert, ct).ConfigureAwait(false);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    private static IEnumerable<ProductType> SeedData()
    {
        // Real Georgian copy per .claude/skills/content-voice — confident,
        // manufacturing, no marketing fluff. Order is the order users see.
        yield return Build(
            slug: "window",
            ka: "ფანჯარა",
            shortKa: "ბათუმის ფაბრიკაში აწყობილი ალუმინის და PVC ფანჯრები.",
            sortOrder: 1);

        yield return Build(
            slug: "door",
            ka: "კარი",
            shortKa: "შესასვლელი და შიდა კარები — თერმო და უსაფრთხო.",
            sortOrder: 2);

        yield return Build(
            slug: "sliding",
            ka: "სლაიდინგ სისტემა",
            shortKa: "ფართო გახსნა, მცირე ფარდობა — დიდი სივრცეებისთვის.",
            sortOrder: 3);

        yield return Build(
            slug: "panoramic",
            ka: "პანორამული შემინვა",
            shortKa: "მინიმალური ჩარჩო, მაქსიმუმი ხედვა.",
            sortOrder: 4);

        yield return Build(
            slug: "balcony",
            ka: "აივნის შემინვა",
            shortKa: "უტიხრო ან ჩარჩოიანი, ბათუმის ქარისთვის ნაგები.",
            sortOrder: 5);
    }

    private static ProductType Build(string slug, string ka, string shortKa, int sortOrder)
    {
        // Deterministic GUIDs derived from slug — keeps the seed idempotent across rebuilds
        // and gives the FRONT a stable id to navigate from.
        var id = DeterministicGuid(slug);
        var nameResult = LocalizedText.Create(ka);
        var descResult = LocalizedText.Create(shortKa);
        var typeResult = ProductType.Create(
            slug: slug,
            name: nameResult.Value,
            shortDescription: descResult.Value,
            heroImageUrl: $"/images/catalog/{slug}.jpg",
            sortOrder: sortOrder);

        // Materialize and override Id+CreatedAtUtc so seeds are stable.
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
        };
    }

    private static Guid DeterministicGuid(string seed)
    {
        // Deterministic UUIDv5 namespace GUID — same seed → same Guid forever.
        // RFC 4122 mandates SHA1 for v5; this is identity derivation, not a
        // security primitive, so CA5350 is suppressed for this single call.
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
