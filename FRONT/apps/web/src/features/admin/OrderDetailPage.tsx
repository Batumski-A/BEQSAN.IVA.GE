import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from 'lucide-react';

import { AdminLayout } from './AdminLayout';
import {
  changeOrderStatus,
  getOrder,
  type OrderDetail,
  type OrderStatus,
} from './api';

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

// Allowed transitions from each status. Cancellation is always available
// from any pre-delivery state.
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['InProduction', 'Cancelled'],
  InProduction: ['Ready', 'Cancelled'],
  Ready: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

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
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const OrderDetailPage = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState<OrderStatus | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getOrder(id);
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეკვეთა ვერ მოიძებნა.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleTransition = async (next: OrderStatus) => {
    if (!order) return;
    setChanging(next);
    try {
      await changeOrderStatus(order.id, next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'სტატუსის შეცვლა ვერ მოხერხდა.');
    } finally {
      setChanging(null);
    }
  };

  if (loading && !order) {
    return (
      <AdminLayout title="შეკვეთა" subtitle="იტვირთება…">
        <div className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-12 text-center font-mono text-caption uppercase tracking-wider text-fg-tertiary">
          იტვირთება…
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout title="შეკვეთა" subtitle="ვერ მოიძებნა">
        <div className="rounded-xl border border-system-danger/40 bg-system-danger/5 p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-system-danger" />
          <p className="mt-3 text-body text-system-danger">{error ?? 'შეკვეთა არ მოიძებნა.'}</p>
          <button
            type="button"
            onClick={() => navigate('/adminpanel/orders')}
            className="mt-4 rounded-md border border-hairline-strong px-4 py-2 font-mono text-caption uppercase tracking-wider text-fg-secondary hover:text-fg-primary"
          >
            ← სიაში დაბრუნება
          </button>
        </div>
      </AdminLayout>
    );
  }

  const nextOptions = NEXT_STATUSES[order.status];

  return (
    <AdminLayout
      title={`შეკვეთა ${order.orderNumber}`}
      subtitle={`შემოვიდა ${formatDate(order.createdAtUtc)}`}
      trailing={
        <Link
          to="/adminpanel/orders"
          className="flex items-center gap-2 rounded-md border border-hairline-strong bg-bg-elevated px-3 py-1.5 font-mono text-caption uppercase tracking-wider text-fg-tertiary hover:text-fg-primary hover:border-accent-amber/40 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          სიაში დაბრუნება
        </Link>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-system-danger/40 bg-system-danger/5 px-3 py-2 text-body-sm text-system-danger">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status + workflow */}
        <section className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
            <h2 className="font-headline text-h4 text-fg-primary">სტატუსი</h2>
            <span
              className={`rounded border px-3 py-1 font-mono text-caption uppercase tracking-wider ${STATUS_STYLES[order.status]}`}
            >
              {STATUS_LABELS[order.status]}
            </span>
          </div>

          {nextOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {nextOptions.map((next) => {
                const isDanger = next === 'Cancelled';
                return (
                  <button
                    key={next}
                    type="button"
                    onClick={() => void handleTransition(next)}
                    disabled={changing !== null}
                    className={`flex items-center gap-2 rounded-md border px-4 py-2 font-mono text-caption uppercase tracking-wider transition-colors disabled:opacity-50 ${
                      isDanger
                        ? 'border-system-danger/40 bg-system-danger/5 text-system-danger hover:bg-system-danger/10'
                        : 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20 font-bold'
                    }`}
                  >
                    {changing === next ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : isDanger ? (
                      <XCircle className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {STATUS_LABELS[next]}-ში გადატანა
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="font-mono text-caption text-fg-tertiary">
              workflow დასრულდა — შემდეგი ნაბიჯი არ არის.
            </p>
          )}

          {/* History */}
          <div className="mt-6">
            <h3 className="mb-3 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
              ისტორია
            </h3>
            <ul className="space-y-2">
              {order.statusHistory.map((h, idx) => (
                <li
                  key={`${h.status}-${h.changedAtUtc}-${idx}`}
                  className="flex items-center justify-between rounded-md border border-hairline bg-bg-base/40 px-3 py-2"
                >
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLES[h.status]}`}
                  >
                    {STATUS_LABELS[h.status]}
                  </span>
                  <span className="font-mono text-caption tabular-nums text-fg-tertiary">
                    {formatDate(h.changedAtUtc)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Customer */}
        <section className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-5">
          <h2 className="border-b border-hairline pb-3 mb-4 font-headline text-h4 text-fg-primary">
            მომხმარებელი
          </h2>
          <dl className="space-y-3">
            <Field label="სახელი" value={order.customerName} />
            <Field
              label="ტელეფონი"
              value={
                <a
                  href={`tel:${order.customerPhone}`}
                  className="inline-flex items-center gap-1.5 font-mono text-body-sm tabular-nums text-accent-amber hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {order.customerPhone}
                </a>
              }
            />
            {order.customerEmail && (
              <Field
                label="ელ. ფოსტა"
                value={
                  <a
                    href={`mailto:${order.customerEmail}`}
                    className="inline-flex items-center gap-1.5 text-body-sm text-accent-amber hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {order.customerEmail}
                  </a>
                }
              />
            )}
            {order.customerAddress && (
              <Field
                label="მისამართი"
                value={
                  <span className="inline-flex items-center gap-1.5 text-body-sm text-fg-primary">
                    <MapPin className="h-3.5 w-3.5 text-fg-tertiary" />
                    {order.customerAddress}
                  </span>
                }
              />
            )}
            {order.notes && (
              <Field
                label="შენიშვნა"
                value={
                  <p className="text-body-sm text-fg-primary whitespace-pre-wrap">
                    {order.notes}
                  </p>
                }
              />
            )}
          </dl>
        </section>

        {/* Pricing */}
        <section className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-5 lg:col-span-2">
          <h2 className="border-b border-hairline pb-3 mb-4 font-headline text-h4 text-fg-primary flex items-center gap-2">
            <Package className="h-4.5 w-4.5 text-accent-amber" />
            კონფიგურაცია
          </h2>
          <pre className="overflow-x-auto rounded-md border border-hairline bg-bg-base/60 p-4 font-mono text-caption text-fg-secondary whitespace-pre-wrap break-all">
{JSON.stringify(order.configuration, null, 2)}
          </pre>
        </section>

        <section className="rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-5">
          <h2 className="border-b border-accent-amber/30 pb-3 mb-4 font-headline text-h4 text-accent-amber">
            ჯამური ფასი
          </h2>
          <div className="font-mono text-h2 font-bold tabular-nums text-fg-primary">
            {formatPrice(order.totalPriceMinor, order.currency)}
          </div>
          <div className="mt-3 flex items-center gap-2 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
            <Calendar className="h-3.5 w-3.5" />
            განახლდა {formatDate(order.updatedAtUtc)}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

function Field({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div>
      <dt className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-tertiary">
        {label}
      </dt>
      <dd className="text-body-sm text-fg-primary">{value}</dd>
    </div>
  );
}
