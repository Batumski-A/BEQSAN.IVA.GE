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

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins("http://localhost:5173", "http://localhost:5174", "https://beqsan.iva.ge")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseCorrelationId();
app.UseSerilogRequestLogging();
app.UseCors();

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

app.MapGet("/", () => Results.Redirect(app.Environment.IsDevelopment() ? "/scalar/v1" : "/api/v1/health"))
    .ExcludeFromDescription();

await app.Services.InitializeDatabaseAsync().ConfigureAwait(false);

await app.RunAsync().ConfigureAwait(false);

// Make Program discoverable to WebApplicationFactory in integration tests.
namespace BEQSAN.Api
{
    public sealed partial class Program;
}
