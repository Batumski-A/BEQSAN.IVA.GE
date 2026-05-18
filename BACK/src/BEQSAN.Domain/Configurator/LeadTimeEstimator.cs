using BEQSAN.Domain.Catalog;

namespace BEQSAN.Domain.Configurator;

/// <summary>
/// Pure production-and-install lead-time estimator. No I/O, no clock, no
/// randomness — same inputs always produce the same window. The result is
/// a min/max pair because real workshops give ranges; the FRONT renders
/// "{min}–{max} days" on Step 8.
///
/// <para>
/// Formula (Phase 1 — Roman-validated against shop capacity):
///   <list type="bullet">
///     <item>Start with <see cref="ProductType.LeadTimeDaysMin"/> +
///       <see cref="ProductType.LeadTimeDaysMax"/> base window.</item>
///     <item>+ pane-count factor: 2 panes → +1 day, 3 → +3, 4+ → +5.</item>
///     <item>+ blind (motor mount, electrical run): +2/+3 days on the window.</item>
///     <item>+ smart-lock (vendor lead, wiring): +3/+5 days.</item>
///     <item>+ regional install days (Batumi 1 / nearby zones 2 / mid 3 / east 4).</item>
///   </list>
/// </para>
/// </summary>
public static class LeadTimeEstimator
{
    public static LeadTimeEstimate Estimate(
        ProductType productType,
        IReadOnlyList<ConfigurationPane> panes,
        bool hasBlind,
        bool hasSmartLock,
        InstallationRegion region)
    {
        var baseMin = productType.LeadTimeDaysMin;
        var baseMax = productType.LeadTimeDaysMax;

        // Pane-count complexity bump. 1 pane → no bump; 2 → +1; 3 → +3; 4+ → +5.
        // baseMax gets one extra day to keep the window narrative honest.
        var paneFactor = panes.Count switch
        {
            <= 1 => 0,
            2 => 1,
            3 => 3,
            _ => 5,
        };
        baseMin += paneFactor;
        baseMax += paneFactor + (panes.Count >= 2 ? 1 : 0);

        if (hasBlind)
        {
            baseMin += 2;
            baseMax += 3;
        }
        if (hasSmartLock)
        {
            baseMin += 3;
            baseMax += 5;
        }

        var installDays = region switch
        {
            InstallationRegion.Batumi => 1,
            InstallationRegion.KobuletiCoast or InstallationRegion.Guria => 2,
            InstallationRegion.Imereti or InstallationRegion.Samegrelo => 3,
            InstallationRegion.EastGeorgia => 4,
            InstallationRegion.Other => 2, // assume a coastal-equivalent install until manually quoted
            _ => 1,
        };

        return new LeadTimeEstimate(
            ProductionDaysMin: baseMin,
            ProductionDaysMax: baseMax,
            InstallationDays: installDays,
            TotalDaysMin: baseMin + installDays,
            TotalDaysMax: baseMax + installDays);
    }
}

public sealed record LeadTimeEstimate(
    int ProductionDaysMin,
    int ProductionDaysMax,
    int InstallationDays,
    int TotalDaysMin,
    int TotalDaysMax);
