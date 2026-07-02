namespace BEQSAN.Application.Configurator.SaveSnapshot;

/// <summary>
/// Wire shape for /configurator/snapshot — the public URL of the stored image,
/// relative to the API host (e.g. "/api/v1/files/2026/07/02/&lt;guid&gt;_drawing.png").
/// </summary>
public sealed record SnapshotDto(string Url);
