using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Domain.Orders;

/// <summary>
/// A customer order submitted from the configurator. Captures the full
/// configuration JSON snapshot at submission time so future catalog edits
/// don't retroactively change historical orders.
/// </summary>
public sealed class Order
{
    public Guid Id { get; init; }

    /// <summary>Human-readable identifier shown to the customer (e.g. "BQ-2026-000123").</summary>
    public string OrderNumber { get; set; } = null!;

    public string CustomerName { get; set; } = null!;

    /// <summary>E.164 (+995595XXXXXX). Validated at the API edge.</summary>
    public string CustomerPhone { get; set; } = null!;

    public string? CustomerEmail { get; set; }

    public string? CustomerAddress { get; set; }

    /// <summary>Optional notes from the customer at submission time.</summary>
    public string? Notes { get; set; }

    /// <summary>JSON snapshot of the full ComputePriceCommand input.</summary>
    public string ConfigurationJson { get; set; } = null!;

    /// <summary>Total price in tetri (1 GEL = 100 tetri).</summary>
    public long TotalPriceMinor { get; set; }

    public Currency Currency { get; set; } = Currency.Gel;

    public OrderStatus Status { get; set; }

    /// <summary>JSON array of {status,changedAtUtc,note?} events.</summary>
    public string StatusHistoryJson { get; set; } = "[]";

    public DateTime CreatedAtUtc { get; init; }
    public DateTime UpdatedAtUtc { get; set; }
}
