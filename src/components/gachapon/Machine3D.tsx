'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Ball } from './types';
import { simulate, applyOrbitForce } from './physics';

extend({ OrbitControls: ThreeOrbitControls });

// Shared materials (created once, reused across all meshes)
const chromeMat = new THREE.MeshStandardMaterial({ color: '#d4d4d8', metalness: 0.9, roughness: 0.1 });
const darkMat = new THREE.MeshStandardMaterial({ color: '#1e1e2e', metalness: 0.4, roughness: 0.5 });
const redMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.35 });
const darkRedMat = new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.5 });
const blackMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.9 });
const floorMat = new THREE.MeshStandardMaterial({ color: '#111827' });

// Shared geometries
const capsuleGeo = new THREE.SphereGeometry(1, 12, 12); // Unit sphere, scaled per ball
const torusGeo = new THREE.TorusGeometry(0.99, 0.02, 4, 12);

// ── Instanced Capsules (single draw call for all balls) ──
function InstancedCapsules({ balls }: { balls: Ball[] }) {
  const topRef = useRef<THREE.InstancedMesh>(null);
  const botRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const topMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const botMats = useRef<THREE.MeshStandardMaterial[]>([]);

  // Create individual materials for each ball color
  const { topMaterial, botMaterial } = useMemo(() => {
    // For instanced mesh we can't have per-instance materials easily,
    // so we use vertex colors instead
    const tm = new THREE.MeshStandardMaterial({ roughness: 0.25, vertexColors: false });
    const bm = new THREE.MeshStandardMaterial({ roughness: 0.25, vertexColors: false });
    return { topMaterial: tm, botMaterial: bm };
  }, []);

  // Since instanced meshes share one material, we'll use individual meshes but with shared geometry
  // This is still fast because geometry is shared (single GPU buffer)
  return (
    <>
      {balls.map((ball, i) => (
        <CapsuleMesh key={i} ball={ball} />
      ))}
    </>
  );
}

// ── Single Capsule (shared geometry, individual materials cached) ──
const materialCache = new Map<string, THREE.MeshStandardMaterial>();
function getCachedMaterial(color: string): THREE.MeshStandardMaterial {
  if (!materialCache.has(color)) {
    materialCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.25 }));
  }
  return materialCache.get(color)!;
}

const topGeo = new THREE.SphereGeometry(1, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
const botGeo = new THREE.SphereGeometry(1, 12, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
const seamGeo = new THREE.TorusGeometry(0.99, 0.02, 4, 12);
const seamMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.1 });

