using System.Globalization;
using BEQSAN.Application.Catalog.GetMaterialsByProductType;
using BEQSAN.Application.Catalog.GetProductTypes;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.Configurator;
using BEQSAN.Domain.ValueObjects;
using MediatR;

namespace BEQSAN.Application.Configurator.ComputePrice;

internal sealed class ComputePriceHandler(
    IProductTypeReader productTypeReader,
    IMaterialReader materialReader)
    : IRequestHandler<ComputePriceCommand, Result<PriceBreakdownDto>>
{
    private readonly IProductTypeReader _productTypeReader = productTypeReader;
    private readonly IMaterialReader _materialReader = materialReader;

    public async Task<Result<PriceBreakdownDto>> Handle(
        ComputePriceCommand request,
        CancellationToken ct)
    {
        // Independent lookups run in parallel — both required before pricing math.
        var productTypeTask = _productTypeReader.GetByIdAsync(request.ProductTypeId, ct);
        var materialTask = _materialReader.GetByIdAsync(request.MaterialId, ct);
        await Task.WhenAll(productTypeTask, materialTask).ConfigureAwait(false);

        var productType = await productTypeTask.ConfigureAwait(false);
        if (productType is null || !productType.IsActive)
        {
            return Result.Failure<PriceBreakdownDto>(ProductTypeErrors.NotFound);
        }

        var material = await materialTask.ConfigureAwait(false);
        if (material is null || !material.IsActive)
        {
            return Result.Failure<PriceBreakdownDto>(MaterialErrors.NotFound);
        }

        // Translate wire-shape ConfigurationPaneInput[] (string enums) into domain
        // ConfigurationPane records. Invalid enum tokens bubble up as validation
        // errors before reaching the pure calculator; the FluentValidation pipeline
        // catches them earlier but we keep a defensive fallback here.
        IReadOnlyList<ConfigurationPane>? panes = null;
        if (request.Panes is { Count: > 0 })
        {
            var domainPanes = new List<ConfigurationPane>(request.Panes.Count);
            foreach (var p in request.Panes)
            {
                if (!Enum.TryParse<PaneOpeningType>(p.OpeningType, ignoreCase: false, out var opening))
                {
                    return Result.Failure<PriceBreakdownDto>(
                        Error.Validation(
                            "configurator.layout.pane.openingTypeInvalid",
                            "გასაღების ტიპი არასწორია.",
                            field: "panes")
                            .WithMetadata("position", p.Position)
                            .WithMetadata("got", p.OpeningType));
                }

                HingeSide? hinge = null;
                if (p.HingeSide is not null)
                {
                    if (!Enum.TryParse<HingeSide>(p.HingeSide, ignoreCase: false, out var hingeParsed))
                    {
                        return Result.Failure<PriceBreakdownDto>(
                            Error.Validation(
                                "configurator.layout.pane.hingeSideInvalid",
                                "მენტეშის მხარე არასწორია.",
                                field: "panes")
                                .WithMetadata("position", p.Position)
                                .WithMetadata("got", p.HingeSide));
                    }
                    hinge = hingeParsed;
                }

                domainPanes.Add(new ConfigurationPane(p.Position, p.WidthRatio, opening, hinge, p.HasMosquitoNet));
            }
            panes = domainPanes;
        }

        // Cross-field, constraints, layout, math — all in the calculator.
        var breakdownResult = PriceCalculator.Compute(
            productType, material, request.WidthCm, request.HeightCm, panes);
        if (breakdownResult.IsFailure)
        {
            return Result.Failure<PriceBreakdownDto>(breakdownResult.Errors);
        }

        return Result.Success(MapToDto(breakdownResult.Value));
    }

    private static PriceBreakdownDto MapToDto(PriceBreakdown b)
    {
        var currency = ParseCurrency(b.Currency);
        var lines = b.Lines
            .Select(l => new PriceLineDto(
                Code: l.Code,
                Label: l.Label,
                AmountMinor: l.AmountMinor,
                AmountDisplay: Money.FromMinor(l.AmountMinor, currency)
                    .Amount.ToString("0.00", CultureInfo.InvariantCulture),
                Currency: b.Currency))
            .ToList();

        return new PriceBreakdownDto(
            AreaSqm: b.AreaSqm.ToString("0.##", CultureInfo.InvariantCulture),
            Lines: lines,
            TotalMinor: b.TotalMinor,
            TotalDisplay: Money.FromMinor(b.TotalMinor, currency)
                .Amount.ToString("0.00", CultureInfo.InvariantCulture),
            Currency: b.Currency);
    }

    private static Currency ParseCurrency(string s) =>
        Enum.TryParse<Currency>(s, ignoreCase: true, out var c) ? c : Currency.Gel;
}
