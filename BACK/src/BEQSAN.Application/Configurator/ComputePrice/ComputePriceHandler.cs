using System.Globalization;
using BEQSAN.Application.Catalog.GetBlindTypes;
using BEQSAN.Application.Catalog.GetColorsByMaterial;
using BEQSAN.Application.Catalog.GetGlassTypesByMaterial;
using BEQSAN.Application.Catalog.GetHandleStyles;
using BEQSAN.Application.Catalog.GetLockTypes;
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
    IMaterialReader materialReader,
    IGlassTypeReader glassTypeReader,
    IColorOptionReader colorOptionReader,
    IHandleStyleReader handleStyleReader,
    ILockTypeReader lockTypeReader,
    IBlindTypeReader blindTypeReader)
    : IRequestHandler<ComputePriceCommand, Result<PriceBreakdownDto>>
{
    private readonly IProductTypeReader _productTypeReader = productTypeReader;
    private readonly IMaterialReader _materialReader = materialReader;
    private readonly IGlassTypeReader _glassTypeReader = glassTypeReader;
    private readonly IColorOptionReader _colorOptionReader = colorOptionReader;
    private readonly IHandleStyleReader _handleStyleReader = handleStyleReader;
    private readonly ILockTypeReader _lockTypeReader = lockTypeReader;
    private readonly IBlindTypeReader _blindTypeReader = blindTypeReader;

    public async Task<Result<PriceBreakdownDto>> Handle(
        ComputePriceCommand request,
        CancellationToken ct)
    {
        // Independent lookups run in parallel — all three required before pricing math.
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

        // Load the glass + color + accessory catalogs in parallel. Empty
        // lists are a legitimate success state (mis-seeded environment) —
        // the calculator falls back to the no-catalog code path so each
        // earlier-slice canary still holds.
        var glassTask = _glassTypeReader.LoadDomainByMaterialAsync(request.MaterialId, ct);
        var colorTask = _colorOptionReader.LoadDomainByMaterialAsync(request.MaterialId, ct);
        var handleTask = _handleStyleReader.LoadAllAsync(ct);
        var lockTask = _lockTypeReader.LoadAllAsync(ct);
        var blindTask = _blindTypeReader.LoadAllAsync(ct);
        var handleCompatTask = _handleStyleReader.LoadCompatibilityAsync(ct);
        var lockCompatTask = _lockTypeReader.LoadCompatibilityAsync(ct);
        var blindCompatTask = _blindTypeReader.LoadCompatibilityAsync(ct);
        await Task.WhenAll(
            glassTask, colorTask,
            handleTask, lockTask, blindTask,
            handleCompatTask, lockCompatTask, blindCompatTask).ConfigureAwait(false);

        var availableGlass = await glassTask.ConfigureAwait(false);
        var availableGlassById = availableGlass.ToDictionary(g => g.Id);

        var availableColors = await colorTask.ConfigureAwait(false);
        var availableColorsById = availableColors.ToDictionary(c => c.Id);

        var handles = (await handleTask.ConfigureAwait(false)).ToDictionary(h => h.Id);
        var locks = (await lockTask.ConfigureAwait(false)).ToDictionary(l => l.Id);
        var blinds = (await blindTask.ConfigureAwait(false)).ToDictionary(b => b.Id);
        var accessoryCatalog = new AccessoryCatalog(
            handles, locks, blinds,
            await handleCompatTask.ConfigureAwait(false),
            await lockCompatTask.ConfigureAwait(false),
            await blindCompatTask.ConfigureAwait(false));

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

                // Translate glass extras with a defensive Enum.TryParse — invalid
                // tokens flow back as structured errors with the offending value
                // in metadata.got so the FRONT can highlight without parsing.
                var extras = new List<GlassExtra>();
                if (p.GlassExtras is { Count: > 0 })
                {
                    foreach (var token in p.GlassExtras)
                    {
                        if (!Enum.TryParse<GlassExtra>(token, ignoreCase: false, out var parsedExtra))
                        {
                            return Result.Failure<PriceBreakdownDto>(
                                Error.Validation(
                                    "configurator.glass.extraInvalid",
                                    "მინის დანამატის ტიპი არასწორია.",
                                    field: "panes")
                                    .WithMetadata("position", p.Position)
                                    .WithMetadata("got", token));
                        }
                        extras.Add(parsedExtra);
                    }
                }

                var glassId = p.GlassTypeId ?? Guid.Empty;
                domainPanes.Add(new ConfigurationPane(
                    p.Position, p.WidthRatio, opening, hinge, p.HasMosquitoNet,
                    glassId, extras));
            }
            panes = domainPanes;
        }

        // Translate the wire-shape ColorSelectionInput to the domain record.
        // Nulls flow through — the calculator's own backcompat path picks
        // the material default when the request omits color entirely.
        ColorSelection? colorSelection = null;
        if (request.Color is not null)
        {
            colorSelection = new ColorSelection(
                OuterColorOptionId: request.Color.OuterColorOptionId,
                InnerColorOptionId: request.Color.InnerColorOptionId,
                CustomRalHex: request.Color.CustomRalHex,
                CustomRalCode: request.Color.CustomRalCode);
        }

        // Translate the wire-shape AccessorySelectionInput to the domain
        // record. Defensive Enum.TryParse on SillPosition + BlindControl —
        // invalid tokens flow back as structured errors with metadata.got.
        AccessorySelection? accessorySelection = null;
        if (request.Accessories is not null)
        {
            SillSelection? sill = null;
            if (request.Accessories.Sill is { } sillInput)
            {
                if (!Enum.TryParse<SillPosition>(sillInput.Position, ignoreCase: false, out var pos))
                {
                    return Result.Failure<PriceBreakdownDto>(
                        Error.Validation(
                            "configurator.accessory.sillPositionInvalid",
                            "ფერთულის პოზიცია არასწორია.",
                            field: "accessories")
                            .WithMetadata("got", sillInput.Position));
                }
                sill = new SillSelection(pos, sillInput.ColorOptionId, sillInput.CustomLengthCm);
            }

            BlindSelection? blind = null;
            if (request.Accessories.Blind is { } blindInput)
            {
                if (!Enum.TryParse<BlindControl>(blindInput.Control, ignoreCase: false, out var ctl))
                {
                    return Result.Failure<PriceBreakdownDto>(
                        Error.Validation(
                            "configurator.accessory.blindControlInvalid",
                            "ჟალუზის მართვა არასწორია.",
                            field: "accessories")
                            .WithMetadata("got", blindInput.Control));
                }
                blind = new BlindSelection(blindInput.BlindTypeId, ctl, blindInput.ColorOptionId);
            }

            accessorySelection = new AccessorySelection(
                HandleStyleId: request.Accessories.HandleStyleId,
                LockTypeId: request.Accessories.LockTypeId,
                Sill: sill,
                Blind: blind);
        }

        // Cross-field, constraints, layout, math — all in the calculator.
        var breakdownResult = PriceCalculator.Compute(
            productType, material, request.WidthCm, request.HeightCm, panes,
            availableGlassById.Count > 0 ? availableGlassById : null,
            colorSelection,
            availableColorsById.Count > 0 ? availableColorsById : null,
            accessorySelection,
            accessoryCatalog);
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
