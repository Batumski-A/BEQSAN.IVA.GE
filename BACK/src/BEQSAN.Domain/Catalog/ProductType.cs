using BEQSAN.Domain.Common;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Domain.Catalog;

public sealed class ProductType
{
    public Guid Id { get; init; }
    public string Slug { get; init; } = string.Empty;
    public LocalizedText Name { get; init; } = new();
    public LocalizedText ShortDescription { get; init; } = new();
    public string HeroImageUrl { get; init; } = string.Empty;
    public int SortOrder { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAtUtc { get; init; }

    public int MinWidthCm { get; init; }
    public int MaxWidthCm { get; init; }
    public int MinHeightCm { get; init; }
    public int MaxHeightCm { get; init; }

    /// <summary>
    /// Resolves the dimension constraints from the entity's own columns.
    /// Falls back to the slug-keyed defaults when columns are zeroed (e.g.
    /// rows that pre-dated the AddDimensionConstraints migration and somehow
    /// escaped the seeder backfill).
    /// </summary>
    public DimensionConstraints GetConstraints()
    {
        if (MinWidthCm > 0 && MaxWidthCm > MinWidthCm && MinHeightCm > 0 && MaxHeightCm > MinHeightCm)
        {
            return new DimensionConstraints(MinWidthCm, MaxWidthCm, MinHeightCm, MaxHeightCm);
        }

        return DimensionConstraints.ForProductType(Slug);
    }

    public static Result<ProductType> Create(
        string? slug,
        LocalizedText name,
        LocalizedText shortDescription,
        string? heroImageUrl,
        int sortOrder,
        DimensionConstraints? constraints = null,
        bool isActive = true)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return Result.Failure<ProductType>(ProductTypeErrors.SlugRequired);
        }

        var normalizedSlug = slug.Trim().ToLowerInvariant();
        if (!IsValidSlug(normalizedSlug))
        {
            return Result.Failure<ProductType>(ProductTypeErrors.SlugInvalid);
        }

        var dims = constraints ?? DimensionConstraints.ForProductType(normalizedSlug);

        return Result.Success(new ProductType
        {
            Id = Guid.NewGuid(),
            Slug = normalizedSlug,
            Name = name,
            ShortDescription = shortDescription,
            HeroImageUrl = heroImageUrl ?? string.Empty,
            SortOrder = sortOrder,
            IsActive = isActive,
            CreatedAtUtc = DateTime.UtcNow,
            MinWidthCm = dims.MinWidthCm,
            MaxWidthCm = dims.MaxWidthCm,
            MinHeightCm = dims.MinHeightCm,
            MaxHeightCm = dims.MaxHeightCm,
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

public static class ProductTypeErrors
{
    public static readonly Error SlugRequired = Error.Validation(
        "productType.slug.required",
        "პროდუქტის ტიპის slug სავალდებულოა.",
        field: "slug");

    public static readonly Error SlugInvalid = Error.Validation(
        "productType.slug.invalid",
        "Slug უნდა შეიცავდეს მხოლოდ ლათინურ მცირე ასოებს, ციფრებს და დეფისებს (2-64 სიმბოლო).",
        field: "slug");

    public static readonly Error NotFound = Error.NotFound(
        "productType.notFound",
        "მითითებული პროდუქტის ტიპი ვერ მოიძებნა.");
}
