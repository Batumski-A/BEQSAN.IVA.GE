/**
 * PlantSilhouette — a tall potted plant for the apartment preset. The
 * pot is a tapered cylinder with a darker rim; the foliage is a cluster
 * of three overlapping ellipsoid leaves in graduated greens, giving a
 * tropical houseplant silhouette (rubber-tree / monstera adjacent)
 * without an asset pipeline.
 *
 * The original Sprint A version was a single cone which read as a
 * Christmas tree at small scales — Lasha flagged it 2026-05-28. This
 * shape reads as a real plant from any angle.
 */
export type PlantSilhouetteProps = {
  scale?: number;
};

export function PlantSilhouette({ scale = 1 }: PlantSilhouetteProps) {
  return (
    <group scale={scale}>
      {/* Terracotta pot — main body */}
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.13, 0.32, 18]} />
        <meshStandardMaterial color="#A5613D" roughness={0.85} />
      </mesh>
      {/* Pot rim — slightly wider darker band at the top */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.185, 0.17, 0.035, 18]} />
        <meshStandardMaterial color="#8A4F30" roughness={0.8} />
      </mesh>
      {/* Soil cap inside the pot */}
      <mesh position={[0, 0.335, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.012, 16]} />
        <meshStandardMaterial color="#2F2620" roughness={0.95} />
      </mesh>
      {/* Stem */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.025, 0.5, 8]} />
        <meshStandardMaterial color="#5A4730" roughness={0.85} />
      </mesh>
      {/* Foliage cluster — three overlapping flattened ellipsoids in
          graduated greens, rotated so the silhouette reads as broad
          leaves rather than a single shape. */}
      <mesh position={[-0.18, 0.95, 0.05]} rotation={[0.2, 0.3, -0.4]} castShadow>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial color="#3E5A3A" roughness={0.75} />
      </mesh>
      <mesh position={[0.2, 1.05, -0.04]} rotation={[-0.15, -0.4, 0.35]} castShadow>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshStandardMaterial color="#496C44" roughness={0.72} />
      </mesh>
      <mesh position={[0.02, 1.22, 0.0]} rotation={[0.1, 0.0, 0.0]} castShadow>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color="#557A50" roughness={0.7} />
      </mesh>
    </group>
  );
}
