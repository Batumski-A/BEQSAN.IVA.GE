import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Group } from 'three';

import { useConfiguratorStore } from '../store';

/**
 * Phase 1 placeholder scene. A box scaled to the configurator dimensions,
 * a glass plane in front of it, and limited orbit controls. Real GLTF
 * models from Roman's workshop photos land in Phase 1.5.
 *
 * Mobile detection turns shadows off and clamps dpr to keep iPhone 12-class
 * devices at 60fps per .claude/skills/3d-scene-design.
 */
export function ConfiguratorScene() {
  const { t } = useTranslation();
  const material = useConfiguratorStore((s) => s.material);
  const dimensions = useConfiguratorStore((s) => s.dimensions);

  const isMobile = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches,
    [],
  );

  return (
    <div className="relative aspect-square overflow-hidden rounded-sm border border-hairline bg-bg-elevated">
      <Canvas
        camera={{ position: [2.4, 1.6, 3.2], fov: 35, near: 0.1, far: 50 }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        shadows={!isMobile}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        aria-hidden
      >
        <color attach="background" args={['#0A0E14']} />

        <ambientLight intensity={0.15} />
        <directionalLight
          position={[5, 8, 4]}
          intensity={1.2}
          color="#FFE4B0"
          castShadow={!isMobile}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {!isMobile ? (
          <>
            <directionalLight position={[-3, 4, -2]} intensity={0.35} color="#9EC4FF" />
            <directionalLight position={[0, 2, -5]} intensity={0.5} color="#FFFFFF" />
          </>
        ) : null}

        <Suspense fallback={null}>
          <Window
            family={material?.family ?? 'aluminum'}
            widthCm={dimensions.widthCm}
            heightCm={dimensions.heightCm}
            mobile={isMobile}
          />
          <Ground />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={1.8}
          maxDistance={6}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI * 0.62}
          autoRotate={!material}
          autoRotateSpeed={0.6}
        />
      </Canvas>

      <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-caption uppercase tracking-wider text-fg-tertiary">
        {dimensions.widthCm}×{dimensions.heightCm} {t('common.units.cm')}
        {material ? <span className="ml-3">· {material.slug?.toUpperCase()}</span> : null}
      </div>
    </div>
  );
}

function Window({
  family,
  widthCm,
  heightCm,
  mobile,
}: {
  family: 'aluminum' | 'pvc';
  widthCm: number;
  heightCm: number;
  mobile: boolean;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current && family) {
      // Only the auto-rotate from OrbitControls handles ambient motion when no
      // material is picked; once material is set the camera stays still and the
      // window is the focal point.
    }
    void delta;
  });

  // metres per cm = 0.01
  const w = (widthCm / 100) * 1.0;
  const h = (heightCm / 100) * 1.0;
  const frameThickness = 0.06;
  const glassInset = 0.08;

  const frameColor = family === 'aluminum' ? '#A8B3C4' : '#F4F2EE';

  return (
    <group ref={ref} position={[0, h / 2, 0]}>
      {/* Frame: top + bottom + left + right slabs */}
      <mesh position={[0, h / 2 - frameThickness / 2, 0]} castShadow={!mobile}>
        <boxGeometry args={[w, frameThickness, frameThickness * 1.4]} />
        <meshPhysicalMaterial
          color={frameColor}
          metalness={family === 'aluminum' ? 1.0 : 0.05}
          roughness={family === 'aluminum' ? 0.25 : 0.55}
        />
      </mesh>
      <mesh position={[0, -(h / 2) + frameThickness / 2, 0]} castShadow={!mobile}>
        <boxGeometry args={[w, frameThickness, frameThickness * 1.4]} />
        <meshPhysicalMaterial
          color={frameColor}
          metalness={family === 'aluminum' ? 1.0 : 0.05}
          roughness={family === 'aluminum' ? 0.25 : 0.55}
        />
      </mesh>
      <mesh position={[-w / 2 + frameThickness / 2, 0, 0]} castShadow={!mobile}>
        <boxGeometry args={[frameThickness, h, frameThickness * 1.4]} />
        <meshPhysicalMaterial
          color={frameColor}
          metalness={family === 'aluminum' ? 1.0 : 0.05}
          roughness={family === 'aluminum' ? 0.25 : 0.55}
        />
      </mesh>
      <mesh position={[w / 2 - frameThickness / 2, 0, 0]} castShadow={!mobile}>
        <boxGeometry args={[frameThickness, h, frameThickness * 1.4]} />
        <meshPhysicalMaterial
          color={frameColor}
          metalness={family === 'aluminum' ? 1.0 : 0.05}
          roughness={family === 'aluminum' ? 0.25 : 0.55}
        />
      </mesh>

      {/* Glass: a transparent plane inside the frame */}
      <mesh position={[0, 0, 0]} receiveShadow={!mobile}>
        <planeGeometry args={[w - glassInset, h - glassInset]} />
        <meshPhysicalMaterial
          color="#F0F8FF"
          transparent
          opacity={0.18}
          transmission={mobile ? 0.5 : 0.95}
          ior={1.52}
          thickness={0.01}
          roughness={0.05}
        />
      </mesh>
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshPhysicalMaterial color="#131925" roughness={0.6} metalness={0.05} />
    </mesh>
  );
}
