/**
 * Chandelier — apartment ceiling pendant. A thin suspension cord + a flat
 * disc shade + a small emissive sphere bulb + a co-located point light.
 * Lowered to a fixed y=2.2 m position (under the 2.7 m ceiling) so the
 * cord visually reads.
 */
export type ChandelierProps = {
  /** When true, the point light is dropped — emissive sphere stays. */
  lowDetail?: boolean;
};

export function Chandelier({ lowDetail = false }: ChandelierProps) {
  return (
    <group position={[0, 2.2, 0]}>
      {/* Suspension cord — thin cylinder from ceiling */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.7, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Shade — flat disc */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.04, 24]} />
        <meshPhysicalMaterial color="#E8E0C8" metalness={0.05} roughness={0.4} />
      </mesh>
      {/* Bulb — emissive sphere */}
      <mesh position={[0, -0.05, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color="#FFF4D8"
          emissive="#FFE8B5"
          emissiveIntensity={2.5}
        />
      </mesh>
      {!lowDetail ? (
        <pointLight color="#FFE8B5" intensity={3} distance={5} decay={2} castShadow />
      ) : null}
    </group>
  );
}
