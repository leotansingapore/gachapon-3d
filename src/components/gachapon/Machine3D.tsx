'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Ball } from './types';
import { simulate, applyOrbitForce } from './physics';

// Extend R3F with OrbitControls from three.js directly (no drei needed)
extend({ OrbitControls: ThreeOrbitControls });

// ── Capsule Mesh (two-tone) ──
function CapsuleMesh({ ball }: { ball: Ball }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(ball.position.x, ball.position.y, ball.position.z);
    groupRef.current.rotation.set(ball.angle, ball.angle * 0.6, ball.angle * 0.8);
  });
  return (
    <group ref={groupRef}>
      <mesh castShadow>
        <sphereGeometry args={[ball.radius, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color={ball.topColor} roughness={0.2} clearcoat={0.8} clearcoatRoughness={0.05} envMapIntensity={0.8} />
      </mesh>
      <mesh castShadow>
        <sphereGeometry args={[ball.radius, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshPhysicalMaterial color={ball.bottomColor} roughness={0.2} clearcoat={0.8} clearcoatRoughness={0.05} envMapIntensity={0.8} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ball.radius * 0.99, 0.003, 4, 16]} />
        <meshBasicMaterial color="#00000030" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// ── BallsController ──
function BallsController({ balls, shaking, tilt }: { balls: Ball[]; shaking: boolean; tilt: { x: number; z: number } }) {
  useFrame((_, delta) => { simulate(balls, shaking, delta, tilt); });
  return <>{balls.map((ball, i) => <CapsuleMesh key={i} ball={ball} />)}</>;
}

// ── Glass Dome ──
function GlassDome() {
  return (
    <group position={[0, 0.48, 0]}>
      <mesh renderOrder={1}>
        <sphereGeometry args={[1.4, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshPhysicalMaterial
          color="#e8f0ff" roughness={0.0} transparent opacity={0.12}
          envMapIntensity={1.0} clearcoat={1} clearcoatRoughness={0}
          side={THREE.DoubleSide} depthWrite={false} ior={1.52}
          specularIntensity={1.5} specularColor="#ffffff"
        />
      </mesh>
      {/* Glass reflections */}
      <mesh position={[0.5, 0.35, 0.9]} rotation={[0.1, 0.4, 0.15]}>
        <planeGeometry args={[0.06, 0.7]} />
        <meshBasicMaterial color="white" opacity={0.15} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[-0.6, 0.4, 0.65]} rotation={[0, -0.3, -0.1]}>
        <planeGeometry args={[0.04, 0.45]} />
        <meshBasicMaterial color="white" opacity={0.06} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ── Simple label using a canvas texture (no drei Text / no font download) ──
function CanvasLabel({ text, width, height, fontSize, color, bgColor, position }: {
  text: string; width: number; height: number; fontSize: number;
  color: string; bgColor: string; position: [number, number, number];
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 4;
    canvas.height = height * 4;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize * 4}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [text, width, height, fontSize, color, bgColor]);

  return (
    <mesh position={position}>
      <planeGeometry args={[width / 100, height / 100]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

// ── Machine Body ──
function MachineBody({ label, priceLabel }: { label: string; priceLabel: string }) {
  return (
    <group>
      <mesh position={[0, -0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.35, 1.4, 1.1, 24]} />
        <meshPhysicalMaterial color="#dc2626" roughness={0.35} clearcoat={0.7} clearcoatRoughness={0.08} />
      </mesh>
      {/* Chrome bands */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[1.42, 1.38, 0.12, 24]} />
        <meshPhysicalMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} />
      </mesh>
      <mesh position={[0, -0.68, 0]}>
        <cylinderGeometry args={[1.42, 1.45, 0.08, 24]} />
        <meshPhysicalMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} />
      </mesh>
      {/* Front panel */}
      <group position={[0, -0.1, 1.28]}>
        <mesh><planeGeometry args={[1.8, 0.7]} /><meshPhysicalMaterial color="#1e1e2e" metalness={0.3} roughness={0.6} /></mesh>
        <mesh position={[0, 0, -0.005]}><planeGeometry args={[1.85, 0.75]} /><meshPhysicalMaterial color="#991b1b" roughness={0.5} /></mesh>
      </group>
      {/* Label (canvas texture, no font download) */}
      <CanvasLabel text={label} width={150} height={18} fontSize={5} color="#dc2626" bgColor="#ffffff" position={[0, 0.18, 1.37]} />
      {/* Price tag */}
      <CanvasLabel text={priceLabel} width={25} height={12} fontSize={4} color="#991b1b" bgColor="#fef08a" position={[0.65, 0.18, 1.38]} />
      {/* Coin slot */}
      <group position={[0.95, 0.0, 1.34]}>
        <mesh><boxGeometry args={[0.14, 0.025, 0.02]} /><meshPhysicalMaterial color="#1a1a2e" metalness={0.5} roughness={0.3} /></mesh>
        <mesh position={[0, 0, -0.005]}><boxGeometry args={[0.18, 0.05, 0.01]} /><meshPhysicalMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} /></mesh>
      </group>
      {/* Screws */}
      {([[1.05, 0.28, 1.05], [-1.05, 0.28, 1.05], [1.05, -0.55, 1.05], [-1.05, -0.55, 1.05]] as [number, number, number][]).map((pos, i) => (
        <group key={i} position={pos}>
          <mesh><cylinderGeometry args={[0.025, 0.025, 0.01, 6]} /><meshPhysicalMaterial color="#a0a0b0" metalness={0.9} roughness={0.15} /></mesh>
        </group>
      ))}
      {/* Capsule tray */}
      <group position={[0, -0.62, 1.25]}>
        <mesh><boxGeometry args={[0.65, 0.22, 0.35]} /><meshStandardMaterial color="#0a0a0a" roughness={0.9} /></mesh>
        <mesh position={[0, 0.11, 0.17]}><boxGeometry args={[0.7, 0.025, 0.025]} /><meshPhysicalMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} /></mesh>
      </group>
      {/* Feet */}
      {([-0.85, 0.85] as number[]).map((x, i) => (
        <group key={i} position={[x, -0.76, 0]}>
          <mesh><cylinderGeometry args={[0.1, 0.12, 0.08, 8]} /><meshPhysicalMaterial color="#a0a0b0" metalness={0.8} roughness={0.2} /></mesh>
          <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.12, 0.12, 0.02, 8]} /><meshStandardMaterial color="#333" roughness={0.95} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ── Top Cap ──
function TopCap() {
  return (
    <group position={[0, 1.88, 0]}>
      <mesh><cylinderGeometry args={[0.45, 0.5, 0.1, 24]} /><meshPhysicalMaterial color="#dc2626" roughness={0.35} clearcoat={0.6} /></mesh>
      <mesh position={[0, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.49, 0.012, 6, 24]} /><meshPhysicalMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} />
      </mesh>
      <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.06, 0.08, 0.07, 12]} /><meshPhysicalMaterial color="#b91c1c" roughness={0.35} clearcoat={0.5} /></mesh>
      <mesh position={[0, 0.14, 0]}><sphereGeometry args={[0.06, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} /><meshPhysicalMaterial color="#b91c1c" roughness={0.3} clearcoat={0.5} /></mesh>
    </group>
  );
}

// ── Knob ──
function Knob({ spinning, canDispense, onTurn }: { spinning: boolean; canDispense: boolean; onTurn: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const targetAngle = useRef(0);
  const currentAngle = useRef(0);

  useEffect(() => { if (spinning) targetAngle.current += Math.PI * 3; }, [spinning]);
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    currentAngle.current += (targetAngle.current - currentAngle.current) * Math.min(delta * 3.5, 0.15);
    groupRef.current.rotation.z = currentAngle.current;
  });

  return (
    <group position={[0, -0.15, 1.42]} ref={groupRef}
      onClick={(e) => { e.stopPropagation(); if (canDispense) onTurn(); }}
      onPointerEnter={() => { setHovered(true); if (canDispense) document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.1, 16]} />
        <meshPhysicalMaterial color={hovered && canDispense ? '#fef08a' : '#d4d4d8'} metalness={0.95} roughness={0.08} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.015]}>
        <cylinderGeometry args={[0.2, 0.2, 0.08, 16]} /><meshPhysicalMaterial color="#1e1e2e" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><boxGeometry args={[0.32, 0.07, 0.025]} /><meshPhysicalMaterial color="#a0a0b0" metalness={0.85} roughness={0.15} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><boxGeometry args={[0.025, 0.07, 0.32]} /><meshPhysicalMaterial color="#a0a0b0" metalness={0.85} roughness={0.15} /></mesh>
      <mesh position={[0, 0.055, 0]}><sphereGeometry args={[0.045, 8, 8]} /><meshPhysicalMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} /></mesh>
      {canDispense && !spinning && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.02]}>
          <torusGeometry args={[0.28, 0.008, 6, 16]} /><meshBasicMaterial color="#fbbf24" opacity={0.25} transparent />
        </mesh>
      )}
    </group>
  );
}

