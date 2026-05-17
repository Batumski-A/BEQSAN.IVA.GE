using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace BEQSAN.IntegrationTests;

/// <summary>
/// Step-7 HTTP coverage — three accessory list endpoints + canary #6 +
/// the validator's negative paths flowing through the price endpoint.
/// </summary>
public class AccessoryEndpointTests(BeqsanWebAppFactory factory) : IClassFixture<BeqsanWebAppFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly BeqsanWebAppFactory _factory = factory;

    private async Task<(Guid Pt, Guid Mat)> SeededWindowAluThermalAsync(HttpClient c)
    {
        var pt = await c.GetFromJsonAsync<Env<TestPt>>("/api/v1/catalog/product-types/window", JsonOptions);
        var mats = await c.GetFromJsonAsync<Env<List<TestMat>>>(
            $"/api/v1/catalog/product-types/{pt!.Value!.Id}/materials", JsonOptions);
        return (pt.Value.Id, mats!.Value!.Single(m => m.Slug == "aluminum-thermal").Id);
    }

    private async Task<(Guid Pt, Guid Mat)> SeededDoorAluThermalAsync(HttpClient c)
    {
        var pt = await c.GetFromJsonAsync<Env<TestPt>>("/api/v1/catalog/product-types/door", JsonOptions);
        var mats = await c.GetFromJsonAsync<Env<List<TestMat>>>(
            $"/api/v1/catalog/product-types/{pt!.Value!.Id}/materials", JsonOptions);
        return (pt.Value.Id, mats!.Value!.Single(m => m.Slug == "aluminum-thermal").Id);
    }

    [Fact]
    public async Task GetHandleStyles_Window_AluThermal_Returns_4_Items()
    {
        using var c = _factory.CreateClient();
        var (_, mat) = await SeededWindowAluThermalAsync(c);
        var resp = await c.GetFromJsonAsync<Env<List<TestHandle>>>(
            $"/api/v1/catalog/materials/{mat}/handle-styles", JsonOptions);
        resp!.Value!.Should().HaveCount(4);
        resp.Value.Should().Contain(h => h.Slug == "premium-secustic");
    }

    [Fact]
    public async Task GetHandleStyles_Window_PvcWhite_Excludes_Premium()
    {
        using var c = _factory.CreateClient();
        var pt = await c.GetFromJsonAsync<Env<TestPt>>("/api/v1/catalog/product-types/window", JsonOptions);
        var mats = await c.GetFromJsonAsync<Env<List<TestMat>>>(
            $"/api/v1/catalog/product-types/{pt!.Value!.Id}/materials", JsonOptions);
        var pvc = mats!.Value!.Single(m => m.Slug == "pvc-white").Id;
        var resp = await c.GetFromJsonAsync<Env<List<TestHandle>>>(
            $"/api/v1/catalog/materials/{pvc}/handle-styles", JsonOptions);
        resp!.Value!.Should().HaveCount(3);
        resp.Value.Should().NotContain(h => h.Slug == "premium-secustic");
    }

    [Fact]
    public async Task GetLockTypes_Door_Includes_SmartFingerprint()
    {
        using var c = _factory.CreateClient();
        var (pt, _) = await SeededDoorAluThermalAsync(c);
        var resp = await c.GetFromJsonAsync<Env<List<TestLock>>>(
            $"/api/v1/catalog/product-types/{pt}/lock-types", JsonOptions);
        resp!.Value!.Should().HaveCount(4);
        resp.Value.Should().Contain(l => l.Slug == "smart-fingerprint");
    }

    [Fact]
    public async Task GetLockTypes_Window_Excludes_SmartFingerprint()
    {
        using var c = _factory.CreateClient();
        var (pt, _) = await SeededWindowAluThermalAsync(c);
        var resp = await c.GetFromJsonAsync<Env<List<TestLock>>>(
            $"/api/v1/catalog/product-types/{pt}/lock-types", JsonOptions);
        resp!.Value!.Should().HaveCount(3);
        resp.Value.Should().NotContain(l => l.Slug == "smart-fingerprint");
    }

    [Fact]
    public async Task GetBlindTypes_Door_OnlyInternal()
    {
        using var c = _factory.CreateClient();
        var (pt, _) = await SeededDoorAluThermalAsync(c);
        var resp = await c.GetFromJsonAsync<Env<List<TestBlind>>>(
            $"/api/v1/catalog/product-types/{pt}/blind-types", JsonOptions);
        resp!.Value!.Should().HaveCount(2);
        resp.Value.Should().OnlyContain(b => b.Slug.StartsWith("internal-", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GetBlindTypes_Window_AllFour()
    {
        using var c = _factory.CreateClient();
        var (pt, _) = await SeededWindowAluThermalAsync(c);
        var resp = await c.GetFromJsonAsync<Env<List<TestBlind>>>(
            $"/api/v1/catalog/product-types/{pt}/blind-types", JsonOptions);
        resp!.Value!.Should().HaveCount(4);
    }

    [Fact]
    public async Task GetHandleStyles_UnknownMaterial_Returns404()
    {
        using var c = _factory.CreateClient();
        var resp = await c.GetAsync($"/api/v1/catalog/materials/{Guid.NewGuid()}/handle-styles");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PostPrice_Canary6_Window_Full_Accessories_Equals_2333_17()
    {
        using var c = _factory.CreateClient();
        var (pt, mat) = await SeededWindowAluThermalAsync(c);

        var glass = await c.GetFromJsonAsync<Env<List<TestGlass>>>(
            $"/api/v1/catalog/materials/{mat}/glass-types", JsonOptions);
        var tripleId = glass!.Value!.Single(g => g.Slug == "triple-low-e").Id;

        var colors = await c.GetFromJsonAsync<Env<List<TestColor>>>(
            $"/api/v1/catalog/materials/{mat}/colors", JsonOptions);
        var anthraciteId = colors!.Value!.Single(co => co.Slug == "anthracite-ral7016").Id;

        var handles = await c.GetFromJsonAsync<Env<List<TestHandle>>>(
            $"/api/v1/catalog/materials/{mat}/handle-styles", JsonOptions);
        var modernId = handles!.Value!.Single(h => h.Slug == "modern-aluminum").Id;

        var locks = await c.GetFromJsonAsync<Env<List<TestLock>>>(
            $"/api/v1/catalog/product-types/{pt}/lock-types", JsonOptions);
        var multi3Id = locks!.Value!.Single(l => l.Slug == "multi-point-3").Id;

        var blinds = await c.GetFromJsonAsync<Env<List<TestBlind>>>(
            $"/api/v1/catalog/product-types/{pt}/blind-types", JsonOptions);
        var blindId = blinds!.Value!.Single(b => b.Slug == "external-aluminum-electric").Id;

        var response = await c.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId = pt,
            materialId = mat,
            widthCm = 165,
            heightCm = 140,
            panes = new object[]
            {
                new
                {
                    position = 1, widthRatio = 0.5,
                    openingType = "Casement", hingeSide = "Right",
                    hasMosquitoNet = false,
                    glassTypeId = tripleId, glassExtras = new[] { "Tempered" },
                },
                new
                {
                    position = 2, widthRatio = 0.5,
                    openingType = "Fixed", hingeSide = (string?)null,
                    hasMosquitoNet = false,
                    glassTypeId = tripleId, glassExtras = Array.Empty<string>(),
                },
            },
            color = new { outerColorOptionId = anthraciteId },
            accessories = new
            {
                handleStyleId = modernId,
                lockTypeId = multi3Id,
                sill = new { position = "Outer" },
                blind = new { blindTypeId = blindId, control = "Electric" },
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<Env<TestBreakdown>>(JsonOptions);
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Value!.TotalMinor.Should().Be(233_317L);
        envelope.Value.TotalDisplay.Should().Be("2333.17");
        envelope.Value.Lines.Should().Contain(l => l.Code == "accessory.handle.modern-aluminum" && l.AmountMinor == 4_500L);
        envelope.Value.Lines.Should().Contain(l => l.Code == "accessory.lock.multi-point-3" && l.AmountMinor == 9_000L);
        envelope.Value.Lines.Should().Contain(l => l.Code == "accessory.sill.outer" && l.AmountMinor == 13_200L);
        envelope.Value.Lines.Should().Contain(l => l.Code == "accessory.blind.external-aluminum-electric" && l.AmountMinor == 50_290L);
    }

    [Fact]
    public async Task PostPrice_Door_WithoutLock_Returns400_WithReasonDoor()
    {
        using var c = _factory.CreateClient();
        var (pt, mat) = await SeededDoorAluThermalAsync(c);
        var handles = await c.GetFromJsonAsync<Env<List<TestHandle>>>(
            $"/api/v1/catalog/materials/{mat}/handle-styles", JsonOptions);
        var modernId = handles!.Value!.Single(h => h.Slug == "modern-aluminum").Id;

        var response = await c.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId = pt,
            materialId = mat,
            widthCm = 100,
            heightCm = 220,
            panes = new object[]
            {
                new
                {
                    position = 1, widthRatio = 1.0,
                    openingType = "Casement", hingeSide = "Right",
                    hasMosquitoNet = false,
                },
            },
            accessories = new
            {
                handleStyleId = modernId,
                // lockTypeId omitted → lockRequired
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var envelope = await response.Content.ReadFromJsonAsync<Env<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.accessory.lockRequired");
        envelope.Errors[0].Metadata!["reason"].GetString().Should().Be("door");
    }

    [Fact]
    public async Task PostPrice_SmartLock_OnWindow_Returns422_LockNotCompatibleProduct()
    {
        using var c = _factory.CreateClient();
        var (winPt, winMat) = await SeededWindowAluThermalAsync(c);
        var (doorPt, _) = await SeededDoorAluThermalAsync(c);
        var doorLocks = await c.GetFromJsonAsync<Env<List<TestLock>>>(
            $"/api/v1/catalog/product-types/{doorPt}/lock-types", JsonOptions);
        var smartId = doorLocks!.Value!.Single(l => l.Slug == "smart-fingerprint").Id;

        var response = await c.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId = winPt,
            materialId = winMat,
            widthCm = 120, heightCm = 140,
            panes = new object[]
            {
                new
                {
                    position = 1, widthRatio = 1.0,
                    openingType = "Casement", hingeSide = "Right",
                    hasMosquitoNet = false,
                },
            },
            accessories = new { lockTypeId = smartId },
        });

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var envelope = await response.Content.ReadFromJsonAsync<Env<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.accessory.lockNotCompatibleProduct");
        envelope.Errors[0].Metadata!["productTypeSlug"].GetString().Should().Be("window");
        envelope.Errors[0].Metadata["lockSlug"].GetString().Should().Be("smart-fingerprint");
    }

    [Fact]
    public async Task PostPrice_MultiPointLock_OnTiltOnly_Returns422_LockRequiresFullOpening()
    {
        using var c = _factory.CreateClient();
        var (pt, mat) = await SeededWindowAluThermalAsync(c);
        var locks = await c.GetFromJsonAsync<Env<List<TestLock>>>(
            $"/api/v1/catalog/product-types/{pt}/lock-types", JsonOptions);
        var multi3 = locks!.Value!.Single(l => l.Slug == "multi-point-3").Id;

        var response = await c.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId = pt,
            materialId = mat,
            widthCm = 120, heightCm = 140,
            panes = new object[]
            {
                new
                {
                    position = 1, widthRatio = 1.0,
                    openingType = "Tilt", hingeSide = (string?)null,
                    hasMosquitoNet = false,
                },
            },
            accessories = new { lockTypeId = multi3 },
        });

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var envelope = await response.Content.ReadFromJsonAsync<Env<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.accessory.lockRequiresFullOpening");
        envelope.Errors[0].Metadata!["lockSlug"].GetString().Should().Be("multi-point-3");
    }

    [Fact]
    public async Task PostPrice_NoAccessories_Canary1_StillEquals_753_31()
    {
        using var c = _factory.CreateClient();
        var (pt, mat) = await SeededWindowAluThermalAsync(c);
        var response = await c.PostAsJsonAsync("/api/v1/configurator/price", new
        {
            productTypeId = pt, materialId = mat,
            widthCm = 120, heightCm = 140,
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<Env<TestBreakdown>>(JsonOptions);
        envelope!.Value!.TotalDisplay.Should().Be("753.31");
    }

    private sealed record Env<T>(bool IsSuccess, T? Value, List<EnvErr> Errors);
    private sealed record EnvErr(string Code, string Message, string? Field, Dictionary<string, JsonElement>? Metadata);
    private sealed record TestPt(Guid Id, string Slug);
    private sealed record TestMat(Guid Id, string Slug);
    private sealed record TestGlass(Guid Id, string Slug);
    private sealed record TestColor(Guid Id, string Slug);
    private sealed record TestHandle(Guid Id, string Slug, string Family);
    private sealed record TestLock(Guid Id, string Slug, string Grade);
    private sealed record TestBlind(Guid Id, string Slug, string Placement, bool SupportsElectric);
    private sealed record TestBreakdown(string AreaSqm, long TotalMinor, string TotalDisplay, List<TestLine> Lines);
    private sealed record TestLine(string Code, long AmountMinor);
}
