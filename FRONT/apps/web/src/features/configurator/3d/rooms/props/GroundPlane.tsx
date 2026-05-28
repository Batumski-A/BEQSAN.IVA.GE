import { useTexture } from '@react-three/drei';
import { RepeatWrapping } from 'three';
import { useEffect } from 'react';

/**
 * GroundPlane — large textured horizontal plane used by HouseExterior
 * (grass) and conceptually reusable by other exterior-ish presets. The
 * texture is tiled via RepeatWrapping so a 1K JPG covers a 12×12 m
 * footprint without obvious tile seams.
 */
export type GroundPlaneProps = {
  /** Public path to a diffuse texture, e.g. /textures/exterior/grass_diff_1k.jpg */
  diffuseTexturePath: string;
  /** Plane width/height in metres. Default 12 m matches the spec. */
  sizeM?: number;
  /** Texture tile count across the plane. Default 4 (so each tile ≈ 3 m). */
  tile?: number;
  /** World-Y position. Default -0.01 (1 cm below the window's bottom rail
      at y=0) so the ground doesn't z-fight with the configurator frame. */
  yOffset?: number;
};

export function GroundPlane({
  diffuseTexturePath,
  sizeM = 12,
  tile = 4,
  yOffset = -0.01,
}: GroundPlaneProps) {
  const texture = useTexture(diffuseTexturePath);
  // Configure tiling once per texture reference.
  useEffect(() => {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(tile, tile);
  }, [texture, tile]);

  return (
    <mesh position={[0, yOffset, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[sizeM, sizeM]} />
      <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
    </mesh>
  );
}
