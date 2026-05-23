using System.Text.Json;
using System.Text.RegularExpressions;
using BEQSAN.Domain.Orders;
using BEQSAN.Domain.ValueObjects;
using BEQSAN.Domain.Warranties;
using BEQSAN.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Api.Endpoints;

/// <summary>
/// Public order submission + admin order management.
/// <list type="bullet">
///   <item><c>POST /api/v1/orders</c> — customer submits configuration + contact (no auth).</item>
///   <item><c>GET  /api/v1/admin/orders</c> — paged list with status filter.</item>
///   <item><c>GET  /api/v1/admin/orders/{id}</c> — full detail incl. configuration snapshot.</item>
///   <item><c>PATCH /api/v1/admin/orders/{id}/status</c> — workflow transition with optional note.</item>
/// </list>
/// </summary>
public static partial class OrdersEndpoints
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public static IEndpointRouteBuilder MapOrdersEndpoints(this IEndpointRouteBuilder app)
    {
        // === PUBLIC === customer submits an order from the configurator
        app.MapPost("/api/v1/orders", async (
                [FromBody] SubmitOrderRequest body,
                BeqsanDbContext db,
                CancellationToken ct) =>
            {
                var name = (body.CustomerName ?? string.Empty).Trim();
                var phone = NormalizePhone(body.CustomerPhone ?? string.Empty);
                var email = string.IsNullOrWhiteSpace(body.CustomerEmail) ? null : body.CustomerEmail!.Trim();
                var address = string.IsNullOrWhiteSpace(body.CustomerAddress) ? null : body.CustomerAddress!.Trim();
                var notes = string.IsNullOrWhiteSpace(body.Notes) ? null : body.Notes!.Trim();

                if (name.Length is < 2 or > 128)
                {
                    return Fail(StatusCodes.Status400BadRequest, "order.nameInvalid",
                        "სახელი უნდა იყოს 2-128 სიმბოლო.", "customerName");
                }
                if (!IsValidPhone(phone))
                {
                    return Fail(StatusCodes.Status400BadRequest, "order.phoneInvalid",
                        "ტელეფონის ნომერი არასწორი ფორმატით (მაგ. +995595XXXXXX).", "customerPhone");
                }
                if (email is not null && !EmailRegex().IsMatch(email))
                {
                    return Fail(StatusCodes.Status400BadRequest, "order.emailInvalid",
                        "ელ. ფოსტის ფორმატი არასწორია.", "customerEmail");
                }
                if (body.Configuration.ValueKind != JsonValueKind.Object)
                {
                    return Fail(StatusCodes.Status400BadRequest, "order.configurationMissing",
                        "კონფიგურაცია არ მოვიდა.", "configuration");
                }
                if (body.TotalPriceMinor <= 0)
                {
                    return Fail(StatusCodes.Status400BadRequest, "order.priceInvalid",
                        "ფასი არასწორია.", "totalPriceMinor");
                }

                var now = DateTime.UtcNow;
                var orderNumber = await GenerateOrderNumberAsync(db, now, ct).ConfigureAwait(false);
                var initialHistory = JsonSerializer.Serialize(new[]
                {
                    new StatusHistoryEntry(OrderStatus.Pending.ToString(), now, null),
                }, JsonOpts);

                var order = new Order
                {
                    Id = Guid.NewGuid(),
                    OrderNumber = orderNumber,
                    CustomerName = name,
                    CustomerPhone = phone,
                    CustomerEmail = email,
                    CustomerAddress = address,
                    Notes = notes,
                    ConfigurationJson = body.Configuration.GetRawText(),
                    TotalPriceMinor = body.TotalPriceMinor,
                    Currency = Currency.Gel,
                    Status = OrderStatus.Pending,
                    StatusHistoryJson = initialHistory,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now,
                };
                db.Orders.Add(order);
                await db.SaveChangesAsync(ct).ConfigureAwait(false);

                return Results.Json(new
                {
                    isSuccess = true,
                    value = new
                    {
                        id = order.Id,
                        orderNumber = order.OrderNumber,
                        status = order.Status.ToString(),
                        createdAtUtc = order.CreatedAtUtc,
                    },
                }, statusCode: StatusCodes.Status201Created);
            })
            .WithTags("Orders")
            .WithName("SubmitOrder")
            .WithSummary("Customer submits a configurator order.");

        // === ADMIN ===
        var admin = app.MapGroup("/api/v1/admin/orders").WithTags("AdminOrders");

        admin.MapGet("/", async (
                [FromQuery] string? status,
                [FromQuery] int? page,
                [FromQuery] int? pageSize,
                BeqsanDbContext db,
                CancellationToken ct) =>
            {
                var pg = page is null or < 1 ? 1 : page.Value;
                var size = pageSize is null or < 1 or > 200 ? 50 : pageSize.Value;
                var query = db.Orders.AsNoTracking().AsQueryable();
                if (Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var parsed))
                {
                    query = query.Where(o => o.Status == parsed);
                }

                var total = await query.CountAsync(ct).ConfigureAwait(false);
                var items = await query
                    .OrderByDescending(o => o.CreatedAtUtc)
                    .Skip((pg - 1) * size)
                    .Take(size)
                    .Select(o => new OrderListItemDto(
                        o.Id, o.OrderNumber, o.CustomerName, o.CustomerPhone,
                        o.TotalPriceMinor, o.Currency.ToString(),
                        o.Status.ToString(), o.CreatedAtUtc))
                    .ToListAsync(ct)
                    .ConfigureAwait(false);

                return Results.Json(new
                {
                    isSuccess = true,
                    value = new { items, total, page = pg, pageSize = size },
                });
            })
            .WithName("AdminOrdersList")
            .WithSummary("List orders with pagination + optional status filter.");

        admin.MapGet("/{id:guid}", async (
                Guid id, BeqsanDbContext db, CancellationToken ct) =>
            {
                var order = await db.Orders
                    .AsNoTracking()
                    .FirstOrDefaultAsync(o => o.Id == id, ct)
                    .ConfigureAwait(false);
                if (order is null)
                {
                    return Fail(StatusCodes.Status404NotFound, "order.notFound", "შეკვეთა ვერ მოიძებნა.");
                }

                JsonElement configEl;
                using (var doc = JsonDocument.Parse(order.ConfigurationJson))
                {
                    configEl = doc.RootElement.Clone();
                }
                JsonElement historyEl;
                using (var doc = JsonDocument.Parse(order.StatusHistoryJson))
                {
                    historyEl = doc.RootElement.Clone();
                }

                return Results.Json(new
                {
                    isSuccess = true,
                    value = new
                    {
                        id = order.Id,
                        orderNumber = order.OrderNumber,
                        customerName = order.CustomerName,
                        customerPhone = order.CustomerPhone,
                        customerEmail = order.CustomerEmail,
                        customerAddress = order.CustomerAddress,
                        notes = order.Notes,
                        configuration = configEl,
                        totalPriceMinor = order.TotalPriceMinor,
                        currency = order.Currency.ToString(),
                        status = order.Status.ToString(),
                        statusHistory = historyEl,
                        createdAtUtc = order.CreatedAtUtc,
                        updatedAtUtc = order.UpdatedAtUtc,
                    },
                });
            })
            .WithName("AdminOrderDetail")
            .WithSummary("Order detail including configuration snapshot and status history.");

        admin.MapPatch("/{id:guid}/status", async (
                Guid id,
                [FromBody] ChangeStatusRequest body,
                BeqsanDbContext db,
                CancellationToken ct) =>
            {
                if (!Enum.TryParse<OrderStatus>(body.Status, ignoreCase: true, out var next))
                {
                    return Fail(StatusCodes.Status400BadRequest, "order.statusInvalid",
                        "სტატუსი არასწორია.", "status");
                }

                var order = await db.Orders
                    .FirstOrDefaultAsync(o => o.Id == id, ct)
                    .ConfigureAwait(false);
                if (order is null)
                {
                    return Fail(StatusCodes.Status404NotFound, "order.notFound", "შეკვეთა ვერ მოიძებნა.");
                }
                if (order.Status == next)
                {
                    return Results.Json(new
                    {
                        isSuccess = true,
                        value = new { status = next.ToString() },
                    });
                }

                var now = DateTime.UtcNow;
                var existing = JsonSerializer.Deserialize<List<StatusHistoryEntry>>(
                    order.StatusHistoryJson, JsonOpts) ?? [];
                existing.Add(new StatusHistoryEntry(
                    next.ToString(), now,
                    string.IsNullOrWhiteSpace(body.Note) ? null : body.Note!.Trim()));

                order.Status = next;
                order.StatusHistoryJson = JsonSerializer.Serialize(existing, JsonOpts);
                order.UpdatedAtUtc = now;

                // Auto-create a warranty record on Delivered transition.
                // Idempotent: only inserts when no warranty exists for this order.
                if (next == OrderStatus.Delivered)
                {
                    var existingWarranty = await db.Warranties
                        .AnyAsync(w => w.OrderId == order.Id, ct)
                        .ConfigureAwait(false);
                    if (!existingWarranty)
                    {
                        const int defaultDurationMonths = 60;
                        db.Warranties.Add(new Warranty
                        {
                            Id = Guid.NewGuid(),
                            OrderId = order.Id,
                            OrderNumber = order.OrderNumber,
                            CustomerName = order.CustomerName,
                            CustomerPhone = order.CustomerPhone,
                            DurationMonths = defaultDurationMonths,
                            StartDateUtc = now,
                            EndDateUtc = now.AddMonths(defaultDurationMonths),
                            Status = WarrantyStatus.Active,
                            CreatedAtUtc = now,
                            UpdatedAtUtc = now,
                        });
                    }
                }

                await db.SaveChangesAsync(ct).ConfigureAwait(false);

                return Results.Json(new
                {
                    isSuccess = true,
                    value = new { status = order.Status.ToString(), updatedAtUtc = order.UpdatedAtUtc },
                });
            })
            .WithName("AdminOrderChangeStatus")
            .WithSummary("Move the order to the next workflow status.");

        return app;
    }

    private static async Task<string> GenerateOrderNumberAsync(
        BeqsanDbContext db, DateTime now, CancellationToken ct)
    {
        var year = now.Year;
        var yearPrefix = $"BQ-{year}-";
        var lastSeq = await db.Orders
            .Where(o => o.OrderNumber.StartsWith(yearPrefix))
            .CountAsync(ct)
            .ConfigureAwait(false);
        return $"{yearPrefix}{lastSeq + 1:D6}";
    }

    private static string NormalizePhone(string raw)
    {
        var digits = new string(raw.Where(c => char.IsDigit(c) || c == '+').ToArray());
        if (digits.StartsWith('+'))
        {
            return digits;
        }
        if (digits.StartsWith("995", StringComparison.Ordinal))
        {
            return "+" + digits;
        }
        if (digits.Length == 9 && digits[0] == '5')
        {
            return "+995" + digits;
        }
        return digits;
    }

    private static bool IsValidPhone(string phone) =>
        phone.StartsWith('+') && phone.Length is >= 8 and <= 16
        && phone[1..].All(char.IsDigit);

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")]
    private static partial Regex EmailRegex();

    private static IResult Fail(int status, string code, string message, string? field = null) =>
        Results.Json(new
        {
            isSuccess = false,
            errors = new[]
            {
                new { code, message, field },
            },
        }, statusCode: status);

    public sealed record SubmitOrderRequest(
        string? CustomerName,
        string? CustomerPhone,
        string? CustomerEmail,
        string? CustomerAddress,
        string? Notes,
        JsonElement Configuration,
        long TotalPriceMinor);

    public sealed record ChangeStatusRequest(string Status, string? Note);

    public sealed record OrderListItemDto(
        Guid Id, string OrderNumber, string CustomerName, string CustomerPhone,
        long TotalPriceMinor, string Currency, string Status, DateTime CreatedAtUtc);

    public sealed record StatusHistoryEntry(string Status, DateTime ChangedAtUtc, string? Note);
}
