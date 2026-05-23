using System.Globalization;
using BEQSAN.Application.Catalog.GetLockTypes;
using BEQSAN.Application.Catalog.GetProductTypes;
using BEQSAN.Application.Configurator.ComputePrice;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.Configurator;
using MediatR;

namespace BEQSAN.Application.Configurator.Review;

/// <summary>
/// Handler for the Step-8 review request. Delegates the price math to
/// <see cref="ComputePriceCommand"/> via MediatR — same canary numbers,
/// same validator chain, no risk of drift — and layers three review-
/// only outputs on top:
///   1. Grouped pricing breakdown — line codes sorted into Material /
///      Glass / Color / Accessories / Installation buckets, VAT and
///      grand total separated.
///   2. Lead time estimate via <see cref="LeadTimeEstimator"/>.
///   3. Warranty terms via <see cref="WarrantyEstimator"/>.
/// </summary>
internal sealed class ReviewHandler(
    IProductTypeReader productTypeReader,
    ILockTypeReader lockTypeReader,
    ISender priceSender)
    : IRequestHandler<ReviewCommand, Result<ReviewResponseDto>>
{
    private readonly IProductTypeReader _productTypeReader = productTypeReader;
    private readonly ILockTypeReader _lockTypeReader = lockTypeReader;
    private readonly ISender _priceSender = priceSender;

    public async Task<Result<ReviewResponseDto>> Handle(ReviewCommand request, CancellationToken ct)
    {
        // Delegate price math to the existing ComputePriceHandler — same
        // canary numbers, same validator chain. ReviewHandler just enriches
        // the response with grouping + delivery info.
        var priceCommand = new ComputePriceCommand(
            ProductTypeId: request.ProductTypeId,
            MaterialId: request.MaterialId,
            WidthCm: request.WidthCm,
            HeightCm: request.HeightCm,
            Panes: request.Panes,
            Color: request.Color,
            Accessories: request.Accessories,
            Installation: request.Installation);
        var priceResult = await _priceSender.Send(priceCommand, ct).ConfigureAwait(false);
        if (priceResult.IsFailure)
        {
            return Result.Failure<ReviewResponseDto>(priceResult.Errors);
        }
        var breakdown = priceResult.Value;

        // Resolve product type + lead-time inputs. We re-load the product
        // type (the price handler already verified existence) because we
        // need WarrantyMonths + LeadTime fields not threaded through the
        // breakdown.
        var productType = await _productTypeReader.GetByIdAsync(request.ProductTypeId, ct).ConfigureAwait(false);
        if (productType is null)
        {
            return Result.Failure<ReviewResponseDto>(ProductTypeErrors.NotFound);
        }

        // Reconstruct the configuration pane shape that LeadTimeEstimator
        // needs. Same backcompat default (single Fixed) as the calculator.
        IReadOnlyList<ConfigurationPane> panes = request.Panes is { Count: > 0 }
            ? request.Panes.Select(ToDomainPane).Where(p => p is not null).Cast<ConfigurationPane>().ToList()
            : [new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false)];

        var region = ParseRegion(request.Installation?.Region);
        var hasBlind = request.Accessories?.Blind is not null;
        var hasSmartLock = await ResolveSmartLockAsync(request.Accessories?.LockTypeId, ct).ConfigureAwait(false);

        var leadTime = LeadTimeEstimator.Estimate(productType, panes, hasBlind, hasSmartLock, region);
        var warranty = WarrantyEstimator.For(productType, hasSmartLock);

        var grouped = GroupBreakdown(breakdown);

        var response = new ReviewResponseDto(
            Pricing: new PricingDto(Flat: breakdown, Grouped: grouped),
            Delivery: new DeliveryDto(
                Warranty: new WarrantyTermsDto(warranty.Months, warranty.Notes),
                LeadTime: new LeadTimeEstimateDto(
                    leadTime.ProductionDaysMin, leadTime.ProductionDaysMax,
                    leadTime.InstallationDays, leadTime.TotalDaysMin, leadTime.TotalDaysMax)));

        return Result.Success(response);
    }

    private async Task<bool> ResolveSmartLockAsync(Guid? lockTypeId, CancellationToken ct)
    {
        if (lockTypeId is null)
        {
            return false;
        }
        var allLocks = await _lockTypeReader.LoadAllAsync(ct).ConfigureAwait(false);
        return allLocks.Any(l => l.Id == lockTypeId.Value && l.Grade == LockGrade.Smart);
    }

    private static InstallationRegion ParseRegion(string? region)
    {
        if (region is null)
        {
            return InstallationRegion.Batumi;
        }
        return Enum.TryParse<InstallationRegion>(region, ignoreCase: false, out var r)
            ? r
            : InstallationRegion.Batumi;
    }

    private static ConfigurationPane? ToDomainPane(ConfigurationPaneInput p)
    {
        if (!Enum.TryParse<PaneOpeningType>(p.OpeningType, ignoreCase: false, out var opening))
        {
            return null;
        }
        HingeSide? hinge = null;
        if (p.HingeSide is not null
            && Enum.TryParse<HingeSide>(p.HingeSide, ignoreCase: false, out var h))
        {
            hinge = h;
        }
        var extras = new List<GlassExtra>();
        if (p.GlassExtras is { Count: > 0 })
        {
            foreach (var e in p.GlassExtras)
            {
                if (Enum.TryParse<GlassExtra>(e, ignoreCase: false, out var parsed))
                {
                    extras.Add(parsed);
                }
            }
        }
        return new ConfigurationPane(
            p.Position, p.WidthRatio, opening, hinge, p.HasMosquitoNet,
            p.GlassTypeId ?? Guid.Empty, extras);
    }

    /// <summary>
    /// Sorts the flat <see cref="PriceBreakdownDto.Lines"/> list into the
    /// 5 UX buckets the Step-8 receipt renders. VAT and grand total are
    /// returned separately because they're rendered below the disclosure
    /// group rows.
    /// </summary>
    private static GroupedBreakdownDto GroupBreakdown(PriceBreakdownDto breakdown)
    {
        var lines = breakdown.Lines;
        var currency = breakdown.Currency;

        var material = lines.Where(l =>
            l.Code == "material"
            || (l.Code.StartsWith("pane.", StringComparison.Ordinal)
                && l.Code.Contains(".opening.", StringComparison.Ordinal)))
            .ToList();
        var glass = lines.Where(l =>
            l.Code.StartsWith("pane.", StringComparison.Ordinal)
                && l.Code.Contains(".glass", StringComparison.Ordinal))
            .ToList();
        var color = lines.Where(l =>
            l.Code.StartsWith("color.", StringComparison.Ordinal))
            .ToList();
        // Accessories includes the per-pane mosquito line (accessory.mosquito)
        // and every accessory.* surcharge.
        var accessories = lines.Where(l =>
            l.Code.StartsWith("accessory.", StringComparison.Ordinal))
            .ToList();
        var installation = lines.Where(l =>
            l.Code.StartsWith("installation.", StringComparison.Ordinal)
            || l.Code.StartsWith("dismantling.", StringComparison.Ordinal)
            || l.Code.StartsWith("carrying.", StringComparison.Ordinal))
            .ToList();

        var vatLine = lines.FirstOrDefault(l => l.Code == "vat");
        var vatMinor = vatLine?.AmountMinor ?? 0L;
        var vatDisplay = vatLine?.AmountDisplay ?? "0.00";

        var isManualQuote = installation.Any(l => l.Code == "installation.manual-quote");

        return new GroupedBreakdownDto(
            Material: ToGroup(material, currency),
            Glass: ToGroup(glass, currency),
            Color: ToGroup(color, currency),
            Accessories: ToGroup(accessories, currency),
            Installation: ToGroup(installation, currency),
            VatDisplay: vatDisplay,
            VatMinor: vatMinor,
            GrandTotalDisplay: breakdown.TotalDisplay,
            GrandTotalMinor: breakdown.TotalMinor,
            Currency: currency,
            InstallationIsManualQuote: isManualQuote);
    }

    private static PriceGroupDto ToGroup(IReadOnlyList<PriceLineDto> lines, string currency)
    {
        var total = lines.Sum(l => l.AmountMinor);
        var display = (total / 100m).ToString("0.00", CultureInfo.InvariantCulture);
        _ = currency; // currency is implied by the surrounding GroupedBreakdownDto
        return new PriceGroupDto(display, total, lines);
    }
}
