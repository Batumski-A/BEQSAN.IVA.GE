import { Environment, Sky, useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { RepeatWrapping } from 'three';

import { buildFallbackWallGeometry, buildWallCutoutGeometry } from '../csg/wallCutout';
import { TreeSilhouette } from './props/TreeSilhouette';
import { GroundPlane } from './props/GroundPlane';

/**
 * HouseExterior — private house facade seen from the street under
 * golden-hour evening light. Window or door is set into the facade via
 * CSG; ground extends forward; sky completes the frame.
 *
 * Spec: docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md
 */
export type HouseExteriorProps = {
  widthCm: number;
  heightCm: number;
  isMobile: boolean;
};

export function HouseExterior({
  widthCm,
  heightCm,
  isMobile,
}: HouseExteriorProps) {
  const widthM = widthCm / 100;
  const heightM = heightCm / 100;

  // Exterior facade is wider + thicker than apartment.
  const wallWidthM = Math.max(6, widthM + 3);
  const wallHeightM = Math.max(3.5, heightM + 1.5);
  const wallDepthM = 0.22;
  const sillHeightM = 1.1;

  const facadeGeometry = useMemo(() => {
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
      facadeGeometry.dispose();
    };
  }, [facadeGeometry]);

  const facade = useTexture({
    map: '/textures/exterior/painted_plaster_wall_diff_1k.jpg',
    normalMap: '/textures/exterior/painted_plaster_wall_nor_gl_1k.jpg',
    aoMap: '/textures/exterior/painted_plaster_wall_arm_1k.jpg',
  });
  useEffect(() => {
    [facade.map, facade.normalMap, facade.aoMap].forEach((t) => {
      if (t === null) return;
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.repeat.set(2, 1.5);
    });
  }, [facade]);

  return (
    <>
      <Environment preset="sunset" background={false} />

      {/* Sky — drei's <Sky> on desktop; static plane fallback on mobile. */}
      {!isMobile ? (
        <Sky distance={450000} sunPosition={[5, 1, 5]} inclination={0.3} azimuth={0.25} />
      ) : (
        <mesh position={[0, 6, -10]}>
          <planeGeometry args={[30, 15]} />
          <meshBasicMaterial color="#FFB870" />
        </mesh>
      )}

      {/* Facade with CSG-cut opening. Slightly warm-shifted tint over the
          plaster diffuse to read as cream paint under golden hour. */}
      <group position={[0, -sillHeightM, -wallDepthM / 2 - 0.04]}>
        <mesh geometry={facadeGeometry} receiveShadow castShadow={!isMobile}>
          <meshStandardMaterial
            color="#D8C9A8"
            map={facade.map ?? null}
            normalMap={facade.normalMap ?? null}
            aoMap={facade.aoMap ?? null}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      </group>

      {/* Ground */}
      <GroundPlane
        diffuseTexturePath={'/textures/exterior/aerial_grass_rock_diff_1k.jpg'}
        sizeM={isMobile ? 8 : 12}
        tile={isMobile ? 2 : 4}
      />

      {/* Two flanking trees on desktop only. */}
      {!isMobile ? (
        <>
          <group position={[-4, 0, -0.6]}>
            <TreeSilhouette scale={1.1} />
          </group>
          <group position={[4, 0, -0.6]}>
            <TreeSilhouette scale={0.9} />
          </group>
        </>
      ) : null}

      {/* Golden hour key light. */}
      <directionalLight
        position={[5, 3, 5]}
        intensity={1.6}
        color="#FFB870"
        castShadow={!isMobile}
      />
      <hemisphereLight args={['#A8C8FF', '#5A4830', 0.5]} />
    </>
  );
}
