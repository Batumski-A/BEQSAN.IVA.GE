using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.ValueObjects;

public class MoneyTests
{
    [Fact]
    public void Gel_RoundsToTwoDecimals()
    {
        var amount = Money.Gel(1234.567m);
        amount.Amount.Should().Be(1234.57m);
        amount.Currency.Should().Be(Currency.Gel);
    }

    [Fact]
    public void Add_SameCurrency_Succeeds()
    {
        var a = Money.Gel(1200m);
        var b = Money.Gel(50.50m);
        (a + b).Should().Be(Money.Gel(1250.50m));
    }

    [Fact]
    public void Add_DifferentCurrency_Throws()
    {
        var a = Money.Gel(100m);
        var b = Money.Usd(20m);
        var act = () => _ = a + b;
        act.Should().Throw<CurrencyMismatchException>()
            .Which.Left.Should().Be(Currency.Gel);
    }

    [Fact]
    public void Subtract_SameCurrency_Succeeds()
    {
        var a = Money.Gel(100m);
        var b = Money.Gel(40m);
        (a - b).Should().Be(Money.Gel(60m));
    }

    [Fact]
    public void Multiply_ByFactor_RoundsToTwoDecimals()
    {
        var price = Money.Gel(280m);
        var areaM2 = 2.4m;
        (price * areaM2).Should().Be(Money.Gel(672.00m));
    }

    [Fact]
    public void EqualityIsValueBased()
    {
        var a = Money.Gel(100m);
        var b = Money.Gel(100m);
        a.Should().Be(b);
        (a == b).Should().BeTrue();
    }

    [Fact]
    public void ToString_Gel_UsesGeorgianFormat()
    {
        var price = Money.Gel(1234.56m);
        price.ToString().Should().Contain("₾");
    }
}
