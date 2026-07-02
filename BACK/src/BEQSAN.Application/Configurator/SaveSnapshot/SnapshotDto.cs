namespace BEQSAN.Application.Configurator.SaveSnapshot;

/// <summary>
/// Wire shape for /configurator/snapshot. <paramref name="Url"/> is the raw
/// image (e.g. "/api/v1/files/2026/07/02/&lt;guid&gt;_drawing.png");
/// <paramref name="ShareUrl"/> is the OpenGraph wrapper page for the same key —
/// messengers (WhatsApp) render it as a photo preview card, which a bare
/// image URL does not reliably get.
/// </summary>
public sealed record SnapshotDto(string Url, string ShareUrl);
