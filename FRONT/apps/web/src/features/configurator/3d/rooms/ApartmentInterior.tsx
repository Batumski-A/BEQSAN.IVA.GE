import { useTexture, Environment } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { RepeatWrapping } from 'three';

import { buildFallbackWallGeometry, buildWallCutoutGeometry } from '../csg/wallCutout';
import { Plinth } from './props/Plinth';
import { Chandelier } from './props/Chandelier';
import { PlantSilhouette } from './props/PlantSilhouette';

/**
 * ApartmentInterior — a Batumi residential living room. Window or door
 * is set into the back wall via CSG cutout; left/right walls partially
 * frame the scene; floor + ceiling close the box.
 *
 * Spec: docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md
 */
export type ApartmentInteriorProps = {
  widthCm: number;
  heightCm: number;
  isMobile: boolean;
};

export function ApartmentInterior({
  widthCm,
  heightCm,
  isMobile,
}: ApartmentInteriorProps) {
  const widthM = widthCm / 100;
  const heightM = heightCm / 100;

  // Back wall sizing — match the apartment baseline spec.
  const wallWidthM = Math.max(4, widthM + 2);
  const wallHeightM = Math.max(2.7, heightM + 0.9);
  const wallDepthM = 0.18;
  const sillHeightM = 0.9;

  const backWallGeometry = useMemo(() => {
    if (isMobile) {
      return buildFallbackWallGeometry({ wallWidthM, wallHeightM });
    }
    return buildWallCutoutGeometry({
      wallWidthM,
      wallHeightM,
      wallDepthM,
      openingWidthM: widthM,
      openingHeightM: heightM,
      sillHeightM,
    });
  }, [isMobile, wallWidthM, wallHeightM, wallDepthM, widthM, heightM, sillHeightM]);

  useEffect(() => {
    return () => {
      backWallGeometry.dispose();
    };
  }, [backWallGeometry]);

  // Floor — Poly Haven parquet PBR.
  const floor = useTexture({
    map: '/textures/apartment/wood_floor_diff_1k.jpg',
    normalMap: '/textures/apartment/wood_floor_nor_gl_1k.jpg',
    aoMap: '/textures/apartment/wood_floor_arm_1k.jpg',
  });
  useEffect(() => {
    [floor.map, floor.normalMap, floor.aoMap].forEach((t) => {
      if (t === null) return;
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.repeat.set(2, 2);
    });
  }, [floor]);

  const wallColor = '#E8E4DC';

  return (
    <>
      {/* Image-based lighting */}
      <Environment preset="city" background={false} />

      {/* Daylight backdrop behind the window opening — without it the glass
          shows the dark studio void and the window reads like a wall-mounted
          TV. Sized just past the opening so the studio backdrop around the
          room stays dark. toneMapped=false keeps the sky bright under the
          renderer's tone mapping. */}
      <mesh position={[0, heightM / 2, -1.4]}>
        <planeGeometry args={[widthM + 2.4, heightM + 2]} />
        <meshBasicMaterial color="#D6E9FF" toneMapped={false} />
      </mesh>

      {/* Back wall with CSG-cut opening, positioned per ADR-0005 convention. */}
      <group position={[0, -sillHeightM, -wallDepthM / 2 - 0.04]}>
        <mesh geometry={backWallGeometry} receiveShadow castShadow={!isMobile}>
          <meshPhysicalMaterial color={wallColor} metalness={0} roughness={0.9} />
        </mesh>
      </group>

      {/* Floor — at the BASE of the wall (sill height below the window's
          bottom rail), so the window reads as mounted 90 cm above the floor
          like a real window, not sitting on the parquet. The 1 cm drop
          avoids z-fighting with the wall slab's bottom edge. Widened to
          6×6 so it extends past the side walls. */}
      <mesh position={[0, -sillHeightM - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial
          map={floor.map ?? null}
          normalMap={floor.normalMap ?? null}
          aoMap={floor.aoMap ?? null}
          roughness={0.85}
          metalness={0}
        />
      </mesh>

      {!isMobile ? (
        <>
          {/* Left wall — plane perpendicular to back wall. */}
          <mesh position={[-3, wallHeightM / 2 - sillHeightM, 0.4]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[2, wallHeightM]} />
            <meshPhysicalMaterial color={wallColor} metalness={0} roughness={0.9} side={2} />
          </mesh>
          {/* Right wall — symmetric. */}
          <mesh position={[3, wallHeightM / 2 - sillHeightM, 0.4]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[2, wallHeightM]} />
            <meshPhysicalMaterial color={wallColor} metalness={0} roughness={0.9} side={2} />
          </mesh>
          {/* Ceiling — pulled back a hair past the back wall (z=-0.04) so the
              ceiling/back-wall corner closes cleanly without a visible seam. */}
          <mesh position={[0, wallHeightM - sillHeightM, 0.4]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[6, 2.1]} />
            <meshPhysicalMaterial color="#FAFAF7" metalness={0} roughness={0.95} />
          </mesh>
          {/* Plinth along the front of the back wall — on the floor. */}
          <group position={[0, -sillHeightM, -0.02]}>
            <Plinth lengthM={6} />
          </group>
          {/* Plant — tucked into the corner so it frames rather than blocks
              the view cone. Stands on the floor against the right wall. */}
          <group position={[2.4, -sillHeightM, -0.4]}>
            <PlantSilhouette scale={0.75} />
          </group>
        </>
      ) : null}

      {/* Chandelier — hangs from the ceiling, pulled INTO the room and off
          the window axis so it never overlaps the model in the default
          front view (it used to hang at z=0, right over the top sash). */}
      <group position={[-1.35, 0, 1.05]}>
        <Chandelier
          lowDetail={isMobile}
          ceilingY={wallHeightM - sillHeightM - 0.02}
          cordLength={Math.min(0.7, Math.max(0.25, (wallHeightM - sillHeightM) * 0.28))}
        />
      </group>

      {/* Daylight bleed through the window — soft cool key from +z. */}
      <directionalLight
        position={[0, 1.8, 3]}
        intensity={0.55}
        color="#B8D2FF"
        castShadow={!isMobile}
      />
      {/* Warm ambient bounce, slightly stronger so corners don't fall to black. */}
      <ambientLight color="#FFE8B5" intensity={0.35} />
      {/* Subtle rim from the back — separates the model from the back wall. */}
      <directionalLight position={[0, 1.6, -1.5]} intensity={0.18} color="#FFD9A0" />
    </>
  );
}
