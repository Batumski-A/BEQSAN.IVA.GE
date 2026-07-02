import { Environment, useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { RepeatWrapping } from 'three';

import { buildFallbackWallGeometry, buildWallCutoutGeometry } from '../csg/wallCutout';
import { GlassRailing } from './props/GlassRailing';
import { WoodVault } from './props/WoodVault';
import { SeaBackdrop } from './props/SeaBackdrop';

/**
 * VerandaSeaside — covered wooden veranda overlooking the Black Sea
 * under late-morning daylight. Back wall hosts the window/door via
 * CSG; wooden deck floor; pergola lattice overhead; glass railing at
 * the front edge; gradient sea backdrop in the distance.
 *
 * Spec: docs/superpowers/specs/2026-05-28-sprint-a-room-context-presets-design.md
 */
export type VerandaSeasideProps = {
  widthCm: number;
  heightCm: number;
  isMobile: boolean;
};

export function VerandaSeaside({
  widthCm,
  heightCm,
  isMobile,
}: VerandaSeasideProps) {
  const widthM = widthCm / 100;
  const heightM = heightCm / 100;

  // Back wall — same baseline as apartment but a slightly warmer plaster.
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

  const deck = useTexture({
    map: '/textures/veranda/wood_floor_deck_diff_1k.jpg',
    normalMap: '/textures/veranda/wood_floor_deck_nor_gl_1k.jpg',
    aoMap: '/textures/veranda/wood_floor_deck_arm_1k.jpg',
  });
  useEffect(() => {
    [deck.map, deck.normalMap, deck.aoMap].forEach((t) => {
      if (t === null) return;
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.repeat.set(2, 1.5);
    });
  }, [deck]);

  return (
    <>
      <Environment preset="dawn" background={false} />

      {/* Sea backdrop on desktop only — the parallax cue helps the brain
          read it as "horizon far away" rather than "wall behind me". */}
      {!isMobile ? <SeaBackdrop /> : null}

      {/* Back wall with CSG opening. */}
      <group position={[0, -sillHeightM, -wallDepthM / 2 - 0.04]}>
        <mesh geometry={backWallGeometry} receiveShadow castShadow={!isMobile}>
          <meshPhysicalMaterial color="#E8DCC8" metalness={0} roughness={0.9} />
        </mesh>
      </group>

      {/* Deck floor — extended forward to meet the railing. Sits at the
          BASE of the back wall (sill height below the window's bottom
          rail) so the window reads mounted at real sill height. */}
      <mesh position={[0, -sillHeightM - 0.01, 1.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 5.5]} />
        <meshStandardMaterial
          map={deck.map ?? null}
          normalMap={deck.normalMap ?? null}
          aoMap={deck.aoMap ?? null}
          roughness={0.8}
          metalness={0}
        />
      </mesh>

      {/* Pergola vault — desktop only, anchored to the deck level. */}
      {!isMobile ? (
        <group position={[0, -sillHeightM, 0]}>
          <WoodVault widthM={5} depthM={4} heightM={3.2} />
        </group>
      ) : null}

      {/* Glass railing at the deck's far front edge — standing ON the deck,
          pushed past the camera's typical orbit distance so it frames the
          scene from outside rather than intersecting the product's view cone. */}
      <group position={[0, -sillHeightM, 4.5]}>
        <GlassRailing lengthM={5} heightM={1} lowDetail={isMobile} />
      </group>

      {/* Bright daylight key + warm bounce. */}
      <directionalLight
        position={[3, 6, 5]}
        intensity={1.8}
        color="#FFFCEC"
        castShadow={!isMobile}
      />
      <hemisphereLight args={['#A8E0FF', '#D8B080', 0.7]} />
    </>
  );
}
