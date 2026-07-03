import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Eye, EyeOff, Pencil, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  basePricePerSqmMinor: number;
  isActive?: boolean;
  currency?: string | null;
};

const productImages: Record<string, string> = {
  'pvc-windows': '/img/modern-pvc-window.webp',
  'aluminum-sliding': '/img/aluminum-sliding-door.webp',
  'aluminum-windows': '/img/modern-aluminum-window.webp',
  'sliding-doors': '/img/aluminum-sliding-door.webp',
  'vitrage-facades': '/img/panoramic-facade-vitrage.webp',
  'balcony-block': '/img/balcony-block-door.webp',
  'insect-screens': '/img/premium-mosquito-net.webp',
  veranda: '/img/balcony-block-door.webp',
};

const localized = (n: LocalizedName | undefined, fallback: string): string =>
  n?.ka ?? n?.en ?? n?.ru ?? fallback;

const fmtGel = (minor: number): string =>
  new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);

export const CatalogPage = (): JSX.Element => {
  const ptQuery = useQuery({
    queryKey: ['catalog', 'product-types'],
    queryFn: async () => {
      const resp = await api.get<ApiResponse<ProductType[]>>('/api/v1/catalog/product-types');
      return unwrap(resp.data);
    },
  });

  return (
    <AdminLayout
      title="კატალოგი"
      subtitle="პროდუქტების ტიპები · მასალები · ხილვადობა"
      trailing={
        <button
          type="button"
          onClick={() => void ptQuery.refetch()}
          disabled={ptQuery.isFetching}
          className="flex items-center gap-2 rounded-md border border-hairline-strong bg-bg-elevated px-3 py-1.5 font-mono text-caption uppercase tracking-wider text-fg-tertiary hover:text-fg-primary hover:border-accent-amber/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${ptQuery.isFetching ? 'animate-spin' : ''}`} />
          განახლება
        </button>
      }
    >
      {ptQuery.isPending ? (
        <div className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-8 text-center font-mono text-caption uppercase tracking-wider text-fg-tertiary">
          იტვირთება…
        </div>
      ) : ptQuery.isError ? (
        <div className="rounded-xl border border-system-danger/40 bg-system-danger/5 p-8 text-center text-system-danger">
          კატალოგი ვერ ჩამოიქაჩა.
        </div>
      ) : (
        <div className="space-y-6">
          {(ptQuery.data ?? [])
            .slice()
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((pt) => (
              <ProductTypeBlock key={pt.id} pt={pt} />
            ))}
        </div>
      )}
    </AdminLayout>
  );
};

function ProductTypeBlock({ pt }: { pt: ProductType }): JSX.Element {
  const matQuery = useQuery({
    queryKey: ['catalog', 'materials', pt.id],
    queryFn: async () => {
      const resp = await api.get<ApiResponse<Material[]>>(
        `/api/v1/catalog/product-types/${pt.id}/materials`,
      );
      return unwrap(resp.data);
    },
  });
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: async (args: { id: string; isActive: boolean }) =>
      updateMaterial(args.id, { isActive: args.isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog', 'materials', pt.id] });
    },
  });

  const ptName = localized(pt.name, pt.slug);
  const image = productImages[pt.slug] ?? '/img/modern-pvc-window.webp';
  const materials = matQuery.data ?? [];
  const activeCount = materials.filter((m) => m.isActive !== false).length;

  return (
    <section className="overflow-hidden rounded-xl border border-hairline-strong bg-bg-elevated/40 backdrop-blur-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4 bg-bg-elevated/20">
        <div className="flex items-center gap-3">
          <img
            src={image}
            alt={ptName}
            className="h-12 w-12 object-cover rounded-md border border-hairline bg-bg-base/40"
          />
          <div>
            <h2 className="font-headline text-body font-bold text-fg-primary">{ptName}</h2>
            <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fg-tertiary">
              <FolderOpen className="h-3 w-3" />
              {pt.slug} · {activeCount}/{materials.length} აქტიური
            </div>
          </div>
        </div>
        <Link
          to="/adminpanel/pricing"
          className="flex items-center gap-1.5 rounded-md border border-accent-amber/40 bg-accent-amber/10 px-3 py-1.5 font-mono text-caption uppercase tracking-wider text-accent-amber hover:bg-accent-amber/20"
        >
          <Pencil className="h-3.5 w-3.5" />
          ფასები
        </Link>
      </header>
      <div className="divide-y divide-hairline">
        {matQuery.isPending ? (
          <p className="px-5 py-3 font-mono text-caption text-fg-tertiary">იტვირთება…</p>
        ) : materials.length === 0 ? (
          <p className="px-5 py-3 text-body-sm text-fg-tertiary">მასალები არ არის ამ ტიპში.</p>
        ) : (
          materials.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-bg-raised/20 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-2 w-2 rounded-full ${m.isActive === false ? 'bg-fg-disabled' : 'bg-system-success'}`} />
                <div className="min-w-0">
                  <div className="text-body-sm font-medium text-fg-primary truncate">
                    {localized(m.name, m.slug)}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-fg-tertiary">
                    {m.slug} · {m.family ?? '—'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-body-sm tabular-nums font-bold text-accent-amber">
                  {fmtGel(m.basePricePerSqmMinor)} ₾/მ²
                </span>
                <button
                  type="button"
                  onClick={() =>
                    toggle.mutate({ id: m.id, isActive: !(m.isActive ?? true) })
                  }
                  disabled={toggle.isPending}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-2 font-mono text-caption uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 min-h-[40px] ${
                    m.isActive === false
                      ? 'border-hairline-strong bg-bg-base/40 text-fg-tertiary hover:text-fg-primary'
                      : 'border-system-success/40 bg-system-success/5 text-system-success hover:bg-system-success/10'
                  }`}
                  title={m.isActive === false ? 'გააქტიურე' : 'გათიშე'}
                >
                  {m.isActive === false ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      გათიშულია
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      აქტიური
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
