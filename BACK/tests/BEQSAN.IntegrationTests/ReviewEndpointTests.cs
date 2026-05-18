using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace BEQSAN.IntegrationTests;

/// <summary>
/// Step-8 HTTP coverage — POST /v1/configurator/review with grouped
/// pricing + delivery info. Canary #7 (Imereti = 2 592.77 ₾) +
/// canary #7b (Batumi = 2 333.17 ₾ = canary #6 byte-for-byte) +
/// manual-quote flag + error-propagation smoke.
/// </summary>
public class ReviewEndpointTests(BeqsanWebAppFactory factory) : IClassFixture<BeqsanWebAppFactory>
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

    private async Task<object> Canary6BodyAsync(HttpClient c, Guid pt, Guid mat)
    {
        var glass = await c.GetFromJsonAsync<Env<List<TestSlug>>>(
            $"/api/v1/catalog/materials/{mat}/glass-types", JsonOptions);
        var tripleId = glass!.Value!.Single(g => g.Slug == "triple-low-e").Id;

        var colors = await c.GetFromJsonAsync<Env<List<TestSlug>>>(
            $"/api/v1/catalog/materials/{mat}/colors", JsonOptions);
        var anthraciteId = colors!.Value!.Single(co => co.Slug == "anthracite-ral7016").Id;

        var handles = await c.GetFromJsonAsync<Env<List<TestSlug>>>(
            $"/api/v1/catalog/materials/{mat}/handle-styles", JsonOptions);
        var modernId = handles!.Value!.Single(h => h.Slug == "modern-aluminum").Id;

        var locks = await c.GetFromJsonAsync<Env<List<TestSlug>>>(
            $"/api/v1/catalog/product-types/{pt}/lock-types", JsonOptions);
        var multi3Id = locks!.Value!.Single(l => l.Slug == "multi-point-3").Id;

        var blinds = await c.GetFromJsonAsync<Env<List<TestSlug>>>(
            $"/api/v1/catalog/product-types/{pt}/blind-types", JsonOptions);
        var blindId = blinds!.Value!.Single(b => b.Slug == "external-aluminum-electric").Id;

        return new
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
        };
    }

    [Fact]
    public async Task PostReview_Canary7_Imereti_GrandTotal_2592_77_WithGroupedBreakdown()
    {
        using var c = _factory.CreateClient();
        var (pt, mat) = await SeededWindowAluThermalAsync(c);
        var body = await Canary6BodyAsync(c, pt, mat);
        var bodyWithInstall = MergeInstallation(body, "Imereti", cityHint: null);

        var response = await c.PostAsJsonAsync("/api/v1/configurator/review", bodyWithInstall);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<Env<TestReview>>(JsonOptions);
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Value!.Pricing.Grouped.GrandTotalMinor.Should().Be(259_277L);
        envelope.Value.Pricing.Grouped.GrandTotalDisplay.Should().Be("2592.77");
        envelope.Value.Pricing.Grouped.Installation.TotalMinor.Should().Be(22_000L);
        envelope.Value.Pricing.Grouped.InstallationIsManualQuote.Should().BeFalse();
        envelope.Value.Pricing.Flat.TotalMinor.Should().Be(259_277L);
    }

    [Fact]
    public async Task PostReview_Canary7b_Batumi_GrandTotal_Equals_Canary6_ByteForByte()
    {
        using var c = _factory.CreateClient();
        var (pt, mat) = await SeededWindowAluThermalAsync(c);
        var body = await Canary6BodyAsync(c, pt, mat);
        var bodyWithInstall = MergeInstallation(body, "Batumi", cityHint: null);

        var response = await c.PostAsJsonAsync("/api/v1/configurator/review", bodyWithInstall);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<Env<TestReview>>(JsonOptions);
        envelope!.Value!.Pricing.Grouped.GrandTotalMinor.Should().Be(233_317L);
        envelope.Value.Pricing.Grouped.Installation.TotalMinor.Should().Be(0L);
        envelope.Value.Pricing.Grouped.Installation.Lines.Should().BeEmpty();
    }

    [Fact]
    public async Task PostReview_OtherRegion_FlagsManualQuote_WithZeroLine()
    {
        using var c = _factory.CreateClient();
        var (pt, mat) = await SeededWindowAluThermalAsync(c);
        var response = await c.PostAsJsonAsync("/api/v1/configurator/review", new
        {
            productTypeId = pt, materialId = mat,
            widthCm = 120, heightCm = 140,
            installation = new { region = "Other", cityHint = "ანასეული, გურია" },
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<Env<TestReview>>(JsonOptions);
        envelope!.Value!.Pricing.Grouped.InstallationIsManualQuote.Should().BeTrue();
        envelope.Value.Pricing.Grouped.Installation.TotalMinor.Should().Be(0L);
        envelope.Value.Pricing.Grouped.Installation.Lines.Should().ContainSingle(l => l.Code == "installation.manual-quote");
    }

    [Fact]
    public async Task PostReview_NoInstallation_DefaultsToBatumi_WindowLeadTime()
    {
        using var c = _factory.CreateClient();
        var (pt, mat) = await SeededWindowAluThermalAsync(c);
        var response = await c.PostAsJsonAsync("/api/v1/configurator/review", new
        {
            productTypeId = pt, materialId = mat,
            widthCm = 120, heightCm = 140,
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var envelope = await response.Content.ReadFromJsonAsync<Env<TestReview>>(JsonOptions);
        envelope!.Value!.Pricing.Grouped.GrandTotalDisplay.Should().Be("753.31");
        envelope.Value.Delivery.Warranty.Months.Should().Be(36);
        envelope.Value.Delivery.LeadTime.ProductionDaysMin.Should().Be(10);
        envelope.Value.Delivery.LeadTime.InstallationDays.Should().Be(1);
        envelope.Value.Delivery.LeadTime.TotalDaysMin.Should().Be(11);
        envelope.Value.Delivery.LeadTime.TotalDaysMax.Should().Be(15);
    }

    [Fact]
    public async Task PostReview_InvalidRegion_Returns400_WithGotMetadata()
    {
        using var c = _factory.CreateClient();
        var (pt, mat) = await SeededWindowAluThermalAsync(c);
        var response = await c.PostAsJsonAsync("/api/v1/configurator/review", new
        {
            productTypeId = pt, materialId = mat,
            widthCm = 120, heightCm = 140,
            installation = new { region = "Atlantis" },
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var envelope = await response.Content.ReadFromJsonAsync<Env<object>>(JsonOptions);
        envelope!.Errors[0].Code.Should().Be("configurator.installation.regionInvalid");
        envelope.Errors[0].Metadata!["got"].GetString().Should().Be("Atlantis");
    }

    [Fact]
    public async Task PostReview_PropagatesUnderlyingValidationFailure()
    {
        using var c = _factory.CreateClient();
        var (pt, mat) = await SeededWindowAluThermalAsync(c);
        // Dimensions out-of-range — should bubble out as the same code
        // the /price endpoint would produce.
        var response = await c.PostAsJsonAsync("/api/v1/configurator/review", new
        {
            productTypeId = pt, materialId = mat,
            widthCm = 10, heightCm = 10, // way below the constraint
            installation = new { region = "Batumi" },
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private static object MergeInstallation(object body, string region, string? cityHint)
    {
        // The canary body is an anonymous object; we re-wrap into a
        // JsonNode to splice in the installation block without losing
        // the rest. JsonSerializer round-trip keeps the test cheap.
        var json = JsonSerializer.SerializeToNode(body, JsonOptions)!.AsObject();
        json["installation"] = new System.Text.Json.Nodes.JsonObject
        {
            ["region"] = region,
            ["cityHint"] = cityHint,
        };
        return json;
    }

    private sealed record Env<T>(bool IsSuccess, T? Value, List<EnvErr> Errors);
    private sealed record EnvErr(string Code, string Message, string? Field, Dictionary<string, JsonElement>? Metadata);
    private sealed record TestPt(Guid Id, string Slug);
    private sealed record TestMat(Guid Id, string Slug);
    private sealed record TestSlug(Guid Id, string Slug);

    private sealed record TestReview(TestPricing Pricing, TestDelivery Delivery);
    private sealed record TestPricing(TestFlat Flat, TestGrouped Grouped);
    private sealed record TestFlat(long TotalMinor, string TotalDisplay);
    private sealed record TestGrouped(
        TestGroup Material,
        TestGroup Glass,
        TestGroup Color,
        TestGroup Accessories,
        TestGroup Installation,
        long VatMinor,
        string VatDisplay,
        long GrandTotalMinor,
        string GrandTotalDisplay,
        bool InstallationIsManualQuote);
    private sealed record TestGroup(long TotalMinor, string TotalDisplay, List<TestLine> Lines);
    private sealed record TestLine(string Code, long AmountMinor);
    private sealed record TestDelivery(TestWarranty Warranty, TestLeadTime LeadTime);
    private sealed record TestWarranty(int Months, List<string> Notes);
    private sealed record TestLeadTime(
        int ProductionDaysMin, int ProductionDaysMax,
        int InstallationDays, int TotalDaysMin, int TotalDaysMax);
}
