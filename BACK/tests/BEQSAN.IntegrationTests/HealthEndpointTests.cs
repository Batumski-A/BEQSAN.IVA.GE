using System.Net;
using System.Net.Http.Json;
using BEQSAN.Api.Endpoints;
using BEQSAN.Application.Common.Persistence;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;

namespace BEQSAN.IntegrationTests;

public class HealthEndpointTests(BeqsanWebAppFactory factory) : IClassFixture<BeqsanWebAppFactory>
{
    private readonly BeqsanWebAppFactory _factory = factory;

    [Fact]
    public async Task GetHealth_AllUp_Returns200WithFullShape()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/v1/health", UriKind.Relative));

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = await response.Content.ReadFromJsonAsync<HealthResponse>();
        payload.Should().NotBeNull();
        payload!.Status.Should().Be("ok");
        payload.Version.Should().NotBeNullOrEmpty();
        payload.CommitSha.Should().NotBeNullOrEmpty();
        payload.UptimeSeconds.Should().BeGreaterThanOrEqualTo(0);

        payload.Checks.Should().NotBeNull();
        payload.Checks.Db.Status.Should().Be("up");
        payload.Checks.Db.LatencyMs.Should().BeGreaterThanOrEqualTo(0);
        payload.Checks.Cache.Status.Should().Be("up");
        payload.Checks.Cache.LatencyMs.Should().BeGreaterThanOrEqualTo(0);
        payload.Checks.Storage.Status.Should().Be("up");
        payload.Checks.Storage.LatencyMs.Should().BeGreaterThanOrEqualTo(0);

        response.Headers.Should().ContainKey("X-Correlation-Id");
    }

    [Fact]
    public async Task GetHealth_HonoursIncomingCorrelationId()
    {
        using var client = _factory.CreateClient();
        var incoming = Guid.NewGuid().ToString("N");

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/health");
        request.Headers.Add("X-Correlation-Id", incoming);

        var response = await client.SendAsync(request);

        response.Headers.GetValues("X-Correlation-Id").First().Should().Be(incoming);
    }

    [Fact]
    public async Task GetHealth_WhenDbIsDown_Returns503()
    {
        using var factory = new BeqsanWebAppFactory();
        await factory.InitializeAsync();

        // Inject a stub IBeqsanDbContext that reports the DB as unreachable.
        using var degradedClient = factory.WithWebHostBuilder(b =>
        {
            b.ConfigureTestServices(services =>
            {
                var fakeDb = Substitute.For<IBeqsanDbContext>();
                fakeDb.PingAsync(Arg.Any<CancellationToken>()).Returns(Task.FromResult(false));
                fakeDb.CanConnectAsync(Arg.Any<CancellationToken>()).Returns(Task.FromResult(false));

                var existing = services.Single(d => d.ServiceType == typeof(IBeqsanDbContext));
                services.Remove(existing);
                services.AddScoped(_ => fakeDb);
            });
        }).CreateClient();

        var response = await degradedClient.GetAsync(new Uri("/api/v1/health", UriKind.Relative));

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        var payload = await response.Content.ReadFromJsonAsync<HealthResponse>();
        payload.Should().NotBeNull();
        payload!.Status.Should().Be("down");
        payload.Checks.Db.Status.Should().Be("down");
        payload.Checks.Cache.Status.Should().Be("up");
        payload.Checks.Storage.Status.Should().Be("up");

        await factory.DisposeAsync();
    }
}
