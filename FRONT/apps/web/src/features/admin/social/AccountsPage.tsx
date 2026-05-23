import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { socialApi, type SocialAccount } from './api';
import { AdminLayout } from '../AdminLayout';
import {
  Facebook,
  Instagram,
  Radio,
  Trash2,
  Link2,
  Calendar,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('ka-GE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
        navigate('/adminpanel/social', { replace: true });
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
    <AdminLayout
      title="სოციალური"
      subtitle="Meta ინტეგრაციები · Facebook + Instagram"
      trailing={
        <button
          type="button"
          disabled={connectMutation.isPending}
          onClick={() => connectMutation.mutate()}
          className="inline-flex items-center gap-2 rounded-md bg-accent-amber px-4 py-2 font-headline text-body-sm text-bg-base font-bold transition-all hover:bg-accent-amber/90 active:scale-95 disabled:opacity-60 shadow-lg shadow-accent-amber/10"
        >
          {connectMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              მუშავდება…
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              Facebook-ის დაკავშირება
            </>
          )}
        </button>
      }
    >
      {accountsQuery.isLoading ? (
        <SkeletonList />
      ) : accountsQuery.isError ? (
        <ErrorBox message={(accountsQuery.error as Error).message} />
      ) : accountsQuery.data?.length === 0 ? (
        <EmptyState onConnect={() => connectMutation.mutate()} isPending={connectMutation.isPending} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {accountsQuery.data?.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              onDisconnect={() => disconnectMutation.mutate(a.id)}
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

const AccountCard = ({
  account,
  onDisconnect,
}: {
  account: SocialAccount;
  onDisconnect: () => void;
}): JSX.Element => {
  return (
    <article className="overflow-hidden rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm shadow-md transition-all hover:border-hairline-strong/80 flex flex-col justify-between">
      <div>
        {/* Card Header with Brand Colors */}
        <header className="relative flex items-start justify-between gap-4 border-b border-hairline px-6 py-5 bg-gradient-to-r from-bg-elevated/10 to-bg-elevated/40">
          <div className="flex gap-4 items-center">
            {/* Meta Gradient Icon Container */}
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#1877F2] to-[#c32aa3] text-white shadow-md">
              <Facebook className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-headline text-body font-bold text-fg-primary">{account.displayName}</h3>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-tertiary">
                UID · <span className="text-fg-secondary">{account.metaUserId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDisconnect}
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-tertiary transition-all hover:border-system-danger/30 hover:text-system-danger hover:bg-system-danger/5 active:scale-95"
          >
            <Trash2 className="h-3 w-3" />
            გათიშვა
          </button>
        </header>

        {/* Metadata Details Row */}
        <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-hairline bg-bg-raised/10">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-fg-tertiary shrink-0" />
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-fg-tertiary">დაკავშირდა</div>
              <div className="font-mono text-[11px] text-fg-secondary mt-0.5">{formatDate(account.connectedAtUtc)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-fg-tertiary shrink-0" />
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-fg-tertiary">განახლდა</div>
              <div className="font-mono text-[11px] text-fg-secondary mt-0.5">{formatDate(account.lastRefreshedAtUtc)}</div>
            </div>
          </div>
        </div>

        {/* Inner Pages List */}
        <div className="p-6">
          <h4 className="font-mono text-[10px] uppercase tracking-wider text-fg-tertiary mb-3">მართული გვერდები</h4>
          <ul className="space-y-3">
            {account.pages.length === 0 ? (
              <li className="py-4 text-center rounded-lg border border-dashed border-hairline text-body-sm text-fg-tertiary bg-bg-base/20">
                გვერდები ვერ მოიძებნა.
              </li>
            ) : (
              account.pages.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-hairline bg-bg-base/20 hover:bg-bg-base/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/20">
                        <Facebook className="h-4 w-4" />
                      </div>
                      {p.igUserId && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white border border-bg-base">
                          <Instagram className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-body-sm font-semibold text-fg-primary leading-snug">{p.name}</div>
                      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-tertiary mt-0.5">
                        {p.igUsername ? `IG: @${p.igUsername}` : 'IG: არ არის'} · ID: {p.metaPageId}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        p.isActive ? 'bg-system-success' : 'bg-fg-disabled'
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        p.isActive ? 'bg-system-success' : 'bg-fg-disabled'
                      }`}></span>
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider font-bold ${
                        p.isActive ? 'text-system-success' : 'text-fg-disabled'
                      }`}
                    >
                      {p.isActive ? 'აქტიური' : 'გათიშული'}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      
      {/* Footer hint */}
      <div className="px-6 py-3 border-t border-hairline bg-bg-raised/10 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-fg-tertiary">
        <ShieldCheck className="h-3.5 w-3.5 text-accent-amber" />
        Meta API-სთან უსაფრთხო კავშირი დამყარებულია
      </div>
    </article>
  );
};

const EmptyState = ({ onConnect, isPending }: { onConnect: () => void; isPending: boolean }): JSX.Element => (
  <div className="mx-auto max-w-xl rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-md px-8 py-12 text-center shadow-xl relative overflow-hidden">
    {/* Decorative radial gradients for glowing glassmorphism */}
    <div className="absolute -left-16 -top-16 h-36 w-36 rounded-full bg-accent-amber/10 blur-[80px]" />
    <div className="absolute -right-16 -bottom-16 h-36 w-36 rounded-full bg-[#c32aa3]/10 blur-[80px]" />

    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-raised/50 border border-hairline mx-auto text-accent-amber mb-6 shadow-inner">
      <Radio className="h-8 w-8 animate-pulse text-accent-amber" />
    </div>

    <h3 className="font-headline text-body font-bold text-fg-primary text-lg">ჯერ არც ერთი Meta ანგარიში არ არის დაკავშირებული</h3>
    <p className="mt-3 text-body-sm text-fg-secondary leading-relaxed">
      სოციალური მარკეტინგის მოდულის გასააქტიურებლად საჭიროა დაუკავშიროთ თქვენი Facebook ანგარიში. 
      ეს საშუალებას მოგცემთ ავტომატურად გამოაქვეყნოთ პოსტები, უპასუხოთ მომხმარებლებს Messenger-სა და Instagram-ში და მართოთ მიმოწერები პირდაპირ ადმინ პანელიდან.
    </p>
    
    <div className="mt-8 flex justify-center">
      <button
        type="button"
        disabled={isPending}
        onClick={onConnect}
        className="inline-flex items-center gap-2 rounded-md bg-accent-amber px-5 py-2.5 font-headline text-body-sm text-bg-base font-bold transition-all hover:bg-accent-amber/90 active:scale-95 disabled:opacity-60 shadow-lg shadow-accent-amber/20"
      >
        {isPending ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            მიმდინარეობს კავშირი…
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" />
            პირველი ანგარიშის დაკავშირება
          </>
        )}
      </button>
    </div>
    
    <div className="mt-6 flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-wider text-fg-tertiary">
      <ShieldCheck className="h-4 w-4 text-system-success" />
      ტოკენი ინახება დაშიფრულად და არასდროს ისმის ლოგებში
    </div>
  </div>
);

const SkeletonList = (): JSX.Element => (
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    {[0, 1].map((i) => (
      <div
        key={i}
        className="h-80 animate-pulse rounded-xl border border-hairline-strong bg-bg-elevated/20 p-6 flex flex-col justify-between"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-bg-raised" />
            <div className="space-y-2">
              <div className="h-5 w-32 rounded bg-bg-raised" />
              <div className="h-3 w-20 rounded bg-bg-raised" />
            </div>
          </div>
          <div className="h-[1px] bg-hairline" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-8 rounded bg-bg-raised" />
            <div className="h-8 rounded bg-bg-raised" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-10 rounded bg-bg-raised" />
          <div className="h-10 rounded bg-bg-raised" />
        </div>
      </div>
    ))}
  </div>
);

const ErrorBox = ({ message }: { message: string }): JSX.Element => (
  <div className="rounded-xl border border-system-danger/20 bg-system-danger/5 px-5 py-4 text-body-sm text-system-danger flex items-start gap-3 max-w-xl mx-auto">
    <AlertCircle className="h-5 w-5 shrink-0 text-system-danger" />
    <div>
      <div className="font-bold">დაკავშირების შეცდომა</div>
      <p className="mt-1 text-fg-secondary">{message}</p>
    </div>
  </div>
);

