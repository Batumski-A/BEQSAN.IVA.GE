import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Phone, RefreshCw, Search } from 'lucide-react';

import { AdminLayout } from './AdminLayout';
import { listOrders, type OrderListItem, type OrderStatus } from './api';

const STATUS_LABELS: Record<OrderStatus, string> = {
  Pending: 'მოლოდინში',
  Confirmed: 'დადასტურებული',
  InProduction: 'წარმოებაში',
  Ready: 'მზადაა',
  Delivered: 'ჩაბარებული',
  Cancelled: 'გაუქმდა',
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  Pending: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
  Confirmed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  InProduction: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Ready: 'bg-system-success/15 text-system-success border-system-success/30',
  Delivered: 'bg-fg-tertiary/15 text-fg-tertiary border-hairline-strong',
  Cancelled: 'bg-system-danger/15 text-system-danger border-system-danger/30',
};

const FILTERS: Array<OrderStatus | 'All'> = [
  'All',
  'Pending',
  'Confirmed',
  'InProduction',
  'Ready',
  'Delivered',
  'Cancelled',
];

const formatPrice = (minor: number, currency: string): string => {
  const major = (minor / 100).toLocaleString('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${major} ${currency === 'Gel' ? '₾' : currency}`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('ka-GE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const OrdersListPage = (): JSX.Element => {
  const [filter, setFilter] = useState<OrderStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listOrders({
        status: filter === 'All' ? null : filter,
        page: 1,
        pageSize: 100,
      });
      setOrders(resp.items);
      setTotal(resp.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ჩატვირთვა ვერ მოხერხდა.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.trim().toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q)
        || o.customerName.toLowerCase().includes(q)
        || o.customerPhone.includes(q),
    );
  }, [orders, search]);

  return (
    <AdminLayout
      title="შეკვეთები"
      subtitle={`ჯამში ${total} შეკვეთა · ${filter === 'All' ? 'ყველა სტატუსი' : STATUS_LABELS[filter]}`}
      trailing={
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-md border border-hairline-strong bg-bg-elevated px-3 py-1.5 font-mono text-caption uppercase tracking-wider text-fg-tertiary hover:text-fg-primary hover:border-accent-amber/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          განახლება
        </button>
      }
    >
      {/* Filter chips + search */}
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
                  : 'border-hairline-strong bg-bg-elevated/40 text-fg-tertiary hover:text-fg-primary hover:border-accent-amber/30'
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

      {error && (
        <div className="mb-4 rounded-md border border-system-danger/40 bg-system-danger/5 px-3 py-2 text-body-sm text-system-danger">
          {error}
        </div>
      )}

      {/* List */}
      {loading && orders.length === 0 ? (
        <div className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-8 text-center font-mono text-caption uppercase tracking-wider text-fg-tertiary">
          იტვირთება…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-12 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-fg-disabled" />
          <p className="mt-3 text-body text-fg-secondary">შეკვეთა ვერ მოიძებნა</p>
          <p className="mt-1 font-mono text-caption text-fg-tertiary">
            {filter !== 'All'
              ? `"${STATUS_LABELS[filter]}" სტატუსში ცარიელია.`
              : 'პირველი შეკვეთა ჯერ არ შემოსულა.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filtered.map((o) => (
              <Link
                key={o.id}
                to={`/adminpanel/orders/${o.id}`}
                className="block rounded-xl border border-hairline-strong bg-bg-elevated/40 p-4 hover:border-accent-amber/40 active:scale-[0.99] transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="font-mono text-body-sm font-bold text-fg-primary tabular-nums">
                      {o.orderNumber}
                    </div>
                    <div className="text-body-sm text-fg-primary truncate">{o.customerName}</div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLES[o.status]}`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-body-sm">
                  <a
                    href={`tel:${o.customerPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 font-mono tabular-nums text-fg-secondary hover:text-accent-amber"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {o.customerPhone}
                  </a>
                  <span className="font-mono font-bold tabular-nums text-accent-amber">
                    {formatPrice(o.totalPriceMinor, o.currency)}
                  </span>
                </div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-fg-tertiary">
                  {formatDate(o.createdAtUtc)}
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table (md+) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-hairline-strong bg-bg-elevated/40">
            <table className="w-full">
              <thead className="border-b border-hairline bg-bg-base/40">
                <tr className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                  <th className="px-4 py-3 text-left">№</th>
                  <th className="px-4 py-3 text-left">მომხმარებელი</th>
                  <th className="px-4 py-3 text-left">ტელეფონი</th>
                  <th className="px-4 py-3 text-right">ჯამი</th>
                  <th className="px-4 py-3 text-left">სტატუსი</th>
                  <th className="px-4 py-3 text-left">დრო</th>
                  <th className="px-4 py-3 text-right">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-hairline/60 last:border-0 hover:bg-bg-raised/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-body-sm tabular-nums text-fg-primary">
                      {o.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-body-sm text-fg-primary">{o.customerName}</td>
                    <td className="px-4 py-3 font-mono text-body-sm tabular-nums text-fg-secondary">
                      <a
                        href={`tel:${o.customerPhone}`}
                        className="inline-flex items-center gap-1.5 hover:text-accent-amber"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {o.customerPhone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-body-sm font-bold tabular-nums text-fg-primary">
                      {formatPrice(o.totalPriceMinor, o.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLES[o.status]}`}
                      >
                        {STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-caption tabular-nums text-fg-tertiary">
                      {formatDate(o.createdAtUtc)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/adminpanel/orders/${o.id}`}
                        className="rounded-md border border-hairline-strong bg-bg-base/40 px-3 py-1 font-mono text-caption uppercase tracking-wider text-fg-secondary hover:border-accent-amber hover:text-accent-amber transition-colors"
                      >
                        ნახვა
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
};
