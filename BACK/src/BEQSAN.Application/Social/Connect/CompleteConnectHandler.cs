using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Application.Common.Persistence;
using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.Social;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Social.Connect;

internal sealed class CompleteConnectHandler(
    IMetaOAuthClient oauth,
    ITokenCipher cipher,
    ISocialAccountRepository accounts,
    ISocialPageRepository pages,
    ICacheService cache,
    IBeqsanDbContext db,
    ILogger<CompleteConnectHandler> logger)
    : IRequestHandler<CompleteConnectCommand, Result<CompleteConnectResponse>>
{
    public async Task<Result<CompleteConnectResponse>> Handle(CompleteConnectCommand cmd, CancellationToken ct)
    {
        var stateKey = StartConnectHandler.StateCacheKey(cmd.State);
        if (await cache.GetAsync<string>(stateKey, ct).ConfigureAwait(false) is null)
        {
            return Result.Failure<CompleteConnectResponse>(SocialErrors.OAuthStateInvalid);
        }
        await cache.RemoveAsync(stateKey, ct).ConfigureAwait(false);

        try
        {
            var shortLived = await oauth.ExchangeCodeAsync(cmd.Code, ct).ConfigureAwait(false);
            var longLived = await oauth.ExchangeForLongLivedAsync(shortLived.AccessToken, ct).ConfigureAwait(false);
            var profile = await oauth.GetUserProfileAsync(longLived.AccessToken, ct).ConfigureAwait(false);

            var userExpiresAt = DateTime.UtcNow.AddSeconds(longLived.ExpiresInSeconds);
            var userToken = cipher.Encrypt(longLived.AccessToken, userExpiresAt);

            var existing = await accounts.GetByMetaUserIdAsync(profile.MetaUserId, ct).ConfigureAwait(false);
            SocialAccount account;
            if (existing is null)
            {
                account = SocialAccount.Create(profile.MetaUserId, profile.DisplayName, userToken);
                await accounts.AddAsync(account, ct).ConfigureAwait(false);
            }
            else
            {
                existing.RefreshToken(userToken);
                existing.Rename(profile.DisplayName);
                await accounts.UpdateAsync(existing, ct).ConfigureAwait(false);
                account = existing;
            }

            var pageDescriptors = await oauth.GetPagesAsync(longLived.AccessToken, ct).ConfigureAwait(false);
            // Page-scoped tokens from /me/accounts never expire (until the user revokes),
            // but we still record a far-future expiry so the same code path handles them.
            var pageExpiry = DateTime.UtcNow.AddYears(50);

            foreach (var pd in pageDescriptors)
            {
                var pageToken = cipher.Encrypt(pd.PageAccessToken, pageExpiry);
                var existingPage = await pages.GetByMetaPageIdAsync(pd.MetaPageId, ct).ConfigureAwait(false);
                if (existingPage is null)
                {
                    var page = SocialPage.Create(account.Id, pd.MetaPageId, pd.Name, pageToken, pd.IgUserId, pd.IgUsername);
                    await pages.AddAsync(page, ct).ConfigureAwait(false);
                }
                else
                {
                    existingPage.Sync(pd.Name, pd.IgUserId, pd.IgUsername, pageToken);
                    await pages.UpdateAsync(existingPage, ct).ConfigureAwait(false);
                }
            }

            await db.SaveChangesAsync(ct).ConfigureAwait(false);
            logger.LogInformation("Meta account connected {AccountId} ({PageCount} pages)", account.Id, pageDescriptors.Count);

            return Result.Success(new CompleteConnectResponse(account.Id, pageDescriptors.Count));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Meta connect failed");
            return Result.Failure<CompleteConnectResponse>(SocialErrors.MetaApiFailure.WithMetadata("reason", ex.Message));
        }
    }
}
