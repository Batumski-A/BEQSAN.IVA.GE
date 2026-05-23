import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Info, HelpCircle, Check, X, Pencil } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { adminApi as api, unwrap, updateMaterial, type ApiResponse } from './api';

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

const productImages: Record<string, string> = {
  'pvc-windows': '/img/modern-pvc-window.png',
  'aluminum-sliding': '/img/aluminum-sliding-door.png',
  'aluminum-windows': '/img/modern-aluminum-window.png',
  'sliding-doors': '/img/aluminum-sliding-door.png',
  'vitrage-facades': '/img/panoramic-facade-vitrage.png',
  'balcony-block': '/img/balcony-block-door.png',
  'insect-screens': '/img/premium-mosquito-net.png',
  'pvc-profiles': '/img/pvc-profile-detail.png',
  'aluminum-profiles': '/img/aluminum-profile-detail.png',
  'premium-handles': '/img/premium-handle-detail.png',
  'sliding-rollers': '/img/sliding-roller-detail.png',
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
  const [searchQuery, setSearchQuery] = useState('');

  const ptQuery = useQuery({
    queryKey: ['catalog', 'product-types'],
    queryFn: async () => {
      const resp = await api.get<ApiResponse<ProductType[]>>('/api/v1/catalog/product-types');
      return unwrap(resp.data);
    },
  });

  return (
    <AdminLayout
      title="ფასები"
      subtitle="მასალები · საბაზო ფასი მ²-ზე"
      trailing={
        <div className="relative w-full max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-tertiary" />
          <input
            type="text"
            placeholder="ძებნა კატალოგში..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-hairline-strong bg-bg-elevated pl-9 pr-3 py-1.5 text-body-sm text-fg-primary outline-none focus:border-accent-amber transition-colors"
          />
        </div>
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
              <ProductTypeSection key={pt.id} pt={pt} searchQuery={searchQuery} />
            ))}
          <FootNote />
        </div>
      )}
    </AdminLayout>
  );
};

function ProductTypeSection({
  pt,
  searchQuery,
}: {
  pt: ProductType;
  searchQuery: string;
}): JSX.Element | null {
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
  const imageSrc = productImages[pt.slug] || '/img/modern-pvc-window.png';

  // Client-side search logic
  const materials = matQuery.data ?? [];
  const query = searchQuery.toLowerCase().trim();

  const filteredMaterials = materials.filter((m) => {
    if (!query) return true;
    const nameKa = m.name?.ka?.toLowerCase() ?? '';
    const nameEn = m.name?.en?.toLowerCase() ?? '';
    const slug = m.slug.toLowerCase();
    const family = m.family?.toLowerCase() ?? '';
    return (
      nameKa.includes(query) ||
      nameEn.includes(query) ||
      slug.includes(query) ||
      family.includes(query)
    );
  });

  const isPtMatch = ptName.toLowerCase().includes(query) || pt.slug.toLowerCase().includes(query);

  // If search is active, hide sections that do not match the product type AND have no matching materials
  if (query && !isPtMatch && filteredMaterials.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm shadow-sm transition-all hover:border-hairline-strong/80">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline px-6 py-4 bg-bg-elevated/20">
        <div className="flex items-center gap-3">
          <img
            src={imageSrc}
            alt={ptName}
            className="h-10 w-10 object-cover rounded-md border border-hairline bg-bg-base/40"
          />
          <div>
            <h2 className="font-headline text-body font-bold text-fg-primary leading-tight">{ptName}</h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-tertiary">
              {pt.slug}
            </span>
          </div>
        </div>
        <span className="rounded bg-bg-raised px-2 py-0.5 font-mono text-[11px] text-fg-secondary border border-hairline">
          {materials.length} მასალა
        </span>
      </header>

      <div className="p-6">
        {matQuery.isPending ? (
          <div className="flex items-center gap-2 font-mono text-caption text-fg-tertiary">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-amber border-t-transparent" />
            იტვირთება…
          </div>
        ) : matQuery.isError ? (
          <p className="text-body-sm text-system-danger">
            მასალები ვერ ჩამოიქაჩა — შეამოწმე API.
          </p>
        ) : filteredMaterials.length === 0 ? (
          <p className="text-body-sm text-fg-tertiary">
            {query ? 'შესაბამისი მასალა არ მოიძებნა.' : 'მასალები არ არის ამ პროდუქტისთვის.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-hairline pb-2">
                  <th className="pb-2.5 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                    მასალა
                  </th>
                  <th className="pb-2.5 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                    ოჯახი
                  </th>
                  <th className="pb-2.5 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                    თერმო-რეიტინგი
                  </th>
                  <th className="pb-2.5 text-right font-mono text-caption uppercase tracking-wider text-fg-tertiary">
                    საბაზო ფასი / მ²
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredMaterials.map((m) => (
                  <tr key={m.id} className="group hover:bg-bg-raised/20 transition-colors">
                    <td className="py-3.5 pr-4 text-body-sm">
                      <div className="font-medium text-fg-primary">{localized(m.name, m.slug)}</div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-tertiary group-hover:text-fg-secondary">
                        {m.slug}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-body-sm text-fg-secondary">
                      {m.family ? (
                        <span className="rounded-md border border-hairline bg-bg-base/20 px-2 py-0.5 font-mono text-[11px]">
                          {m.family}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 pr-4 text-body-sm text-fg-secondary">
                      {m.thermalRating || '—'}
                    </td>
                    <td className="py-3.5 text-right font-mono text-body-sm tabular-nums text-fg-primary">
                      <InlinePriceCell
                        materialId={m.id}
                        productTypeId={pt.id}
                        priceMinor={m.basePricePerSqmMinor}
                        currency={m.currency ?? 'GEL'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function InlinePriceCell({
  materialId,
  productTypeId,
  priceMinor,
  currency,
}: {
  materialId: string;
  productTypeId: string;
  priceMinor: number;
  currency: string;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(() => (priceMinor / 100).toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newMinor: number) =>
      updateMaterial(materialId, { basePricePerSqmMinor: newMinor }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog', 'materials', productTypeId] });
      setEditing(false);
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'შენახვა ვერ მოხერხდა.'),
  });

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft((priceMinor / 100).toFixed(2));
          setEditing(true);
          setError(null);
        }}
        className="group/edit inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 hover:border-accent-amber/30 hover:bg-bg-raised/40 active:scale-95 transition-all min-h-[40px]"
        title="დააჭირე რომ შეცვალო"
      >
        <span className="font-bold text-accent-amber">{fmtGel(priceMinor)}</span>{' '}
        <span className="text-[10px] text-fg-tertiary">{currency}</span>
        <Pencil className="h-3 w-3 text-fg-tertiary opacity-60 md:opacity-0 md:group-hover/edit:opacity-100 transition-opacity" />
      </button>
    );
  }

  const submit = () => {
    setError(null);
    const major = Number.parseFloat(draft.replace(',', '.'));
    if (!Number.isFinite(major) || major <= 0) {
      setError('ფასი არასწორია.');
      return;
    }
    const minor = Math.round(major * 100);
    mutation.mutate(minor);
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="inline-flex items-center justify-end gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') {
              setEditing(false);
              setError(null);
            }
          }}
          disabled={mutation.isPending}
          className="w-24 rounded border border-accent-amber/50 bg-bg-base px-2 py-1.5 text-right font-mono text-body-sm tabular-nums text-fg-primary outline-none focus:border-accent-amber min-h-[40px]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={mutation.isPending}
          className="rounded-md border border-system-success/40 bg-system-success/10 p-2 text-system-success hover:bg-system-success/20 active:scale-95 transition-all disabled:opacity-50 min-h-[40px] min-w-[40px]"
          aria-label="შენახვა"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          disabled={mutation.isPending}
          className="rounded-md border border-hairline-strong p-2 text-fg-tertiary hover:text-fg-primary active:scale-95 transition-all disabled:opacity-50 min-h-[40px] min-w-[40px]"
          aria-label="გაუქმება"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <span className="font-mono text-[10px] text-system-danger">{error}</span>
      )}
    </div>
  );
}

