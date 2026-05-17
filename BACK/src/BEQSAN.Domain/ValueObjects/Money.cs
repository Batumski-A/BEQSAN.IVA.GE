using System.Globalization;

namespace BEQSAN.Domain.ValueObjects;

public readonly record struct Money(decimal Amount, Currency Currency)
{
    public static readonly Money ZeroGel = new(0m, Currency.Gel);

    public static Money Gel(decimal amount) => new(decimal.Round(amount, 2, MidpointRounding.ToEven), Currency.Gel);
    public static Money Usd(decimal amount) => new(decimal.Round(amount, 2, MidpointRounding.ToEven), Currency.Usd);
    public static Money Eur(decimal amount) => new(decimal.Round(amount, 2, MidpointRounding.ToEven), Currency.Eur);

    /// <summary>
    /// Build a Money value from minor units (tetri for GEL, cents for USD/EUR).
    /// 63840 → 638.40 ₾. Use this whenever crossing the persistence boundary —
    /// pricing storage is int minor-units only, see ADR-0002.
    /// </summary>
    public static Money FromMinor(long minor, Currency currency) =>
        new(minor / 100m, currency);

    /// <summary>
    /// Project to int minor units for storage / wire transport. Uses banker's
    /// rounding so 0.5 tetri sums don't drift up systematically.
    /// </summary>
    public long ToMinor() => (long)decimal.Round(Amount * 100m, 0, MidpointRounding.ToEven);

    public static Money operator +(Money left, Money right)
    {
        if (left.Currency != right.Currency)
        {
            throw new CurrencyMismatchException(left.Currency, right.Currency);
        }

        return new Money(left.Amount + right.Amount, left.Currency);
    }

    public static Money operator -(Money left, Money right)
    {
        if (left.Currency != right.Currency)
        {
            throw new CurrencyMismatchException(left.Currency, right.Currency);
        }

        return new Money(left.Amount - right.Amount, left.Currency);
    }

    public static Money operator *(Money money, decimal factor) =>
        new(decimal.Round(money.Amount * factor, 2, MidpointRounding.ToEven), money.Currency);

    public static Money operator *(decimal factor, Money money) => money * factor;

    public Money Add(Money other) => this + other;
    public Money Subtract(Money other) => this - other;
    public Money Multiply(decimal factor) => this * factor;

    public override string ToString() =>
        Currency == Currency.Gel
            ? string.Create(CultureInfo.GetCultureInfo("ka-GE"), $"{Amount:N2} ₾")
            : string.Create(CultureInfo.InvariantCulture, $"{Amount:N2} {Currency}");
}
