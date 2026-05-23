using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BEQSAN.Application.Catalog.GetProductTypes;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;

namespace BEQSAN.IntegrationTests;

public class CatalogEndpointTests(BeqsanWebAppFactory factory) : IClassFixture<BeqsanWebAppFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly BeqsanWebAppFactory _factory = factory;

    [Fact]
    public async Task GetProductTypes_Returns200WithEnvelopeAnd5Items()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/v1/catalog/product-types", UriKind.Relative));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.Should().ContainKey("X-Correlation-Id");

        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<List<TestProductType>>>(JsonOptions);
        envelope.Should().NotBeNull();
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Errors.Should().BeEmpty();
        envelope.Value.Should().NotBeNull().And.HaveCount(6);

        envelope.Value!.Select(p => p.Slug).Should()
            .ContainInOrder("window", "door", "sliding", "panoramic", "balcony", "veranda");

        var window = envelope.Value!.Single(p => p.Slug == "window");
        window.Name.Should().NotBeNull();
        window.Name!.Ka.Should().Be("ფანჯარა");
        window.SortOrder.Should().Be(1);
        window.HeroImageUrl.Should().Be("/images/catalog/window.jpg");
    }

    [Fact]
    public async Task GetProductTypes_ReturnsCanonicalCamelCaseProperties()
    {
        using var client = _factory.CreateClient();

        var raw = await client.GetStringAsync(new Uri("/api/v1/catalog/product-types", UriKind.Relative));

        // The wire shape must be camelCase — FRONT contract.
        raw.Should().Contain("\"isSuccess\":true");
        raw.Should().Contain("\"value\":");
        raw.Should().Contain("\"errors\":[]");
        raw.Should().Contain("\"slug\":");
        raw.Should().Contain("\"heroImageUrl\":");
        raw.Should().Contain("\"sortOrder\":");
    }

    [Fact]
    public async Task GetProductTypes_WhenReaderThrows_Returns500WithEnvelope()
    {
        using var factory = new BeqsanWebAppFactory();
        await factory.InitializeAsync();

        var fakeReader = Substitute.For<IProductTypeReader>();
        fakeReader.ListActiveAsync(Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<ProductTypeDto>>(_ => throw new InvalidOperationException("boom"));

        using var failingClient = factory.WithWebHostBuilder(b =>
        {
            b.ConfigureTestServices(services =>
            {
                var existing = services.Single(d => d.ServiceType == typeof(IProductTypeReader));
                services.Remove(existing);
                services.AddScoped(_ => fakeReader);
            });
        }).CreateClient();

        var response = await failingClient.GetAsync(new Uri("/api/v1/catalog/product-types", UriKind.Relative));

        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope.Should().NotBeNull();
        envelope!.IsSuccess.Should().BeFalse();
        envelope.Errors.Should().ContainSingle();
        envelope.Errors[0].Code.Should().Be("internal.error");
        envelope.Errors[0].Message.Should().Contain("ხარვეზი");

        // No internal stack trace leaks in the response body.
        var raw = await response.Content.ReadAsStringAsync();
        raw.Should().NotContain("boom");
        raw.Should().NotContain("InvalidOperationException");
        raw.Should().NotContain("at BEQSAN");

        await factory.DisposeAsync();
    }

    private sealed record TestApiResponse<T>(bool IsSuccess, T? Value, List<TestApiError> Errors);

    private sealed record TestApiError(string Code, string Message, string? Field);

    private sealed record TestProductType(
        Guid Id,
        string Slug,
        TestLocalizedText? Name,
        TestLocalizedText? ShortDescription,
        string HeroImageUrl,
        int SortOrder);

    private sealed record TestLocalizedText(string Ka, string? En, string? Ru);
}
