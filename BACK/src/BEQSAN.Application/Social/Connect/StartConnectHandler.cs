using System.Security.Cryptography;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Social.Connect;

internal sealed class StartConnectHandler(
    IMetaOAuthClient oauth,
    ICacheService cache)
    : IRequestHandler<StartConnectCommand, Result<StartConnectResponse>>
{
    private static readonly TimeSpan StateTtl = TimeSpan.FromMinutes(10);

    public async Task<Result<StartConnectResponse>> Handle(StartConnectCommand request, CancellationToken ct)
    {
        var state = GenerateState();
        await cache.SetAsync(StateCacheKey(state), "1", StateTtl, ct).ConfigureAwait(false);
        var url = oauth.BuildAuthorizeUrl(state);
        return Result.Success(new StartConnectResponse(url, state));
    }

    private static string GenerateState()
    {
        Span<byte> buf = stackalloc byte[18];
        RandomNumberGenerator.Fill(buf);
        return Convert.ToBase64String(buf).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    public static string StateCacheKey(string state) => $"social:oauth:state:{state}";
}
