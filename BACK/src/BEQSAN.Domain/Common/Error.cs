namespace BEQSAN.Domain.Common;

public enum ErrorType
{
    None = 0,
    Failure = 1,
    Validation = 2,
    NotFound = 3,
    Conflict = 4,
    Unauthorized = 5,
    Forbidden = 6,
    BusinessRule = 7,
}

/// <summary>
/// Domain error. <see cref="Code"/> is dot-namespaced English (machine-readable, stable);
/// <see cref="Message"/> is Georgian (user-facing, server-localized). <see cref="Field"/>
/// is non-null when the error is bound to an input property — populated by FluentValidation.
/// <see cref="Metadata"/> carries structured context the UI uses to render the error
/// precisely (min/max/actual on out-of-range, expected/got on mismatch, etc.).
/// </summary>
public sealed record Error(
    string Code,
    string Message,
    ErrorType Type,
    string? Field = null,
    IReadOnlyDictionary<string, object>? Metadata = null)
{
    public static readonly Error None = new(string.Empty, string.Empty, ErrorType.None);

    public static Error Failure(string code, string message) => new(code, message, ErrorType.Failure);
    public static Error Validation(string code, string message, string? field = null) => new(code, message, ErrorType.Validation, field);
    public static Error NotFound(string code, string message) => new(code, message, ErrorType.NotFound);
    public static Error Conflict(string code, string message) => new(code, message, ErrorType.Conflict);
    public static Error Unauthorized(string code, string message) => new(code, message, ErrorType.Unauthorized);
    public static Error Forbidden(string code, string message) => new(code, message, ErrorType.Forbidden);
    public static Error BusinessRule(string code, string message) => new(code, message, ErrorType.BusinessRule);

    /// <summary>
    /// Returns a new Error with one entry appended (or overwritten) in the metadata bag.
    /// The record stays immutable; existing references to the original Error are unaffected.
    /// </summary>
    public Error WithMetadata(string key, object value)
    {
        ArgumentException.ThrowIfNullOrEmpty(key);
        var next = Metadata is null
            ? new Dictionary<string, object>(StringComparer.Ordinal)
            : new Dictionary<string, object>(Metadata, StringComparer.Ordinal);
        next[key] = value;
        return this with { Metadata = next };
    }
}
