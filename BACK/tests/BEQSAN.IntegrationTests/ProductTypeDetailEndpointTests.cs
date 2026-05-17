using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace BEQSAN.IntegrationTests;

public class ProductTypeDetailEndpointTests(BeqsanWebAppFactory factory) : IClassFixture<BeqsanWebAppFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly BeqsanWebAppFactory _factory = factory;

    [Fact]
    public async Task GetDetail_BySlug_Returns200WithConstraints()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/catalog/product-types/window");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<TestDetail>>(JsonOptions);
        envelope.Should().NotBeNull();
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Value!.Slug.Should().Be("window");
        envelope.Value.Constraints.Should().NotBeNull();
        envelope.Value.Constraints!.MinWidthCm.Should().Be(30);
        envelope.Value.Constraints.MaxWidthCm.Should().Be(300);
        envelope.Value.Constraints.MinHeightCm.Should().Be(30);
        envelope.Value.Constraints.MaxHeightCm.Should().Be(250);
    }

    [Fact]
    public async Task GetDetail_ById_ReturnsSameAsBySlug()
    {
        using var client = _factory.CreateClient();
        var bySlug = await client.GetFromJsonAsync<TestApiResponse<TestDetail>>(
            "/api/v1/catalog/product-types/window", JsonOptions);
        var byId = await client.GetFromJsonAsync<TestApiResponse<TestDetail>>(
            $"/api/v1/catalog/product-types/{bySlug!.Value!.Id}", JsonOptions);

        byId!.IsSuccess.Should().BeTrue();
        byId.Value!.Id.Should().Be(bySlug.Value.Id);
        byId.Value.Constraints.Should().Be(bySlug.Value.Constraints);
    }

    [Theory]
    [InlineData("door", 60, 140, 180, 260)]
    [InlineData("panoramic", 150, 800, 200, 350)]
    [InlineData("balcony", 80, 600, 80, 280)]
    public async Task GetDetail_BySlug_AllSeededProductTypesHaveExpectedRanges(
        string slug, int minW, int maxW, int minH, int maxH)
    {
        using var client = _factory.CreateClient();
        var envelope = await client.GetFromJsonAsync<TestApiResponse<TestDetail>>(
            $"/api/v1/catalog/product-types/{slug}", JsonOptions);
        envelope!.Value!.Constraints!.MinWidthCm.Should().Be(minW);
        envelope.Value.Constraints.MaxWidthCm.Should().Be(maxW);
        envelope.Value.Constraints.MinHeightCm.Should().Be(minH);
        envelope.Value.Constraints.MaxHeightCm.Should().Be(maxH);
    }

    [Fact]
    public async Task GetDetail_UnknownSlug_Returns404()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/catalog/product-types/no-such-slug");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.IsSuccess.Should().BeFalse();
        envelope.Errors[0].Code.Should().Be("productType.notFound");
    }

    [Fact]
    public async Task PostPrice_Door_80x210_Matches_832_61()
    {
        using var client = _factory.CreateClient();
        var door = await client.GetFromJsonAsync<TestApiResponse<TestDetail>>(
            "/api/v1/catalog/product-types/door", JsonOptions);
        var materials = await client.GetFromJsonAsync<TestApiResponse<List<TestMaterial>>>(
            $"/api/v1/catalog/product-types/{door!.Value!.Id}/materials", JsonOptions);
        var doorThermal = materials!.Value!.Single(m => m.Slug == "aluminum-thermal");

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId = door.Value.Id,
            materialId = doorThermal.Id,
            widthCm = 80,
            heightCm = 210,
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<TestBreakdown>>(JsonOptions);
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Value!.TotalDisplay.Should().Be("832.61");
        envelope.Value.TotalMinor.Should().Be(83261);
    }

    [Fact]
    public async Task PostPrice_Door_30x210_Returns400_WithMetadata()
    {
        using var client = _factory.CreateClient();
        var door = await client.GetFromJsonAsync<TestApiResponse<TestDetail>>(
            "/api/v1/catalog/product-types/door", JsonOptions);
        var materials = await client.GetFromJsonAsync<TestApiResponse<List<TestMaterial>>>(
            $"/api/v1/catalog/product-types/{door!.Value!.Id}/materials", JsonOptions);
        var doorThermal = materials!.Value!.Single(m => m.Slug == "aluminum-thermal");

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId = door.Value.Id,
            materialId = doorThermal.Id,
            widthCm = 30,
            heightCm = 210,
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.IsSuccess.Should().BeFalse();
        envelope.Errors[0].Code.Should().Be("configurator.dimensions.widthOutOfRange");
        envelope.Errors[0].Field.Should().Be("widthCm");
        envelope.Errors[0].Metadata.Should().NotBeNull();
        envelope.Errors[0].Metadata!["min"].GetInt32().Should().Be(60);
        envelope.Errors[0].Metadata["max"].GetInt32().Should().Be(140);
        envelope.Errors[0].Metadata["actual"].GetInt32().Should().Be(30);
    }

    private sealed record TestApiResponse<T>(bool IsSuccess, T? Value, List<TestApiError> Errors);

    private sealed record TestApiError(
        string Code,
        string Message,
        string? Field,
        Dictionary<string, System.Text.Json.JsonElement>? Metadata);

    private sealed record TestDetail(Guid Id, string Slug, TestConstraints? Constraints);

    private sealed record TestConstraints(int MinWidthCm, int MaxWidthCm, int MinHeightCm, int MaxHeightCm);

    private sealed record TestMaterial(Guid Id, string Slug);

    private sealed record TestBreakdown(string AreaSqm, long TotalMinor, string TotalDisplay);
}
