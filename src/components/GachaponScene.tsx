'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, MeshTransmissionMaterial, Text, useGLTF, RoundedBox, Sparkles } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider, BallCollider, RapierRigidBody } from '@react-three/rapier';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useRef, useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import * as THREE from 'three';

// --- Prize segments (same weights as original) ---
interface PrizeSegment {
  id: string;
  label: string;
  creditValue: number;
  weight: number;
}

const SEGMENTS: PrizeSegment[] = [
  { id: '1', label: '3 Credits', creditValue: 3, weight: 24 },
  { id: '2', label: '6 Credits', creditValue: 6, weight: 18 },
  { id: '3', label: '9 Credits', creditValue: 9, weight: 14 },
  { id: '4', label: '12 Credits', creditValue: 12, weight: 10 },
  { id: '5', label: '15 Credits', creditValue: 15, weight: 7 },
  { id: '6', label: '18 Credits', creditValue: 18, weight: 5 },
  { id: '7', label: '21 Credits', creditValue: 21, weight: 3 },
  { id: '8', label: '24 Credits', creditValue: 24, weight: 2 },
];

const BALL_COLORS = [
  { base: '#355A99', emissive: '#1a2d4d' },
  { base: '#C4A24D', emissive: '#6b5628' },
  { base: '#0066B3', emissive: '#003359' },
  { base: '#2a4a7a', emissive: '#15253d' },
  { base: '#a88a3d', emissive: '#54451f' },
  { base: '#0055a0', emissive: '#002a50' },
  { base: '#4a6fa5', emissive: '#253752' },
  { base: '#8a7030', emissive: '#453818' },
];

function pickPrize(): PrizeSegment {
  const total = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  let rand = Math.random() * total;
  for (const seg of SEGMENTS) {
    rand -= seg.weight;
    if (rand <= 0) return seg;
  }
  return SEGMENTS[0];
}

// --- 3D Capsule Ball ---
function CapsuleBall({
  position,
  color,
  segment,
  index,
  onBallRef,
}: {
  position: [number, number, number];
  color: { base: string; emissive: string };
  segment: PrizeSegment;
  index: number;
  onBallRef?: (ref: RapierRigidBody, index: number) => void;
}) {
  const rigidRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const radius = 0.18 + Math.random() * 0.04;

  useEffect(() => {
    if (rigidRef.current && onBallRef) {
      onBallRef(rigidRef.current, index);
    }
  }, [onBallRef, index]);

  return (
    <RigidBody
      ref={rigidRef}
      position={position}
      restitution={0.5}
      friction={0.3}
      linearDamping={0.5}
      angularDamping={0.3}
      colliders={false}
    >
      <BallCollider args={[radius]} />
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshPhysicalMaterial
          color={color.base}
          metalness={0.1}
          roughness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={1.5}
          emissive={color.emissive}
          emissiveIntensity={0.1}
        />
      </mesh>
      {/* Seam line */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.98, 0.005, 8, 32]} />
        <meshBasicMaterial color="#ffffff" opacity={0.2} transparent />
      </mesh>
      {/* Specular highlight sphere */}
      <mesh position={[-radius * 0.25, radius * 0.3, radius * 0.4]}>
        <sphereGeometry args={[radius * 0.15, 16, 16]} />
        <meshBasicMaterial color="white" opacity={0.3} transparent />
      </mesh>
    </RigidBody>
  );
}

// --- Glass Dome ---
function GlassDome() {
  return (
    <group position={[0, 1.2, 0]}>
      {/* Dome shell - transparent glass */}
      <mesh>
        <sphereGeometry args={[1.1, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <MeshTransmissionMaterial
          backside
          samples={8}
          thickness={0.1}
          chromaticAberration={0.02}
          anisotropy={0.3}
          distortion={0.05}
          distortionScale={0.2}
          temporalDistortion={0.02}
          iridescence={0.3}
          iridescenceIOR={1}
          iridescenceThicknessRange={[0, 1400]}
          color="#c8d8f0"
          attenuationColor="#a0b8d0"
          attenuationDistance={3}
          opacity={0.35}
          transparent
          roughness={0.05}
          envMapIntensity={2}
        />
      </mesh>
      {/* Glass rim highlight */}
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.08, 0.02, 8, 64]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} opacity={0.15} transparent />
      </mesh>
    </group>
  );
}

