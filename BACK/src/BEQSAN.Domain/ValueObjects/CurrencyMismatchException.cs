namespace BEQSAN.Domain.ValueObjects;

public sealed class CurrencyMismatchException : InvalidOperationException
{
    public CurrencyMismatchException(Currency left, Currency right)
        : base($"Cannot operate on Money values with different currencies ({left} vs {right}).")
    {
        Left = left;
        Right = right;
    }

    public CurrencyMismatchException() { }

    public CurrencyMismatchException(string message) : base(message) { }

    public CurrencyMismatchException(string message, Exception innerException)
        : base(message, innerException) { }

    public Currency Left { get; }
    public Currency Right { get; }
}
