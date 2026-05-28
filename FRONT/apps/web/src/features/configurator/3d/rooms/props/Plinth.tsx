/**
 * Plinth — dark-wood baseboard running along the bottom edge of an
 * apartment wall. Rendered as a thin box mesh; the parent positions and
 * scales it per-wall. Single-purpose, no props beyond width/depth.
 */
export type PlinthProps = {
  /** Length of this baseboard run, in metres. */
  lengthM: number;
};

export function Plinth({ lengthM }: PlinthProps) {
  // 8 cm tall × 2 cm deep — standard Batumi apartment plinth section.
  const heightM = 0.08;
  const depthM = 0.02;
  return (
    <mesh position={[0, heightM / 2, depthM / 2]} receiveShadow>
      <boxGeometry args={[lengthM, heightM, depthM]} />
      <meshPhysicalMaterial color="#3A2A1F" metalness={0} roughness={0.6} />
    </mesh>
  );
}