// --- Machine Body ---
function MachineBody() {
  const bodyColor = '#1a1f35';
  const accentColor = '#C4A24D';

  return (
    <group>
      {/* Main cylindrical body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.2, 1.2, 32]} />
        <meshPhysicalMaterial
          color={bodyColor}
          metalness={0.8}
          roughness={0.3}
          clearcoat={0.5}
          clearcoatRoughness={0.2}
        />
      </mesh>

      {/* Gold band separator */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[1.18, 1.18, 0.06, 32]} />
        <meshPhysicalMaterial
          color={accentColor}
          metalness={0.9}
          roughness={0.15}
          emissive={accentColor}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Bottom band */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[1.22, 1.22, 0.06, 32]} />
        <meshPhysicalMaterial
          color={accentColor}
          metalness={0.9}
          roughness={0.15}
          emissive={accentColor}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* GACHAPON text plate */}
      <mesh position={[0, 0.3, 1.16]} rotation={[0, 0, 0]}>
        <planeGeometry args={[1.2, 0.18]} />
        <meshPhysicalMaterial
          color="#0c1020"
          metalness={0.5}
          roughness={0.5}
          opacity={0.9}
          transparent
        />
      </mesh>
      <Text
        position={[0, 0.3, 1.17]}
        fontSize={0.07}
        color={accentColor}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.35}
        font="/fonts/inter-bold.woff"
      >
        GACHAPON
      </Text>

      {/* Screws */}
      {[
        [0.9, 0.45, 0.75],
        [-0.9, 0.45, 0.75],
        [0.9, -0.45, 0.75],
        [-0.9, -0.45, 0.75],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 6]} />
          <meshPhysicalMaterial color="#45455a" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}

      {/* Coin slot */}
      <group position={[0.85, 0.1, 1.14]}>
        <mesh>
          <boxGeometry args={[0.15, 0.03, 0.02]} />
          <meshPhysicalMaterial color="#000" metalness={0.8} roughness={0.2} />
        </mesh>
        <Text position={[0, -0.04, 0.01]} fontSize={0.025} color={accentColor} anchorX="center" anchorY="middle">
          COIN
        </Text>
      </group>

      {/* Chute opening */}
      <mesh position={[0, -0.75, 0.9]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.5, 0.25, 0.3]} />
        <meshPhysicalMaterial color="#020408" metalness={0.2} roughness={0.8} />
      </mesh>
      {/* Chute inner shadow */}
      <mesh position={[0, -0.75, 0.82]}>
        <boxGeometry args={[0.45, 0.2, 0.15]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Machine feet */}
      {[-0.7, 0.7].map((x, i) => (
        <mesh key={i} position={[x, -0.7, 0]}>
          <cylinderGeometry args={[0.12, 0.15, 0.12, 16]} />
          <meshPhysicalMaterial color="#0c1020" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// --- Knob ---
function Knob({
  onTurn,
  isSpinning,
  canDispense,
}: {
  onTurn: () => void;
  isSpinning: boolean;
  canDispense: boolean;
}) {
  const knobRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);

  useEffect(() => {
    if (isSpinning) {
      targetRotation.current += Math.PI * 3;
    }
  }, [isSpinning]);

  useFrame((_, delta) => {
    if (knobRef.current) {
      currentRotation.current += (targetRotation.current - currentRotation.current) * delta * 3;
      knobRef.current.rotation.z = currentRotation.current;
    }
  });

  return (
    <group
      ref={knobRef}
      position={[0, -0.1, 1.25]}
      onClick={canDispense ? onTurn : undefined}
      onPointerEnter={() => {
        setHovered(true);
        if (canDispense) document.body.style.cursor = 'pointer';
      }}
      onPointerLeave={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {/* Knob base ring */}
      <mesh>
        <cylinderGeometry args={[0.28, 0.28, 0.08, 32]} />
        <meshPhysicalMaterial
          color="#50506a"
          metalness={0.9}
          roughness={0.2}
          emissive={hovered && canDispense ? '#C4A24D' : '#000000'}
          emissiveIntensity={hovered && canDispense ? 0.3 : 0}
        />
      </mesh>
      {/* Inner knob face */}
      <mesh position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.1, 32]} />
        <meshPhysicalMaterial
          color="#2a2a3e"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>
      {/* Cross handle - horizontal */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.35, 0.06, 0.03]} />
        <meshPhysicalMaterial color="#555570" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Cross handle - vertical */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.03, 0.06, 0.35]} />
        <meshPhysicalMaterial color="#555570" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Center cap with gold accent */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshPhysicalMaterial
          color="#C4A24D"
          metalness={0.9}
          roughness={0.1}
          emissive="#C4A24D"
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Glow ring when ready */}
      {canDispense && !isSpinning && (
        <mesh position={[0, 0, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.015, 8, 32]} />
          <meshBasicMaterial color="#C4A24D" opacity={0.4} transparent />
        </mesh>
      )}
    </group>
  );
}

