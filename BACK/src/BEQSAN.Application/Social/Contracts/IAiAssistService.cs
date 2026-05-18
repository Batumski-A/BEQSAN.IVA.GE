namespace BEQSAN.Application.Social.Contracts;

/// <summary>
/// Single AI service for caption drafting and reply suggestions. Backed by
/// Claude Sonnet 4.6 — model id stays inside the implementation so swapping
/// providers (Anthropic direct, KIE, Azure OpenAI) is one DI registration.
/// </summary>
public interface IAiAssistService
{
    /// <param name="topic">Free-form admin brief — e.g. „ახალი მოდელი slim 70mm".</param>
    /// <param name="tonality">One of: friendly | technical | promo. Optional.</param>
    /// <param name="ct">Cancellation token.</param>
    Task<string> DraftCaptionAsync(string topic, string? tonality, CancellationToken ct);

    /// <param name="conversationContext">Last ~10 turns, oldest first.</param>
    /// <param name="customerLastMessage">The message we're replying to.</param>
    /// <param name="ct">Cancellation token.</param>
    Task<string> SuggestReplyAsync(
        IReadOnlyList<AiTurn> conversationContext,
        string customerLastMessage,
        CancellationToken ct);
}

public sealed record AiTurn(bool IsFromCustomer, string Text);
