using BEQSAN.Domain.Configurator;
using FluentValidation;

namespace BEQSAN.Application.Configurator.ComputePrice;

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
            .InclusiveBetween(PriceCalculator.MinDimensionCm, PriceCalculator.MaxDimensionCm)
            .WithMessage($"სიგანე უნდა იყოს {PriceCalculator.MinDimensionCm}-{PriceCalculator.MaxDimensionCm} სმ შორის.");

        RuleFor(x => x.HeightCm)
            .InclusiveBetween(PriceCalculator.MinDimensionCm, PriceCalculator.MaxDimensionCm)
            .WithMessage($"სიმაღლე უნდა იყოს {PriceCalculator.MinDimensionCm}-{PriceCalculator.MaxDimensionCm} სმ შორის.");
    }
}
