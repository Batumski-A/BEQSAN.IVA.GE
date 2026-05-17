using BEQSAN.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace BEQSAN.Api.Common;

public static class ResultExtensions
{
    /// <summary>
    /// Maps a Result to the canonical <see cref="ApiResponse{Unit}"/> envelope.
    /// HTTP status comes from <see cref="ErrorType"/> on failure; success returns 204.
    /// </summary>
    public static IResult ToHttpResult(this Result result) =>
        result.IsSuccess
            ? Results.NoContent()
            : Results.Json(BuildFailure<object>(result), statusCode: StatusFor(result.Error.Type));

    /// <summary>
    /// Maps a Result&lt;T&gt; to the canonical <see cref="ApiResponse{T}"/> envelope.
    /// 200 on success, ErrorType-mapped status on failure.
    /// </summary>
    public static IResult ToHttpResult<T>(this Result<T> result) =>
        result.IsSuccess
            ? Results.Ok(ApiResponse<T>.Success(result.Value))
            : Results.Json(BuildFailure<T>(result), statusCode: StatusFor(result.Error.Type));

    public static IActionResult ToActionResult(this Result result) =>
        result.IsSuccess
            ? new NoContentResult()
            : new ObjectResult(BuildFailure<object>(result)) { StatusCode = StatusFor(result.Error.Type) };

    public static IActionResult ToActionResult<T>(this Result<T> result) =>
        result.IsSuccess
            ? new OkObjectResult(ApiResponse<T>.Success(result.Value))
            : new ObjectResult(BuildFailure<T>(result)) { StatusCode = StatusFor(result.Error.Type) };

    private static ApiResponse<T> BuildFailure<T>(Result result) =>
        ApiResponse<T>.Failure(result.Errors
            .Select(e => new ApiError(e.Code, e.Message, e.Field))
            .ToList());

    public static int StatusFor(ErrorType type) => type switch
    {
        ErrorType.Validation => StatusCodes.Status400BadRequest,
        ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
        ErrorType.Forbidden => StatusCodes.Status403Forbidden,
        ErrorType.NotFound => StatusCodes.Status404NotFound,
        ErrorType.Conflict => StatusCodes.Status409Conflict,
        ErrorType.BusinessRule => StatusCodes.Status422UnprocessableEntity,
        ErrorType.Failure => StatusCodes.Status500InternalServerError,
        ErrorType.None => StatusCodes.Status500InternalServerError,
        _ => StatusCodes.Status500InternalServerError,
    };
}
