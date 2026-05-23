import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi, type InboxChannel, type InboxThread } from './api';
import { AdminLayout } from '../AdminLayout';
import {
  Facebook,
  Instagram,
  Search,
  Send,
  Sparkles,
  MessageSquare,
  MessageCircle,
  Inbox,
  Clock,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

const channelLabel: Record<InboxChannel, string> = {
  InstagramDm: 'Instagram DM',
  FacebookMessenger: 'Messenger',
  InstagramComment: 'IG Comment',
  FacebookComment: 'FB Comment',
};

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString('ka-GE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const InboxPage = (): JSX.Element => {
  const qc = useQueryClient();
  const threadsQuery = useQuery({ queryKey: ['social', 'inbox'], queryFn: () => socialApi.listInbox(50) });
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Client-side search of conversation threads
  const filteredThreads = useMemo(() => {
    const list = threadsQuery.data ?? [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (t) =>
        t.participantName?.toLowerCase().includes(q) ||
        t.lastMessagePreview?.toLowerCase().includes(q) ||
        t.pageName?.toLowerCase().includes(q),
    );
  }, [threadsQuery.data, searchQuery]);

  return (
    <AdminLayout title="მიმოწერა" subtitle="ინბოქსი · Meta მიმოწერების ცენტრი">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px,1fr] lg:h-[calc(100vh-220px)] min-h-[500px]">
        {/* Left pane: Threads List */}
        <aside className="flex flex-col rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm overflow-hidden shadow-md">
          {/* Header & Search */}
          <div className="p-4 border-b border-hairline bg-bg-elevated/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-fg-tertiary">
                მიმოწერები ({filteredThreads.length})
              </span>
              <span className="rounded-md bg-bg-raised px-2 py-0.5 font-mono text-[10px] text-fg-secondary border border-hairline">
                აქტიური
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-tertiary" />
              <input
                type="text"
                placeholder="ძებნა მიმოწერებში..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-bg-base pl-9 pr-3 py-1.5 text-body-sm text-fg-primary outline-none focus:border-accent-amber transition-colors"
              />
            </div>
          </div>

          {/* Threads scrolling viewport */}
          <div className="flex-1 overflow-y-auto divide-y divide-hairline bg-bg-elevated/5">
            {threadsQuery.isLoading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-raised/40" />
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="px-4 py-12 text-center flex flex-col items-center justify-center text-fg-tertiary">
                <Inbox className="h-8 w-8 text-fg-tertiary/45 mb-2" />
                <p className="text-body-sm">
                  {searchQuery ? 'შესაბამისი ჩატი არ მოიძებნა.' : 'შემავალი შეტყობინებები ცარიელია.'}
                </p>
              </div>
            ) : (
              <ul>
                {filteredThreads.map((t) => (
                  <ThreadRow
                    key={t.id}
                    thread={t}
                    active={t.id === activeThreadId}
                    onSelect={() => setActiveThreadId(t.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Right pane: Chat View */}
        <section className="flex flex-col rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm overflow-hidden shadow-md">
          {activeThreadId ? (
            <ThreadView
              threadId={activeThreadId}
              onReplied={() => {
                void qc.invalidateQueries({ queryKey: ['social', 'inbox'] });
                void qc.invalidateQueries({ queryKey: ['social', 'thread', activeThreadId] });
              }}
            />
          ) : (
            <div className="flex flex-col h-full min-h-[400px] items-center justify-center text-center p-8 bg-bg-elevated/5">
              <MessageSquare className="h-12 w-12 text-accent-amber/40 mb-3 animate-pulse" />
              <h3 className="font-headline text-body font-bold text-fg-primary">საუბარი არ არის არჩეული</h3>
              <p className="mt-2 text-caption text-fg-secondary max-w-sm leading-relaxed">
                მიმოწერის სანახავად, მომხმარებელთან საუბრის დასაწყებად ან AI-სთან პასუხის დასაგენერირებლად აირჩიეთ ჩატი მარცხენა სიიდან.
              </p>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

/* --- Component Helpers --- */

const ThreadRow = ({
  thread,
  active,
  onSelect,
}: {
  thread: InboxThread;
  active: boolean;
  onSelect: () => void;
}): JSX.Element => {
  const isInstagram = thread.channel.includes('Instagram');
  const isMessenger = thread.channel === 'FacebookMessenger';

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-start gap-3.5 px-4 py-4 text-left transition-all ${
          active ? 'bg-bg-raised/70 border-l-2 border-accent-amber' : 'hover:bg-bg-raised/30 border-l-2 border-transparent'
        }`}
      >
        {/* Unread Glow Dot or User Initials avatar */}
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-raised border border-hairline text-fg-primary font-headline text-body-sm font-bold shadow-sm">
            {thread.participantName ? thread.participantName.slice(0, 2).toUpperCase() : 'ან'}
          </div>
          {thread.hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-amber opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-amber border border-bg-base"></span>
            </span>
          )}
        </div>

        {/* Info Grid */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className={`truncate text-body-sm font-bold text-fg-primary ${thread.hasUnread ? 'font-black' : ''}`}>
              {thread.participantName || 'მომხმარებელი'}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-fg-tertiary flex items-center gap-1 shrink-0">
              {isInstagram ? (
                <Instagram className="h-3 w-3 text-[#c32aa3]" />
              ) : isMessenger ? (
                <MessageCircle className="h-3 w-3 text-[#0084FF]" />
              ) : (
                <Facebook className="h-3 w-3 text-[#1877F2]" />
              )}
              {channelLabel[thread.channel].split(' ')[1] || channelLabel[thread.channel]}
            </span>
          </div>
          
          <p className={`mt-1.5 truncate text-[12px] text-fg-secondary ${thread.hasUnread ? 'text-fg-primary font-medium' : ''}`}>
            {thread.lastMessagePreview}
          </p>

          <div className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-fg-tertiary">
            <span className="truncate">{thread.pageName}</span>
            <span className="tabular-nums flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {formatTime(thread.lastMessageAtUtc)}
            </span>
          </div>
        </div>
      </button>
    </li>
  );
};

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
    return (
      <div className="p-8 text-center flex flex-col h-full items-center justify-center text-fg-tertiary">
        <RefreshCw className="h-8 w-8 text-accent-amber animate-spin mb-3" />
        <p className="font-mono text-[10px] uppercase tracking-wider">მიმოწერის ჩატვირთვა…</p>
      </div>
    );
  }
  if (thread.isError || !thread.data) {
    return (
      <div className="p-8 text-center flex flex-col h-full items-center justify-center text-system-danger">
        <ShieldAlert className="h-8 w-8 text-system-danger mb-3" />
        <p className="font-bold">მიმოწერა ვერ ჩამოიქაჩა</p>
        <p className="mt-1 text-caption text-fg-secondary">{(thread.error as Error)?.message ?? 'უცნობი შეცდომა API კავშირისას'}</p>
      </div>
    );
  }

  const isInstagram = thread.data.channel.includes('Instagram');
  const isMessenger = thread.data.channel === 'FacebookMessenger';

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Thread Header */}
      <header className="border-b border-hairline px-6 py-4 bg-bg-elevated/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-amber text-bg-base font-headline text-body font-bold shadow-md">
            {thread.data.participantName ? thread.data.participantName.slice(0, 2).toUpperCase() : 'ან'}
          </div>
          <div>
            <div className="text-body-sm font-bold text-fg-primary leading-tight">{thread.data.participantName}</div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-fg-tertiary flex items-center gap-1.5 mt-1">
              {isInstagram ? (
                <Instagram className="h-3.5 w-3.5 text-[#c32aa3]" />
              ) : isMessenger ? (
                <MessageCircle className="h-3.5 w-3.5 text-[#0084FF]" />
              ) : (
                <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />
              )}
              {channelLabel[thread.data.channel]}
            </div>
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 bg-bg-elevated/5">
        {thread.data.messages.map((m) => {
          const isOutbound = m.direction === 'Outbound';
          return (
            <div
              key={m.id}
              className={`flex items-end gap-2.5 ${isOutbound ? 'justify-end' : 'justify-start'}`}
            >
              {/* User Initials Avatar on Left side */}
              {!isOutbound && (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-raised border border-hairline text-fg-tertiary font-headline text-[9px] font-bold">
                  {thread.data.participantName ? thread.data.participantName.slice(0, 1).toUpperCase() : 'ან'}
                </div>
              )}

              <div
                className={`max-w-[70%] rounded-xl px-4 py-3 text-body-sm shadow-sm relative group transition-all ${
                  isOutbound
                    ? 'bg-accent-amber/15 border border-accent-amber/35 text-fg-primary rounded-br-none'
                    : 'bg-bg-elevated/70 border border-hairline-strong text-fg-primary rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                <div className="mt-2 font-mono text-[8px] uppercase tracking-wider text-fg-tertiary/75 flex items-center justify-end gap-1.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formatTime(m.atUtc)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply input & AI Suggestions */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (reply.trim().length > 0) {
            replyMutation.mutate();
          }
        }}
        className="border-t border-hairline px-6 py-4 bg-bg-elevated/10"
      >
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-fg-tertiary">
            პასუხის ფორმა
          </span>
          <button
            type="button"
            disabled={suggestMutation.isPending}
            onClick={() => suggestMutation.mutate()}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-accent-amber hover:text-accent-amber/90 transition-colors disabled:opacity-50 font-bold bg-accent-amber/5 px-2.5 py-1 rounded-md border border-accent-amber/10"
          >
            {suggestMutation.isPending ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                ფიქრობს…
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                AI-ით პასუხი
              </>
            )}
          </button>
        </div>
        <div className="relative">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="დაწერე პასუხი აქ..."
            className="w-full resize-none rounded-xl border border-hairline-strong bg-bg-base/60 px-4 py-3 pr-12 text-body-sm text-fg-primary outline-none focus:border-accent-amber transition-colors"
          />
          <button
            type="submit"
            disabled={replyMutation.isPending || reply.trim().length === 0}
            className="absolute right-3.5 bottom-3.5 rounded-lg bg-accent-amber p-2 text-bg-base font-bold transition-all hover:bg-accent-amber/90 active:scale-95 disabled:opacity-30 disabled:scale-100"
          >
            {replyMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

