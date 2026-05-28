/**
 * PlantSilhouette — a tall potted plant for the apartment preset. The
 * pot is a tapered cylinder; the foliage is a billboard plane that
 * always faces the camera. Used inside an apartment to break the
 * geometric harshness of the wall corners.
 *
 * Sprint A ships without an actual alpha-cutout PNG (the asset doesn't
 * exist yet — see spec § Open questions). For now the foliage is a
 * simple stylised cone in a dark sage colour; swap to a textured plane
 * once Lasha approves the artwork.
 */
export type PlantSilhouetteProps = {
  scale?: number;
};

export function PlantSilhouette({ scale = 1 }: PlantSilhouetteProps) {
  return (
    <group scale={scale}>
      {/* Terracotta pot */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.13, 0.3, 16]} />
        <meshStandardMaterial color="#A55F3A" roughness={0.85} />
      </mesh>
      {/* Foliage placeholder — stylised cone */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <coneGeometry args={[0.35, 1.1, 16]} />
        <meshStandardMaterial color="#3F5640" roughness={0.7} />
      </mesh>
    </group>
  );
}
