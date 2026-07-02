using BEQSAN.Api.Common;
using BEQSAN.Api.Endpoints;
using BEQSAN.Api.Middleware;
using BEQSAN.Application;
using BEQSAN.Infrastructure;
using Microsoft.Extensions.FileProviders;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithThreadId()
        .Enrich.WithMachineName();
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.Configure<AdminAuthOptions>(
    builder.Configuration.GetSection(AdminAuthOptions.SectionName));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "BEQSAN API",
        Version = "v1",
        Description = "BEQSAN — windows & doors platform (beqsan.iva.ge)",
    });
});

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

const string ViteDevCorsPolicy = "vite-dev";
const string ProductionCorsPolicy = "production";

builder.Services.AddCors(options =>
{
    if (builder.Environment.IsDevelopment())
    {
        options.AddPolicy(ViteDevCorsPolicy, policy => policy
            .WithOrigins(
                "http://localhost:5173",   // Vite default
                "http://localhost:5174",   // Vite alt (when 5173 is taken)
                "http://localhost:4173")   // Vite preview (pnpm preview)
            .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .WithHeaders("Content-Type", "Authorization", "X-Correlation-Id", "X-Admin-Token")
            .WithExposedHeaders("X-Correlation-Id")
            .AllowCredentials());
    }

    // Production origins are read from configuration (Cors:AllowedOrigins) so
    // host/port can change between staging (iva.ge:4433) and the final domain
    // (beqsan.iva.ge) without a rebuild.
    var allowedOrigins = builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>() ?? [];

    options.AddPolicy(ProductionCorsPolicy, policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy
                .WithOrigins(allowedOrigins)
                .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .WithHeaders("Content-Type", "Authorization", "X-Correlation-Id", "X-Admin-Token")
                .WithExposedHeaders("X-Correlation-Id")
                .AllowCredentials();
        }
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseCorrelationId();
app.UseSerilogRequestLogging();
app.UseCors(app.Environment.IsDevelopment() ? ViteDevCorsPolicy : ProductionCorsPolicy);

// Public read access to stored uploads (configurator snapshots, gallery images).
// Root resolution mirrors LocalFileStorage.GetRootAbsolute: Storage:LocalRoot,
// combined with the content root's CWD when relative. PhysicalFileProvider
// throws on a nonexistent root, so create it up front.
var storageOptions = app.Configuration
    .GetSection(StorageOptions.SectionName)
    .Get<StorageOptions>() ?? new StorageOptions();
var uploadsRoot = Path.IsPathRooted(storageOptions.LocalRoot)
    ? storageOptions.LocalRoot
    : Path.Combine(Directory.GetCurrentDirectory(), storageOptions.LocalRoot);
Directory.CreateDirectory(uploadsRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRoot),
    RequestPath = "/api/v1/files",
    ServeUnknownFileTypes = false, // png/jpg covered by the default content-type map
});

app.UseMiddleware<AdminTokenAuthMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger(options => options.RouteTemplate = "openapi/{documentName}.json");
    app.MapScalarApiReference(options =>
    {
        options.Title = "BEQSAN API";
        options.Theme = ScalarTheme.BluePlanet;
        options.OpenApiRoutePattern = "/openapi/{documentName}.json";
    });
}

app.MapHealthEndpoints();
app.MapCatalogEndpoints();
app.MapConfiguratorEndpoints();
app.MapShareEndpoints();
app.MapAdminAuthEndpoints();
app.MapAdminCatalogEndpoints();
app.MapOrdersEndpoints();
app.MapAdminReportsEndpoints();
app.MapAdminWarrantiesEndpoints();
app.MapAdminGalleryEndpoints();
app.MapSocialEndpoints();
app.MapMetaWebhookEndpoints();

app.MapGet("/", () => Results.Redirect(app.Environment.IsDevelopment() ? "/scalar/v1" : "/api/v1/health"))
    .ExcludeFromDescription();

await app.Services.InitializeDatabaseAsync().ConfigureAwait(false);

await app.RunAsync().ConfigureAwait(false);

// Make Program discoverable to WebApplicationFactory in integration tests.
namespace BEQSAN.Api
{
    public sealed partial class Program;
}