function CapsuleMesh({ ball }: { ball: Ball }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(ball.position.x, ball.position.y, ball.position.z);
    groupRef.current.rotation.set(ball.angle, ball.angle * 0.6, ball.angle * 0.8);
    groupRef.current.scale.setScalar(ball.radius);
  });

  return (
    <group ref={groupRef} scale={ball.radius}>
      <mesh geometry={topGeo} material={getCachedMaterial(ball.topColor)} />
      <mesh geometry={botGeo} material={getCachedMaterial(ball.bottomColor)} />
      <mesh geometry={seamGeo} material={seamMat} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

// ── BallsController ──
function BallsController({ balls, shaking, tilt }: { balls: Ball[]; shaking: boolean; tilt: { x: number; z: number } }) {
  useFrame((_, delta) => { simulate(balls, shaking, delta, tilt); });
  return <>{balls.map((ball, i) => <CapsuleMesh key={i} ball={ball} />)}</>;
}

// ── Glass Dome ──
const domeGeo = new THREE.SphereGeometry(1.4, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
const domeMat = new THREE.MeshStandardMaterial({
  color: '#e8f0ff', roughness: 0.0, transparent: true, opacity: 0.1,
  side: THREE.DoubleSide, depthWrite: false,
});

function GlassDome() {
  return (
    <group position={[0, 0.48, 0]}>
      <mesh geometry={domeGeo} material={domeMat} renderOrder={1} />
      {/* Single specular streak */}
      <mesh position={[0.5, 0.35, 0.9]} rotation={[0.1, 0.4, 0.15]}>
        <planeGeometry args={[0.06, 0.7]} />
        <meshBasicMaterial color="white" opacity={0.12} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ── Canvas Label (no font download) ──
function CanvasLabel({ text, width, height, fontSize, color, bgColor, position }: {
  text: string; width: number; height: number; fontSize: number;
  color: string; bgColor: string; position: [number, number, number];
}) {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = width * 3;
    canvas.height = height * 3;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize * 3}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [text, width, height, fontSize, color, bgColor]);

  if (!texture) return null;
  return (
    <mesh position={position}>
      <planeGeometry args={[width / 100, height / 100]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

// ── Machine Body (using shared materials, no shadows) ──
function MachineBody({ label, priceLabel }: { label: string; priceLabel: string }) {
  return (
    <group>
      {/* Body cylinder */}
      <mesh position={[0, -0.15, 0]} material={redMat}>
        <cylinderGeometry args={[1.35, 1.4, 1.1, 20]} />
      </mesh>
      {/* Chrome bands */}
      <mesh position={[0, 0.32, 0]} material={chromeMat}>
        <cylinderGeometry args={[1.42, 1.38, 0.12, 20]} />
      </mesh>
      <mesh position={[0, -0.68, 0]} material={chromeMat}>
        <cylinderGeometry args={[1.42, 1.45, 0.08, 20]} />
      </mesh>
      {/* Front panel */}
      <group position={[0, -0.1, 1.28]}>
        <mesh material={darkMat}><planeGeometry args={[1.8, 0.7]} /></mesh>
        <mesh position={[0, 0, -0.005]} material={darkRedMat}><planeGeometry args={[1.85, 0.75]} /></mesh>
      </group>
      {/* Labels */}
      <CanvasLabel text={label} width={150} height={18} fontSize={5} color="#dc2626" bgColor="#ffffff" position={[0, 0.18, 1.37]} />
      <CanvasLabel text={priceLabel} width={25} height={12} fontSize={4} color="#991b1b" bgColor="#fef08a" position={[0.65, 0.18, 1.38]} />
      {/* Coin slot */}
      <mesh position={[0.95, 0.0, 1.34]} material={darkMat}><boxGeometry args={[0.14, 0.025, 0.02]} /></mesh>
      <mesh position={[0.95, 0.0, 1.335]} material={chromeMat}><boxGeometry args={[0.18, 0.05, 0.01]} /></mesh>
      {/* Capsule tray */}
      <mesh position={[0, -0.62, 1.25]} material={blackMat}><boxGeometry args={[0.65, 0.22, 0.35]} /></mesh>
      <mesh position={[0, -0.51, 1.42]} material={chromeMat}><boxGeometry args={[0.7, 0.025, 0.025]} /></mesh>
      {/* Feet */}
      {([-0.85, 0.85] as number[]).map((x, i) => (
        <group key={i} position={[x, -0.76, 0]}>
          <mesh material={chromeMat}><cylinderGeometry args={[0.1, 0.12, 0.08, 8]} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ── Top Cap ──
function TopCap() {
  return (
    <group position={[0, 1.88, 0]}>
      <mesh material={redMat}><cylinderGeometry args={[0.45, 0.5, 0.1, 16]} /></mesh>
      <mesh position={[0, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={chromeMat}>
        <torusGeometry args={[0.49, 0.012, 4, 16]} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.1, 8]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.35} />
      </mesh>
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
        <cylinderGeometry args={[0.26, 0.26, 0.1, 12]} />
        <meshStandardMaterial color={hovered && canDispense ? '#fef08a' : '#d4d4d8'} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.015]} material={darkMat}>
        <cylinderGeometry args={[0.2, 0.2, 0.08, 12]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={chromeMat}><boxGeometry args={[0.32, 0.07, 0.025]} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={chromeMat}><boxGeometry args={[0.025, 0.07, 0.32]} /></mesh>
      <mesh position={[0, 0.055, 0]} material={chromeMat}><sphereGeometry args={[0.045, 6, 6]} /></mesh>
      {canDispense && !spinning && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.02]}>
          <torusGeometry args={[0.28, 0.008, 4, 12]} />
          <meshBasicMaterial color="#fbbf24" opacity={0.25} transparent />
        </mesh>
      )}
    </group>
  );
}

// ── Orbit Controls ──
function Controls() {
  const { camera, gl } = useThree();
  const ref = useRef<ThreeOrbitControls>(null);
  useEffect(() => {
    const c = new ThreeOrbitControls(camera, gl.domElement);
    c.enablePan = false; c.enableZoom = false;
    c.minPolarAngle = Math.PI * 0.25; c.maxPolarAngle = Math.PI * 0.55;
    c.minAzimuthAngle = -Math.PI * 0.25; c.maxAzimuthAngle = Math.PI * 0.25;
    c.target.set(0, 0.5, 0); c.update();
    ref.current = c;
    return () => { c.dispose(); };
  }, [camera, gl]);
  useFrame(() => { ref.current?.update(); });
  return null;
}

// ── Main Scene (no shadows for faster render) ──
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
    const az = Math.atan2(camera.position.x, camera.position.z);
    const d = az - prevAzimuth.current;
    prevAzimuth.current = az;
    if (Math.abs(d) > 0.001 && Math.abs(d) < 0.5) applyOrbitForce(balls, d * 25);
  });

  return (
    <>
      {/* Simplified lighting (no shadows) */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} color="#fff5e6" />
      <pointLight position={[-3, 4, 2]} intensity={0.4} color="#93c5fd" />
      <pointLight position={[2, 1, 3]} intensity={0.3} color="#fde68a" />
      <hemisphereLight args={['#b0c4de', '#2a2a3a', 0.6]} />

      <Controls />

      <group ref={machineRef}>
        <MachineBody label={label} priceLabel={priceLabel} />
        <GlassDome />
        <TopCap />
        <BallsController balls={balls} shaking={shaking} tilt={tilt} />
        <Knob spinning={phase === 'knob-turning'} canDispense={phase === 'idle'} onTurn={onTurnKnob} />
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]} material={floorMat}>
        <planeGeometry args={[20, 20]} />
      </mesh>
    </>
  );
}
