using BEQSAN.Api.Common;
using BEQSAN.Application.Configurator.ComputePrice;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BEQSAN.Api.Endpoints;

public static class ConfiguratorEndpoints
{
    public static IEndpointRouteBuilder MapConfiguratorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/configurator").WithTags("Configurator");

        group.MapPost("price", async (
                ComputePriceCommand command, ISender sender, CancellationToken ct) =>
            {
                var result = await sender.Send(command, ct).ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("ComputePrice")
            .WithSummary("Compute the price breakdown for a (productType, material, dimensions) tuple")
            .Produces<ApiResponse<PriceBreakdownDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status400BadRequest)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .Produces<ApiResponse<object>>(StatusCodes.Status422UnprocessableEntity)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        return app;
    }
}

[Produces("application/json")]
[ApiExplorerSettings(IgnoreApi = false)]
internal sealed class ConfiguratorSchemaAnchor
{
    public ApiResponse<PriceBreakdownDto>? PriceResponse { get; init; }
}
