'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Text, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Ball } from './types';
import { simulate, applyOrbitForce } from './physics';

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
        <sphereGeometry args={[ball.radius, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color={ball.topColor} roughness={0.2} clearcoat={0.8} clearcoatRoughness={0.05} envMapIntensity={1.5} />
      </mesh>
      <mesh castShadow>
        <sphereGeometry args={[ball.radius, 20, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshPhysicalMaterial color={ball.bottomColor} roughness={0.2} clearcoat={0.8} clearcoatRoughness={0.05} envMapIntensity={1.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ball.radius * 0.99, 0.003, 6, 24]} />
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
        <sphereGeometry args={[1.4, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshPhysicalMaterial
          color="#e8f0ff" roughness={0.0} transparent opacity={0.12}
          envMapIntensity={2.5} clearcoat={1} clearcoatRoughness={0}
          side={THREE.DoubleSide} depthWrite={false} ior={1.52}
          specularIntensity={1.5} specularColor="#ffffff"
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.38, 0.015, 8, 64]} />
        <meshBasicMaterial color="white" opacity={0.06} transparent />
      </mesh>
      {/* Glass reflections */}
      {[[0.5, 0.35, 0.9, 0.06, 0.7, 0.15], [0.65, 0.2, 0.7, 0.04, 0.4, 0.08], [-0.6, 0.4, 0.65, 0.04, 0.45, 0.06]].map(([x, y, z, w, h, o], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i === 2 ? -0.3 : 0.4, 0.1 * (i === 2 ? -1 : 1)]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color="white" opacity={o} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ── Machine Body ──
function MachineBody({ label, priceLabel }: { label: string; priceLabel: string }) {
  return (
    <group>
      <mesh position={[0, -0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.35, 1.4, 1.1, 32]} />
        <meshPhysicalMaterial color="#dc2626" roughness={0.35} clearcoat={0.7} clearcoatRoughness={0.08} />
      </mesh>
      {/* Chrome bands */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[1.42, 1.38, 0.12, 32]} />
        <meshPhysicalMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} />
      </mesh>
      <mesh position={[0, -0.68, 0]}>
        <cylinderGeometry args={[1.42, 1.45, 0.08, 32]} />
        <meshPhysicalMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} />
      </mesh>
      {/* Front panel */}
      <group position={[0, -0.1, 1.28]}>
        <mesh><planeGeometry args={[1.8, 0.7]} /><meshPhysicalMaterial color="#1e1e2e" metalness={0.3} roughness={0.6} /></mesh>
        <mesh position={[0, 0, -0.005]}><planeGeometry args={[1.85, 0.75]} /><meshPhysicalMaterial color="#991b1b" roughness={0.5} /></mesh>
      </group>
      {/* Label */}
      <group position={[0, 0.18, 1.36]}>
        <mesh><planeGeometry args={[1.5, 0.18]} /><meshStandardMaterial color="#ffffff" roughness={0.4} /></mesh>
        <Text position={[0, 0, 0.005]} fontSize={0.055} color="#dc2626" anchorX="center" anchorY="middle" letterSpacing={0.15} fontWeight={700}>
          {label}
        </Text>
      </group>
      {/* Price tag */}
      <group position={[0.65, 0.18, 1.37]}>
        <mesh><planeGeometry args={[0.25, 0.12]} /><meshStandardMaterial color="#fef08a" roughness={0.3} /></mesh>
        <Text position={[0, 0, 0.003]} fontSize={0.04} color="#991b1b" anchorX="center" anchorY="middle" fontWeight={700}>
          {priceLabel}
        </Text>
      </group>
      {/* Coin slot */}
      <group position={[0.95, 0.0, 1.34]}>
        <mesh><boxGeometry args={[0.14, 0.025, 0.02]} /><meshPhysicalMaterial color="#1a1a2e" metalness={0.5} roughness={0.3} /></mesh>
        <mesh position={[0, 0, -0.005]}><boxGeometry args={[0.18, 0.05, 0.01]} /><meshPhysicalMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} /></mesh>
      </group>
      {/* Screws */}
      {([[1.05, 0.28, 1.05], [-1.05, 0.28, 1.05], [1.05, -0.55, 1.05], [-1.05, -0.55, 1.05]] as [number, number, number][]).map((pos, i) => (
        <group key={i} position={pos}>
          <mesh><cylinderGeometry args={[0.025, 0.025, 0.01, 8]} /><meshPhysicalMaterial color="#a0a0b0" metalness={0.9} roughness={0.15} /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}><boxGeometry args={[0.03, 0.002, 0.002]} /><meshBasicMaterial color="#666" /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}><boxGeometry args={[0.002, 0.002, 0.03]} /><meshBasicMaterial color="#666" /></mesh>
        </group>
      ))}
      {/* Capsule tray */}
      <group position={[0, -0.62, 1.25]}>
        <mesh><boxGeometry args={[0.65, 0.22, 0.35]} /><meshStandardMaterial color="#0a0a0a" roughness={0.9} /></mesh>
        <mesh position={[0, 0.11, 0.17]}><boxGeometry args={[0.7, 0.025, 0.025]} /><meshPhysicalMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} /></mesh>
        <mesh position={[0, -0.02, 0.18]} rotation={[0.25, 0, 0]}>
          <planeGeometry args={[0.62, 0.2]} />
          <meshPhysicalMaterial color="#888" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* Feet */}
      {([-0.85, 0.85] as number[]).map((x, i) => (
        <group key={i} position={[x, -0.76, 0]}>
          <mesh><cylinderGeometry args={[0.1, 0.12, 0.08, 12]} /><meshPhysicalMaterial color="#a0a0b0" metalness={0.8} roughness={0.2} /></mesh>
          <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.12, 0.12, 0.02, 12]} /><meshStandardMaterial color="#333" roughness={0.95} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ── Top Cap ──
function TopCap() {
  return (
    <group position={[0, 1.88, 0]}>
      <mesh><cylinderGeometry args={[0.45, 0.5, 0.1, 32]} /><meshPhysicalMaterial color="#dc2626" roughness={0.35} clearcoat={0.6} /></mesh>
      <mesh position={[0, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.49, 0.012, 8, 32]} /><meshPhysicalMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} />
      </mesh>
      <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.06, 0.08, 0.07, 16]} /><meshPhysicalMaterial color="#b91c1c" roughness={0.35} clearcoat={0.5} /></mesh>
      <mesh position={[0, 0.14, 0]}><sphereGeometry args={[0.06, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} /><meshPhysicalMaterial color="#b91c1c" roughness={0.3} clearcoat={0.5} /></mesh>
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
        <cylinderGeometry args={[0.26, 0.26, 0.1, 24]} />
        <meshPhysicalMaterial color={hovered && canDispense ? '#fef08a' : '#d4d4d8'} metalness={0.95} roughness={0.08} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.015]}>
        <cylinderGeometry args={[0.2, 0.2, 0.08, 24]} /><meshPhysicalMaterial color="#1e1e2e" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><boxGeometry args={[0.32, 0.07, 0.025]} /><meshPhysicalMaterial color="#a0a0b0" metalness={0.85} roughness={0.15} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><boxGeometry args={[0.025, 0.07, 0.32]} /><meshPhysicalMaterial color="#a0a0b0" metalness={0.85} roughness={0.15} /></mesh>
      <mesh position={[0, 0.055, 0]}><sphereGeometry args={[0.045, 12, 12]} /><meshPhysicalMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} /></mesh>
      {canDispense && !spinning && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.02]}>
          <torusGeometry args={[0.28, 0.008, 8, 24]} /><meshBasicMaterial color="#fbbf24" opacity={0.25} transparent />
        </mesh>
      )}
    </group>
  );
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
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} color="#fff5e6" />
      <pointLight position={[-3, 4, 2]} intensity={0.4} color="#93c5fd" />
      <pointLight position={[3, 2, 3]} intensity={0.3} color="#fde68a" />
      <spotLight position={[0, 5, 3]} angle={0.4} penumbra={0.6} intensity={2} castShadow />
      <pointLight position={[0, 0.6, 0]} intensity={0.3} color="#ffffff" distance={2} />
      <Environment preset="studio" />
      <OrbitControls enablePan={false} enableZoom={false}
        minPolarAngle={Math.PI * 0.25} maxPolarAngle={Math.PI * 0.55}
        minAzimuthAngle={-Math.PI * 0.25} maxAzimuthAngle={Math.PI * 0.25}
        target={[0, 0.5, 0]} />
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
      <ContactShadows position={[0, -0.84, 0]} opacity={0.4} scale={6} blur={2.5} far={2.5} />
    </>
  );
}
