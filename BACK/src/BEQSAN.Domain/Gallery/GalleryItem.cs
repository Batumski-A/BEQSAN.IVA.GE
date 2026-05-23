namespace BEQSAN.Domain.Gallery;

/// <summary>
/// A photo or video featured on the public gallery. MVP phase: images
/// reference existing static files under /img/*. Future phase will add
/// admin upload via IStorageService.
/// </summary>
public sealed class GalleryItem
{
    public Guid Id { get; init; }

    public string Title { get; set; } = null!;
    public string? Caption { get; set; }

    /// <summary>Public URL of the asset (e.g. "/img/modern-pvc-window.png").</summary>
    public string ImageUrl { get; set; } = null!;

    /// <summary>Optional category slug — "windows", "doors", "facades", "balcony".</summary>
    public string? Category { get; set; }

    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public bool IsFeatured { get; set; }

    public DateTime CreatedAtUtc { get; init; }
    public DateTime UpdatedAtUtc { get; set; }
}
