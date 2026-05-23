using BEQSAN.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Api.Endpoints;

/// <summary>
/// Admin gallery management (MVP: list + edit metadata + toggle visibility).
/// File-upload endpoint comes in a later phase via <c>IStorageService</c>.
/// </summary>
public static class AdminGalleryEndpoints
{
    public static IEndpointRouteBuilder MapAdminGalleryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/gallery").WithTags("AdminGallery");

        group.MapGet("/", async (BeqsanDbContext db, CancellationToken ct) =>
        {
            var items = await db.GalleryItems
                .AsNoTracking()
                .OrderBy(g => g.SortOrder)
                .Select(g => new GalleryDto(
                    g.Id, g.Title, g.Caption, g.ImageUrl, g.Category,
                    g.SortOrder, g.IsActive, g.IsFeatured, g.CreatedAtUtc))
                .ToListAsync(ct)
                .ConfigureAwait(false);

            return Results.Json(new { isSuccess = true, value = items });
        })
        .WithName("AdminGalleryList");

        group.MapPatch("/{id:guid}", async (
                Guid id,
                [FromBody] UpdateGalleryItemRequest body,
                BeqsanDbContext db,
                CancellationToken ct) =>
            {
                var item = await db.GalleryItems
                    .FirstOrDefaultAsync(g => g.Id == id, ct)
                    .ConfigureAwait(false);
                if (item is null)
                {
                    return Results.Json(new
                    {
                        isSuccess = false,
                        errors = new[] { new { code = "gallery.notFound", message = "ფოტო ვერ მოიძებნა." } },
                    }, statusCode: StatusCodes.Status404NotFound);
                }
                if (!string.IsNullOrWhiteSpace(body.Title))
                {
                    item.Title = body.Title.Trim();
                }
                if (body.Caption is not null)
                {
                    item.Caption = body.Caption.Trim();
                }
                if (body.Category is not null)
                {
                    item.Category = body.Category.Trim();
                }
                if (body.IsActive is { } a)
                {
                    item.IsActive = a;
                }
                if (body.IsFeatured is { } f)
                {
                    item.IsFeatured = f;
                }
                if (body.SortOrder is { } s)
                {
                    item.SortOrder = s;
                }
                item.UpdatedAtUtc = DateTime.UtcNow;
                await db.SaveChangesAsync(ct).ConfigureAwait(false);

                return Results.Json(new { isSuccess = true, value = new { id = item.Id } });
            })
            .WithName("AdminGalleryUpdate");

        group.MapDelete("/{id:guid}", async (Guid id, BeqsanDbContext db, CancellationToken ct) =>
        {
            var item = await db.GalleryItems.FirstOrDefaultAsync(g => g.Id == id, ct).ConfigureAwait(false);
            if (item is null)
            {
                return Results.Json(new
                {
                    isSuccess = false,
                    errors = new[] { new { code = "gallery.notFound", message = "ფოტო ვერ მოიძებნა." } },
                }, statusCode: StatusCodes.Status404NotFound);
            }
            db.GalleryItems.Remove(item);
            await db.SaveChangesAsync(ct).ConfigureAwait(false);
            return Results.Json(new { isSuccess = true, value = new { id } });
        })
        .WithName("AdminGalleryDelete");

        return app;
    }

    public sealed record GalleryDto(
        Guid Id, string Title, string? Caption, string ImageUrl, string? Category,
        int SortOrder, bool IsActive, bool IsFeatured, DateTime CreatedAtUtc);

    public sealed record UpdateGalleryItemRequest(
        string? Title, string? Caption, string? Category,
        bool? IsActive, bool? IsFeatured, int? SortOrder);
}
