using BEQSAN.Api.Endpoints;
using BEQSAN.Api.Middleware;
using BEQSAN.Application;
using BEQSAN.Infrastructure;
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
            .WithHeaders("Content-Type", "Authorization", "X-Correlation-Id")
            .WithExposedHeaders("X-Correlation-Id")
            .AllowCredentials());
    }

    // Production policy stays empty until beqsan.iva.ge CNAME + admin.beqsan.iva.ge
    // are confirmed. Filled in a separate commit when deploy lands.
    options.AddPolicy(ProductionCorsPolicy, policy =>
    {
        // placeholder — no origins, denies all
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseCorrelationId();
app.UseSerilogRequestLogging();
app.UseCors(app.Environment.IsDevelopment() ? ViteDevCorsPolicy : ProductionCorsPolicy);

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

app.MapGet("/", () => Results.Redirect(app.Environment.IsDevelopment() ? "/scalar/v1" : "/api/v1/health"))
    .ExcludeFromDescription();

await app.Services.InitializeDatabaseAsync().ConfigureAwait(false);

await app.RunAsync().ConfigureAwait(false);

// Make Program discoverable to WebApplicationFactory in integration tests.
namespace BEQSAN.Api
{
    public sealed partial class Program;
}
