/**
 * WoodVault — overhead wooden pergola lattice for the VerandaSeaside
 * preset. Renders 6 main beams along z plus 2 perpendicular cross-beams
 * along x. Skipped entirely in lowDetail mode (the beam count is the
 * most expensive part of the veranda preset).
 */
export type WoodVaultProps = {
  /** Vault width along x in metres. */
  widthM?: number;
  /** Vault depth along z in metres. */
  depthM?: number;
  /** Mounting height of the vault above the deck, in metres. */
  heightM?: number;
};

export function WoodVault({
  widthM = 5,
  depthM = 4,
  heightM = 2.8,
}: WoodVaultProps) {
  const beamCount = 6;
  const beamSpacingM = depthM / (beamCount - 1);
  const beamSection = 0.08;

  return (
    <group position={[0, heightM, 0]}>
      {/* Main beams running along x */}
      {Array.from({ length: beamCount }, (_, i) => (
        <mesh
          key={`main-${i}`}
          position={[0, 0, -depthM / 2 + i * beamSpacingM]}
          castShadow
        >
          <boxGeometry args={[widthM, beamSection, beamSection]} />
          <meshStandardMaterial color="#5A3D28" roughness={0.85} />
        </mesh>
      ))}
      {/* Cross-beams running along z (front + back) */}
      {[-depthM / 2, depthM / 2].map((z, i) => (
        <mesh
          key={`cross-${i}`}
          position={[0, beamSection, z]}
          castShadow
        >
          <boxGeometry args={[beamSection, beamSection, depthM]} />
          <meshStandardMaterial color="#5A3D28" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}
