import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { socialApi, type SocialAccount } from './api';
import { Shell } from '../../components/shell/Shell';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('ka-GE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const AccountsPage = (): JSX.Element => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const accountsQuery = useQuery({
    queryKey: ['social', 'accounts'],
    queryFn: socialApi.listAccounts,
  });

  // Handle OAuth callback — Meta redirects back with ?code=...&state=...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state) {
      void socialApi.completeConnect(code, state).then(() => {
        navigate('/social', { replace: true });
        void qc.invalidateQueries({ queryKey: ['social', 'accounts'] });
      });
    }
  }, [location.search, navigate, qc]);

  const connectMutation = useMutation({
    mutationFn: socialApi.startConnect,
    onSuccess: (resp) => {
      window.location.href = resp.authorizeUrl;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: socialApi.disconnectAccount,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['social', 'accounts'] }),
  });

  return (
    <Shell
      title="სოციალური"
      subtitle="meta · facebook + instagram"
      trailing={
        <button
          type="button"
          disabled={connectMutation.isPending}
          onClick={() => connectMutation.mutate()}
          className="rounded-sm bg-accent-amber px-4 py-2 font-headline text-body-sm text-bg-base transition-colors hover:bg-accent-amber-h disabled:opacity-60"
        >
          {connectMutation.isPending ? 'მუშავდება…' : '+ Facebook-ის დაკავშირება'}
        </button>
      }
    >
      {accountsQuery.isLoading ? (
        <SkeletonList />
      ) : accountsQuery.isError ? (
        <ErrorBox message={(accountsQuery.error as Error).message} />
      ) : accountsQuery.data?.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {accountsQuery.data?.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              onDisconnect={() => disconnectMutation.mutate(a.id)}
            />
          ))}
        </div>
      )}
    </Shell>
  );
};

const AccountCard = ({ account, onDisconnect }: { account: SocialAccount; onDisconnect: () => void }): JSX.Element => {
  return (
    <article className="rounded-sm border border-hairline bg-bg-raised p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-headline text-h4 text-fg-primary">{account.displayName}</h3>
          <p className="mt-1 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
            uid · {account.metaUserId}
          </p>
        </div>
        <button
          type="button"
          onClick={onDisconnect}
          className="font-mono text-caption uppercase tracking-wider text-fg-tertiary transition-colors hover:text-system-danger"
        >
          გათიშვა
        </button>
      </header>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-caption uppercase tracking-wider">
        <dt className="text-fg-tertiary">დაკავშირდა</dt>
        <dd className="text-fg-secondary tabular-nums">{formatDate(account.connectedAtUtc)}</dd>
        <dt className="text-fg-tertiary">ბოლო refresh</dt>
        <dd className="text-fg-secondary tabular-nums">{formatDate(account.lastRefreshedAtUtc)}</dd>
      </dl>
      <ul className="mt-5 divide-y divide-hairline border-t border-hairline">
        {account.pages.length === 0 ? (
          <li className="py-3 text-body-sm text-fg-tertiary">გვერდი არ მოიძებნა.</li>
        ) : (
          account.pages.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between py-3">
              <div>
                <div className="text-body-sm text-fg-primary">{p.name}</div>
                <div className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                  {p.igUsername ? `ig · @${p.igUsername}` : 'ig · არ არის'} · fb · {p.metaPageId}
                </div>
              </div>
              <span
                className={`font-mono text-caption uppercase tracking-wider ${
                  p.isActive ? 'text-system-success' : 'text-fg-disabled'
                }`}
              >
                {p.isActive ? 'აქტიური' : 'გათიშული'}
              </span>
            </li>
          ))
        )}
      </ul>
    </article>
  );
};

const EmptyState = (): JSX.Element => (
  <div className="mx-auto max-w-xl rounded-sm border border-hairline bg-bg-raised px-6 py-12 text-center">
    <div className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">01 · meta</div>
    <h3 className="mt-3 font-headline text-h3 text-fg-primary">ჯერ ერთი ანგარიშიც არ არის დაკავშირებული</h3>
    <p className="mt-3 text-body text-fg-secondary">
      დააჭირე ზემოთ ღილაკს, შედი შენი Facebook-ით და აირჩიე გვერდი/ბიზნეს Instagram. ტოკენი
      დაშიფრულად ინახება ჩვენთან, არასდროს ისმის ლოგებში.
    </p>
  </div>
);

const SkeletonList = (): JSX.Element => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    {[0, 1].map((i) => (
      <div key={i} className="h-44 animate-pulse rounded-sm border border-hairline bg-bg-elevated" />
    ))}
  </div>
);

const ErrorBox = ({ message }: { message: string }): JSX.Element => (
  <div className="rounded-sm border border-system-danger/40 bg-bg-elevated px-4 py-3 text-body-sm text-system-danger">
    {message}
  </div>
);
