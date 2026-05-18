using BEQSAN.Domain.Catalog;

namespace BEQSAN.Domain.Configurator;

/// <summary>
/// Maps a finished configuration to its warranty terms. The base months
/// come from <see cref="ProductType.WarrantyMonths"/>; certain premium
/// accessories add vendor-backed notes the FRONT surfaces below the
/// headline number.
/// </summary>
public static class WarrantyEstimator
{
    /// <summary>
    /// Smart-lock manufacturer's own warranty layered on top of the BEQSAN
    /// frame warranty. The caller of <see cref="For"/> resolves
    /// <c>hasSmartLock</c> from <c>LockGrade.Smart</c> in the accessory
    /// selection.
    /// </summary>
    public const int SmartLockVendorWarrantyMonths = 24;

    public static WarrantyTerms For(
        ProductType productType,
        bool hasSmartLock)
    {
        var notes = new List<string>();
        if (hasSmartLock)
        {
            notes.Add("smart-lock.vendor.24mo");
        }

        return new WarrantyTerms(
            Months: productType.WarrantyMonths,
            Notes: notes);
    }
}

public sealed record WarrantyTerms(int Months, IReadOnlyList<string> Notes);
