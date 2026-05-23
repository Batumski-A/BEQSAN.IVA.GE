using BEQSAN.Domain.Common;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Domain.Catalog;

public sealed class Material
{
    public Guid Id { get; init; }
    public Guid ProductTypeId { get; init; }
    public string Slug { get; init; } = string.Empty;
    public LocalizedText Name { get; init; } = new();
    public LocalizedText ShortDescription { get; init; } = new();
    public MaterialFamily Family { get; init; }
    public ThermalRating ThermalRating { get; init; }

    /// <summary>
    /// Storage representation: int minor units (tetri for GEL). 38000 = 380.00 ₾/m².
    /// Never a decimal/double — see ADR-0002. Convert via <see cref="Money.FromMinor"/>
    /// at display / DTO boundaries.
    /// </summary>
    public int BasePricePerSqmMinor { get; set; }

    public Currency Currency { get; init; } = Currency.Gel;
    public int SortOrder { get; init; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; init; }

    public static Result<Material> Create(
        Guid productTypeId,
        string? slug,
        LocalizedText name,
        LocalizedText shortDescription,
        MaterialFamily family,
        ThermalRating thermalRating,
        int basePricePerSqmMinor,
        Currency currency,
        int sortOrder,
        bool isActive = true)
    {
        if (productTypeId == Guid.Empty)
        {
            return Result.Failure<Material>(MaterialErrors.ProductTypeRequired);
        }

        if (string.IsNullOrWhiteSpace(slug))
        {
            return Result.Failure<Material>(MaterialErrors.SlugRequired);
        }

        var normalizedSlug = slug.Trim().ToLowerInvariant();
        if (!IsValidSlug(normalizedSlug))
        {
            return Result.Failure<Material>(MaterialErrors.SlugInvalid);
        }

        if (basePricePerSqmMinor <= 0)
        {
            return Result.Failure<Material>(MaterialErrors.PriceMustBePositive);
        }

        return Result.Success(new Material
        {
            Id = Guid.NewGuid(),
            ProductTypeId = productTypeId,
            Slug = normalizedSlug,
            Name = name,
            ShortDescription = shortDescription,
            Family = family,
            ThermalRating = thermalRating,
            BasePricePerSqmMinor = basePricePerSqmMinor,
            Currency = currency,
            SortOrder = sortOrder,
            IsActive = isActive,
            CreatedAtUtc = DateTime.UtcNow,
        });
    }

    private static bool IsValidSlug(string slug)
    {
        if (slug.Length is < 2 or > 64)
        {
            return false;
        }

        foreach (var c in slug)
        {
            var allowed = c is (>= 'a' and <= 'z') or (>= '0' and <= '9') or '-';
            if (!allowed)
            {
                return false;
            }
        }

        return slug[0] != '-' && slug[^1] != '-';
    }
}

public static class MaterialErrors
{
    public static readonly Error ProductTypeRequired = Error.Validation(
        "material.productType.required",
        "მასალა უნდა იყოს მიბმული პროდუქტის ტიპთან.",
        field: "productTypeId");

    public static readonly Error SlugRequired = Error.Validation(
        "material.slug.required",
        "მასალის slug სავალდებულოა.",
        field: "slug");

    public static readonly Error SlugInvalid = Error.Validation(
        "material.slug.invalid",
        "Slug უნდა შეიცავდეს მხოლოდ ლათინურ მცირე ასოებს, ციფრებს და დეფისებს (2-64 სიმბოლო).",
        field: "slug");

    public static readonly Error PriceMustBePositive = Error.Validation(
        "material.price.mustBePositive",
        "ფასი მ²-ზე უნდა იყოს დადებითი რიცხვი (tetri).",
        field: "basePricePerSqmMinor");

    public static readonly Error NotFound = Error.NotFound(
        "material.notFound",
        "მითითებული მასალა ვერ მოიძებნა.");

    public static readonly Error NotInProductType = Error.BusinessRule(
        "configurator.material.notInProductType",
        "მითითებული მასალა არ ეკუთვნის ამ პროდუქტის ტიპს.");
}