// --- Dome Collision Walls (invisible) ---
function DomeColliders() {
  const segments = 16;
  const radius = 1.05;
  const height = 0.9;
  const centerY = 1.4;

  const walls = useMemo(() => {
    const w: { pos: [number, number, number]; rot: [number, number, number] }[] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      w.push({
        pos: [x, centerY, z],
        rot: [0, -angle, 0],
      });
    }
    return w;
  }, []);

  return (
    <group>
      {/* Dome walls */}
      {walls.map((w, i) => (
        <RigidBody key={i} type="fixed" position={w.pos} rotation={w.rot}>
          <CuboidCollider args={[0.22, height / 2, 0.02]} />
        </RigidBody>
      ))}
      {/* Floor of dome */}
      <RigidBody type="fixed" position={[0, 0.75, 0]}>
        <CuboidCollider args={[1.1, 0.05, 1.1]} />
      </RigidBody>
      {/* Ceiling of dome */}
      <RigidBody type="fixed" position={[0, 2.1, 0]}>
        <CuboidCollider args={[0.6, 0.05, 0.6]} />
      </RigidBody>
      {/* Funnel walls to guide balls toward center */}
      <RigidBody type="fixed" position={[-0.5, 0.85, 0]} rotation={[0, 0, -0.4]}>
        <CuboidCollider args={[0.3, 0.02, 0.8]} />
      </RigidBody>
      <RigidBody type="fixed" position={[0.5, 0.85, 0]} rotation={[0, 0, 0.4]}>
        <CuboidCollider args={[0.3, 0.02, 0.8]} />
      </RigidBody>
    </group>
  );
}

// --- Top Cap ---
function TopCap() {
  return (
    <group position={[0, 2.05, 0]}>
      <mesh>
        <cylinderGeometry args={[0.65, 1.12, 0.25, 32]} />
        <meshPhysicalMaterial
          color="#252a42"
          metalness={0.85}
          roughness={0.25}
          clearcoat={0.3}
        />
      </mesh>
      {/* Ventilation slots */}
      {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
        <mesh key={i} position={[x, 0.13, 0]}>
          <boxGeometry args={[0.06, 0.015, 0.4]} />
          <meshBasicMaterial color="#000" opacity={0.5} transparent />
        </mesh>
      ))}
      {/* Premium badge */}
      <Text
        position={[0, 0.05, 0.55]}
        fontSize={0.04}
        color="#C4A24D"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.25}
      >
        PREMIUM
      </Text>
    </group>
  );
}

