import { Loader2, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useConfiguratorPrice, type PriceRequest } from '../api';
import { useConfiguratorStore } from '../store';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

type Props = {
  onSendOrder: () => void;
};

/**
 * Modern Studio price chip + primary CTA, rendered in the shell's top-right.
 * The chip reads from the existing Zustand store and calls the server price
 * endpoint via `useConfiguratorPrice` — no pricing math in this file. The
 * CTA is disabled until both productType + material are picked (i.e. the
 * server query is enabled). Pricing is best-effort: if the request 422s on
 * an in-progress configuration (e.g. door without handle yet) we still show
 * the chip with a dash, never a frontend-computed fallback.
 */
export function PriceChip({ onSendOrder }: Props) {
  const { t } = useTranslation();

  const productType = useConfiguratorStore((s) => s.productType);
  const material = useConfiguratorStore((s) => s.material);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const panes = useConfiguratorStore((s) => s.panes);
  const color = useConfiguratorStore((s) => s.color);
  const accessories = useConfiguratorStore((s) => s.accessories);
  const installation = useConfiguratorStore((s) => s.installation);

  // Debounce the heavier inputs so slider drags don't spam the server.
  const debouncedPanes = useDebouncedValue(panes, 400);
  const debouncedAccessories = useDebouncedValue(accessories, 400);

  const req: PriceRequest | null =
    productType && material
      ? {
          productTypeId: productType.id,
          materialId: material.id,
          widthCm: dimensions.widthCm,
          heightCm: dimensions.heightCm,
          panes: debouncedPanes,
          color: color ?? undefined,
          accessories: debouncedAccessories ?? undefined,
          installation: installation ?? undefined,
        }
      : null;
  const priceQuery = useConfiguratorPrice(req);

  const total = priceQuery.data?.totalDisplay ?? null;
  const canOrder = Boolean(productType && material && total);

  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-studio-ink-3/50 bg-studio-ink-2/80 p-1.5 pl-4 font-studio shadow-2xl backdrop-blur-md">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-studio-fg-inv-soft">
          {t('configurator.shell.priceEyebrow')}
        </span>
        <span className="font-mono text-base font-bold tabular-nums text-studio-fg-inv">
          {priceQuery.isFetching && !total ? (
            <Loader2 className="h-4 w-4 animate-spin text-studio-brand-soft" aria-hidden />
          ) : total ? (
            <>
              {total} <span className="text-studio-fg-inv-mute">₾</span>
            </>
          ) : (
            <span className="text-studio-fg-inv-soft">—</span>
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={onSendOrder}
        disabled={!canOrder}
        className="group inline-flex h-10 items-center gap-2 rounded-xl bg-studio-brand px-4 text-xs font-bold uppercase tracking-wider text-studio-fg-inv shadow-lg shadow-studio-brand-glow transition-all duration-200 ease-standard hover:bg-studio-brand-h disabled:cursor-not-allowed disabled:bg-studio-ink-3 disabled:text-studio-fg-inv-soft disabled:shadow-none motion-reduce:transition-none"
      >
        <Send className="h-3.5 w-3.5" aria-hidden />
        <span>{t('configurator.shell.cta')}</span>
      </button>
    </div>
  );
}
