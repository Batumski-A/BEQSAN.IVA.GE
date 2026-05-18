using System.Net.Http.Json;
using System.Text.Json.Serialization;
using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Social;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BEQSAN.Infrastructure.Social;

/// <summary>
/// Authenticated Meta Graph operations: publish posts (FB single/photo + IG
/// container/publish two-step), pull conversations + comments, send replies.
/// Each call accepts the decrypted page-scoped token — the client itself is
/// stateless and lives as a registered HttpClient instance.
/// </summary>
internal sealed class MetaGraphClient(
    HttpClient http,
    IOptions<SocialOptions> options,
    ILogger<MetaGraphClient> logger) : IMetaGraphClient
{
    private readonly MetaOptions _meta = options.Value.Meta;
    private string GraphUrl => $"https://graph.facebook.com/{_meta.ApiVersion}";

    public async Task<MetaPublishResult> PublishFacebookPostAsync(
        string pageAccessToken,
        string metaPageId,
        string caption,
        IReadOnlyList<string> imageUrls,
        CancellationToken ct)
    {
        string endpoint;
        Dictionary<string, string?> form;

        if (imageUrls.Count == 0)
        {
            endpoint = $"{GraphUrl}/{metaPageId}/feed";
            form = new Dictionary<string, string?> { ["message"] = caption, ["access_token"] = pageAccessToken };
        }
        else if (imageUrls.Count == 1)
        {
            endpoint = $"{GraphUrl}/{metaPageId}/photos";
            form = new Dictionary<string, string?>
            {
                ["url"] = imageUrls[0],
                ["caption"] = caption,
                ["access_token"] = pageAccessToken,
            };
        }
        else
        {
            var mediaIds = new List<string>(imageUrls.Count);
            foreach (var url in imageUrls)
            {
                var uploadResp = await PostFormAsync<PublishIdJson>(
                    $"{GraphUrl}/{metaPageId}/photos",
                    new Dictionary<string, string?>
                    {
                        ["url"] = url,
                        ["published"] = "false",
                        ["access_token"] = pageAccessToken,
                    }, ct).ConfigureAwait(false);
                mediaIds.Add(uploadResp.Id ?? string.Empty);
            }
            endpoint = $"{GraphUrl}/{metaPageId}/feed";
            form = new Dictionary<string, string?> { ["message"] = caption, ["access_token"] = pageAccessToken };
            for (var i = 0; i < mediaIds.Count; i++)
            {
                form[$"attached_media[{i}]"] = $"{{\"media_fbid\":\"{mediaIds[i]}\"}}";
            }
        }

        var resp = await PostFormAsync<PublishIdJson>(endpoint, form, ct).ConfigureAwait(false);
        var externalId = resp.PostId ?? resp.Id ?? throw new InvalidOperationException("Meta did not return an id");
        return new MetaPublishResult(externalId, null);
    }

    public async Task<MetaPublishResult> PublishInstagramPostAsync(
        string pageAccessToken,
        string igUserId,
        string caption,
        IReadOnlyList<string> imageUrls,
        CancellationToken ct)
    {
        if (imageUrls.Count == 0)
        {
            throw new InvalidOperationException("Instagram posts require at least one image.");
        }

        string creationId;

        if (imageUrls.Count == 1)
        {
            var container = await PostFormAsync<PublishIdJson>(
                $"{GraphUrl}/{igUserId}/media",
                new Dictionary<string, string?>
                {
                    ["image_url"] = imageUrls[0],
                    ["caption"] = caption,
                    ["access_token"] = pageAccessToken,
                }, ct).ConfigureAwait(false);
            creationId = container.Id ?? throw new InvalidOperationException("IG container returned no id");
        }
        else
        {
            var childIds = new List<string>(imageUrls.Count);
            foreach (var url in imageUrls)
            {
                var child = await PostFormAsync<PublishIdJson>(
                    $"{GraphUrl}/{igUserId}/media",
                    new Dictionary<string, string?>
                    {
                        ["image_url"] = url,
                        ["is_carousel_item"] = "true",
                        ["access_token"] = pageAccessToken,
                    }, ct).ConfigureAwait(false);
                childIds.Add(child.Id ?? string.Empty);
            }
            var carousel = await PostFormAsync<PublishIdJson>(
                $"{GraphUrl}/{igUserId}/media",
                new Dictionary<string, string?>
                {
                    ["media_type"] = "CAROUSEL",
                    ["children"] = string.Join(',', childIds),
                    ["caption"] = caption,
                    ["access_token"] = pageAccessToken,
                }, ct).ConfigureAwait(false);
            creationId = carousel.Id ?? throw new InvalidOperationException("IG carousel returned no id");
        }

        var publish = await PostFormAsync<PublishIdJson>(
            $"{GraphUrl}/{igUserId}/media_publish",
            new Dictionary<string, string?>
            {
                ["creation_id"] = creationId,
                ["access_token"] = pageAccessToken,
            }, ct).ConfigureAwait(false);

        return new MetaPublishResult(publish.Id ?? string.Empty, null);
    }

    public async Task<IReadOnlyList<MetaConversationDescriptor>> ListConversationsAsync(
        string pageAccessToken,
        string metaPageId,
        InboxChannel channel,
        CancellationToken ct)
    {
        var platform = channel == InboxChannel.InstagramDm ? "instagram" : "messenger";
        var url = $"{GraphUrl}/{metaPageId}/conversations" +
                  $"?platform={platform}" +
                  $"&fields=id,updated_time,participants" +
                  $"&limit=50&access_token={Uri.EscapeDataString(pageAccessToken)}";
        var resp = await http.GetFromJsonAsync<ConversationListJson>(url, ct).ConfigureAwait(false);
        if (resp?.Data is null)
        {
            return [];
        }
        return resp.Data.Select(c => new MetaConversationDescriptor(
            c.Id ?? string.Empty,
            c.Participants?.Data?.FirstOrDefault()?.Id ?? string.Empty,
            c.Participants?.Data?.FirstOrDefault()?.Name ?? string.Empty,
            DateTime.TryParse(c.UpdatedTime, out var t) ? t.ToUniversalTime() : DateTime.UtcNow))
            .ToArray();
    }

    public async Task<IReadOnlyList<MetaInboxMessage>> ListThreadMessagesAsync(
        string pageAccessToken,
        string externalThreadId,
        CancellationToken ct)
    {
        var url = $"{GraphUrl}/{externalThreadId}/messages" +
                  $"?fields=id,message,from,created_time,attachments" +
                  $"&limit=50&access_token={Uri.EscapeDataString(pageAccessToken)}";
        var resp = await http.GetFromJsonAsync<MessageListJson>(url, ct).ConfigureAwait(false);
        if (resp?.Data is null)
        {
            return [];
        }
        return resp.Data.Select(m => new MetaInboxMessage(
            m.Id ?? string.Empty,
            m.From?.Id ?? string.Empty,
            m.From?.Name ?? string.Empty,
            m.Message ?? string.Empty,
            m.Attachments?.Data?.FirstOrDefault()?.ImageData?.Url,
            DateTime.TryParse(m.CreatedTime, out var t) ? t.ToUniversalTime() : DateTime.UtcNow))
            .ToArray();
    }

    public async Task<string> SendMessageAsync(
        string pageAccessToken,
        string metaPageId,
        InboxChannel channel,
        string recipientId,
        string text,
        CancellationToken ct)
    {
        var url = $"{GraphUrl}/{metaPageId}/messages";
        var form = new Dictionary<string, string?>
        {
            ["recipient"] = $"{{\"id\":\"{recipientId}\"}}",
            ["message"] = $"{{\"text\":{System.Text.Json.JsonSerializer.Serialize(text)}}}",
            ["messaging_type"] = "RESPONSE",
            ["access_token"] = pageAccessToken,
        };
        if (channel == InboxChannel.InstagramDm)
        {
            form["messaging_product"] = "instagram";
        }
        var resp = await PostFormAsync<SendMessageJson>(url, form, ct).ConfigureAwait(false);
        return resp.MessageId ?? resp.Id ?? throw new InvalidOperationException("Meta send returned no id");
    }

    public async Task<IReadOnlyList<MetaInboxComment>> ListPostCommentsAsync(
        string pageAccessToken,
        string externalPostId,
        CancellationToken ct)
    {
        var url = $"{GraphUrl}/{externalPostId}/comments" +
                  $"?fields=id,from,message,created_time,parent" +
                  $"&order=chronological" +
                  $"&limit=100&access_token={Uri.EscapeDataString(pageAccessToken)}";
        var resp = await http.GetFromJsonAsync<CommentListJson>(url, ct).ConfigureAwait(false);
        if (resp?.Data is null)
        {
            return [];
        }
        return resp.Data.Select(c => new MetaInboxComment(
            c.Id ?? string.Empty,
            c.From?.Id ?? string.Empty,
            c.From?.Name ?? string.Empty,
            c.Message ?? string.Empty,
            DateTime.TryParse(c.CreatedTime, out var t) ? t.ToUniversalTime() : DateTime.UtcNow,
            c.Parent?.Id))
            .ToArray();
    }

    public async Task<string> ReplyToCommentAsync(
        string pageAccessToken,
        string commentId,
        string text,
        CancellationToken ct)
    {
        var resp = await PostFormAsync<PublishIdJson>(
            $"{GraphUrl}/{commentId}/comments",
            new Dictionary<string, string?>
            {
                ["message"] = text,
                ["access_token"] = pageAccessToken,
            }, ct).ConfigureAwait(false);
        return resp.Id ?? throw new InvalidOperationException("Meta reply returned no id");
    }

    private async Task<T> PostFormAsync<T>(string url, IDictionary<string, string?> form, CancellationToken ct)
        where T : new()
    {
        using var content = new FormUrlEncodedContent(
            form.Where(kv => kv.Value is not null)
                .Select(kv => new KeyValuePair<string, string>(kv.Key, kv.Value!)));
        var response = await http.PostAsync(url, content, ct).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
            logger.LogError("Meta API {Status}: {Body}", (int)response.StatusCode, body);
            throw new HttpRequestException($"Meta API {(int)response.StatusCode}: {Truncate(body, 500)}");
        }
        var json = await response.Content.ReadFromJsonAsync<T>(cancellationToken: ct).ConfigureAwait(false);
        return json ?? new T();
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max];

    private sealed class PublishIdJson
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("post_id")] public string? PostId { get; set; }
    }

    private sealed class SendMessageJson
    {
        [JsonPropertyName("message_id")] public string? MessageId { get; set; }
        [JsonPropertyName("id")] public string? Id { get; set; }
    }

    private sealed class ConversationListJson
    {
        [JsonPropertyName("data")] public List<ConversationJson>? Data { get; set; }
    }

    private sealed class ConversationJson
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("updated_time")] public string? UpdatedTime { get; set; }
        [JsonPropertyName("participants")] public ParticipantsJson? Participants { get; set; }
    }

    private sealed class ParticipantsJson
    {
        [JsonPropertyName("data")] public List<ParticipantJson>? Data { get; set; }
    }

    private sealed class ParticipantJson
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("name")] public string? Name { get; set; }
    }

    private sealed class MessageListJson
    {
        [JsonPropertyName("data")] public List<MessageJson>? Data { get; set; }
    }

    private sealed class MessageJson
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("message")] public string? Message { get; set; }
        [JsonPropertyName("created_time")] public string? CreatedTime { get; set; }
        [JsonPropertyName("from")] public ParticipantJson? From { get; set; }
        [JsonPropertyName("attachments")] public AttachmentsJson? Attachments { get; set; }
    }

    private sealed class AttachmentsJson
    {
        [JsonPropertyName("data")] public List<AttachmentJson>? Data { get; set; }
    }

    private sealed class AttachmentJson
    {
        [JsonPropertyName("image_data")] public ImageDataJson? ImageData { get; set; }
    }

    private sealed class ImageDataJson
    {
        [JsonPropertyName("url")] public string? Url { get; set; }
    }

    private sealed class CommentListJson
    {
        [JsonPropertyName("data")] public List<CommentJson>? Data { get; set; }
    }

    private sealed class CommentJson
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("message")] public string? Message { get; set; }
        [JsonPropertyName("created_time")] public string? CreatedTime { get; set; }
        [JsonPropertyName("from")] public ParticipantJson? From { get; set; }
        [JsonPropertyName("parent")] public CommentJson? Parent { get; set; }
    }
}
