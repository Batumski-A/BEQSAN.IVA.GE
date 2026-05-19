import { useQuery } from '@tanstack/react-query';
import { Shell } from '../../components/shell/Shell';
import { api, unwrap, type ApiResponse } from '../../lib/api';

/**
 * Read-only pricing surface (Phase 1). Lists every product type and the
 * materials available under it, with the base price per square metre that
 * BACK's pricing engine multiplies area against. Editing inline is the next
 * step — needs an admin write endpoint (PATCH /api/v1/admin/catalog/materials/:id)
 * that doesn't exist yet. For now, the page surfaces the data so Roman can
 * audit what the configurator quotes against and flag deltas.
 *
 * Layered surcharges (colour modifier, glass surcharge, accessory absolute,
 * region modifier) ship as separate panels once their respective admin
 * endpoints land.
 */

type LocalizedName = { ka?: string | null; en?: string | null; ru?: string | null };

type ProductType = {
  id: string;
  slug: string;
  name: LocalizedName;
  sortOrder?: number;
};

type Material = {
  id: string;
  slug: string;
  name: LocalizedName;
  family?: string | null;
  thermalRating?: string | null;
  basePricePerSqmMinor: number;
  currency?: string | null;
};

function fmtGel(minor: number): string {
  return new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

function localized(n: LocalizedName | undefined, fallback: string): string {
  return n?.ka ?? n?.en ?? n?.ru ?? fallback;
}

export const PricingPage = (): JSX.Element => {
  const ptQuery = useQuery({
    queryKey: ['catalog', 'product-types'],
    queryFn: async () => {
      const resp = await api.get<ApiResponse<ProductType[]>>('/api/v1/catalog/product-types');
      return unwrap(resp.data);
    },
  });

  return (
    <Shell
      title="ფასები"
      subtitle="მასალები · საბაზო ფასი მ²-ზე"
      trailing={
        <span className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
          read-only · phase 1
        </span>
      }
    >
      {ptQuery.isPending ? (
        <Skeleton />
      ) : ptQuery.isError ? (
        <ErrorBlock onRetry={() => ptQuery.refetch()} />
      ) : (
        <div className="space-y-8">
          {(ptQuery.data ?? [])
            .slice()
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((pt) => (
              <ProductTypeSection key={pt.id} pt={pt} />
            ))}
          <FootNote />
        </div>
      )}
    </Shell>
  );
};

function ProductTypeSection({ pt }: { pt: ProductType }): JSX.Element {
  const matQuery = useQuery({
    queryKey: ['catalog', 'materials', pt.id],
    queryFn: async () => {
      const resp = await api.get<ApiResponse<Material[]>>(
        `/api/v1/catalog/product-types/${pt.id}/materials`,
      );
      return unwrap(resp.data);
    },
  });
  const ptName = localized(pt.name, pt.slug);
  return (
    <section className="rounded-sm border border-hairline bg-bg-raised p-6">
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-headline text-h4 tracking-tight text-fg-primary">{ptName}</h2>
        <span className="font-mono text-caption uppercase tracking-wider text-fg-tertiary">
          {pt.slug}
        </span>
      </header>

      {matQuery.isPending ? (
        <p className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
          იტვირთება…
        </p>
      ) : matQuery.isError ? (
        <p className="text-body-sm text-fg-secondary">
          მასალები ვერ ჩამოიქაჩა — შეამოწმე API.
        </p>
      ) : (matQuery.data ?? []).length === 0 ? (
        <p className="text-body-sm text-fg-secondary">მასალები არ არის ამ პროდუქტისთვის.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-hairline">
              <th className="py-2 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                მასალა
              </th>
              <th className="py-2 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                ფამილია
              </th>
              <th className="py-2 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                თერმო-რეიტინგი
              </th>
              <th className="py-2 text-right font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                საბაზო / მ²
              </th>
            </tr>
          </thead>
          <tbody>
            {matQuery.data!.map((m) => (
              <tr key={m.id} className="border-b border-hairline last:border-b-0">
                <td className="py-3 text-body-sm text-fg-primary">
                  <div>{localized(m.name, m.slug)}</div>
                  <div className="mt-0.5 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                    {m.slug}
                  </div>
                </td>
                <td className="py-3 text-body-sm text-fg-secondary">{m.family ?? '—'}</td>
                <td className="py-3 text-body-sm text-fg-secondary">{m.thermalRating ?? '—'}</td>
                <td className="py-3 text-right font-mono text-body-sm tabular-nums text-fg-primary">
                  {fmtGel(m.basePricePerSqmMinor)}{' '}
                  <span className="text-fg-tertiary">{m.currency ?? 'GEL'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Skeleton(): JSX.Element {
  return (
    <div className="space-y-8">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-sm border border-hairline bg-bg-raised p-6">
          <div className="mb-4 h-6 w-40 animate-pulse-soft rounded-sm bg-bg-elevated" />
          <div className="space-y-2">
            <div className="h-5 w-full animate-pulse-soft rounded-sm bg-bg-elevated" />
            <div className="h-5 w-4/5 animate-pulse-soft rounded-sm bg-bg-elevated" />
            <div className="h-5 w-2/3 animate-pulse-soft rounded-sm bg-bg-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }): JSX.Element {
  return (
    <div className="rounded-sm border border-system-danger/40 bg-bg-raised p-6">
      <h2 className="font-headline text-h4 text-fg-primary">პროდუქტი ვერ ჩამოიქაჩა</h2>
      <p className="mt-2 text-body-sm text-fg-secondary">
        API არ პასუხობს. შესაძლოა ბექი ჩამოვარდა ან ქსელი ვერ მუშაობს.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-10 items-center rounded-sm border border-hairline-strong px-4 font-mono text-mono-spec uppercase tracking-wider text-fg-primary hover:border-accent-amber hover:text-accent-amber"
      >
        თავიდან ცადე
      </button>
    </div>
  );
}

function FootNote(): JSX.Element {
  return (
    <div className="rounded-sm border border-hairline bg-bg-elevated p-6 text-body-sm text-fg-tertiary">
      <p>
        ფასები იცვლება ბექის seeder-ით (`MaterialSeeder.cs`). რეალური ცვლილებებისთვის
        ჯერ-ჯერობით საჭიროა SQLite-ის DB-ში პირდაპირი UPDATE ან migration. Inline
        editing დაემატება როცა <code className="font-mono text-fg-secondary">PATCH /api/v1/admin/catalog/materials/:id</code>{' '}
        endpoint-ი დაიხდება.
      </p>
    </div>
  );
}
