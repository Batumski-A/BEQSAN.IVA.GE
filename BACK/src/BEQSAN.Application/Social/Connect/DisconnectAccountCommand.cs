using BEQSAN.Application.Common.Persistence;
using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.Social;
using MediatR;

namespace BEQSAN.Application.Social.Connect;

public sealed record DisconnectAccountCommand(Guid AccountId) : IRequest<Result>;

internal sealed class DisconnectAccountHandler(
    ISocialAccountRepository accounts,
    IBeqsanDbContext db)
    : IRequestHandler<DisconnectAccountCommand, Result>
{
    public async Task<Result> Handle(DisconnectAccountCommand cmd, CancellationToken ct)
    {
        var account = await accounts.GetByIdAsync(cmd.AccountId, ct).ConfigureAwait(false);
        if (account is null)
        {
            return Result.Failure(SocialErrors.AccountNotFound);
        }
        account.Disconnect();
        await accounts.UpdateAsync(account, ct).ConfigureAwait(false);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success();
    }
}