function Skeleton(): JSX.Element {
  return (
    <div className="space-y-8">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 animate-pulse rounded-md bg-bg-raised" />
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-bg-raised" />
              <div className="h-3 w-16 animate-pulse rounded bg-bg-raised" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-10 w-full animate-pulse rounded bg-bg-raised" />
            <div className="h-10 w-full animate-pulse rounded bg-bg-raised" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }): JSX.Element {
  return (
    <div className="rounded-xl border border-system-danger/20 bg-system-danger/5 p-6 text-center max-w-xl mx-auto">
      <HelpCircle className="h-12 w-12 text-system-danger mx-auto mb-3" />
      <h2 className="font-headline text-body font-bold text-fg-primary">კატალოგი ვერ ჩამოიქაჩა</h2>
      <p className="mt-2 text-caption text-fg-secondary">
        API სერვერი არ პასუხობს. გთხოვთ შეამოწმოთ ინტერნეტის კავშირი ან ცადოთ მოგვიანებით.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-9 items-center rounded-md bg-bg-raised border border-hairline-strong px-4 font-mono text-caption uppercase tracking-wider text-fg-primary hover:border-accent-amber hover:text-accent-amber transition-colors"
      >
        თავიდან ცადე
      </button>
    </div>
  );
}

function FootNote(): JSX.Element {
  return (
    <div className="rounded-xl border border-hairline-strong bg-bg-elevated/25 p-5 text-body-sm text-fg-tertiary flex items-start gap-3">
      <Info className="h-5 w-5 text-accent-amber shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        ფასებზე დააჭირე რომ ცარიელად შეცვალო — <kbd className="rounded bg-bg-base/50 px-1 py-0.5 font-mono text-[11px] text-fg-secondary">Enter</kbd> შენახვა,{' '}
        <kbd className="rounded bg-bg-base/50 px-1 py-0.5 font-mono text-[11px] text-fg-secondary">Esc</kbd> გაუქმება.
        ცვლილებები პირდაპირ მიდის DB-ში (<code className="font-mono text-[12px]">PATCH /api/v1/admin/catalog/materials/:id</code>).
      </p>
    </div>
  );
}

