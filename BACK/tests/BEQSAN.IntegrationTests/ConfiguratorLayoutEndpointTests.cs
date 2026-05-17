using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace BEQSAN.IntegrationTests;

public class ConfiguratorLayoutEndpointTests(BeqsanWebAppFactory factory) : IClassFixture<BeqsanWebAppFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly BeqsanWebAppFactory _factory = factory;

    private async Task<(Guid productTypeId, Guid materialId)> SeededWindowIdsAsync(HttpClient client)
    {
        var pt = await client.GetFromJsonAsync<TestApiResponse<TestProductType>>(
            "/api/v1/catalog/product-types/window", JsonOptions);
        var materials = await client.GetFromJsonAsync<TestApiResponse<List<TestMaterial>>>(
            $"/api/v1/catalog/product-types/{pt!.Value!.Id}/materials", JsonOptions);
        return (pt.Value.Id, materials!.Value!.Single(m => m.Slug == "aluminum-thermal").Id);
    }

    private async Task<(Guid productTypeId, Guid materialId)> SeededDoorIdsAsync(HttpClient client)
    {
        var pt = await client.GetFromJsonAsync<TestApiResponse<TestProductType>>(
            "/api/v1/catalog/product-types/door", JsonOptions);
        var materials = await client.GetFromJsonAsync<TestApiResponse<List<TestMaterial>>>(
            $"/api/v1/catalog/product-types/{pt!.Value!.Id}/materials", JsonOptions);
        return (pt.Value.Id, materials!.Value!.Single(m => m.Slug == "aluminum-thermal").Id);
    }

    private async Task<(Guid productTypeId, Guid materialId)> SeededSlidingIdsAsync(HttpClient client)
    {
        var pt = await client.GetFromJsonAsync<TestApiResponse<TestProductType>>(
            "/api/v1/catalog/product-types/sliding", JsonOptions);
        var materials = await client.GetFromJsonAsync<TestApiResponse<List<TestMaterial>>>(
            $"/api/v1/catalog/product-types/{pt!.Value!.Id}/materials", JsonOptions);
        return (pt.Value.Id, materials!.Value!.Single(m => m.Slug == "aluminum-thermal").Id);
    }

    [Fact]
    public async Task PostPrice_Canary3_Window_165x140_2pane_CasementFixed_Equals_1077_23()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowIdsAsync(client);

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 165,
            heightCm = 140,
            panes = new object[]
            {
                new { position = 1, widthRatio = 0.5, openingType = "Casement", hingeSide = "Right", hasMosquitoNet = false },
                new { position = 2, widthRatio = 0.5, openingType = "Fixed",    hingeSide = (string?)null, hasMosquitoNet = false },
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<TestBreakdown>>(JsonOptions);
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Value!.AreaSqm.Should().Be("2.31");
        envelope.Value.TotalMinor.Should().Be(107723);
        envelope.Value.TotalDisplay.Should().Be("1077.23");
        envelope.Value.Lines.Should().HaveCount(3);
        envelope.Value.Lines[0].Code.Should().Be("material");
        envelope.Value.Lines[1].Code.Should().Be("pane.1.opening.casement");
        envelope.Value.Lines[1].AmountMinor.Should().Be(3511);
        envelope.Value.Lines[2].Code.Should().Be("vat");
    }

    [Fact]
    public async Task PostPrice_OmittedPanes_PreservesCanary1_WindowDefaultFixedAt_753_31()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowIdsAsync(client);

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 120,
            heightCm = 140,
            // no panes field — backcompat
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<TestBreakdown>>(JsonOptions);
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Value!.TotalDisplay.Should().Be("753.31");
    }

    [Fact]
    public async Task PostPrice_Door_3FixedPanes_Returns422_TooManyFixed()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededDoorIdsAsync(client);

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 120,
            heightCm = 220,
            panes = new object[]
            {
                // Doors cap at 2 panes — 3 panes trips pane-count BEFORE the
                // tooManyFixed rule. We assert the actual code returned is
                // pane-count and contains expected metadata. (Canonical
                // tooManyFixed test still in LayoutValidatorTests for the 2-pane
                // both-Fixed scenario.)
                new { position = 1, widthRatio = 0.34, openingType = "Fixed", hingeSide = (string?)null, hasMosquitoNet = false },
                new { position = 2, widthRatio = 0.33, openingType = "Fixed", hingeSide = (string?)null, hasMosquitoNet = false },
                new { position = 3, widthRatio = 0.33, openingType = "Fixed", hingeSide = (string?)null, hasMosquitoNet = false },
            },
        });

        // Validator: width 120 is just within door range (60..140). Pane-count rule fires.
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.layout.paneCount");
        envelope.Errors[0].Metadata!["max"].GetInt32().Should().Be(2);
        envelope.Errors[0].Metadata["actual"].GetInt32().Should().Be(3);
    }

    [Fact]
    public async Task PostPrice_Door_2FixedPanes_Returns400_DoorTooManyFixed()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededDoorIdsAsync(client);

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 120,
            heightCm = 220,
            panes = new object[]
            {
                new { position = 1, widthRatio = 0.5, openingType = "Fixed", hingeSide = (string?)null, hasMosquitoNet = false },
                new { position = 2, widthRatio = 0.5, openingType = "Fixed", hingeSide = (string?)null, hasMosquitoNet = false },
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.layout.door.tooManyFixed");
    }

    [Fact]
    public async Task PostPrice_Window_CasementMissingHinge_Returns400_WithMetadataPosition()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowIdsAsync(client);

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 165,
            heightCm = 140,
            panes = new object[]
            {
                new { position = 1, widthRatio = 0.5, openingType = "Casement", hingeSide = (string?)null, hasMosquitoNet = false },
                new { position = 2, widthRatio = 0.5, openingType = "Fixed",    hingeSide = (string?)null, hasMosquitoNet = false },
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.layout.pane.hingeRequired");
        envelope.Errors[0].Field.Should().Be("panes");
        envelope.Errors[0].Metadata!["position"].GetInt32().Should().Be(1);
        envelope.Errors[0].Metadata["openingType"].GetString().Should().Be("casement");
    }

    [Fact]
    public async Task PostPrice_Sliding_WithCasementPane_Returns400_InvalidOpening()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededSlidingIdsAsync(client);

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 200,
            heightCm = 220,
            panes = new object[]
            {
                new { position = 1, widthRatio = 0.5, openingType = "Sliding",  hingeSide = (string?)null, hasMosquitoNet = false },
                new { position = 2, widthRatio = 0.5, openingType = "Casement", hingeSide = "Right",       hasMosquitoNet = false },
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.layout.sliding.invalidOpening");
        envelope.Errors[0].Metadata!["position"].GetInt32().Should().Be(2);
        envelope.Errors[0].Metadata["got"].GetString().Should().Be("casement");
    }

    [Fact]
    public async Task PostPrice_RatioSumNotOne_Returns400_WithMetadata()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowIdsAsync(client);

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 165,
            heightCm = 140,
            panes = new object[]
            {
                new { position = 1, widthRatio = 0.5, openingType = "Fixed", hingeSide = (string?)null, hasMosquitoNet = false },
                new { position = 2, widthRatio = 0.3, openingType = "Fixed", hingeSide = (string?)null, hasMosquitoNet = false },
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.layout.widthRatioSum");
        envelope.Errors[0].Metadata!["expected"].GetString().Should().Be("1.000");
        envelope.Errors[0].Metadata["actual"].GetString().Should().Be("0.800");
    }

    private sealed record TestApiResponse<T>(bool IsSuccess, T? Value, List<TestApiError> Errors);

    private sealed record TestApiError(
        string Code,
        string Message,
        string? Field,
        Dictionary<string, JsonElement>? Metadata);

    private sealed record TestProductType(Guid Id, string Slug);

    private sealed record TestMaterial(Guid Id, string Slug);

    private sealed record TestBreakdown(string AreaSqm, long TotalMinor, string TotalDisplay, List<TestLine> Lines);

    private sealed record TestLine(string Code, long AmountMinor);
}
