/**
 * Chandelier — apartment ceiling pendant. A thin suspension cord + a flat
 * disc shade + a small emissive sphere bulb + a co-located point light.
 *
 * Hangs FROM the ceiling: the group origin sits at the ceiling, the cord
 * descends from y=0 to y=-cordLength, and the shade/bulb sit at the cord
 * tip. This way the pendant always reads as attached to the ceiling
 * regardless of room height — Sprint A's fixed y=2.2 caused the pendant
 * to clip through the ceiling on shorter windows. (Lasha flagged
 * 2026-05-28.)
 */
export type ChandelierProps = {
  /** When true, the point light is dropped — emissive sphere stays. */
  lowDetail?: boolean;
  /** World-Y position of the ceiling plane this pendant hangs from. */
  ceilingY?: number;
  /** Length of the suspension cord in meters. */
  cordLength?: number;
};

export function Chandelier({
  lowDetail = false,
  ceilingY = 2.4,
  cordLength = 0.55,
}: ChandelierProps) {
  const shadeY = -cordLength;
  const bulbY = shadeY - 0.05;
  return (
    <group position={[0, ceilingY, 0]}>
      {/* Suspension cord — hangs from the ceiling */}
      <mesh position={[0, -cordLength / 2, 0]}>
        <cylinderGeometry args={[0.005, 0.005, cordLength, 8]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>
      {/* Shade — flat disc */}
      <mesh position={[0, shadeY, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.18, 0.04, 24]} />
        <meshPhysicalMaterial color="#E8E0C8" metalness={0.05} roughness={0.4} />
      </mesh>
      {/* Bulb — emissive sphere */}
      <mesh position={[0, bulbY, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color="#FFF4D8"
          emissive="#FFE8B5"
          emissiveIntensity={2.5}
        />
      </mesh>
      {!lowDetail ? (
        <pointLight
          position={[0, bulbY, 0]}
          color="#FFE8B5"
          intensity={3}
          distance={5}
          decay={2}
          castShadow
        />
      ) : null}
    </group>
  );
}
