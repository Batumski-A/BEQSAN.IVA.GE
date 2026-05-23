import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Star, StarOff, RefreshCw, ImageOff, Pencil } from 'lucide-react';

import { AdminLayout } from './AdminLayout';
import { listGallery, updateGalleryItem, type GalleryItem } from './api';

const CATEGORY_LABELS: Record<string, string> = {
  windows: 'ფანჯრები',
  doors: 'კარები',
  facades: 'ფასადები',
  balcony: 'აივანი',
  accessories: 'აქსესუარები',
  details: 'დეტალები',
};

export const GalleryPage = (): JSX.Element => {
  const [category, setCategory] = useState<string | 'All'>('All');
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'gallery'],
    queryFn: listGallery,
  });

  const mutate = useMutation({
    mutationFn: (args: { id: string; patch: Partial<GalleryItem> }) =>
      updateGalleryItem(args.id, args.patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'gallery'] });
    },
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (query.data ?? []).forEach((g) => g.category && set.add(g.category));
    return Array.from(set).sort();
  }, [query.data]);

  const items = useMemo(() => {
    const arr = query.data ?? [];
    if (category === 'All') return arr;
    return arr.filter((g) => g.category === category);
  }, [query.data, category]);

  return (
    <AdminLayout
      title="გალერეა"
      subtitle={`${query.data?.length ?? 0} ფოტო · ${category === 'All' ? 'ყველა' : (CATEGORY_LABELS[category] ?? category)}`}
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
      <div className="mb-5 flex flex-wrap gap-2">
        <Chip active={category === 'All'} onClick={() => setCategory('All')} label="ყველა" />
        {categories.map((c) => (
          <Chip
            key={c}
            active={category === c}
            onClick={() => setCategory(c)}
            label={CATEGORY_LABELS[c] ?? c}
          />
        ))}
      </div>

      {query.isPending ? (
        <div className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-8 text-center font-mono text-caption uppercase tracking-wider text-fg-tertiary">
          იტვირთება…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-hairline-strong bg-bg-elevated/40 p-12 text-center">
          <ImageOff className="mx-auto h-12 w-12 text-fg-disabled" />
          <p className="mt-3 text-body text-fg-secondary">ფოტო ვერ მოიძებნა</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((g) => (
            <Card
              key={g.id}
              item={g}
              mutating={mutate.isPending}
              onToggleActive={() => mutate.mutate({ id: g.id, patch: { isActive: !g.isActive } })}
              onToggleFeatured={() =>
                mutate.mutate({ id: g.id, patch: { isFeatured: !g.isFeatured } })
              }
              onEditTitle={(title) => mutate.mutate({ id: g.id, patch: { title } })}
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

function Card({
  item,
  mutating,
  onToggleActive,
  onToggleFeatured,
  onEditTitle,
}: {
  item: GalleryItem;
  mutating: boolean;
  onToggleActive: () => void;
  onToggleFeatured: () => void;
  onEditTitle: (title: string) => void;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-bg-elevated/40 backdrop-blur-sm transition-all ${
        item.isActive ? 'border-hairline-strong hover:border-accent-amber/40' : 'border-hairline-strong/40 opacity-60'
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-bg-base/40">
        <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        {item.isFeatured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-accent-amber/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-bg-base font-bold">
            <Star className="h-3 w-3 fill-current" />
            გამორჩეული
          </span>
        )}
        {!item.isActive && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-system-danger/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white font-bold">
            <EyeOff className="h-3 w-3" />
            გათიშული
          </span>
        )}
      </div>
      <div className="p-4">
        {editing ? (
          <div className="flex gap-1">
            <input
              type="text"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onEditTitle(draft.trim());
                  setEditing(false);
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              className="flex-1 rounded border border-accent-amber/50 bg-bg-base px-2 py-1 text-body-sm text-fg-primary outline-none focus:border-accent-amber"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(item.title);
              setEditing(true);
            }}
            className="group/title flex items-start gap-1.5 text-left w-full"
          >
            <span className="font-headline text-body-sm font-bold text-fg-primary leading-tight">
              {item.title}
            </span>
            <Pencil className="h-3 w-3 mt-0.5 text-fg-tertiary opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
          </button>
        )}
        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-tertiary">
          {item.category ? (CATEGORY_LABELS[item.category] ?? item.category) : '—'}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onToggleActive}
            disabled={mutating}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 font-mono text-caption uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 min-h-[40px] ${
              item.isActive
                ? 'border-system-success/40 bg-system-success/5 text-system-success hover:bg-system-success/10'
                : 'border-hairline-strong bg-bg-base/40 text-fg-tertiary hover:text-fg-primary'
            }`}
          >
            {item.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {item.isActive ? 'ხილვადი' : 'დამალულია'}
          </button>
          <button
            type="button"
            onClick={onToggleFeatured}
            disabled={mutating}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 font-mono text-caption uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 min-h-[40px] ${
              item.isFeatured
                ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/20'
                : 'border-hairline-strong bg-bg-base/40 text-fg-tertiary hover:text-fg-primary'
            }`}
          >
            {item.isFeatured ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </article>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 font-mono text-caption uppercase tracking-wider transition-colors ${
        active
          ? 'border-accent-amber bg-accent-amber/10 text-accent-amber font-bold'
          : 'border-hairline-strong bg-bg-elevated/40 text-fg-tertiary hover:text-fg-primary'
      }`}
    >
      {label}
    </button>
  );
}
