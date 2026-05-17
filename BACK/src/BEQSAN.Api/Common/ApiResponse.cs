namespace BEQSAN.Api.Common;

/// <summary>
/// Canonical JSON envelope for every Result&lt;T&gt;-returning endpoint.
/// Consumers (FRONT) can always rely on the same top-level shape regardless of
/// success or failure — only <see cref="IsSuccess"/>, <see cref="Value"/>, and
/// <see cref="Errors"/> need to be checked.
/// </summary>
public sealed record ApiResponse<T>(
    bool IsSuccess,
    T? Value,
    IReadOnlyList<ApiError> Errors)
{
    public static ApiResponse<T> Success(T value) => new(true, value, []);
    public static ApiResponse<T> Failure(IReadOnlyList<ApiError> errors) => new(false, default, errors);
}

/// <summary>
/// One error entry in <see cref="ApiResponse{T}.Errors"/>. Code is machine-readable
/// English (stable across releases); Message is Georgian user-facing copy; Field is
/// the camelCased input property name when bound; Metadata carries structured context
/// the UI uses to render the error precisely (e.g. <c>{ "min": 60, "max": 140,
/// "actual": 30 }</c> for an out-of-range validation).
/// </summary>
public sealed record ApiError(
    string Code,
    string Message,
    string? Field,
    IReadOnlyDictionary<string, object>? Metadata = null);
