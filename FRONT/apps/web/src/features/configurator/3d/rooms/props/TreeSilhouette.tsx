/**
 * TreeSilhouette — stylised tree for the HouseExterior preset. Sprint A
 * uses a simple trunk + foliage-cone primitive; a textured alpha-cutout
 * billboard is a Sprint B+ upgrade once the asset exists. Two of these
 * flank the house facade.
 */
export type TreeSilhouetteProps = {
  scale?: number;
};

export function TreeSilhouette({ scale = 1 }: TreeSilhouetteProps) {
  return (
    <group scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 1.6, 12]} />
        <meshStandardMaterial color="#5A3D28" roughness={0.85} />
      </mesh>
      {/* Foliage — broad cone */}
      <mesh position={[0, 2.0, 0]} castShadow>
        <coneGeometry args={[0.9, 1.8, 16]} />
        <meshStandardMaterial color="#3F5640" roughness={0.7} />
      </mesh>
    </group>
  );
}
