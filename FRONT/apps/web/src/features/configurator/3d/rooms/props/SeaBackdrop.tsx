import { useMemo } from 'react';
import { CanvasTexture, LinearFilter } from 'three';

/**
 * SeaBackdrop — large distant plane with a baked vertical gradient that
 * reads as "sky transitioning to sea at the horizon". A canvas-generated
 * texture (drawn once into a CanvasTexture) keeps the asset out of the
 * git tree — no PNG file needed.
 *
 * Positioned far away (z = -15 m by default) so the parallax tells the
 * brain "this is the open horizon", not "this is a wall behind me".
 */
export type SeaBackdropProps = {
  /** Plane width in metres. */
  widthM?: number;
  /** Plane height in metres. */
  heightM?: number;
};

export function SeaBackdrop({ widthM = 30, heightM = 12 }: SeaBackdropProps) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      throw new Error('SeaBackdrop: 2D context not available');
    }
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    // Sky → distant haze → sea
    grad.addColorStop(0.0, '#A8C8E8');  // pale sky
    grad.addColorStop(0.55, '#D8E0E0'); // haze at horizon
    grad.addColorStop(0.6, '#6A8DA8');  // sea start
    grad.addColorStop(1.0, '#1F4868');  // deep sea
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const tex = new CanvasTexture(canvas);
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    return tex;
  }, []);

  return (
    <mesh position={[0, heightM / 2 - 1.5, -15]}>
      <planeGeometry args={[widthM, heightM]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}
