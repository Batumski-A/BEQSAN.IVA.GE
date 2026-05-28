/**
 * GlassRailing — low transparent panel with vertical metal posts and a
 * thin top rail. Used at the front edge of the VerandaSeaside deck so
 * the user reads the sea/sky as "outside" beyond the veranda.
 */
export type GlassRailingProps = {
  /** Railing length along x in metres. Default 4 m matches the spec deck. */
  lengthM?: number;
  /** Total railing height in metres. Default 1 m. */
  heightM?: number;
  /** When true, posts and top rail are skipped — just the glass panel. */
  lowDetail?: boolean;
};

export function GlassRailing({
  lengthM = 4,
  heightM = 1,
  lowDetail = false,
}: GlassRailingProps) {
  const postCount = 5;
  const postSpacingM = lengthM / (postCount - 1);

  return (
    <group>
      {/* Glass panel */}
      <mesh position={[0, heightM / 2, 0]}>
        <planeGeometry args={[lengthM, heightM]} />
        <meshPhysicalMaterial
          transmission={0.95}
          ior={1.52}
          thickness={0.005}
          roughness={0.04}
          transparent
          opacity={0.5}
        />
      </mesh>

      {!lowDetail ? (
        <>
          {/* Posts */}
          {Array.from({ length: postCount }, (_, i) => (
            <mesh
              key={i}
              position={[-lengthM / 2 + i * postSpacingM, heightM / 2, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.015, 0.015, heightM, 8]} />
              <meshStandardMaterial color="#8a8a8a" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
          {/* Top rail */}
          <mesh position={[0, heightM + 0.02, 0]} castShadow>
            <boxGeometry args={[lengthM, 0.04, 0.04]} />
            <meshStandardMaterial color="#8a8a8a" metalness={0.8} roughness={0.3} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}
