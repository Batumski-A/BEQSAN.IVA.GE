import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  Banknote,
  TrendingUp,
  Percent,
  Clock,
  CheckCircle2,
  XCircle,
  Wrench,
  PackageCheck,
  Factory,
  RefreshCw,
} from 'lucide-react';

import { AdminLayout } from './AdminLayout';
import { getReportsOverview, type OrderStatus, type ReportsOverview } from './api';
import { ORDER_STATUS_LABEL, STATUS_FG, SkeletonBlock } from './statusPalette';

const STATUS_ICONS: Record<OrderStatus, React.ComponentType<{ className?: string }>> = {
  Pending: Clock,
  Confirmed: CheckCircle2,
  InProduction: Factory,
  Ready: PackageCheck,
  Delivered: Wrench,
  Cancelled: XCircle,
};

const fmtGel = (minor: number): string =>
  new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);

export const ReportsPage = (): JSX.Element => {
  const query = useQuery({
    queryKey: ['admin', 'reports', 'overview'],
    queryFn: getReportsOverview,
    refetchOnWindowFocus: false,
  });

  const data: ReportsOverview | undefined = query.data;

  return (
    <AdminLayout
      title="რეპორტები"
      subtitle="გაყიდვები, კონვერსია, აქტივობა"
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
      {query.isPending ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-32" />
            ))}
          </div>
          <SkeletonBlock className="mt-8 h-72" />
        </>
      ) : query.isError || !data ? (
        <div className="rounded-xl border border-system-danger/40 bg-system-danger/5 p-8 text-center text-system-danger">
          რეპორტი ვერ ჩამოიქაჩა.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="ჯამური შეკვეთები"
              value={data.totalOrders.toString()}
              sub={`+${data.last7Days} ბოლო 7 დღეში`}
              icon={ShoppingCart}
            />
            <Kpi
              label="შემოსავალი (ჩაბარებული)"
              value={`${fmtGel(data.revenueDeliveredMinor)} ₾`}
              sub={`pipeline: ${fmtGel(data.revenuePipelineMinor)} ₾`}
              icon={Banknote}
            />
            <Kpi
              label="კონვერსია"
              value={`${data.conversionPercent}%`}
              sub={`${data.byStatus.Delivered} ჩაბარდა / ${data.byStatus.Delivered + data.byStatus.Cancelled} დახურული`}
              icon={Percent}
            />
            <Kpi
              label="ბოლო 30 დღე"
              value={data.last30Days.toString()}
              sub="ახალი შემოსული შეკვეთა"
              icon={TrendingUp}
            />
          </div>

          {/* Status funnel */}
          <section className="mt-8 rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm p-6">
            <h2 className="mb-4 font-headline text-h4 text-fg-primary">სტატუსების განაწილება</h2>
            <div className="space-y-3">
              {(Object.keys(STATUS_ICONS) as OrderStatus[]).map((status) => {
                const Icon = STATUS_ICONS[status];
                const color = STATUS_FG[status];
                const label = ORDER_STATUS_LABEL[status];
                const count = data.byStatus[status] ?? 0;
                const pct = data.totalOrders > 0 ? (count / data.totalOrders) * 100 : 0;
                return (
                  <div key={status} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                    {/* Row 1 on mobile: label + count + pct. Row 1 on desktop: just label. */}
                    <div className="flex items-center gap-2 sm:w-44">
                      <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                      <span className="text-body-sm text-fg-primary flex-1 truncate">{label}</span>
                      <span className="font-mono text-body-sm tabular-nums text-fg-primary sm:hidden">
                        {count}
                      </span>
                      <span className="font-mono text-caption tabular-nums text-fg-tertiary sm:hidden">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="relative h-2.5 flex-1 overflow-hidden rounded-full border border-hairline bg-bg-base">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full bg-current ${color}`}
                        style={{ width: `${pct}%`, opacity: 0.6 }}
                      />
                    </div>
                    <span className="hidden sm:inline-block w-12 text-right font-mono text-body-sm tabular-nums text-fg-primary">
                      {count}
                    </span>
                    <span className="hidden sm:inline-block w-12 text-right font-mono text-caption tabular-nums text-fg-tertiary">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <p className="mt-6 text-center font-mono text-caption uppercase tracking-wider text-fg-tertiary">
            განახლდა {new Date(data.generatedAtUtc).toLocaleString('ka-GE')}
          </p>
        </>
      )}
    </AdminLayout>
  );
};

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm p-5 hover:border-accent-amber/40 transition-all">
      <div className="flex justify-between items-start">
        <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
          {label}
        </span>
        <div className="rounded-lg bg-bg-base/60 p-2 border border-hairline">
          <Icon className="h-5 w-5 text-accent-amber" />
        </div>
      </div>
      <div className="mt-3 font-mono text-h2 font-bold tabular-nums text-fg-primary">{value}</div>
      <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-fg-tertiary">
        {sub}
      </div>
    </div>
  );
}
