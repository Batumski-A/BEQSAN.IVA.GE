using BEQSAN.Domain.Warranties;
using BEQSAN.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Api.Endpoints;

/// <summary>
/// Admin warranty management.
/// <list type="bullet">
///   <item><c>GET    /api/v1/admin/warranties</c> — paged list with status filter.</item>
///   <item><c>GET    /api/v1/admin/warranties/{id}</c> — detail.</item>
///   <item><c>PATCH  /api/v1/admin/warranties/{id}/status</c> — claim → resolved transitions.</item>
///   <item><c>PATCH  /api/v1/admin/warranties/{id}/notes</c> — update manager notes.</item>
/// </list>
/// <para>
/// Records are auto-created when an order moves to <c>Delivered</c> (see
/// <c>OrdersEndpoints.MapAdminOrderChangeStatus</c>), using a 60-month
/// workshop-default coverage window.
/// </para>
/// </summary>
public static class AdminWarrantiesEndpoints
{
    public static IEndpointRouteBuilder MapAdminWarrantiesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/warranties").WithTags("AdminWarranties");

        group.MapGet("/", async (
                [FromQuery] string? status,
                [FromQuery] int? page,
                [FromQuery] int? pageSize,
                BeqsanDbContext db,
                CancellationToken ct) =>
            {
                var pg = page is null or < 1 ? 1 : page.Value;
                var size = pageSize is null or < 1 or > 200 ? 50 : pageSize.Value;

                // Lazy expiration: any Active warranty past EndDate gets bumped to Expired
                // at read time. Avoids a background job for a low-frequency derivation.
                var now = DateTime.UtcNow;
                var stale = await db.Warranties
                    .Where(w => w.Status == WarrantyStatus.Active && w.EndDateUtc < now)
                    .ToListAsync(ct)
                    .ConfigureAwait(false);
                if (stale.Count > 0)
                {
                    foreach (var w in stale)
                    {
                        w.Status = WarrantyStatus.Expired;
                        w.UpdatedAtUtc = now;
                    }
                    await db.SaveChangesAsync(ct).ConfigureAwait(false);
                }

                var query = db.Warranties.AsNoTracking().AsQueryable();
                if (Enum.TryParse<WarrantyStatus>(status, ignoreCase: true, out var parsed))
                {
                    query = query.Where(w => w.Status == parsed);
                }

                var total = await query.CountAsync(ct).ConfigureAwait(false);
                var items = await query
                    .OrderByDescending(w => w.CreatedAtUtc)
                    .Skip((pg - 1) * size)
                    .Take(size)
                    .Select(w => new WarrantyListItemDto(
                        w.Id, w.OrderId, w.OrderNumber, w.CustomerName, w.CustomerPhone,
                        w.DurationMonths, w.StartDateUtc, w.EndDateUtc, w.Status.ToString()))
                    .ToListAsync(ct)
                    .ConfigureAwait(false);

                return Results.Json(new
                {
                    isSuccess = true,
                    value = new { items, total, page = pg, pageSize = size },
                });
            })
            .WithName("AdminWarrantiesList")
            .WithSummary("List warranties (filterable by status).");

        group.MapGet("/{id:guid}", async (Guid id, BeqsanDbContext db, CancellationToken ct) =>
        {
            var w = await db.Warranties
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, ct)
                .ConfigureAwait(false);
            if (w is null)
            {
                return Fail(StatusCodes.Status404NotFound, "warranty.notFound", "გარანტია ვერ მოიძებნა.");
            }
            return Results.Json(new
            {
                isSuccess = true,
                value = new
                {
                    id = w.Id,
                    orderId = w.OrderId,
                    orderNumber = w.OrderNumber,
                    customerName = w.CustomerName,
                    customerPhone = w.CustomerPhone,
                    durationMonths = w.DurationMonths,
                    startDateUtc = w.StartDateUtc,
                    endDateUtc = w.EndDateUtc,
                    status = w.Status.ToString(),
                    notes = w.Notes,
                    createdAtUtc = w.CreatedAtUtc,
                    updatedAtUtc = w.UpdatedAtUtc,
                },
            });
        })
        .WithName("AdminWarrantyDetail");

        group.MapPatch("/{id:guid}/status", async (
                Guid id,
                [FromBody] WarrantyStatusChange body,
                BeqsanDbContext db,
                CancellationToken ct) =>
            {
                if (!Enum.TryParse<WarrantyStatus>(body.Status, ignoreCase: true, out var next))
                {
                    return Fail(StatusCodes.Status400BadRequest, "warranty.statusInvalid", "სტატუსი არასწორია.", "status");
                }
                var w = await db.Warranties.FirstOrDefaultAsync(x => x.Id == id, ct).ConfigureAwait(false);
                if (w is null)
                {
                    return Fail(StatusCodes.Status404NotFound, "warranty.notFound", "გარანტია ვერ მოიძებნა.");
                }
                w.Status = next;
                if (!string.IsNullOrWhiteSpace(body.Notes))
                {
                    w.Notes = body.Notes.Trim();
                }
                w.UpdatedAtUtc = DateTime.UtcNow;
                await db.SaveChangesAsync(ct).ConfigureAwait(false);
                return Results.Json(new
                {
                    isSuccess = true,
                    value = new { status = w.Status.ToString(), notes = w.Notes },
                });
            })
            .WithName("AdminWarrantyChangeStatus");

        return app;
    }

    private static IResult Fail(int status, string code, string message, string? field = null) =>
        Results.Json(new
        {
            isSuccess = false,
            errors = new[] { new { code, message, field } },
        }, statusCode: status);

    public sealed record WarrantyListItemDto(
        Guid Id, Guid OrderId, string OrderNumber, string CustomerName, string CustomerPhone,
        int DurationMonths, DateTime StartDateUtc, DateTime EndDateUtc, string Status);

    public sealed record WarrantyStatusChange(string Status, string? Notes);
}
