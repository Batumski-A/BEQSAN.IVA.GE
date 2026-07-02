using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Configurator.SaveSnapshot;

/// <summary>
/// Stores a PNG/JPEG snapshot of the 3D configurator drawing, delivered as a
/// base64 data URL ("data:image/png;base64,..."), and returns the public URL
/// the FRONT can embed (order attachments, social posts, share links).
/// </summary>
public sealed record SaveSnapshotCommand(string ImageDataUrl) : IRequest<Result<SnapshotDto>>;
