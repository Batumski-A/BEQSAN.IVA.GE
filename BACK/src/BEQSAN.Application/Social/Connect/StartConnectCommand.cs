using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Social.Connect;

/// <summary>
/// Step 1 of the OAuth dance — admin clicks „Connect Facebook" and we mint a
/// `state` nonce + return Meta's dialog URL. The state is cached briefly so we
/// can verify it on callback.
/// </summary>
public sealed record StartConnectCommand : IRequest<Result<StartConnectResponse>>;

public sealed record StartConnectResponse(string AuthorizeUrl, string State);
