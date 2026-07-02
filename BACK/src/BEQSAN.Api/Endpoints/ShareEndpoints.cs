using System.Text.RegularExpressions;
using BEQSAN.Application.Common.Abstractions;

namespace BEQSAN.Api.Endpoints;

/// <summary>
/// Public OpenGraph wrapper pages for stored configurator drawings.
/// WhatsApp (and other messengers) render a link as a photo-preview card
/// only when the URL serves HTML with og:image — a bare .png link gets a
/// plain domain card. The page itself shows the drawing full-width, so a
/// human clicking through sees the same image.
///
/// Presentational-only endpoint (no domain logic), so it stays in the Api
/// layer without a MediatR round-trip — same tradeoff OrdersEndpoints makes.
/// </summary>
public static partial class ShareEndpoints
{
    // Storage keys are produced exclusively by LocalFileStorage:
    // yyyy/MM/dd/<32-hex>_<sanitized-name>.<ext>. Anything else is rejected
    // before touching the filesystem (defense in depth on top of the
    // storage layer's own traversal guard).
    [GeneratedRegex(@"^\d{4}/\d{2}/\d{2}/[0-9a-f]{32}_[A-Za-z0-9._-]+\.(png|jpg)$")]
    private static partial Regex StorageKeyPattern();

    public static IEndpointRouteBuilder MapShareEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/share").WithTags("Share");

        group.MapGet("{**storageKey}", async (
                string storageKey,
                IStorageService storage,
                IConfiguration config,
                HttpContext http,
                CancellationToken ct) =>
            {
                if (!StorageKeyPattern().IsMatch(storageKey))
                {
                    return Results.NotFound();
                }

                var exists = await storage.ExistsAsync(storageKey, ct).ConfigureAwait(false);
                if (!exists)
                {
                    return Results.NotFound();
                }

                // nginx proxies /api/ with Host rewritten to the backend site,
                // so the request host is useless for public URLs — take the
                // canonical base from config instead.
                var baseUrl = (config["Public:BaseUrl"]
                    ?? $"{http.Request.Scheme}://{http.Request.Host}").TrimEnd('/');
                var imageUrl = $"{baseUrl}/api/v1/files/{storageKey}";

                var html = $$"""
                    <!doctype html>
                    <html lang="ka">
                    <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>BEQSAN — ნახაზი</title>
                    <meta property="og:title" content="BEQSAN — შენი ფანჯრის ნახაზი">
                    <meta property="og:description" content="აწყობილია beqsan.iva.ge-ს 3D სტუდიაში">
                    <meta property="og:type" content="website">
                    <meta property="og:image" content="{{imageUrl}}">
                    <meta property="og:image:width" content="1600">
                    <meta property="og:image:height" content="1200">
                    <meta name="twitter:card" content="summary_large_image">
                    <style>
                      body{margin:0;background:#0F172A;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;min-height:100vh}
                      header{color:#fff;font-weight:700;letter-spacing:.18em;padding:20px 0 12px}
                      header span{color:#2563eb}
                      img{max-width:min(96vw,1100px);border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,.5)}
                      p{color:#94A3B8;font-size:13px;padding:14px}
                    </style>
                    </head>
                    <body>
                    <header>BEQSAN<span>.</span></header>
                    <img src="{{imageUrl}}" alt="BEQSAN — ფანჯრის ნახაზი">
                    <p>ნახაზი აწყობილია beqsan.iva.ge-ს 3D სტუდიაში</p>
                    </body>
                    </html>
                    """;

                return Results.Content(html, "text/html; charset=utf-8");
            })
            .WithName("GetDrawingSharePage")
            .WithSummary("OpenGraph wrapper page for a stored configurator drawing")
            .Produces(StatusCodes.Status200OK, contentType: "text/html")
            .Produces(StatusCodes.Status404NotFound);

        return app;
    }
}
