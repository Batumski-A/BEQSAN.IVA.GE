using BEQSAN.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace BEQSAN.Api.Common;

public static class ResultExtensions
{
    public static IResult ToHttpResult(this Result result) =>
        result.IsSuccess
            ? Results.NoContent()
            : ToProblemResult(result.Error);

    public static IResult ToHttpResult<T>(this Result<T> result) =>
        result.IsSuccess
            ? Results.Ok(result.Value)
            : ToProblemResult(result.Error);

    public static IActionResult ToActionResult(this Result result) =>
        result.IsSuccess
            ? new NoContentResult()
            : ToObjectResult(result.Error);

    public static IActionResult ToActionResult<T>(this Result<T> result) =>
        result.IsSuccess
            ? new OkObjectResult(result.Value)
            : ToObjectResult(result.Error);

    private static IResult ToProblemResult(Error error) => Results.Problem(
        detail: error.Message,
        statusCode: StatusFor(error.Type),
        title: error.Code,
        type: $"https://beqsan.iva.ge/errors/{error.Type}".ToLowerInvariant());

    private static ObjectResult ToObjectResult(Error error) => new(new ProblemDetails
    {
        Type = $"https://beqsan.iva.ge/errors/{error.Type}".ToLowerInvariant(),
        Title = error.Code,
        Detail = error.Message,
        Status = StatusFor(error.Type),
    })
    {
        StatusCode = StatusFor(error.Type),
    };

    private static int StatusFor(ErrorType type) => type switch
    {
        ErrorType.Validation => StatusCodes.Status400BadRequest,
        ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
        ErrorType.Forbidden => StatusCodes.Status403Forbidden,
        ErrorType.NotFound => StatusCodes.Status404NotFound,
        ErrorType.Conflict => StatusCodes.Status409Conflict,
        ErrorType.Failure => StatusCodes.Status500InternalServerError,
        ErrorType.None => StatusCodes.Status500InternalServerError,
        _ => StatusCodes.Status500InternalServerError,
    };
}
