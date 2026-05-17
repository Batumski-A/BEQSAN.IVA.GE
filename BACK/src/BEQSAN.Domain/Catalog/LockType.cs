using BEQSAN.Domain.Common;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Domain.Catalog;

/// <summary>
/// A lock option the customer can pick at configurator Step 7. Surcharge
/// is <em>per openable pane</em> (each handle gets its own lock cylinder).
///
/// <para>
/// <see cref="RequiresCasementOrTurn"/> is the engineering constraint: a
/// multi-point lock needs a full-perimeter opening to anchor the locking
/// points around. A Tilt-only or Sliding-only configuration can't carry
/// one — the validator rejects that pairing with metadata pointing at
/// the offending lock slug.
/// </para>
/// <para>
/// Phase-1 scope: <see cref="LockGrade.Smart"/> is door-only (the smart
/// fingerprint vendor we're integrating with hasn't shipped window
/// firmware). Compatibility table enforces it.
/// </para>
/// </summary>
public sealed class LockType
{
    public Guid Id { get; init; }
    public string Slug { get; init; } = string.Empty;
    public LocalizedText Name { get; init; } = new();
    public LocalizedText ShortDescription { get; init; } = new();
    public LockGrade Grade { get; init; }

    /// <summary>1..5 stars displayed by the FRONT.</summary>
    public int SecurityRating { get; init; }

    /// <summary>
    /// True for multi-point locks that physically need a Casement or
    /// TiltAndTurn pane. The validator surfaces
    /// <c>configurator.accessory.lockRequiresFullOpening</c> when the
    /// chosen layout has no such pane.
    /// </summary>
    public bool RequiresCasementOrTurn { get; init; }

    public int SurchargePerPaneMinor { get; init; }
    public Currency Currency { get; init; } = Currency.Gel;
    public bool IsDefault { get; init; }
    public int SortOrder { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAtUtc { get; init; }

    public static Result<LockType> Create(
        string? slug,
        LocalizedText name,
        LocalizedText shortDescription,
        LockGrade grade,
        int securityRating,
        bool requiresCasementOrTurn,
        int surchargePerPaneMinor,
        Currency currency,
        int sortOrder,
        bool isDefault,
        bool isActive = true)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return Result.Failure<LockType>(LockTypeErrors.SlugRequired);
        }

        var normalizedSlug = slug.Trim().ToLowerInvariant();
        if (!CatalogSlugRules.IsValid(normalizedSlug))
        {
            return Result.Failure<LockType>(LockTypeErrors.SlugInvalid);
        }

        if (securityRating is < 1 or > 5)
        {
            return Result.Failure<LockType>(LockTypeErrors.SecurityRatingOutOfRange);
        }

        // Multi-point grade implies full-opening requirement; basic and smart
        // (door-only) don't. Reject mismatched declarations so the seed data
        // can't drift away from the validator's contract.
        if (grade == LockGrade.MultiPoint && !requiresCasementOrTurn)
        {
            return Result.Failure<LockType>(LockTypeErrors.MultiPointMustRequireFullOpening);
        }

        if (surchargePerPaneMinor < 0)
        {
            return Result.Failure<LockType>(LockTypeErrors.SurchargeMustNotBeNegative);
        }

        return Result.Success(new LockType
        {
            Id = Guid.NewGuid(),
            Slug = normalizedSlug,
            Name = name,
            ShortDescription = shortDescription,
            Grade = grade,
            SecurityRating = securityRating,
            RequiresCasementOrTurn = requiresCasementOrTurn,
            SurchargePerPaneMinor = surchargePerPaneMinor,
            Currency = currency,
            SortOrder = sortOrder,
            IsDefault = isDefault,
            IsActive = isActive,
            CreatedAtUtc = DateTime.UtcNow,
        });
    }
}

public enum LockGrade
{
    Basic = 0,
    MultiPoint = 1,
    Smart = 2,
}

public static class LockTypeErrors
{
    public static readonly Error SlugRequired = Error.Validation(
        "lockType.slug.required",
        "საკეტის slug სავალდებულოა.",
        field: "slug");

    public static readonly Error SlugInvalid = Error.Validation(
        "lockType.slug.invalid",
        "Slug უნდა შეიცავდეს მხოლოდ ლათინურ მცირე ასოებს, ციფრებს და დეფისებს (2-64 სიმბოლო).",
        field: "slug");

    public static readonly Error SecurityRatingOutOfRange = Error.Validation(
        "lockType.securityRating.outOfRange",
        "უსაფრთხოების ქულა 1-5 დიაპაზონში უნდა იყოს.",
        field: "securityRating");

    public static readonly Error MultiPointMustRequireFullOpening = Error.Validation(
        "lockType.multiPoint.mustRequireFullOpening",
        "Multi-point საკეტი საჭიროებს გასაღები/გასაღები+დასაკეცი პანელს.",
        field: "requiresCasementOrTurn");

    public static readonly Error SurchargeMustNotBeNegative = Error.Validation(
        "lockType.surcharge.negative",
        "საკეტის დანამატის ფასი არ შეიძლება იყოს უარყოფითი.",
        field: "surchargePerPaneMinor");

    public static readonly Error NotFound = Error.NotFound(
        "lockType.notFound",
        "მითითებული საკეტი ვერ მოიძებნა.");
}
