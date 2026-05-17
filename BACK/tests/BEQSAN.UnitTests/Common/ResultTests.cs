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
        result.Errors.Should().BeEmpty();
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
        result.Errors.Should().ContainSingle().Which.Should().Be(err);
    }

    [Fact]
    public void Failure_MultipleErrors_KeepsAllAndExposesFirstAsError()
    {
        var first = Error.Validation("validation.widthCm", "too small", "widthCm");
        var second = Error.Validation("validation.heightCm", "too small", "heightCm");
        var result = Result.Failure([first, second]);

        result.IsFailure.Should().BeTrue();
        result.Errors.Should().HaveCount(2);
        result.Error.Should().Be(first);
    }

    [Fact]
    public void Success_Generic_ReturnsValue()
    {
        var result = Result.Success(42);
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(42);
        result.Errors.Should().BeEmpty();
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
    public void Success_WithErrors_ThrowsInvalidOperation()
    {
        var act = () => new Result(true, [Error.NotFound("x", "y")]);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Failure_WithoutErrors_ThrowsInvalidOperation()
    {
        var act = () => new Result(false, []);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Error_CarriesField_WhenValidationBoundToProperty()
    {
        var err = Error.Validation("validation.widthCm", "ვიწროა", field: "widthCm");
        err.Field.Should().Be("widthCm");
        err.Type.Should().Be(ErrorType.Validation);
    }
}
