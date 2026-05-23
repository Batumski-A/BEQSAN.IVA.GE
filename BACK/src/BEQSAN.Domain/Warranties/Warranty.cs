namespace BEQSAN.Domain.Warranties;

/// <summary>
/// Customer warranty record. Auto-created when an order transitions to
/// Delivered; the workshop default is 60 months and can be overridden
/// per-order from the admin UI.
/// </summary>
public sealed class Warranty
{
    public Guid Id { get; init; }
    public Guid OrderId { get; init; }
    public string OrderNumber { get; set; } = null!;

    public string CustomerName { get; set; } = null!;
    public string CustomerPhone { get; set; } = null!;

    public int DurationMonths { get; set; }
    public DateTime StartDateUtc { get; set; }
    public DateTime EndDateUtc { get; set; }

    public WarrantyStatus Status { get; set; }

    /// <summary>Manager notes — claim description, resolution, etc.</summary>
    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; init; }
    public DateTime UpdatedAtUtc { get; set; }
}