// --- Dispensed Ball Animation (outside physics) ---
function DispensedBall({
  color,
  phase,
  creditValue,
  onPhaseComplete,
}: {
  color: { base: string; emissive: string };
  phase: 'dropping' | 'landed' | 'cracking' | 'opening' | 'reveal';
  creditValue: number;
  onPhaseComplete: (next: string) => void;
}) {
  const ballRef = useRef<THREE.Group>(null);
  const topShellRef = useRef<THREE.Mesh>(null);
  const bottomShellRef = useRef<THREE.Mesh>(null);
  const prizeRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const phaseTimeRef = useRef(0);

  useEffect(() => {
    phaseTimeRef.current = 0;
  }, [phase]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    phaseTimeRef.current += delta;
    const t = phaseTimeRef.current;

    if (!ballRef.current) return;

    if (phase === 'dropping') {
      // Ball drops from above with bounce
      const dropDuration = 0.8;
      const progress = Math.min(t / dropDuration, 1);
      const bounce = Math.abs(Math.sin(progress * Math.PI * 3)) * (1 - progress) * 1.5;
      ballRef.current.position.y = 3 - progress * 3 + bounce;
      ballRef.current.rotation.x = t * 5;
      ballRef.current.rotation.z = t * 3;

      if (progress >= 1) onPhaseComplete('landed');
    } else if (phase === 'landed') {
      ballRef.current.position.y = 0;
      ballRef.current.rotation.x = 0;
      ballRef.current.rotation.z = 0;
      // Gentle wobble
      ballRef.current.rotation.z = Math.sin(t * 8) * 0.05 * Math.max(0, 1 - t);

      if (t > 0.8) onPhaseComplete('cracking');
    } else if (phase === 'cracking') {
      // Shake intensely
      ballRef.current.position.x = Math.sin(t * 40) * 0.03;
      ballRef.current.rotation.z = Math.sin(t * 35) * 0.04;

      if (t > 0.8) onPhaseComplete('opening');
    } else if (phase === 'opening') {
      const progress = Math.min(t / 0.6, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      if (topShellRef.current) {
        topShellRef.current.position.y = ease * 1.5;
        topShellRef.current.position.x = -ease * 0.5;
        topShellRef.current.rotation.z = -ease * 0.6;
        topShellRef.current.scale.setScalar(1 - ease * 0.3);
        (topShellRef.current.material as THREE.MeshPhysicalMaterial).opacity = 1 - ease;
      }
      if (bottomShellRef.current) {
        bottomShellRef.current.position.y = -ease * 1.2;
        bottomShellRef.current.position.x = ease * 0.4;
        bottomShellRef.current.rotation.z = ease * 0.5;
        bottomShellRef.current.scale.setScalar(1 - ease * 0.3);
        (bottomShellRef.current.material as THREE.MeshPhysicalMaterial).opacity = 1 - ease;
      }
      if (prizeRef.current) {
        const prizeScale = Math.min(progress * 2, 1);
        prizeRef.current.scale.setScalar(prizeScale);
        prizeRef.current.rotation.y = t * 2;
      }

      if (progress >= 1) onPhaseComplete('reveal');
    } else if (phase === 'reveal') {
      if (prizeRef.current) {
        prizeRef.current.rotation.y = t * 1.5;
        prizeRef.current.position.y = Math.sin(t * 2) * 0.1;
      }
    }
  });

  return (
    <group ref={ballRef} position={[0, 3, 0]}>
      {/* Top half shell */}
      <mesh ref={topShellRef} position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color={color.base}
          metalness={0.1}
          roughness={0.15}
          clearcoat={1}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Bottom half shell */}
      <mesh ref={bottomShellRef} position={[0, -0.02, 0]}>
        <sphereGeometry args={[0.4, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshPhysicalMaterial
          color={color.base}
          metalness={0.1}
          roughness={0.15}
          clearcoat={1}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Seam ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.008, 8, 32]} />
        <meshBasicMaterial color="white" opacity={0.3} transparent />
      </mesh>
      {/* Inner prize */}
      <group ref={prizeRef} scale={0}>
        <mesh>
          <dodecahedronGeometry args={[0.2]} />
          <meshPhysicalMaterial
            color="#C4A24D"
            metalness={0.9}
            roughness={0.1}
            emissive="#C4A24D"
            emissiveIntensity={0.5}
          />
        </mesh>
        <Text
          position={[0, 0, 0.25]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000"
        >
          {`+${creditValue}`}
        </Text>
        {/* Sparkle particles around prize */}
        <Sparkles
          count={20}
          scale={1}
          size={3}
          speed={2}
          color="#C4A24D"
        />
      </group>
      {/* ? mark before opening */}
      {(phase === 'dropping' || phase === 'landed' || phase === 'cracking') && (
        <Text
          position={[0, 0, 0.42]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="black"
        >
          ?
        </Text>
      )}
    </group>
  );
}

// --- Particle burst on ball open ---
function ParticleBurst({ color, active }: { color: string; active: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const velocities = useRef<Float32Array>(null);
  const count = 60;

  const { positions, colors: particleColors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    const gold = new THREE.Color('#C4A24D');

    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      const mixColor = i % 3 === 0 ? gold : c;
      col[i * 3] = mixColor.r;
      col[i * 3 + 1] = mixColor.g;
      col[i * 3 + 2] = mixColor.b;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 4;
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.cos(phi) * speed * 0.8 + 2;
      vel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }

    velocities.current = vel;
    return { positions: pos, colors: col };
  }, [color]);

  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!active || !particlesRef.current || !velocities.current) return;
    timeRef.current += delta;
    const t = timeRef.current;
    const posAttr = particlesRef.current.geometry.attributes.position;
    const vel = velocities.current;

    for (let i = 0; i < count; i++) {
      posAttr.array[i * 3] += vel[i * 3] * delta;
      posAttr.array[i * 3 + 1] += vel[i * 3 + 1] * delta - t * delta * 3;
      posAttr.array[i * 3 + 2] += vel[i * 3 + 2] * delta;
    }
    posAttr.needsUpdate = true;

    // Fade
    const mat = particlesRef.current.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - t * 0.8);
  });

  if (!active) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[particleColors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={1}
        sizeAttenuation
      />
    </points>
  );
}

