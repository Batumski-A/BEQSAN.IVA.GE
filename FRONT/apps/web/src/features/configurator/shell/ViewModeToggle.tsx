import { Box, Pencil, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';

export type ViewMode = '3d' | '2d' | 'preview';

type Props = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

/**
 * Three-position toggle in the top-right corner of the Modern Studio shell.
 * - 3D     → live R3F scene visible behind the floating panels.
 * - 2D     → SVG blueprint replaces the scene.
 * - Preview→ scene visible, all floating panels hidden (back button + this
 *            toggle remain so the user can exit the preview).
 *
 * Rendered as a glass-card row of three buttons inside a single rounded
 * `bg-studio-ink-2/80 backdrop-blur-md` shell. Selected mode reads as a
 * solid `bg-studio-brand` chip; unselected reads as plain inverse text.
 */
export function ViewModeToggle({ value, onChange }: Props) {
  const { t } = useTranslation();

  const options: ReadonlyArray<{
    mode: ViewMode;
    label: string;
    icon: typeof Box;
  }> = [
    { mode: '3d', label: t('configurator.shell.viewMode.threeD'), icon: Box },
    { mode: '2d', label: t('configurator.shell.viewMode.twoD'), icon: Pencil },
    {
      mode: 'preview',
      label: t('configurator.shell.viewMode.preview'),
      icon: Eye,
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t('configurator.shell.viewMode.aria')}
      className="inline-flex items-center gap-1 rounded-2xl border border-studio-ink-3/50 bg-studio-ink-2/80 p-1 font-studio shadow-2xl backdrop-blur-md"
    >
      {options.map(({ mode, label, icon: Icon }) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold uppercase tracking-wider transition-colors duration-200 ease-standard motion-reduce:transition-none',
              active
                ? 'bg-studio-brand text-studio-fg-inv shadow-lg shadow-studio-brand-glow'
                : 'text-studio-fg-inv-mute hover:bg-studio-ink-3/60 hover:text-studio-fg-inv',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
