import { useTexture } from '@react-three/drei';
import { RepeatWrapping } from 'three';
import { useMemo } from 'react';

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
};

export function GroundPlane({
  diffuseTexturePath,
  sizeM = 12,
  tile = 4,
}: GroundPlaneProps) {
  const texture = useTexture(diffuseTexturePath);
  // Configure tiling once per texture reference.
  useMemo(() => {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(tile, tile);
  }, [texture, tile]);

  return (
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[sizeM, sizeM]} />
      <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
    </mesh>
  );
}
