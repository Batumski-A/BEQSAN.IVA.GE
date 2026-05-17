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
/// </summary>
public sealed record Error(string Code, string Message, ErrorType Type, string? Field = null)
{
    public static readonly Error None = new(string.Empty, string.Empty, ErrorType.None);

    public static Error Failure(string code, string message) => new(code, message, ErrorType.Failure);
    public static Error Validation(string code, string message, string? field = null) => new(code, message, ErrorType.Validation, field);
    public static Error NotFound(string code, string message) => new(code, message, ErrorType.NotFound);
    public static Error Conflict(string code, string message) => new(code, message, ErrorType.Conflict);
    public static Error Unauthorized(string code, string message) => new(code, message, ErrorType.Unauthorized);
    public static Error Forbidden(string code, string message) => new(code, message, ErrorType.Forbidden);
    public static Error BusinessRule(string code, string message) => new(code, message, ErrorType.BusinessRule);
}
