using System.Net;
using System.Net.Http.Json;
using BEQSAN.Api.Endpoints;

namespace BEQSAN.IntegrationTests;

public class HealthEndpointTests(BeqsanWebAppFactory factory) : IClassFixture<BeqsanWebAppFactory>
{
    private readonly BeqsanWebAppFactory _factory = factory;

    [Fact]
    public async Task GetHealth_ReturnsOkWithExpectedShape()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/v1/health", UriKind.Relative));

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = await response.Content.ReadFromJsonAsync<HealthResponse>();
        payload.Should().NotBeNull();
        payload!.Status.Should().Be("ok");
        payload.DbStatus.Should().Be("up");
        payload.Version.Should().NotBeNullOrEmpty();
        payload.CommitSha.Should().NotBeNullOrEmpty();
        payload.UptimeSeconds.Should().BeGreaterThanOrEqualTo(0);

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
}
