import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi, type InboxChannel, type InboxThread } from './api';
import { Shell } from '../../components/shell/Shell';

const channelLabel: Record<InboxChannel, string> = {
  InstagramDm: 'ig dm',
  FacebookMessenger: 'fb msg',
  InstagramComment: 'ig comment',
  FacebookComment: 'fb comment',
};

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString('ka-GE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const InboxPage = (): JSX.Element => {
  const qc = useQueryClient();
  const threadsQuery = useQuery({ queryKey: ['social', 'inbox'], queryFn: () => socialApi.listInbox(50) });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  return (
    <Shell title="მიმოწერა" subtitle="dm + კომენტარები · უწყვეტი ფლუქსი">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px,1fr] lg:gap-6">
        <aside className="rounded-sm border border-hairline bg-bg-elevated">
          <header className="border-b border-hairline px-4 py-3 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
            {threadsQuery.data?.length ?? 0} მიმოწერა
          </header>
          {threadsQuery.isLoading ? (
            <div className="space-y-1 p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-sm bg-bg-raised" />
              ))}
            </div>
          ) : threadsQuery.data?.length === 0 ? (
            <p className="px-4 py-8 text-center text-body-sm text-fg-tertiary">
              ჯერ ვერც ერთი მესიჯი არ მოვიდა.
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {threadsQuery.data?.map((t) => (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  active={t.id === activeThreadId}
                  onSelect={() => setActiveThreadId(t.id)}
                />
              ))}
            </ul>
          )}
        </aside>

        <section className="rounded-sm border border-hairline bg-bg-raised">
          {activeThreadId ? (
            <ThreadView
              threadId={activeThreadId}
              onReplied={() => {
                void qc.invalidateQueries({ queryKey: ['social', 'inbox'] });
                void qc.invalidateQueries({ queryKey: ['social', 'thread', activeThreadId] });
              }}
            />
          ) : (
            <p className="flex h-full min-h-[400px] items-center justify-center text-body text-fg-tertiary">
              აირჩიე მიმოწერა მარცხნივ.
            </p>
          )}
        </section>
      </div>
    </Shell>
  );
};

const ThreadRow = ({
  thread,
  active,
  onSelect,
}: {
  thread: InboxThread;
  active: boolean;
  onSelect: () => void;
}): JSX.Element => (
  <li>
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
        active ? 'bg-bg-raised' : 'hover:bg-bg-raised'
      }`}
    >
      <span
        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
          thread.hasUnread ? 'bg-accent-amber' : 'bg-transparent'
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-body-sm text-fg-primary">{thread.participantName || 'ანონიმური'}</span>
          <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
            {channelLabel[thread.channel]}
          </span>
        </div>
        <p className="mt-1 truncate text-caption text-fg-secondary">{thread.lastMessagePreview}</p>
        <p className="mt-1 font-mono text-caption uppercase tracking-wider text-fg-tertiary tabular-nums">
          {thread.pageName} · {formatTime(thread.lastMessageAtUtc)}
        </p>
      </div>
    </button>
  </li>
);

const ThreadView = ({ threadId, onReplied }: { threadId: string; onReplied: () => void }): JSX.Element => {
  const thread = useQuery({
    queryKey: ['social', 'thread', threadId],
    queryFn: () => socialApi.getThread(threadId),
  });
  const [reply, setReply] = useState('');

  const replyMutation = useMutation({
    mutationFn: () => socialApi.reply(threadId, reply),
    onSuccess: () => {
      setReply('');
      onReplied();
    },
  });

  const suggestMutation = useMutation({
    mutationFn: () => socialApi.suggestReply(threadId),
    onSuccess: (text) => setReply(text),
  });

  if (thread.isLoading) {
    return <div className="p-6 text-body-sm text-fg-tertiary">იტვირთება…</div>;
  }
  if (thread.isError || !thread.data) {
    return <div className="p-6 text-body-sm text-system-danger">{(thread.error as Error)?.message ?? 'შეცდომა'}</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-hairline px-5 py-3">
        <div className="text-body-sm text-fg-primary">{thread.data.participantName}</div>
        <div className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
          {channelLabel[thread.data.channel]}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {thread.data.messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.direction === 'Outbound' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-sm px-3 py-2 text-body-sm ${
                m.direction === 'Outbound'
                  ? 'bg-accent-amber/15 text-fg-primary'
                  : 'bg-bg-elevated text-fg-primary'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              <div className="mt-1 font-mono text-caption uppercase tracking-wider text-fg-tertiary tabular-nums">
                {formatTime(m.atUtc)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (reply.trim().length > 0) {
            replyMutation.mutate();
          }
        }}
        className="border-t border-hairline px-5 py-3"
      >
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">პასუხი</span>
          <button
            type="button"
            disabled={suggestMutation.isPending}
            onClick={() => suggestMutation.mutate()}
            className="font-mono text-caption uppercase tracking-wider text-fg-tertiary transition-colors hover:text-accent-amber disabled:opacity-50"
          >
            {suggestMutation.isPending ? 'ფიქრობს…' : 'ai · შემოთავაზება'}
          </button>
        </div>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          placeholder="დაწერე პასუხი…"
          className="w-full resize-y rounded-sm border border-hairline-strong bg-bg-base px-3 py-2 text-body-sm text-fg-primary outline-none focus:border-accent-amber"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={replyMutation.isPending || reply.trim().length === 0}
            className="rounded-sm bg-accent-amber px-4 py-1.5 font-headline text-body-sm text-bg-base transition-colors hover:bg-accent-amber-h disabled:opacity-50"
          >
            {replyMutation.isPending ? 'იგზავნება…' : 'გაგზავნა →'}
          </button>
        </div>
      </form>
    </div>
  );
};
