import type { PresetKind } from './presets';
import { ApartmentInterior } from './ApartmentInterior';
import { HouseExterior } from './HouseExterior';
import { VerandaSeaside } from './VerandaSeaside';

/**
 * Sprint A — Room Context dispatcher. Renders the right preset scene
 * for the chosen kind. Lasha confirmed (2026-05-28 brainstorming) that
 * the existing drag-to-rotate-world-group camera mode is preserved
 * across all presets — scenery rotates with the product.
 *
 * Spec: docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md
 */
export type RoomContextProps = {
  kind: PresetKind;
  widthCm: number;
  heightCm: number;
  isMobile: boolean;
};

export function RoomContext({ kind, widthCm, heightCm, isMobile }: RoomContextProps): JSX.Element | null {
  switch (kind) {
    case 'apartment':
      return <ApartmentInterior widthCm={widthCm} heightCm={heightCm} isMobile={isMobile} />;
    case 'exterior':
      return <HouseExterior widthCm={widthCm} heightCm={heightCm} isMobile={isMobile} />;
    case 'veranda':
      return <VerandaSeaside widthCm={widthCm} heightCm={heightCm} isMobile={isMobile} />;
    default: {
      // Exhaustiveness check — adding a new PresetKind will fail compile here.
      const _exhaustive: never = kind;
      void _exhaustive;
      // eslint-disable-next-line no-console
      console.warn(`RoomContext: unknown preset kind`, kind);
      return null;
    }
  }
}
