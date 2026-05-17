import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

type RalEntry = {
  code: string;
  hex: string;
  nameKa: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (hex: string, code: string) => void;
};

/**
 * Modal palette of RAL Classic colours loaded from a static JSON file.
 * Search filters by Georgian name or RAL code; clicking a swatch
 * promotes it to the preview row at the bottom; confirm hands the
 * (hex, code) pair to the parent which sets store.color to ral-custom.
 *
 * Focus management:
 *   - On open, captures the previously-focused element and pulls
 *     focus into the search input.
 *   - On close, restores focus to the element that opened the modal.
 *   - Tab/Shift+Tab loops within the modal via a single sentinel
 *     element pair around the dialog body.
 *   - Esc closes.
 */
export function RalPaletteModal({ open, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const [palette, setPalette] = useState<RalEntry[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RalEntry | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogId = useId();

  // Load the static JSON once. Cached by the browser after first hit.
  useEffect(() => {
    let cancelled = false;
    fetch('/ral-palette.json')
      .then((r) => r.json() as Promise<RalEntry[]>)
      .then((data) => {
        if (!cancelled) setPalette(data);
      })
      .catch(() => {
        if (!cancelled) setPalette([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Focus management on open/close.
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      // Defer one tick so the dialog is in the DOM.
      requestAnimationFrame(() => {
        searchRef.current?.focus();
      });
    } else {
      previousFocusRef.current?.focus();
    }
  }, [open]);

  // Keyboard handling: Esc closes, Tab cycles within the dialog.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return palette;
    return palette.filter(
      (r) => r.code.toLowerCase().includes(q) || r.nameKa.toLowerCase().includes(q),
    );
  }, [palette, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/85 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-sm border border-hairline-strong bg-bg-raised shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2
            id={`${dialogId}-title`}
            className="font-display text-h3 text-fg-primary"
          >
            {t('configurator.steps.color.ralPalette.modal.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.actions.close')}
            className="rounded-sm p-1 text-fg-secondary transition-colors hover:bg-bg-elevated hover:text-fg-primary"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="border-b border-hairline px-6 py-4">
          <label className="flex items-center gap-3 rounded-sm border border-hairline bg-bg-elevated px-3 py-2">
            <Search className="h-4 w-4 text-fg-tertiary" aria-hidden />
            <span className="sr-only">{t('configurator.steps.color.ralPalette.modal.search')}</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('configurator.steps.color.ralPalette.modal.searchPlaceholder')}
              className="flex-1 bg-transparent font-mono text-mono-spec uppercase tracking-wider text-fg-primary placeholder:text-fg-tertiary focus:outline-none"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <p className="font-mono text-mono-spec uppercase tracking-wider text-fg-tertiary">
              {t('configurator.steps.color.ralPalette.modal.noResults')}
            </p>
          ) : (
            <div
              role="grid"
              aria-label={t('configurator.steps.color.ralPalette.modal.title')}
              className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6"
            >
              {filtered.map((ral) => {
                const isActive = selected?.code === ral.code;
                return (
                  <button
                    key={ral.code}
                    type="button"
                    role="gridcell"
                    aria-selected={isActive}
                    onClick={() => setSelected(ral)}
                    className={cn(
                      'group relative flex flex-col items-stretch overflow-hidden rounded-sm border bg-bg-base text-left transition-colors',
                      isActive
                        ? 'border-accent-amber ring-1 ring-accent-amber/40'
                        : 'border-hairline hover:border-hairline-strong',
                    )}
                  >
                    <span
                      aria-hidden
                      className="block h-12 w-full"
                      style={{ backgroundColor: ral.hex }}
                    />
                    <span className="block px-2 py-1 font-mono text-caption uppercase tracking-wider text-fg-secondary">
                      {ral.code}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview + confirm row */}
        <div className="border-t border-hairline px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-10 w-10 rounded-sm border border-hairline"
                style={{ backgroundColor: selected?.hex ?? 'transparent' }}
              />
              <div className="font-mono text-mono-spec uppercase tracking-wider">
                <div className="text-fg-tertiary">
                  {t('configurator.steps.color.ralPalette.modal.preview')}
                </div>
                <div className="mt-0.5 text-fg-primary">
                  {selected ? `${selected.nameKa} · ${selected.code}` : '—'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-caption uppercase tracking-wider text-accent-amber">
                {t('configurator.steps.color.ralPalette.modal.surcharge')}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center rounded-sm border border-hairline-strong px-3 font-mono text-mono-spec uppercase tracking-wider text-fg-secondary transition-colors hover:text-fg-primary"
              >
                {t('configurator.steps.color.ralPalette.modal.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selected) {
                    onConfirm(selected.hex, selected.code);
                  }
                }}
                disabled={!selected}
                className={cn(
                  'inline-flex h-10 items-center rounded-sm px-4 font-mono text-mono-spec uppercase tracking-wider transition-all',
                  selected
                    ? 'bg-accent-amber text-bg-base hover:bg-accent-amber-h'
                    : 'cursor-not-allowed bg-bg-elevated text-fg-disabled',
                )}
              >
                {t('configurator.steps.color.ralPalette.modal.confirm')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
