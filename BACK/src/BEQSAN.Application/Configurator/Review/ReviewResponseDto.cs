using BEQSAN.Application.Configurator.ComputePrice;

namespace BEQSAN.Application.Configurator.Review;

/// <summary>
/// Rich response shape for the Step-8 review screen. Carries the
/// flattened <see cref="PriceBreakdownDto"/> for power consumers AND a
/// pre-grouped pricing structure the FRONT renders directly into the
/// receipt-style summary without re-parsing line codes.
/// </summary>
public sealed record ReviewResponseDto(
    PricingDto Pricing,
    DeliveryDto Delivery);

public sealed record PricingDto(
    PriceBreakdownDto Flat,
    GroupedBreakdownDto Grouped);

public sealed record GroupedBreakdownDto(
    PriceGroupDto Material,
    PriceGroupDto Glass,
    PriceGroupDto Color,
    PriceGroupDto Accessories,
    PriceGroupDto Installation,
    string VatDisplay,
    long VatMinor,
    string GrandTotalDisplay,
    long GrandTotalMinor,
    string Currency,
    bool InstallationIsManualQuote);

public sealed record PriceGroupDto(
    string TotalDisplay,
    long TotalMinor,
    IReadOnlyList<PriceLineDto> Lines);

public sealed record DeliveryDto(
    WarrantyTermsDto Warranty,
    LeadTimeEstimateDto LeadTime);

public sealed record WarrantyTermsDto(
    int Months,
    IReadOnlyList<string> Notes);

public sealed record LeadTimeEstimateDto(
    int ProductionDaysMin,
    int ProductionDaysMax,
    int InstallationDays,
    int TotalDaysMin,
    int TotalDaysMax);
