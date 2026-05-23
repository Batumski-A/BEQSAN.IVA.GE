using BEQSAN.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Api.Endpoints;

/// <summary>
/// Admin-only catalog edit endpoints. Phase-1 surface: inline price edit
/// and active toggle. Future phases (catalog CMS proper) will add full
/// CRUD for materials, glass types, colors, accessories.
/// </summary>
public static class AdminCatalogEndpoints
{
    public static IEndpointRouteBuilder MapAdminCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/catalog").WithTags("AdminCatalog");

        group.MapPatch("/materials/{id:guid}", async (
                Guid id,
                [FromBody] UpdateMaterialRequest body,
                BeqsanDbContext db,
                CancellationToken ct) =>
            {
                var material = await db.Materials
                    .FirstOrDefaultAsync(m => m.Id == id, ct)
                    .ConfigureAwait(false);
                if (material is null)
                {
                    return Results.Json(new
                    {
                        isSuccess = false,
                        errors = new[] { new { code = "catalog.materialNotFound", message = "მასალა ვერ მოიძებნა." } },
                    }, statusCode: StatusCodes.Status404NotFound);
                }

                if (body.BasePricePerSqmMinor is { } price)
                {
                    if (price is <= 0 or > int.MaxValue)
                    {
                        return Results.Json(new
                        {
                            isSuccess = false,
                            errors = new[] { new { code = "catalog.priceInvalid", message = "ფასი დადებითი უნდა იყოს." } },
                        }, statusCode: StatusCodes.Status400BadRequest);
                    }
                    material.BasePricePerSqmMinor = (int)price;
                }

                if (body.IsActive is { } active)
                {
                    material.IsActive = active;
                }

                await db.SaveChangesAsync(ct).ConfigureAwait(false);

                return Results.Json(new
                {
                    isSuccess = true,
                    value = new
                    {
                        id = material.Id,
                        basePricePerSqmMinor = material.BasePricePerSqmMinor,
                        isActive = material.IsActive,
                    },
                });
            })
            .WithName("AdminUpdateMaterial")
            .WithSummary("Update a material's base price and/or active flag (inline pricing).");

        return app;
    }

    public sealed record UpdateMaterialRequest(long? BasePricePerSqmMinor, bool? IsActive);
}