// --- Camera Controller ---
function CameraController({ dispensing }: { dispensing: boolean }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 1.2, 4.5));
  const targetLookAt = useRef(new THREE.Vector3(0, 0.8, 0));

  useEffect(() => {
    if (dispensing) {
      targetPos.current.set(0, 0.5, 2.5);
      targetLookAt.current.set(0, 0.3, 0);
    } else {
      targetPos.current.set(0, 1.2, 4.5);
      targetLookAt.current.set(0, 0.8, 0);
    }
  }, [dispensing]);

  useFrame((_, delta) => {
    camera.position.lerp(targetPos.current, delta * 2);
    const lookTarget = new THREE.Vector3();
    lookTarget.copy(camera.position);
    lookTarget.lerp(targetLookAt.current, 1);
    camera.lookAt(targetLookAt.current);
  });

  return null;
}

// --- Main Scene ---
function Scene({
  onDispense,
  phase,
  setPhase,
  dispensedColor,
  dispensedCredit,
  shaking,
}: {
  onDispense: () => void;
  phase: string;
  setPhase: (p: string) => void;
  dispensedColor: { base: string; emissive: string } | null;
  dispensedCredit: number;
  shaking: boolean;
}) {
  const ballRefs = useRef<Map<number, RapierRigidBody>>(new Map());
  const machineRef = useRef<THREE.Group>(null);
  const shakeTimeRef = useRef(0);

  const handleBallRef = useCallback((ref: RapierRigidBody, index: number) => {
    ballRefs.current.set(index, ref);
  }, []);

  // Shake effect - apply impulses to all balls
  useFrame((_, delta) => {
    if (shaking) {
      shakeTimeRef.current += delta;
      ballRefs.current.forEach((body) => {
        if (body) {
          body.applyImpulse(
            {
              x: (Math.random() - 0.5) * 0.8,
              y: Math.random() * 0.5 + 0.2,
              z: (Math.random() - 0.5) * 0.8,
            },
            true
          );
        }
      });
      // Machine shake
      if (machineRef.current) {
        machineRef.current.position.x = Math.sin(shakeTimeRef.current * 40) * 0.02;
        machineRef.current.rotation.z = Math.sin(shakeTimeRef.current * 35) * 0.005;
      }
    } else {
      if (machineRef.current) {
        machineRef.current.position.x *= 0.9;
        machineRef.current.rotation.z *= 0.9;
      }
    }
  });

  const isDispensing = phase !== 'idle';

  return (
    <>
      <CameraController dispensing={isDispensing} />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-2, 3, 2]} intensity={0.5} color="#8ba3c7" />
      <pointLight position={[2, 1, 3]} intensity={0.3} color="#C4A24D" />

      {/* Spot light on machine */}
      <spotLight
        position={[0, 4, 2]}
        angle={0.5}
        penumbra={0.5}
        intensity={1.5}
        castShadow
        target-position={[0, 1, 0]}
      />

      {/* Environment for reflections */}
      <Environment preset="city" />

      <group ref={machineRef}>
        {/* Machine body */}
        <MachineBody />

        {/* Glass dome */}
        <GlassDome />

        {/* Top cap */}
        <TopCap />

        {/* Physics world for balls */}
        <Physics gravity={[0, -9.81, 0]}>
          <DomeColliders />

          {/* Balls */}
          {SEGMENTS.map((seg, i) => (
            <CapsuleBall
              key={seg.id}
              position={[
                (Math.random() - 0.5) * 1.2,
                1.2 + Math.random() * 0.8,
                (Math.random() - 0.5) * 1.2,
              ]}
              color={BALL_COLORS[i % BALL_COLORS.length]}
              segment={seg}
              index={i}
              onBallRef={handleBallRef}
            />
          ))}
        </Physics>

        {/* Knob */}
        <Knob
          onTurn={onDispense}
          isSpinning={phase === 'knob-turning'}
          canDispense={phase === 'idle'}
        />
      </group>

      {/* Dispensed ball overlay */}
      {isDispensing && dispensedColor && phase !== 'knob-turning' && (
        <group position={[0, 0, 2]}>
          <DispensedBall
            color={dispensedColor}
            phase={phase as 'dropping' | 'landed' | 'cracking' | 'opening' | 'reveal'}
            creditValue={dispensedCredit}
            onPhaseComplete={setPhase}
          />
          <ParticleBurst
            color={dispensedColor.base}
            active={phase === 'opening' || phase === 'reveal'}
          />
        </group>
      )}

      {/* Floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#080c16" metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Post processing */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          intensity={0.4}
          blendFunction={BlendFunction.ADD}
        />
        <Vignette offset={0.3} darkness={0.7} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    </>
  );
}

