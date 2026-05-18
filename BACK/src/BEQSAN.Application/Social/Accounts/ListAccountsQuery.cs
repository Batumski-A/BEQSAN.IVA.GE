using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Social.Accounts;

public sealed record ListAccountsQuery : IRequest<Result<IReadOnlyList<AccountDto>>>;

public sealed record AccountDto(
    Guid Id,
    string MetaUserId,
    string DisplayName,
    DateTime ConnectedAtUtc,
    DateTime LastRefreshedAtUtc,
    bool IsActive,
    IReadOnlyList<PageDto> Pages);

public sealed record PageDto(
    Guid Id,
    string MetaPageId,
    string Name,
    string? IgUserId,
    string? IgUsername,
    bool IsActive,
    DateTime ConnectedAtUtc);

internal sealed class ListAccountsHandler(
    ISocialAccountRepository accounts,
    ISocialPageRepository pages)
    : IRequestHandler<ListAccountsQuery, Result<IReadOnlyList<AccountDto>>>
{
    public async Task<Result<IReadOnlyList<AccountDto>>> Handle(ListAccountsQuery request, CancellationToken ct)
    {
        var rows = await accounts.ListActiveAsync(ct).ConfigureAwait(false);
        var result = new List<AccountDto>(rows.Count);
        foreach (var a in rows)
        {
            var pageList = await pages.ListForAccountAsync(a.Id, ct).ConfigureAwait(false);
            result.Add(new AccountDto(
                a.Id,
                a.MetaUserId,
                a.DisplayName,
                a.ConnectedAtUtc,
                a.LastRefreshedAtUtc,
                a.IsActive,
                pageList.Select(p => new PageDto(p.Id, p.MetaPageId, p.Name, p.IgUserId, p.IgUsername, p.IsActive, p.ConnectedAtUtc))
                    .ToArray()));
        }
        return Result.Success<IReadOnlyList<AccountDto>>(result);
    }
}
