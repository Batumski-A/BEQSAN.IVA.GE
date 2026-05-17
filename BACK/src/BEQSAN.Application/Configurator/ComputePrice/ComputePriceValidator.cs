using BEQSAN.Domain.Configurator;
using FluentValidation;

namespace BEQSAN.Application.Configurator.ComputePrice;

/// <summary>
/// First-line input validation. Per-product-type constraints (e.g. door is
/// taller than window) are enforced inside <see cref="PriceCalculator.Compute"/>
/// against the actual ProductType row — this validator only catches the
/// absolute outliers that would never make sense for any product (negative,
/// zero, > 8 m).
/// </summary>
internal sealed class ComputePriceValidator : AbstractValidator<ComputePriceCommand>
{
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
    }
}
