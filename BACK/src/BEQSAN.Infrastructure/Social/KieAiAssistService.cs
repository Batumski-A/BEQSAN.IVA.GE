using System.Net.Http.Json;
using System.Text.Json.Serialization;
using BEQSAN.Application.Social.Contracts;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BEQSAN.Infrastructure.Social;

/// <summary>
/// AI assist via KIE.ai chat-completions endpoint (OpenAI-compatible), routed to
/// Claude Sonnet 4.6 by default. Single HTTP call per request — no streaming, no
/// tool-use yet (auto-reply tool wiring lives in Phase 3 of the social plan).
/// </summary>
internal sealed class KieAiAssistService(
    HttpClient http,
    IOptions<SocialOptions> options,
    ILogger<KieAiAssistService> logger) : IAiAssistService
{
    private readonly AiOptions _ai = options.Value.Ai;

    private const string CaptionSystem =
        "შენ ხარ BEQSAN-ის (ალუმინი + PVC ფანჯრები/კარები, ბათუმი) სოციალური მედია მენეჯერი. " +
        "დაწერე ერთი მოკლე ქართული პოსტი (1-3 აბზაცი, მაქს 600 სიმბოლო). " +
        "ტონი — ჭეშმარიტი, ხელით ნაშენი, ხელოსნური; AI-სტილის გასული ფრაზები ('გამოგვცადეთ', 'ჩვენ ვართ #1') აკრძალულია. " +
        "ციფრები ქართულად (1 234, არა '1k'). ემოჯი — მაქს 1, თუ კონტექსტი მოითხოვს. " +
        "გამოიყენე მაქს 3 hashtag (#beqsan, #ბათუმი, ან თემატური).";

    private const string ReplySystem =
        "შენ ხარ BEQSAN-ის (ფანჯრები/კარები) მომხმარებლის სერვისის ასისტენტი ბათუმში. " +
        "უპასუხე ქართულად, თავაზიანად, კონკრეტულად. " +
        "თუ კლიენტი ფასს ეკითხება — სთხოვე ზომა (სიგანე × სიმაღლე სმ-ში) და მასალა (ალუმინი/PVC). " +
        "თუ კონკრეტული პასუხი არ შეგიძლია — შესთავაზე ბათუმის ფაბრიკაში მისვლა ან 24 საათში პასუხის გაცემა.";

    public Task<string> DraftCaptionAsync(string topic, string? tonality, CancellationToken ct)
    {
        var brief = string.IsNullOrWhiteSpace(tonality)
            ? topic
            : $"ტონი: {tonality}.\nთემა: {topic}";
        return CompleteAsync(CaptionSystem, brief, ct);
    }

    public Task<string> SuggestReplyAsync(IReadOnlyList<AiTurn> conversationContext, string customerLastMessage, CancellationToken ct)
    {
        var history = string.Join("\n", conversationContext.Select(t =>
            t.IsFromCustomer ? $"კლიენტი: {t.Text}" : $"BEQSAN: {t.Text}"));
        var prompt = $"{history}\nკლიენტი (ბოლო): {customerLastMessage}\n\nშეადგინე ერთი თავაზიანი პასუხი (1-2 წინადადება).";
        return CompleteAsync(ReplySystem, prompt, ct);
    }

    private async Task<string> CompleteAsync(string system, string user, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_ai.ApiKey))
        {
            throw new InvalidOperationException("Social:Ai:ApiKey is not configured. Set the KIE.ai API key via user-secrets or environment.");
        }
        var url = _ai.BaseUrl.TrimEnd('/') + "/v1/chat/completions";
        var body = new ChatRequest
        {
            Model = _ai.Model,
            Temperature = 0.7,
            MaxTokens = 600,
            Messages =
            [
                new ChatMessage { Role = "system", Content = system },
                new ChatMessage { Role = "user", Content = user },
            ],
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
        request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {_ai.ApiKey}");

        using var response = await http.SendAsync(request, ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
            logger.LogError("KIE chat completion {Status}: {Body}", (int)response.StatusCode, errBody);
            throw new HttpRequestException($"KIE API {(int)response.StatusCode}");
        }
        var resp = await response.Content.ReadFromJsonAsync<ChatResponse>(cancellationToken: ct).ConfigureAwait(false)
                   ?? throw new InvalidOperationException("KIE returned empty response");
        return resp.Choices?.FirstOrDefault()?.Message?.Content?.Trim() ?? string.Empty;
    }

    private sealed class ChatRequest
    {
        [JsonPropertyName("model")] public string Model { get; set; } = string.Empty;
        [JsonPropertyName("messages")] public List<ChatMessage> Messages { get; set; } = [];
        [JsonPropertyName("temperature")] public double Temperature { get; set; }
        [JsonPropertyName("max_tokens")] public int MaxTokens { get; set; }
    }

    private sealed class ChatMessage
    {
        [JsonPropertyName("role")] public string Role { get; set; } = string.Empty;
        [JsonPropertyName("content")] public string Content { get; set; } = string.Empty;
    }

    private sealed class ChatResponse
    {
        [JsonPropertyName("choices")] public List<ChatChoice>? Choices { get; set; }
    }

    private sealed class ChatChoice
    {
        [JsonPropertyName("message")] public ChatMessage? Message { get; set; }
    }
}
