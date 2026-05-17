using System.Text.RegularExpressions;
using BEQSAN.Domain.Common;

namespace BEQSAN.Domain.ValueObjects;

public sealed partial class PhoneNumber : IEquatable<PhoneNumber>
{
    private const string GeorgianPrefix = "+995";

    public string E164 { get; }

    private PhoneNumber(string e164) => E164 = e164;

    public static Result<PhoneNumber> Create(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return Result.Failure<PhoneNumber>(PhoneNumberErrors.Empty);
        }

        var cleaned = NonDigitOrPlus().Replace(raw, string.Empty);

        if (cleaned.StartsWith("00995", StringComparison.Ordinal))
        {
            cleaned = "+" + cleaned[2..];
        }

        if (!cleaned.StartsWith('+'))
        {
            cleaned = cleaned.StartsWith("995", StringComparison.Ordinal)
                ? "+" + cleaned
                : GeorgianPrefix + cleaned;
        }

        if (!GeorgianMobile().IsMatch(cleaned))
        {
            return Result.Failure<PhoneNumber>(PhoneNumberErrors.Invalid);
        }

        return Result.Success(new PhoneNumber(cleaned));
    }

    public bool Equals(PhoneNumber? other) =>
        other is not null && string.Equals(E164, other.E164, StringComparison.Ordinal);

    public override bool Equals(object? obj) => Equals(obj as PhoneNumber);

    public override int GetHashCode() => StringComparer.Ordinal.GetHashCode(E164);

    public override string ToString() => E164;

    public static bool operator ==(PhoneNumber? left, PhoneNumber? right) =>
        left is null ? right is null : left.Equals(right);

    public static bool operator !=(PhoneNumber? left, PhoneNumber? right) => !(left == right);

    [GeneratedRegex(@"[^\d+]", RegexOptions.CultureInvariant)]
    private static partial Regex NonDigitOrPlus();

    [GeneratedRegex(@"^\+9955\d{8}$", RegexOptions.CultureInvariant)]
    private static partial Regex GeorgianMobile();
}

public static class PhoneNumberErrors
{
    public static readonly Error Empty = Error.Validation(
        "phone.empty",
        "Phone number is required.");

    public static readonly Error Invalid = Error.Validation(
        "phone.invalid",
        "Phone number must be a Georgian mobile number in E.164 (+995 5XX XXX XXX).");
}
