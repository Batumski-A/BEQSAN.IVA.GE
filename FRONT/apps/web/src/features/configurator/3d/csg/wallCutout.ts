import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { BoxGeometry, PlaneGeometry, type BufferGeometry } from 'three';

/**
 * Parametric wall slab with a rectangular window opening cut out.
 *
 * Units are meters across the board. Scene.tsx works in centimeters at the
 * store layer and converts via `/ 100` before reaching geometry; do the same
 * at every call site of this helper.
 *
 * Adopted per ADR-0005. The CSG path is the interactive, free, instant
 * alternative to the Replicate-driven "see it in my room" flow documented
 * in the ai-integration skill — use this when the user wants to judge
 * proportion against a wall slab, use Replicate when they want a sharable
 * photoreal render of their actual room.
 */
export type WallCutoutSpec = {
  /** Wall slab total width in meters. Typical interior wall: 3.0 - 5.0 m. */
  wallWidthM: number;
  /** Wall slab total height in meters. Typical residential: 2.5 - 3.0 m. */
  wallHeightM: number;
  /**
   * Wall slab depth in meters — i.e. how thick the wall is.
   * BEQSAN-installed walls in Batumi are typically 0.15 - 0.25 m for interior,
   * 0.30 - 0.40 m for exterior. Default 0.2 reads as a residential interior wall.
   */
  wallDepthM: number;
  /** Window opening width in meters. */
  openingWidthM: number;
  /** Window opening height in meters. */
  openingHeightM: number;
  /**
   * Sill height — distance from floor to bottom of opening, in meters.
   * Roman's residential default is 0.9 m. Balcony doors use 0.
   */
  sillHeightM: number;
};

/**
 * Build a wall slab geometry with a rectangular opening cut out via Boolean
 * subtraction. Wall is positioned so its base sits at y=0 and the opening is
 * centered on the x axis.
 *
 * Cost note: the BVH build inside the evaluator is O(n log n) per call. Do
 * NOT call this inside `useFrame` or on every render — memoize against the
 * dependency set (typically `[widthCm, heightCm, sillCm]`) so it only re-runs
 * when the user actually changes a dimension.
 */
export function buildWallCutoutGeometry(spec: WallCutoutSpec): BufferGeometry {
  const { wallWidthM, wallHeightM, wallDepthM, openingWidthM, openingHeightM, sillHeightM } = spec;

  const wallBrush = new Brush(new BoxGeometry(wallWidthM, wallHeightM, wallDepthM));
  wallBrush.position.set(0, wallHeightM / 2, 0);
  wallBrush.updateMatrixWorld();

  // Opening depth is slightly larger than the wall so the cut passes cleanly
  // through both faces — otherwise we get z-fighting on the inner rim.
  const openingDepthM = wallDepthM + 0.02;
  const openingBrush = new Brush(new BoxGeometry(openingWidthM, openingHeightM, openingDepthM));
  openingBrush.position.set(0, sillHeightM + openingHeightM / 2, 0);
  openingBrush.updateMatrixWorld();

  const evaluator = new Evaluator();
  const result = evaluator.evaluate(wallBrush, openingBrush, SUBTRACTION);

  return result.geometry;
}

/**
 * Mobile / low-detail fallback for [[buildWallCutoutGeometry]]. Returns a plain
 * rectangular plane the same width and height as the slab, with no cutout.
 *
 * Adopted per ADR-0005 § "Mobile fallback for CSG". The window is still
 * rendered on top — visually the user reads the wall as a backdrop rather
 * than a slab the window mounts INTO. Less informative than the cut version
 * but keeps iPhone 12-class devices comfortably above 60 FPS.
 */
export function buildFallbackWallGeometry(spec: {
  wallWidthM: number;
  wallHeightM: number;
}): BufferGeometry {
  return new PlaneGeometry(spec.wallWidthM, spec.wallHeightM);
}
