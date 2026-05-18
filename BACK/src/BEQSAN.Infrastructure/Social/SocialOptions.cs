namespace BEQSAN.Infrastructure.Social;

public sealed class SocialOptions
{
    public const string SectionName = "Social";

    public MetaOptions Meta { get; set; } = new();
    public EncryptionOptions Encryption { get; set; } = new();
    public AiOptions Ai { get; set; } = new();

    /// <summary>
    /// Header value the admin SPA sends on /api/v1/admin/social/* and
    /// /api/v1/admin/* generally. Phase 0 — replaced by real JWT auth in Phase 2.
    /// </summary>
    public string AdminToken { get; set; } = string.Empty;
}

public sealed class MetaOptions
{
    public string AppId { get; set; } = string.Empty;
    public string AppSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = "http://localhost:5174/social/callback";
    public string ApiVersion { get; set; } = "v25.0";
    public string WebhookVerifyToken { get; set; } = string.Empty;
    public string Scope { get; set; } =
        "pages_show_list,pages_read_engagement,pages_read_user_content," +
        "pages_manage_posts,pages_manage_engagement,pages_manage_metadata,pages_messaging," +
        "instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_messages";
}

public sealed class EncryptionOptions
{
    /// <summary>Base64-encoded 32-byte AES-256 key.</summary>
    public string Key { get; set; } = string.Empty;
}

public sealed class AiOptions
{
    /// <summary>
    /// KIE.ai endpoint base. The chat completions URL is `{BaseUrl}/v1/chat/completions`
    /// and is OpenAI-compatible. Override per environment.
    /// </summary>
    public string BaseUrl { get; set; } = "https://api.kie.ai";
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Claude model id routed via KIE. Default to Sonnet 4.6 — fast + cheap enough
    /// for caption drafts and reply suggestions. See [docs/adr/0003-social-module.md].
    /// </summary>
    public string Model { get; set; } = "claude-sonnet-4-6";
}
