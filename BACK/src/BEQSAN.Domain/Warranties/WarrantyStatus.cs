namespace BEQSAN.Domain.Warranties;

public enum WarrantyStatus
{
    /// <summary>Active and within validity window.</summary>
    Active = 0,

    /// <summary>EndDate passed — coverage ended.</summary>
    Expired = 1,

    /// <summary>Customer filed a warranty claim — under workshop review.</summary>
    Claimed = 2,

    /// <summary>Claim resolved (fixed, replaced, or denied).</summary>
    Resolved = 3,
}