// --- Exported Component ---
export default function GachaponScene() {
  const [phase, setPhase] = useState('idle');
  const [prize, setPrize] = useState<PrizeSegment | null>(null);
  const [dispensedColor, setDispensedColor] = useState<{ base: string; emissive: string } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [totalCredits, setTotalCredits] = useState(0);
  const [showCollect, setShowCollect] = useState(false);

  const handleDispense = useCallback(() => {
    if (phase !== 'idle') return;

    const picked = pickPrize();
    const colorIndex = SEGMENTS.findIndex(s => s.id === picked.id);
    const color = BALL_COLORS[colorIndex % BALL_COLORS.length];

    setPrize(picked);
    setDispensedColor(color);

    // Phase sequence
    setPhase('knob-turning');
    setShaking(true);

    // Vibrate if available
    try { navigator?.vibrate?.([30, 50, 30, 50, 30, 50, 60]); } catch {}

    setTimeout(() => {
      setShaking(false);
      setPhase('dropping');
      try { navigator?.vibrate?.(80); } catch {}
    }, 1200);
  }, [phase]);

  const handlePhaseChange = useCallback((next: string) => {
    setPhase(next);
    if (next === 'reveal') {
      setShowCollect(true);
      try { navigator?.vibrate?.([50, 100, 50]); } catch {}
    }
    if (next === 'cracking') {
      try { navigator?.vibrate?.([15, 30, 15, 30, 15, 30, 40]); } catch {}
    }
  }, []);

  const handleCollect = useCallback(() => {
    if (prize) {
      setTotalCredits(prev => prev + prize.creditValue);
    }
    setPhase('idle');
    setPrize(null);
    setDispensedColor(null);
    setShowCollect(false);
  }, [prize]);

  const handleShake = useCallback(() => {
    if (phase !== 'idle') return;
    setShaking(true);
    try { navigator?.vibrate?.(30); } catch {}
    setTimeout(() => setShaking(false), 500);
  }, [phase]);

  return (
    <div className="relative w-full h-screen">
      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 1.2, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onPointerMissed={() => {
          if (phase === 'idle') handleShake();
        }}
      >
        <color attach="background" args={['#0a0e1a']} />
        <fog attach="fog" args={['#0a0e1a', 6, 12]} />
        <Suspense fallback={null}>
          <Scene
            onDispense={handleDispense}
            phase={phase}
            setPhase={handlePhaseChange}
            dispensedColor={dispensedColor}
            dispensedCredit={prize?.creditValue ?? 0}
            shaking={shaking}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
        <div className="max-w-md mx-auto">
          {/* Credits display */}
          <div className="flex justify-between items-center">
            <div className="pointer-events-auto px-4 py-2 rounded-xl"
              style={{
                background: 'rgba(16, 21, 37, 0.85)',
                border: '1px solid rgba(196, 162, 77, 0.2)',
                backdropFilter: 'blur(10px)',
              }}>
              <span className="text-xs tracking-wider uppercase" style={{ color: 'rgba(196, 162, 77, 0.6)' }}>
                Activity Credits
              </span>
              <div className="text-2xl font-bold" style={{ color: '#C4A24D' }}>
                {totalCredits} AFC
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
        <div className="max-w-md mx-auto flex flex-col items-center gap-3">
          {phase === 'idle' && (
            <>
              <p className="text-xs tracking-wider" style={{ color: 'rgba(196, 162, 77, 0.5)' }}>
                Tap the knob or click anywhere to shake
              </p>
              <button
                onClick={handleDispense}
                className="pointer-events-auto px-8 py-3 rounded-full transition-all duration-200 hover:brightness-125 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(196,162,77,0.15) 0%, rgba(196,162,77,0.08) 100%)',
                  border: '1px solid rgba(196,162,77,0.3)',
                  color: 'rgba(196,162,77,0.85)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                Dispense Capsule
              </button>
            </>
          )}

          {phase === 'knob-turning' && (
            <p className="text-sm animate-pulse" style={{ color: 'rgba(196,162,77,0.7)' }}>
              Turning knob...
            </p>
          )}

          {(phase === 'dropping' || phase === 'landed' || phase === 'cracking') && (
            <p className="text-sm animate-pulse" style={{ color: 'rgba(196,162,77,0.7)' }}>
              Opening capsule...
            </p>
          )}
        </div>
      </div>

      {/* Prize reveal overlay */}
      {showCollect && prize && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(5,8,20,0.85), rgba(0,0,0,0.95))' }}
        >
          <div className="text-center">
            <div className="text-6xl font-black mb-2" style={{ color: '#C4A24D', textShadow: '0 0 40px rgba(196,162,77,0.4)' }}>
              +{prize.creditValue}
            </div>
            <p className="text-lg font-semibold mb-1" style={{ color: 'rgba(196,162,77,0.8)' }}>
              Activity Credits!
            </p>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {prize.label}
            </p>
            <button
              onClick={handleCollect}
              className="px-10 py-3 rounded-full transition-all duration-200 hover:brightness-125 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(196,162,77,0.2), rgba(196,162,77,0.1))',
                border: '1px solid rgba(196,162,77,0.4)',
                color: '#C4A24D',
                fontSize: '1rem',
                fontWeight: 700,
              }}
            >
              Collect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
