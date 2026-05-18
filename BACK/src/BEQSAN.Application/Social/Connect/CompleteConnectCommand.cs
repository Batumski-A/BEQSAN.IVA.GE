using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Social.Connect;

/// <summary>
/// Step 2 — Meta calls us back with `code` + `state`. We verify the state,
/// exchange the code for a long-lived user token, discover the pages, and
/// persist the account + page tokens encrypted.
/// </summary>
public sealed record CompleteConnectCommand(string Code, string State) : IRequest<Result<CompleteConnectResponse>>;

public sealed record CompleteConnectResponse(Guid AccountId, int PagesConnected);
