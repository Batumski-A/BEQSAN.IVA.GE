using BEQSAN.Domain.Orders;
using BEQSAN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Api.Endpoints;

/// <summary>
/// Read-only reporting surface for the admin dashboard. All values derived
/// from the orders table — no separate analytics store yet.
/// </summary>
public static class AdminReportsEndpoints
{
    public static IEndpointRouteBuilder MapAdminReportsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/reports").WithTags("AdminReports");

        group.MapGet("/overview", async (BeqsanDbContext db, CancellationToken ct) =>
        {
            var now = DateTime.UtcNow;
            var since7 = now.AddDays(-7);
            var since30 = now.AddDays(-30);

            var orders = await db.Orders.AsNoTracking()
                .Select(o => new { o.Status, o.TotalPriceMinor, o.CreatedAtUtc })
                .ToListAsync(ct)
                .ConfigureAwait(false);

            var byStatus = new Dictionary<string, int>
            {
                [nameof(OrderStatus.Pending)] = 0,
                [nameof(OrderStatus.Confirmed)] = 0,
                [nameof(OrderStatus.InProduction)] = 0,
                [nameof(OrderStatus.Ready)] = 0,
                [nameof(OrderStatus.Delivered)] = 0,
                [nameof(OrderStatus.Cancelled)] = 0,
            };
            long revenueDeliveredMinor = 0;
            long revenuePipelineMinor = 0;
            var last7 = 0;
            var last30 = 0;

            foreach (var o in orders)
            {
                byStatus[o.Status.ToString()]++;
                if (o.Status == OrderStatus.Delivered)
                {
                    revenueDeliveredMinor += o.TotalPriceMinor;
                }
                else if (o.Status is OrderStatus.Confirmed or OrderStatus.InProduction or OrderStatus.Ready)
                {
                    revenuePipelineMinor += o.TotalPriceMinor;
                }
                if (o.CreatedAtUtc >= since7)
                {
                    last7++;
                }
                if (o.CreatedAtUtc >= since30)
                {
                    last30++;
                }
            }

            var total = orders.Count;
            var delivered = byStatus[nameof(OrderStatus.Delivered)];
            var cancelled = byStatus[nameof(OrderStatus.Cancelled)];
            var closed = delivered + cancelled;
            var conversionPercent = closed > 0
                ? Math.Round((double)delivered / closed * 100, 1)
                : 0d;

            return Results.Json(new
            {
                isSuccess = true,
                value = new
                {
                    totalOrders = total,
                    byStatus,
                    revenueDeliveredMinor,
                    revenuePipelineMinor,
                    last7Days = last7,
                    last30Days = last30,
                    conversionPercent,
                    generatedAtUtc = now,
                },
            });
        })
        .WithName("AdminReportsOverview")
        .WithSummary("Aggregate counts + revenue + conversion derived from orders.");

        return app;
    }
}
