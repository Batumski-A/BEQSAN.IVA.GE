using BEQSAN.Domain.Common;

namespace BEQSAN.UnitTests.Common;

public class ResultTests
{
    [Fact]
    public void Success_NonGeneric_IsSuccess()
    {
        var result = Result.Success();
        result.IsSuccess.Should().BeTrue();
        result.IsFailure.Should().BeFalse();
        result.Error.Should().Be(Error.None);
    }

    [Fact]
    public void Failure_NonGeneric_CarriesError()
    {
        var err = Error.NotFound("x.missing", "missing");
        var result = Result.Failure(err);
        result.IsFailure.Should().BeTrue();
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be(err);
    }

    [Fact]
    public void Success_Generic_ReturnsValue()
    {
        var result = Result.Success(42);
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(42);
    }

    [Fact]
    public void Failure_Generic_ReadingValueThrows()
    {
        var result = Result.Failure<int>(Error.NotFound("x", "y"));
        result.IsFailure.Should().BeTrue();
        var act = () => _ = result.Value;
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Success_WithError_ThrowsInvalidOperation()
    {
        var act = () => new Result(true, Error.NotFound("x", "y"));
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Failure_WithoutError_ThrowsInvalidOperation()
    {
        var act = () => new Result(false, Error.None);
        act.Should().Throw<InvalidOperationException>();
    }
}
