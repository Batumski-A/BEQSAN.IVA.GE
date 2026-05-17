using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.ValueObjects;

public class PhoneNumberTests
{
    [Theory]
    [InlineData("595123456")]
    [InlineData("+995595123456")]
    [InlineData("995595123456")]
    [InlineData("+995 595 12 34 56")]
    [InlineData("+995-595-123-456")]
    [InlineData("(595) 12-34-56")]
    [InlineData("00995595123456")]
    public void Create_NormalizesGeorgianFormatsToE164(string raw)
    {
        var result = PhoneNumber.Create(raw);
        result.IsSuccess.Should().BeTrue();
        result.Value.E164.Should().Be("+995595123456");
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_EmptyOrWhitespace_ReturnsValidationError(string? raw)
    {
        var result = PhoneNumber.Create(raw);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("phone.empty");
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("+1 555 12 34 56")]    // not Georgian
    [InlineData("+995 322 12 34 56")]  // landline, not mobile
    [InlineData("+995 4XX XX XX")]     // letters
    [InlineData("+9955123")]            // too short
    public void Create_InvalidFormats_ReturnsValidationError(string raw)
    {
        var result = PhoneNumber.Create(raw);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("phone.invalid");
    }

    [Fact]
    public void Equality_SameNumber_IsEqual()
    {
        var a = PhoneNumber.Create("+995595123456").Value;
        var b = PhoneNumber.Create("595 12 34 56").Value;
        a.Should().Be(b);
        (a == b).Should().BeTrue();
        a.GetHashCode().Should().Be(b.GetHashCode());
    }

    [Fact]
    public void ToString_ReturnsE164()
    {
        var phone = PhoneNumber.Create("595123456").Value;
        phone.ToString().Should().Be("+995595123456");
    }
}
