using BEQSAN.Api.Common;
using BEQSAN.Application.Catalog.GetMaterialsByProductType;
using BEQSAN.Application.Catalog.GetProductTypes;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BEQSAN.Api.Endpoints;

public static class CatalogEndpoints
{
    public static IEndpointRouteBuilder MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/catalog").WithTags("Catalog");

        group.MapGet("product-types", async (ISender sender, CancellationToken ct) =>
            {
                var result = await sender.Send(new GetProductTypesQuery(), ct).ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("GetProductTypes")
            .WithSummary("Active product types in display order")
            .Produces<ApiResponse<IReadOnlyList<ProductTypeDto>>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        group.MapGet("product-types/{productTypeId:guid}/materials", async (
                Guid productTypeId, ISender sender, CancellationToken ct) =>
            {
                var result = await sender
                    .Send(new GetMaterialsByProductTypeQuery(productTypeId), ct)
                    .ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("GetMaterialsByProductType")
            .WithSummary("Active materials for a product type, ordered for display")
            .Produces<ApiResponse<IReadOnlyList<MaterialDto>>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        return app;
    }
}

/// <summary>
/// Marker for Swashbuckle so the OpenAPI doc declares the response shapes
/// even though minimal-API endpoints don't reference DTOs in their signatures
/// directly. Used purely at codegen time.
/// </summary>
[Produces("application/json")]
[ApiExplorerSettings(IgnoreApi = false)]
internal sealed class CatalogSchemaAnchor
{
    public ApiResponse<IReadOnlyList<ProductTypeDto>>? ProductTypesResponse { get; init; }
    public ApiResponse<IReadOnlyList<MaterialDto>>? MaterialsResponse { get; init; }
}
