using BEQSAN.Domain.Gallery;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Infrastructure.Persistence.Seed;

/// <summary>
/// Seeds the gallery with the existing static product images so the
/// admin gallery page has content out-of-the-box. Idempotent — skips
/// items whose ImageUrl already exists.
/// </summary>
public static class GalleryItemSeeder
{
    public static async Task SeedAsync(BeqsanDbContext db, CancellationToken ct = default)
    {
        var seed = new (string Title, string Url, string Category, bool Featured)[]
        {
            ("PVC ფანჯრები · სტუდია", "/img/modern-pvc-window.png", "windows", true),
            ("ალუმინის ფანჯრები · მინიმალისტური", "/img/modern-aluminum-window.png", "windows", true),
            ("ალუმინის სლაიდური კარი", "/img/aluminum-sliding-door.png", "doors", true),
            ("აივანი · ფანჯარა + ბლოკი", "/img/balcony-block-door.png", "balcony", false),
            ("ვიტრაჟი · საფასადე", "/img/panoramic-facade-vitrage.png", "facades", true),
            ("ბადე · სტაციონარული", "/img/premium-mosquito-net.png", "accessories", false),
            ("ალუმინის პროფილი", "/img/aluminum-profile-detail.png", "details", false),
            ("PVC პროფილი · 6-კამერა", "/img/pvc-profile-detail.png", "details", false),
            ("პრემიუმ სახელური", "/img/premium-handle-detail.png", "details", false),
            ("სლაიდური როლერი", "/img/sliding-roller-detail.png", "details", false),
        };

        var existing = await db.GalleryItems
            .Select(g => g.ImageUrl)
            .ToListAsync(ct)
            .ConfigureAwait(false);
        var existingSet = new HashSet<string>(existing, StringComparer.OrdinalIgnoreCase);

        var now = DateTime.UtcNow;
        var sortOrder = 0;
        foreach (var (title, url, category, featured) in seed)
        {
            sortOrder += 10;
            if (existingSet.Contains(url))
            {
                continue;
            }
            db.GalleryItems.Add(new GalleryItem
            {
                Id = Guid.NewGuid(),
                Title = title,
                Caption = null,
                ImageUrl = url,
                Category = category,
                SortOrder = sortOrder,
                IsActive = true,
                IsFeatured = featured,
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
            });
        }
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
