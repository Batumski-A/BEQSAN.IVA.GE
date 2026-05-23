import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Phone,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { AdminLayout } from './AdminLayout';
import {
  changeWarrantyStatus,
  listWarranties,
  type WarrantyListItem,
  type WarrantyStatus,
} from './api';

const STATUS_LABELS: Record<WarrantyStatus, string> = {
  Active: 'მოქმედი',
  Expired: 'ვადაგასული',
  Claimed: 'პრეტენზია',
  Resolved: 'მოგვარდა',
};

const STATUS_STYLES: Record<WarrantyStatus, string> = {
  Active: 'bg-system-success/15 text-system-success border-system-success/30',
  Expired: 'bg-fg-tertiary/15 text-fg-tertiary border-hairline-strong',
  Claimed: 'bg-system-danger/15 text-system-danger border-system-danger/30',
  Resolved: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const FILTERS: Array<WarrantyStatus | 'All'> = ['All', 'Active', 'Claimed', 'Resolved', 'Expired'];

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

const daysLeft = (endIso: string): number => {
  const end = new Date(endIso).getTime();
  const now = Date.now();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
};

export const WarrantiesPage = (): JSX.Element => {
  const [filter, setFilter] = useState<WarrantyStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'warranties', filter],
    queryFn: () => listWarranties({ status: filter === 'All' ? null : filter }),
  });

  const mutation = useMutation({
    mutationFn: (args: { id: string; status: WarrantyStatus }) =>
      changeWarrantyStatus(args.id, args.status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'warranties'] });
    },
  });

  const items = useMemo(() => {
    const arr = query.data?.items ?? [];
    if (!search.trim()) return arr;
    const q = search.toLowerCase();
    return arr.filter(
      (w) =>
        w.orderNumber.toLowerCase().includes(q)
        || w.customerName.toLowerCase().includes(q)
        || w.customerPhone.includes(q),
    );
  }, [query.data, search]);

  return (
    <AdminLayout
      title="გარანტიები"
      subtitle={`${query.data?.total ?? 0} ჩანაწერი · ${filter === 'All' ? 'ყველა სტატუსი' : STATUS_LABELS[filter]}`}
      trailing={
        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="flex items-center gap-2 rounded-md border border-hairline-strong bg-bg-elevated px-3 py-1.5 font-mono text-caption uppercase tracking-wider text-fg-tertiary hover:text-fg-primary hover:border-accent-amber/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
          განახლება
        </button>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md border px-3 py-1.5 font-mono text-caption uppercase tracking-wider transition-colors ${
                filter === f
                  ? 'border-accent-amber bg-accent-amber/10 text-accent-amber font-bold'
                  : 'border-hairline-strong bg-bg-elevated/40 text-fg-tertiary hover:text-fg-primary'
              }`}
            >
              {f === 'All' ? 'ყველა' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="ძებნა #, სახელი, ტელ."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-hairline bg-bg-base px-3 pl-10 py-2 text-body-sm text-fg-primary outline-none focus:border-accent-amber"
          />
        </div>
      </div>

      {query.isPending ? (
        <div className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-8 text-center font-mono text-caption uppercase tracking-wider text-fg-tertiary">
          იტვირთება…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-12 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-fg-disabled" />
          <p className="mt-3 text-body text-fg-secondary">გარანტია ჯერ არ არსებობს</p>
          <p className="mt-1 font-mono text-caption text-fg-tertiary">
            ჩაბარებული შეკვეთა ცარიელად ქმნის გარანტიის ჩანაწერს (60 თვე).
          </p>
        </div>
      ) : (
        <Cards
          items={items}
          mutating={mutation.isPending}
          onChange={(id, status) => mutation.mutate({ id, status })}
        />
      )}
    </AdminLayout>
  );
};

function Cards({
  items,
  mutating,
  onChange,
}: {
  items: WarrantyListItem[];
  mutating: boolean;
  onChange: (id: string, status: WarrantyStatus) => void;
}): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((w) => {
        const dl = daysLeft(w.endDateUtc);
        const isExpiring = w.status === 'Active' && dl < 60;
        return (
          <article
            key={w.id}
            className="rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm p-5 hover:border-accent-amber/30 transition-colors"
          >
            <header className="flex items-start justify-between border-b border-hairline pb-3 mb-3 gap-2">
              <div>
                <div className="font-mono text-body-sm font-bold text-fg-primary">
                  {w.orderNumber}
                </div>
                <div className="text-body-sm text-fg-secondary">{w.customerName}</div>
              </div>
              <span
                className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap ${STATUS_STYLES[w.status]}`}
              >
                {STATUS_LABELS[w.status]}
              </span>
            </header>

            <dl className="space-y-1.5 text-body-sm">
              <Row label="ტელეფონი">
                <a href={`tel:${w.customerPhone}`} className="inline-flex items-center gap-1.5 font-mono tabular-nums text-accent-amber hover:underline">
                  <Phone className="h-3.5 w-3.5" />
                  {w.customerPhone}
                </a>
              </Row>
              <Row label="ხანგრძლივობა">
                <span className="font-mono tabular-nums">{w.durationMonths} თვე</span>
              </Row>
              <Row label="ვადა">
                <span className="font-mono tabular-nums">
                  {formatDate(w.startDateUtc)} → {formatDate(w.endDateUtc)}
                </span>
              </Row>
              {w.status === 'Active' && (
                <Row label="დარჩა">
                  <span className={`font-mono tabular-nums ${isExpiring ? 'text-accent-amber font-bold' : ''}`}>
                    {dl > 0 ? `${dl} დღე` : 'ვადა გავიდა'}
                  </span>
                </Row>
              )}
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {w.status === 'Active' && (
                <button
                  type="button"
                  onClick={() => onChange(w.id, 'Claimed')}
                  disabled={mutating}
                  className="flex items-center gap-1.5 rounded-md border border-system-danger/40 bg-system-danger/5 px-3 py-2 font-mono text-caption uppercase tracking-wider text-system-danger hover:bg-system-danger/10 active:scale-95 transition-all disabled:opacity-50 min-h-[40px]"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  პრეტენზია
                </button>
              )}
              {w.status === 'Claimed' && (
                <button
                  type="button"
                  onClick={() => onChange(w.id, 'Resolved')}
                  disabled={mutating}
                  className="flex items-center gap-1.5 rounded-md border border-blue-500/40 bg-blue-500/5 px-3 py-2 font-mono text-caption uppercase tracking-wider text-blue-400 hover:bg-blue-500/10 active:scale-95 transition-all disabled:opacity-50 min-h-[40px]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  მოგვარდა
                </button>
              )}
              {w.status === 'Resolved' && (
                <button
                  type="button"
                  onClick={() => onChange(w.id, 'Active')}
                  disabled={mutating}
                  className="flex items-center gap-1.5 rounded-md border border-system-success/40 bg-system-success/5 px-3 py-2 font-mono text-caption uppercase tracking-wider text-system-success hover:bg-system-success/10 active:scale-95 transition-all disabled:opacity-50 min-h-[40px]"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  დააბრუნე Active
                </button>
              )}
              <Link
                to={`/adminpanel/orders/${w.orderId}`}
                className="ml-auto flex items-center gap-1.5 rounded-md border border-hairline-strong bg-bg-base/40 px-3 py-2 font-mono text-caption uppercase tracking-wider text-fg-secondary hover:text-fg-primary hover:border-accent-amber/30 active:scale-95 transition-all min-h-[40px]"
              >
                შეკვეთა
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-fg-tertiary">{label}</dt>
      <dd className="text-fg-primary">{children}</dd>
    </div>
  );
}