// ── Orbit Controls (direct from three.js, no drei) ──
function Controls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<ThreeOrbitControls>(null);

  useEffect(() => {
    const controls = new ThreeOrbitControls(camera, gl.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.minAzimuthAngle = -Math.PI * 0.25;
    controls.maxAzimuthAngle = Math.PI * 0.25;
    controls.target.set(0, 0.5, 0);
    controls.update();
    controlsRef.current = controls;
    return () => { controls.dispose(); };
  }, [camera, gl]);

  useFrame(() => { controlsRef.current?.update(); });
  return null;
}

// ── Main Scene ──
export function GachaponScene3D({ balls, shaking, phase, onTurnKnob, tilt, label, priceLabel }: {
  balls: Ball[]; shaking: boolean; phase: string; onTurnKnob: () => void;
  tilt: { x: number; z: number }; label: string; priceLabel: string;
}) {
  const machineRef = useRef<THREE.Group>(null);
  const prevAzimuth = useRef(0);
  const { camera } = useThree();

  useFrame(() => {
    if (!machineRef.current) return;
    if (shaking) {
      machineRef.current.position.x = Math.sin(Date.now() * 0.04) * 0.012;
      machineRef.current.rotation.z = Math.sin(Date.now() * 0.035) * 0.003;
    } else {
      machineRef.current.position.x *= 0.93;
      machineRef.current.rotation.z *= 0.93;
    }
    const azimuth = Math.atan2(camera.position.x, camera.position.z);
    const delta = azimuth - prevAzimuth.current;
    prevAzimuth.current = azimuth;
    if (Math.abs(delta) > 0.001 && Math.abs(delta) < 0.5) {
      applyOrbitForce(balls, delta * 25);
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} castShadow shadow-mapSize={[512, 512]} color="#fff5e6" />
      <pointLight position={[-3, 4, 2]} intensity={0.4} color="#93c5fd" />
      <pointLight position={[3, 2, 3]} intensity={0.3} color="#fde68a" />
      <spotLight position={[0, 5, 3]} angle={0.4} penumbra={0.6} intensity={2} castShadow />
      <pointLight position={[0, 0.6, 0]} intensity={0.3} color="#ffffff" distance={2} />
      <hemisphereLight args={['#b0c4de', '#2a2a3a', 0.8]} />

      <Controls />

      <group ref={machineRef}>
        <MachineBody label={label} priceLabel={priceLabel} />
        <GlassDome />
        <TopCap />
        <BallsController balls={balls} shaking={shaking} tilt={tilt} />
        <Knob spinning={phase === 'knob-turning'} canDispense={phase === 'idle'} onTurn={onTurnKnob} />
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} /><meshStandardMaterial color="#111827" />
      </mesh>
    </>
  );
}
