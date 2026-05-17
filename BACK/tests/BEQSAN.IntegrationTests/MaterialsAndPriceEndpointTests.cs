using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace BEQSAN.IntegrationTests;

public class MaterialsAndPriceEndpointTests(BeqsanWebAppFactory factory) : IClassFixture<BeqsanWebAppFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly BeqsanWebAppFactory _factory = factory;

    private async Task<(Guid window, Guid door, Guid windowAluThermal)> GetSeededIdsAsync(HttpClient client)
    {
        var ptResponse = await client.GetFromJsonAsync<TestApiResponse<List<TestProductType>>>(
            "/api/v1/catalog/product-types", JsonOptions);
        var window = ptResponse!.Value!.Single(p => p.Slug == "window").Id;
        var door = ptResponse.Value.Single(p => p.Slug == "door").Id;

        var matResponse = await client.GetFromJsonAsync<TestApiResponse<List<TestMaterial>>>(
            $"/api/v1/catalog/product-types/{window}/materials", JsonOptions);
        var aluThermal = matResponse!.Value!.Single(m => m.Slug == "aluminum-thermal").Id;

        return (window, door, aluThermal);
    }

    [Fact]
    public async Task GetMaterials_ForWindow_Returns200WithFourItems()
    {
        using var client = _factory.CreateClient();
        var (window, _, _) = await GetSeededIdsAsync(client);

        var response = await client.GetAsync($"/api/v1/catalog/product-types/{window}/materials");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<List<TestMaterial>>>(JsonOptions);
        envelope.Should().NotBeNull();
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Value.Should().HaveCount(4);
        envelope.Value!.Select(m => m.Slug).Should()
            .ContainInOrder("aluminum-thermal", "aluminum-basic", "pvc-white", "pvc-laminated");
        envelope.Value!.Single(m => m.Slug == "aluminum-thermal").BasePricePerSqmMinor.Should().Be(38000);
    }

    [Fact]
    public async Task GetMaterials_UnknownProductType_Returns404WithEnvelope()
    {
        using var client = _factory.CreateClient();
        var unknown = Guid.Parse("00000000-0000-0000-0000-000000000001");

        var response = await client.GetAsync($"/api/v1/catalog/product-types/{unknown}/materials");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.IsSuccess.Should().BeFalse();
        envelope.Errors[0].Code.Should().Be("productType.notFound");
    }

    [Fact]
    public async Task PostPrice_HappyPath_Returns_753_31()
    {
        using var client = _factory.CreateClient();
        var (window, _, mat) = await GetSeededIdsAsync(client);

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId = window,
            materialId = mat,
            widthCm = 120,
            heightCm = 140,
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<TestBreakdown>>(JsonOptions);
        envelope.Should().NotBeNull();
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Value!.AreaSqm.Should().Be("1.68");
        envelope.Value.TotalMinor.Should().Be(75331);
        envelope.Value.TotalDisplay.Should().Be("753.31");
        envelope.Value.Lines.Should().HaveCount(2);
        envelope.Value.Lines[0].Code.Should().Be("material");
        envelope.Value.Lines[0].AmountMinor.Should().Be(63840);
        envelope.Value.Lines[1].Code.Should().Be("vat");
        envelope.Value.Lines[1].AmountMinor.Should().Be(11491);
    }

    [Fact]
    public async Task PostPrice_DimensionsOutOfRange_Returns400()
    {
        using var client = _factory.CreateClient();
        var (window, _, mat) = await GetSeededIdsAsync(client);

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId = window,
            materialId = mat,
            widthCm = 10,
            heightCm = 140,
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.IsSuccess.Should().BeFalse();
        envelope.Errors.Should().NotBeEmpty();
        envelope.Errors[0].Field.Should().Be("widthCm");
    }

    [Fact]
    public async Task PostPrice_MaterialNotInProductType_Returns422()
    {
        using var client = _factory.CreateClient();
        var (_, door, mat) = await GetSeededIdsAsync(client);
        // `mat` is a window material; we're claiming it's a door material → 422.

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId = door,
            materialId = mat,
            widthCm = 120,
            heightCm = 140,
        });

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.IsSuccess.Should().BeFalse();
        envelope.Errors[0].Code.Should().Be("configurator.material.notInProductType");
    }

    [Fact]
    public async Task PostPrice_UnknownProductType_Returns404()
    {
        using var client = _factory.CreateClient();
        var (_, _, mat) = await GetSeededIdsAsync(client);

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            materialId = mat,
            widthCm = 120,
            heightCm = 140,
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.IsSuccess.Should().BeFalse();
        envelope.Errors[0].Code.Should().Be("productType.notFound");
    }

    private sealed record TestApiResponse<T>(bool IsSuccess, T? Value, List<TestApiError> Errors);

    private sealed record TestApiError(string Code, string Message, string? Field);

    private sealed record TestProductType(Guid Id, string Slug);

    private sealed record TestMaterial(
        Guid Id,
        Guid ProductTypeId,
        string Slug,
        string Family,
        string ThermalRating,
        long BasePricePerSqmMinor,
        string BasePricePerSqmDisplay,
        string Currency,
        int SortOrder);

    private sealed record TestBreakdown(
        string AreaSqm,
        List<TestPriceLine> Lines,
        long TotalMinor,
        string TotalDisplay,
        string Currency);

    private sealed record TestPriceLine(string Code, string Label, long AmountMinor, string AmountDisplay, string Currency);
}
