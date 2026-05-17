using System.Text.Json;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.UnitTests.ValueObjects;

public class LocalizedTextTests
{
    [Fact]
    public void Create_WithKaOnly_Succeeds()
    {
        var result = LocalizedText.Create("ფანჯარა");
        result.IsSuccess.Should().BeTrue();
        result.Value.Ka.Should().Be("ფანჯარა");
        result.Value.En.Should().BeNull();
        result.Value.Ru.Should().BeNull();
    }

    [Fact]
    public void Create_TrimsAllValues()
    {
        var result = LocalizedText.Create("  ფანჯარა  ", "  window  ", "  окно  ");
        result.IsSuccess.Should().BeTrue();
        result.Value.Ka.Should().Be("ფანჯარა");
        result.Value.En.Should().Be("window");
        result.Value.Ru.Should().Be("окно");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithEmptyKa_ReturnsValidationError(string? ka)
    {
        var result = LocalizedText.Create(ka);
        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("localizedText.ka.required");
        result.Error.Field.Should().Be("ka");
    }

    [Fact]
    public void Create_TreatsEmptyEnRuAsNull()
    {
        var result = LocalizedText.Create("ფანჯარა", "  ", "");
        result.IsSuccess.Should().BeTrue();
        result.Value.En.Should().BeNull();
        result.Value.Ru.Should().BeNull();
    }

    [Theory]
    [InlineData("ka", "ფანჯარა")]
    [InlineData("en", "window")]
    [InlineData("ru", "окно")]
    [InlineData("de", "ფანჯარა")] // unknown locale falls back to ka
    public void Resolve_ReturnsTranslationOrFallbackToKa(string locale, string expected)
    {
        var lt = LocalizedText.Create("ფანჯარა", "window", "окно").Value;
        lt.Resolve(locale).Should().Be(expected);
    }

    [Fact]
    public void Resolve_MissingTranslation_FallsBackToKa()
    {
        var lt = LocalizedText.Create("ფანჯარა").Value;
        lt.Resolve("en").Should().Be("ფანჯარა");
        lt.Resolve("ru").Should().Be("ფანჯარა");
    }

    [Fact]
    public void JsonRoundTrip_PreservesAllFields()
    {
        var original = LocalizedText.Create("ფანჯარა", "window", "окно").Value;
        var json = JsonSerializer.Serialize(original);
        var roundTripped = JsonSerializer.Deserialize<LocalizedText>(json);
        roundTripped.Should().NotBeNull();
        roundTripped!.Ka.Should().Be("ფანჯარა");
        roundTripped.En.Should().Be("window");
        roundTripped.Ru.Should().Be("окно");
    }

    [Fact]
    public void JsonRoundTrip_NullEnRu_StaysNull()
    {
        var original = LocalizedText.Create("ფანჯარა").Value;
        var json = JsonSerializer.Serialize(original);
        json.Should().NotContain("\"En\":\"\"");
        var roundTripped = JsonSerializer.Deserialize<LocalizedText>(json);
        roundTripped!.En.Should().BeNull();
        roundTripped.Ru.Should().BeNull();
    }
}
