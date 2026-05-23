namespace BEQSAN.Domain.Orders;

/// <summary>
/// Lifecycle of a customer order from submission through delivery.
/// Persisted as the integer value so admin UIs can compare by ordinal
/// for "later than X" status filters.
/// </summary>
public enum OrderStatus
{
    /// <summary>Just submitted — awaiting manager review.</summary>
    Pending = 0,

    /// <summary>Manager confirmed price + scope; ready to schedule.</summary>
    Confirmed = 1,

    /// <summary>Workshop has begun fabrication.</summary>
    InProduction = 2,

    /// <summary>Finished, awaiting customer pickup / installation slot.</summary>
    Ready = 3,

    /// <summary>Installed or delivered to the customer.</summary>
    Delivered = 4,

    /// <summary>Customer cancelled or manager rejected (e.g. unreachable).</summary>
    Cancelled = 99,
}
