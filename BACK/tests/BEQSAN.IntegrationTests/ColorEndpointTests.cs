using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace BEQSAN.IntegrationTests;

/// <summary>
/// Step-6 HTTP coverage — colors-by-material listing + the
/// /configurator/price endpoint's new color code paths (canary #5,
/// dual-color happy/refusal, RAL custom validation matrix, backcompat).
/// </summary>
public class ColorEndpointTests(BeqsanWebAppFactory factory) : IClassFixture<BeqsanWebAppFactory>
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

    private async Task<(Guid productTypeId, Guid materialId)> SeededWindowPvcLaminatedAsync(HttpClient client)
    {
        var pt = await client.GetFromJsonAsync<TestApiResponse<TestProductType>>(
            "/api/v1/catalog/product-types/window", JsonOptions);
        var materials = await client.GetFromJsonAsync<TestApiResponse<List<TestMaterial>>>(
            $"/api/v1/catalog/product-types/{pt!.Value!.Id}/materials", JsonOptions);
        return (pt.Value.Id, materials!.Value!.Single(m => m.Slug == "pvc-laminated").Id);
    }

    private async Task<List<TestColor>> ColorsForAsync(HttpClient client, Guid materialId)
    {
        var resp = await client.GetFromJsonAsync<TestApiResponse<List<TestColor>>>(
            $"/api/v1/catalog/materials/{materialId}/colors", JsonOptions);
        return resp!.Value!;
    }

    private async Task<Guid> GlassIdAsync(HttpClient client, Guid materialId, string slug)
    {
        var resp = await client.GetFromJsonAsync<TestApiResponse<List<TestGlass>>>(
            $"/api/v1/catalog/materials/{materialId}/glass-types", JsonOptions);
        return resp!.Value!.Single(g => g.Slug == slug).Id;
    }

    [Fact]
    public async Task GetColors_AluminumThermal_ReturnsCompatList_DefaultFirst_ExcludesRalCustom()
    {
        using var client = _factory.CreateClient();
        var (_, matId) = await SeededWindowAluThermalAsync(client);

        var colors = await ColorsForAsync(client, matId);

        colors.Should().NotBeEmpty();
        colors[0].IsDefault.Should().BeTrue();
        colors[0].Slug.Should().Be("white-ral9016");
        colors.Should().NotContain(c => c.Slug == "ral-custom");
        // Should include premium colors.
        colors.Should().Contain(c => c.Slug == "anthracite-ral7016");
        // Should NOT include wood laminates (aluminum has no wood compat).
        colors.Should().NotContain(c => c.Slug.EndsWith("-laminate", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GetColors_PvcLaminated_IncludesWoodLaminates_ExcludesAluminumPremium()
    {
        using var client = _factory.CreateClient();
        var (_, matId) = await SeededWindowPvcLaminatedAsync(client);

        var colors = await ColorsForAsync(client, matId);

        colors.Should().Contain(c => c.Slug == "oak-laminate");
        colors.Should().Contain(c => c.Slug == "walnut-laminate");
        // Aluminum-specific premium colors are not in the PVC compat set.
        colors.Should().NotContain(c => c.Slug == "anthracite-ral7016");
        colors.Should().NotContain(c => c.Slug == "ral-custom");
    }

    [Fact]
    public async Task GetColors_UnknownMaterial_Returns404()
    {
        using var client = _factory.CreateClient();
        var resp = await client.GetAsync(
            $"/api/v1/catalog/materials/{Guid.NewGuid()}/colors");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PostPrice_Canary5_Window_165x140_TripleLowE_Tempered_Plus_Anthracite_Equals_1424_68()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowAluThermalAsync(client);
        var tripleLowEId = await GlassIdAsync(client, materialId, "triple-low-e");
        var colors = await ColorsForAsync(client, materialId);
        var anthraciteId = colors.Single(c => c.Slug == "anthracite-ral7016").Id;

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
            color = new
            {
                outerColorOptionId = anthraciteId,
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<TestBreakdown>>(JsonOptions);
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Value!.TotalMinor.Should().Be(142468L);
        envelope.Value.TotalDisplay.Should().Be("1424.68");
        envelope.Value.Lines.Should().Contain(l => l.Code == "color.outer.anthracite-ral7016" && l.AmountMinor == 7500L);
    }

    [Fact]
    public async Task PostPrice_NoColorField_Canary1_StillEquals_753_31()
    {
        // Backcompat: omitted `color` → server resolves white default
        // (surcharge 0) and the canary holds.
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
    public async Task PostPrice_DualColorOnAluminum_Returns422_DualOnlyOnPvc()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowAluThermalAsync(client);
        var colors = await ColorsForAsync(client, materialId);
        var whiteId = colors.Single(c => c.Slug == "white-ral9016").Id;
        var anthraciteId = colors.Single(c => c.Slug == "anthracite-ral7016").Id;

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 120,
            heightCm = 140,
            color = new
            {
                outerColorOptionId = anthraciteId,
                innerColorOptionId = whiteId,
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.color.dualOnlyOnPvc");
    }

    [Fact]
    public async Task PostPrice_DualColorOnPvc_AddsInnerLine_At60Percent()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowPvcLaminatedAsync(client);
        var colors = await ColorsForAsync(client, materialId);
        var whiteId = colors.Single(c => c.Slug == "white-ral9016").Id;
        var oakId = colors.Single(c => c.Slug == "oak-laminate").Id;

        // Outer = oak (18000), inner = oak (18000) → equals outer, inner line
        // suppressed. To exercise the dual line, pair outer=white with
        // inner=oak (so 60% of 18000 = 10800).
        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 120,
            heightCm = 140,
            color = new
            {
                outerColorOptionId = whiteId,
                innerColorOptionId = oakId,
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<TestBreakdown>>(JsonOptions);
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Value!.Lines.Should().Contain(l => l.Code == "color.inner.oak-laminate" && l.AmountMinor == 10800L);
    }

    [Fact]
    public async Task PostPrice_RalCustomWithoutHexCode_Returns400()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowAluThermalAsync(client);
        // ral-custom isn't exposed in the public list — pull it via a fresh price call
        // that would otherwise succeed if we provided the hex+code. We need the id;
        // the most direct path is to read seeded id-from-slug via the domain reader's
        // wrapping endpoint, but for the test we recompute the deterministic id.
        var ralCustomId = DeterministicCatalogGuid("ral-custom");

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 120,
            heightCm = 140,
            color = new
            {
                outerColorOptionId = ralCustomId,
                // hex + code omitted
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.color.ralCustomMissing");
    }

    [Fact]
    public async Task PostPrice_RalCustomBadHex_Returns400_WithGotMetadata()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowAluThermalAsync(client);
        var ralCustomId = DeterministicCatalogGuid("ral-custom");

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 120,
            heightCm = 140,
            color = new
            {
                outerColorOptionId = ralCustomId,
                customRalHex = "not-a-hex",
                customRalCode = "RAL 9016",
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.color.ralCustomHexInvalid");
        envelope.Errors[0].Metadata!["got"].GetString().Should().Be("not-a-hex");
    }

    [Fact]
    public async Task PostPrice_RalCustom_HappyPath_AppliesPlaceholderSurcharge()
    {
        using var client = _factory.CreateClient();
        var (productTypeId, materialId) = await SeededWindowAluThermalAsync(client);
        var ralCustomId = DeterministicCatalogGuid("ral-custom");

        var response = await client.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId,
            materialId,
            widthCm = 120,
            heightCm = 140,
            color = new
            {
                outerColorOptionId = ralCustomId,
                customRalHex = "#27352A",
                customRalCode = "RAL 6009",
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<TestApiResponse<TestBreakdown>>(JsonOptions);
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Value!.Lines.Should().Contain(l => l.Code == "color.outer.ral-custom" && l.AmountMinor == 25000L);
    }

    /// <summary>
    /// Recomputes the deterministic GUID the seeder builds for ral-custom.
    /// Mirrors the SHA-1-based UUIDv5 transform used in ColorOptionSeeder.
    /// </summary>
    private static Guid DeterministicCatalogGuid(string slug)
    {
        var input = System.Text.Encoding.UTF8.GetBytes("BEQSAN-CATALOG-2026:color-option:" + slug);
#pragma warning disable CA5350
        var hash = System.Security.Cryptography.SHA1.HashData(input);
#pragma warning restore CA5350
        var bytes = new byte[16];
        Array.Copy(hash, bytes, 16);
        bytes[6] = (byte)((bytes[6] & 0x0F) | 0x50);
        bytes[8] = (byte)((bytes[8] & 0x3F) | 0x80);
        return new Guid(bytes);
    }

    private sealed record TestApiResponse<T>(bool IsSuccess, T? Value, List<TestApiError> Errors);

    private sealed record TestApiError(
        string Code,
        string Message,
        string? Field,
        Dictionary<string, JsonElement>? Metadata);

    private sealed record TestProductType(Guid Id, string Slug);

    private sealed record TestMaterial(Guid Id, string Slug);

    private sealed record TestColor(Guid Id, string Slug, string Family, int SurchargeMinor, bool IsDefault);

    private sealed record TestGlass(Guid Id, string Slug);

    private sealed record TestBreakdown(string AreaSqm, long TotalMinor, string TotalDisplay, List<TestLine> Lines);

    private sealed record TestLine(string Code, long AmountMinor);
}
