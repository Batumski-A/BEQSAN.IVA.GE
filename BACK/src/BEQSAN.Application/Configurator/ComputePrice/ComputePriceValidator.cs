using BEQSAN.Domain.Configurator;
using FluentValidation;

namespace BEQSAN.Application.Configurator.ComputePrice;

/// <summary>
/// First-line input validation. Per-product-type rules (door taller than
/// window, sliding requires 2+ panes, hinge matrix, etc.) are enforced
/// inside <see cref="PriceCalculator.Compute"/> against the actual
/// ProductType row — this validator only catches the absolute outliers
/// that would never make sense for any product (negative dims, > 8 m,
/// pane with ratio outside (0, 1], missing position).
/// </summary>
internal sealed class ComputePriceValidator : AbstractValidator<ComputePriceCommand>
{
    private static readonly HashSet<string> ValidOpenings = new(StringComparer.Ordinal)
    {
        "Fixed", "Casement", "Tilt", "TiltAndTurn", "Sliding",
    };

    private static readonly HashSet<string> ValidHinges = new(StringComparer.Ordinal)
    {
        "Left", "Right",
    };

    public ComputePriceValidator()
    {
        RuleFor(x => x.ProductTypeId)
            .NotEqual(Guid.Empty)
            .WithMessage("პროდუქტის ტიპი სავალდებულოა.");

        RuleFor(x => x.MaterialId)
            .NotEqual(Guid.Empty)
            .WithMessage("მასალა სავალდებულოა.");

        RuleFor(x => x.WidthCm)
            .InclusiveBetween(
                PriceCalculator.AbsoluteMinDimensionCm,
                PriceCalculator.AbsoluteMaxDimensionCm)
            .WithMessage($"სიგანე უნდა იყოს {PriceCalculator.AbsoluteMinDimensionCm}-{PriceCalculator.AbsoluteMaxDimensionCm} სმ შორის.");

        RuleFor(x => x.HeightCm)
            .InclusiveBetween(
                PriceCalculator.AbsoluteMinDimensionCm,
                PriceCalculator.AbsoluteMaxDimensionCm)
            .WithMessage($"სიმაღლე უნდა იყოს {PriceCalculator.AbsoluteMinDimensionCm}-{PriceCalculator.AbsoluteMaxDimensionCm} სმ შორის.");

        // Per-pane shape validation runs only when Panes is supplied; null is the
        // backwards-compat path and means "synthesize single Fixed".
        RuleForEach(x => x.Panes)
            .SetValidator(new ConfigurationPaneInputValidator())
            .When(x => x.Panes is not null);
    }

    private sealed class ConfigurationPaneInputValidator : AbstractValidator<ConfigurationPaneInput>
    {
        public ConfigurationPaneInputValidator()
        {
            RuleFor(p => p.Position)
                .GreaterThan(0)
                .WithMessage("პანელის ნომერი უნდა იყოს დადებითი.");

            RuleFor(p => p.WidthRatio)
                .GreaterThan(0m)
                .LessThanOrEqualTo(1m)
                .WithMessage("პანელის სიგანის წილი 0-დან 1-მდე უნდა იყოს.");

            RuleFor(p => p.OpeningType)
                .Must(ValidOpenings.Contains)
                .WithMessage("გასაღების ტიპი არასწორია.");

            RuleFor(p => p.HingeSide!)
                .Must(ValidHinges.Contains)
                .When(p => p.HingeSide is not null)
                .WithMessage("მენტეშის მხარე არასწორია.");
        }
    }
}
