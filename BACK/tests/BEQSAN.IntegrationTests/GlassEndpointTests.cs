using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace BEQSAN.IntegrationTests;

/// <summary>
/// Step-5 HTTP coverage — glass-types listing per material + the
/// /configurator/price endpoint's new glass code paths (canary #4,
/// glass-not-compatible, frosted/tinted conflict, backcompat for the
/// glass-omitted request shape).
/// </summary>
public class GlassEndpointTests(BeqsanWebAppFactory factory) : IClassFixture<BeqsanWebAppFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly BeqsanWebAppFactory _factory = factory;

    private async Task<(Guid productTypeId, Guid materialId)> SeededWindowAluThermalAsync(HttpClient client)
    {
        var pt = await client.GetFromJsonAsync<TestApiResponse<TestProductType>>(
            "/api/v1/catalog/product-types/window", JsonOptions);
        var materials = await client.GetFromJsonAsync<TestApiResponse<List<TestMaterial>>>(
            $"/api/v1/catalog/product-types/{pt!.Value!.Id}/materials", JsonOptions);
        return (pt.Value.Id, materials!.Value!.Single(m => m.Slug == "aluminum-thermal").Id);
    }

    private async Task<(Guid productTypeId, Guid materialId)> SeededPvcWhiteAsync(HttpClient client)
    {
        var pt = await client.GetFromJsonAsync<TestApiResponse<TestProductType>>(
            "/api/v1/catalog/product-types/window", JsonOptions);
        var materials = await client.GetFromJsonAsync<TestApiResponse<List<TestMaterial>>>(
            $"/api/v1/catalog/product-types/{pt!.Value!.Id}/materials", JsonOptions);
        return (pt.Value.Id, materials!.Value!.Single(m => m.Slug == "pvc-white").Id);
    }

    private async Task<List<TestGlassType>> GlassTypesForAsync(HttpClient client, Guid materialId)
    {
        var resp = await client.GetFromJsonAsync<TestApiResponse<List<TestGlassType>>>(
            $"/api/v1/catalog/materials/{materialId}/glass-types", JsonOptions);
        return resp!.Value!;
    }

    [Fact]
    public async Task GetGlassTypes_AluminumThermal_Returns7_DefaultFirst()
    {
        using var client = _factory.CreateClient();
        var (_, matId) = await SeededWindowAluThermalAsync(client);

        var glassTypes = await GlassTypesForAsync(client, matId);

        glassTypes.Should().HaveCount(7);
        glassTypes[0].IsDefault.Should().BeTrue();
        glassTypes[0].Slug.Should().Be("double-standard");
        glassTypes.Count(g => g.IsDefault).Should().Be(1);
        glassTypes.Should().Contain(g => g.Slug == "quadruple-low-e");
    }

    [Fact]
    public async Task GetGlassTypes_PvcWhite_ExcludesTripleAndQuadrupleLowE()
    {
        using var client = _factory.CreateClient();
        var (_, matId) = await SeededPvcWhiteAsync(client);

        var glassTypes = await GlassTypesForAsync(client, matId);

        glassTypes.Should().HaveCount(4);
        glassTypes.Select(g => g.Slug).Should().BeEquivalentTo(
            new[] { "double-standard", "double-low-e", "tempered-double", "frosted-double" });
        glassTypes.Should().NotContain(g => g.Slug.StartsWith("triple", StringComparison.Ordinal));
        glassTypes.Should().NotContain(g => g.Slug.StartsWith("quadruple", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GetGlassTypes_UnknownMaterial_Returns404()
    {
        using var client = _factory.CreateClient();
        var resp = await client.GetAsync(
            $"/api/v1/catalog/materials/{Guid.NewGuid()}/glass-types");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PostPrice_Canary4_Window_165x140_TripleLowEPlusTempered_Equals_1336_18()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowAluThermalAsync(client);
        var glass = await GlassTypesForAsync(client, materialId);
        var tripleLowEId = glass.Single(g => g.Slug == "triple-low-e").Id;

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 165,
            heightCm = 140,
            panes = new object[]
            {
                new
                {
                    position = 1,
                    widthRatio = 0.5,
                    openingType = "Casement",
                    hingeSide = "Right",
                    hasMosquitoNet = false,
                    glassTypeId = tripleLowEId,
                    glassExtras = new[] { "Tempered" },
                },
                new
                {
                    position = 2,
                    widthRatio = 0.5,
                    openingType = "Fixed",
                    hingeSide = (string?)null,
                    hasMosquitoNet = false,
                    glassTypeId = tripleLowEId,
                    glassExtras = Array.Empty<string>(),
                },
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<TestBreakdown>>(JsonOptions);
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Value!.TotalMinor.Should().Be(133618L);
        envelope.Value.TotalDisplay.Should().Be("1336.18");
        envelope.Value.Lines.Should().Contain(l => l.Code == "pane.1.glass.triple-low-e" && l.AmountMinor == 6930L);
        envelope.Value.Lines.Should().Contain(l => l.Code == "pane.1.glass.extra.tempered" && l.AmountMinor == 8085L);
    }

    [Fact]
    public async Task PostPrice_NoGlass_Canary1_StillEquals_753_31()
    {
        // Backcompat: Step-1/2 shape (no panes, no glass) gets the default
        // glass auto-resolved and the canary holds.
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowAluThermalAsync(client);

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 120,
            heightCm = 140,
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<TestBreakdown>>(JsonOptions);
        envelope!.Value!.TotalDisplay.Should().Be("753.31");
    }

    [Fact]
    public async Task PostPrice_FrostedAndTintedSamePane_Returns400_WithPosition()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowAluThermalAsync(client);
        var glass = await GlassTypesForAsync(client, materialId);
        var defaultId = glass.Single(g => g.IsDefault).Id;

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 120,
            heightCm = 140,
            panes = new[]
            {
                new
                {
                    position = 1,
                    widthRatio = 1.0,
                    openingType = "Fixed",
                    hingeSide = (string?)null,
                    hasMosquitoNet = false,
                    glassTypeId = defaultId,
                    glassExtras = new[] { "Frosted", "Tinted" },
                },
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.glass.frostedTintedConflict");
        envelope.Errors[0].Metadata!["position"].GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task PostPrice_QuadrupleLowE_OnPvcWhite_Returns422_NotCompatible()
    {
        using var client = _factory.CreateClient();
        var (aluProductTypeId, aluMatId) = await SeededWindowAluThermalAsync(client);
        var aluGlass = await GlassTypesForAsync(client, aluMatId);
        var quadrupleId = aluGlass.Single(g => g.Slug == "quadruple-low-e").Id;

        var (productTypeId, pvcMatId) = await SeededPvcWhiteAsync(client);
        _ = aluProductTypeId; // alu material was used only to look up quadruple's id

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId = pvcMatId,
            widthCm = 120,
            heightCm = 140,
            panes = new[]
            {
                new
                {
                    position = 1,
                    widthRatio = 1.0,
                    openingType = "Fixed",
                    hingeSide = (string?)null,
                    hasMosquitoNet = false,
                    glassTypeId = quadrupleId,
                    glassExtras = Array.Empty<string>(),
                },
            },
        });

        // BusinessRule maps to 422 Unprocessable Entity per result-envelope contract.
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.glass.notCompatibleWithMaterial");
        envelope.Errors[0].Metadata!["position"].GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task PostPrice_InvalidGlassExtraToken_Returns400_WithPosition_AndGot()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowAluThermalAsync(client);
        var glass = await GlassTypesForAsync(client, materialId);
        var defaultId = glass.Single(g => g.IsDefault).Id;

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 120,
            heightCm = 140,
            panes = new[]
            {
                new
                {
                    position = 1,
                    widthRatio = 1.0,
                    openingType = "Fixed",
                    hingeSide = (string?)null,
                    hasMosquitoNet = false,
                    glassTypeId = defaultId,
                    glassExtras = new[] { "Sparkly" }, // not a real extra
                },
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private sealed record TestApiResponse<T>(bool IsSuccess, T? Value, List<TestApiError> Errors);

    private sealed record TestApiError(
        string Code,
        string Message,
        string? Field,
        Dictionary<string, JsonElement>? Metadata);

    private sealed record TestProductType(Guid Id, string Slug);

    private sealed record TestMaterial(Guid Id, string Slug);

    private sealed record TestGlassType(Guid Id, string Slug, int PaneCount, int SurchargePerSqmMinor, bool IsDefault);

    private sealed record TestBreakdown(string AreaSqm, long TotalMinor, string TotalDisplay, List<TestLine> Lines);

    private sealed record TestLine(string Code, long AmountMinor);
}
