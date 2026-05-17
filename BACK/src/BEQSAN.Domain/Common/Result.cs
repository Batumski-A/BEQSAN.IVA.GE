namespace BEQSAN.Domain.Common;

public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;

    /// <summary>
    /// All errors collected for this failure. Empty when <see cref="IsSuccess"/> is true.
    /// Typical sizes: 0 (success), 1 (single error), 2+ (validation across multiple fields).
    /// </summary>
    public IReadOnlyList<Error> Errors { get; }

    /// <summary>
    /// Convenience accessor: first error in <see cref="Errors"/>, or <see cref="Error.None"/>
    /// on success. Tests and most handler call-sites only care about the primary error.
    /// </summary>
    public Error Error => Errors.Count > 0 ? Errors[0] : Common.Error.None;

    internal Result(bool isSuccess, IReadOnlyList<Error> errors)
    {
        if (isSuccess && errors.Count > 0)
        {
            throw new InvalidOperationException("Successful result cannot carry errors.");
        }

        if (!isSuccess && errors.Count == 0)
        {
            throw new InvalidOperationException("Failed result must carry at least one error.");
        }

        IsSuccess = isSuccess;
        Errors = errors;
    }

    public static Result Success() => new(true, []);

    public static Result Failure(Error error) => new(false, [error]);

    public static Result Failure(IReadOnlyList<Error> errors) => new(false, errors);

    public static Result<T> Success<T>(T value) => new(value, true, []);

    public static Result<T> Failure<T>(Error error) => new(default, false, [error]);

    public static Result<T> Failure<T>(IReadOnlyList<Error> errors) => new(default, false, errors);
}

public sealed class Result<T> : Result
{
    private readonly T? _value;

    internal Result(T? value, bool isSuccess, IReadOnlyList<Error> errors) : base(isSuccess, errors)
    {
        _value = value;
    }

    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("Cannot read Value from a failed result.");
}
