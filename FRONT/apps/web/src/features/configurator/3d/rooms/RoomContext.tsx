import type { PresetKind } from './presets';

/**
 * Sprint A — Room Context dispatcher. Renders the right preset scene for
 * the chosen kind. Lasha confirmed (2026-05-28 brainstorming) that the
 * existing drag-to-rotate-world-group camera mode is preserved across all
 * presets — scenery rotates with the product, the product stays centred.
 *
 * Spec: docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md
 */
export type RoomContextProps = {
  kind: PresetKind;
  /** Window/door opening width in centimetres (matches Scene.tsx convention). */
  widthCm: number;
  /** Window/door opening height in centimetres. */
  heightCm: number;
  /**
   * iPhone-class device flag. Drives the lowDetail path per preset
   * (ADR-0005 § Mobile fallback for CSG). True = skip heavy geometry.
   */
  isMobile: boolean;
};

/**
 * Phase-shell — preset components ship in Tasks 15–17. Until then this
 * renders null and the scene reverts to the bare studio backdrop (same as
 * `roomPreset === null`). The early shell exists so Task 4 can replace the
 * old `RoomContextWall` call with a stable target before the leaf presets
 * exist, keeping every commit independently buildable.
 */
export function RoomContext(_: RoomContextProps): JSX.Element | null {
  return null;
}
