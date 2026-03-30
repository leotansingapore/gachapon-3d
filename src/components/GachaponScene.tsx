'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Text, Sparkles, ContactShadows, OrbitControls } from '@react-three/drei';
import { useRef, useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════
// PRIZE DATA
// ═══════════════════════════════════════════════════════
interface PrizeSegment {
  id: string;
  label: string;
  creditValue: number;
  weight: number;
  emoji: string;
}

const SEGMENTS: PrizeSegment[] = [
  { id: '1', label: '3 Credits', creditValue: 3, weight: 24, emoji: '🥉' },
  { id: '2', label: '6 Credits', creditValue: 6, weight: 18, emoji: '🥈' },
  { id: '3', label: '9 Credits', creditValue: 9, weight: 14, emoji: '🥈' },
  { id: '4', label: '12 Credits', creditValue: 12, weight: 10, emoji: '🥇' },
  { id: '5', label: '15 Credits', creditValue: 15, weight: 7, emoji: '🥇' },
  { id: '6', label: '18 Credits', creditValue: 18, weight: 5, emoji: '💎' },
  { id: '7', label: '21 Credits', creditValue: 21, weight: 3, emoji: '💎' },
  { id: '8', label: '24 Credits', creditValue: 24, weight: 2, emoji: '👑' },
];

// Two-tone capsule colors (top/bottom halves like real gachapon)
const CAPSULE_PALETTES: [string, string][] = [
  ['#ef4444', '#ffffff'],  // red + white
  ['#3b82f6', '#ffffff'],  // blue + white
  ['#f59e0b', '#ffffff'],  // yellow + white
  ['#10b981', '#ffffff'],  // green + white
  ['#8b5cf6', '#ffffff'],  // purple + white
  ['#ec4899', '#ffffff'],  // pink + white
  ['#f97316', '#ffffff'],  // orange + white
  ['#06b6d4', '#ffffff'],  // cyan + white
  ['#ef4444', '#f59e0b'],  // red + yellow
  ['#3b82f6', '#ef4444'],  // blue + red
  ['#10b981', '#f59e0b'],  // green + yellow
  ['#8b5cf6', '#ec4899'],  // purple + pink
  ['#f97316', '#10b981'],  // orange + green
  ['#3b82f6', '#f59e0b'],  // blue + yellow
  ['#ef4444', '#3b82f6'],  // red + blue
  ['#f59e0b', '#10b981'],  // yellow + green
  ['#ec4899', '#8b5cf6'],  // pink + purple
  ['#06b6d4', '#ef4444'],  // cyan + red
  ['#f97316', '#3b82f6'],  // orange + blue
  ['#10b981', '#ec4899'],  // green + pink
];

function pickPrize(): { segment: PrizeSegment; colorIndex: number } {
  const total = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < SEGMENTS.length; i++) {
    rand -= SEGMENTS[i].weight;
    if (rand <= 0) return { segment: SEGMENTS[i], colorIndex: i };
  }
  return { segment: SEGMENTS[0], colorIndex: 0 };
}

// ═══════════════════════════════════════════════════════
// SOUND
// ═══════════════════════════════════════════════════════
function playSound(type: 'click' | 'clack' | 'ding' | 'whoosh' | 'rattle') {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = ctx.currentTime;
    if (type === 'click') {
      osc.frequency.value = 900; gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06); osc.start(); osc.stop(t + 0.06);
    } else if (type === 'clack') {
      osc.frequency.value = 350; osc.type = 'square'; gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12); osc.start(); osc.stop(t + 0.12);
    } else if (type === 'ding') {
      osc.frequency.value = 1400; gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6); osc.start(); osc.stop(t + 0.6);
    } else if (type === 'whoosh') {
      osc.frequency.setValueAtTime(500, t); osc.frequency.exponentialRampToValueAtTime(150, t + 0.25);
      osc.type = 'sawtooth'; gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25); osc.start(); osc.stop(t + 0.25);
    } else if (type === 'rattle') {
      // Multiple quick clicks
      for (let i = 0; i < 5; i++) {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.frequency.value = 600 + Math.random() * 400;
        o2.type = 'square';
        g2.gain.setValueAtTime(0.04, t + i * 0.05);
        g2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.04);
        o2.start(t + i * 0.05); o2.stop(t + i * 0.05 + 0.04);
      }
      gain.gain.value = 0; osc.start(); osc.stop(t + 0.01);
    }
  } catch {}
}

// ═══════════════════════════════════════════════════════
// BALL PHYSICS
// ═══════════════════════════════════════════════════════
interface Ball {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  topColor: string;
  bottomColor: string;
  segmentIndex: number;
  angle: number;
  angularVel: number;
}

// Physics must match the visual dome: position [0, 0.48, 0], radius 1.4
const DOME_CENTER_Y = 0.48;
const DOME_RADIUS = 1.32;
const GRAVITY = -14; // Strong gravity so balls fall fast
const FRICTION = 0.99; // Less air drag for livelier movement
const BOUNCE_COEFF = 0.55; // Bouncier off walls
const FLOOR_Y = 0.5;
const CEILING_Y = 1.78;
const NUM_BALLS = 20;

function createBalls(): Ball[] {
  const balls: Ball[] = [];
  for (let i = 0; i < NUM_BALLS; i++) {
    const angle = (i / NUM_BALLS) * Math.PI * 2 + Math.random() * 0.5;
    const layer = Math.floor(i / 8); // Stack in layers
    const r = 0.2 + Math.random() * 0.7;
    const palette = CAPSULE_PALETTES[i % CAPSULE_PALETTES.length];
    balls.push({
      position: new THREE.Vector3(
        Math.cos(angle) * r,
        FLOOR_Y + 0.15 + layer * 0.2 + Math.random() * 0.2,
        Math.sin(angle) * r
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1,
        Math.random() * 2,
        (Math.random() - 0.5) * 1
      ),
      radius: 0.13 + Math.random() * 0.03,
      topColor: palette[0],
      bottomColor: palette[1],
      segmentIndex: i % SEGMENTS.length,
      angle: Math.random() * Math.PI * 2,
      angularVel: (Math.random() - 0.5) * 1.5,
    });
  }
  return balls;
}

function simulateBalls(balls: Ball[], shaking: boolean, delta: number, tilt: { x: number; z: number }) {
  const dt = Math.min(delta, 0.025);
  const domeCenter = new THREE.Vector3(0, DOME_CENTER_Y, 0);

  for (const ball of balls) {
    ball.velocity.y += GRAVITY * dt;
    ball.velocity.x += tilt.x * 4 * dt;
    ball.velocity.z += tilt.z * 4 * dt;

    if (shaking) {
      // Gentle continuous rattle (for visual shake during knob turning)
      ball.velocity.x += (Math.random() - 0.5) * 6 * dt;
      ball.velocity.y += (Math.random() * 3 + 1) * dt;
      ball.velocity.z += (Math.random() - 0.5) * 6 * dt;
      ball.angularVel += (Math.random() - 0.5) * 4 * dt;
    }

    ball.velocity.multiplyScalar(FRICTION);
    ball.position.addScaledVector(ball.velocity, dt);

    ball.angularVel *= 0.97;
    const speed = ball.velocity.length();
    if (speed > 0.15) ball.angularVel += speed * 0.4 * dt;
    ball.angle += ball.angularVel * dt;

    // Dome containment (hemisphere)
    const toCenter = new THREE.Vector3().subVectors(ball.position, domeCenter);
    const dist = toCenter.length();
    const maxDist = DOME_RADIUS - ball.radius;
    if (dist > maxDist && ball.position.y > FLOOR_Y) {
      toCenter.normalize();
      ball.position.copy(domeCenter).addScaledVector(toCenter, maxDist);
      const vDotN = ball.velocity.dot(toCenter);
      if (vDotN > 0) {
        ball.velocity.addScaledVector(toCenter, -vDotN * (1 + BOUNCE_COEFF));
        ball.velocity.multiplyScalar(0.88);
      }
    }

    // Floor
    if (ball.position.y - ball.radius < FLOOR_Y) {
      ball.position.y = FLOOR_Y + ball.radius;
      ball.velocity.y = Math.abs(ball.velocity.y) * BOUNCE_COEFF;
      ball.velocity.x *= 0.93; ball.velocity.z *= 0.93;
      // Rolling friction
      ball.angularVel += ball.velocity.x * 0.3;
    }
    // Ceiling
    if (ball.position.y + ball.radius > CEILING_Y) {
      ball.position.y = CEILING_Y - ball.radius;
      ball.velocity.y = -Math.abs(ball.velocity.y) * BOUNCE_COEFF;
    }
    // Hard walls as fallback
    const wallR = 1.25;
    const hDist = Math.sqrt(ball.position.x ** 2 + ball.position.z ** 2);
    if (hDist + ball.radius > wallR && ball.position.y < DOME_CENTER_Y - 0.3) {
      const scale = (wallR - ball.radius) / hDist;
      ball.position.x *= scale;
      ball.position.z *= scale;
      const radial = new THREE.Vector2(ball.position.x, ball.position.z).normalize();
      const vRadial = ball.velocity.x * radial.x + ball.velocity.z * radial.y;
      if (vRadial > 0) {
        ball.velocity.x -= vRadial * radial.x * (1 + BOUNCE_COEFF);
        ball.velocity.z -= vRadial * radial.y * (1 + BOUNCE_COEFF);
      }
    }

    ball.velocity.clampLength(0, 7);
  }

  // Ball-to-ball collisions
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j];
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const dz = b.position.z - a.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const minDist = a.radius + b.radius;
      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist, ny = dy / dist, nz = dz / dist;
        const overlap = (minDist - dist) * 0.55;
        a.position.x -= nx * overlap; a.position.y -= ny * overlap; a.position.z -= nz * overlap;
        b.position.x += nx * overlap; b.position.y += ny * overlap; b.position.z += nz * overlap;
        const dvx = a.velocity.x - b.velocity.x;
        const dvy = a.velocity.y - b.velocity.y;
        const dvz = a.velocity.z - b.velocity.z;
        const vRel = dvx * nx + dvy * ny + dvz * nz;
        if (vRel > 0) {
          const imp = vRel * (1 + BOUNCE_COEFF) * 0.5;
          a.velocity.x -= imp * nx; a.velocity.y -= imp * ny; a.velocity.z -= imp * nz;
          b.velocity.x += imp * nx; b.velocity.y += imp * ny; b.velocity.z += imp * nz;
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════
// 3D CAPSULE (two-tone like real gachapon)
// ═══════════════════════════════════════════════════════
function CapsuleMesh({ ball }: { ball: Ball }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.copy(ball.position);
    groupRef.current.rotation.set(ball.angle, ball.angle * 0.6, ball.angle * 0.8);
  });

  return (
    <group ref={groupRef}>
      {/* Top half - colored */}
      <mesh castShadow>
        <sphereGeometry args={[ball.radius, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color={ball.topColor}
          metalness={0.0}
          roughness={0.2}
          clearcoat={0.8}
          clearcoatRoughness={0.05}
          envMapIntensity={1.5}
        />
      </mesh>
      {/* Bottom half */}
      <mesh castShadow>
        <sphereGeometry args={[ball.radius, 20, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshPhysicalMaterial
          color={ball.bottomColor}
          metalness={0.0}
          roughness={0.2}
          clearcoat={0.8}
          clearcoatRoughness={0.05}
          envMapIntensity={1.5}
        />
      </mesh>
      {/* Seam ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ball.radius * 0.99, 0.003, 6, 24]} />
        <meshBasicMaterial color="#00000030" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// BALLS CONTROLLER
// ═══════════════════════════════════════════════════════
function BallsController({ balls, shaking, tilt }: { balls: Ball[]; shaking: boolean; tilt: { x: number; z: number } }) {
  useFrame((_, delta) => { simulateBalls(balls, shaking, delta, tilt); });
  return <>{balls.map((ball, i) => <CapsuleMesh key={i} ball={ball} />)}</>;
}

// ═══════════════════════════════════════════════════════
// GLASS DOME (big, prominent - 60% of visual height)
// ═══════════════════════════════════════════════════════
function GlassDome() {
  return (
    <group position={[0, 0.48, 0]}>
      {/* Main dome - full hemisphere, clear acrylic */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[1.4, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshPhysicalMaterial
          color="#e8f0ff"
          metalness={0.0}
          roughness={0.0}
          transparent
          opacity={0.12}
          envMapIntensity={2.5}
          clearcoat={1}
          clearcoatRoughness={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          ior={1.52}
          specularIntensity={1.5}
          specularColor="#ffffff"
        />
      </mesh>
      {/* Subtle edge highlight */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.38, 0.015, 8, 64]} />
        <meshBasicMaterial color="white" opacity={0.06} transparent />
      </mesh>
      {/* Specular streaks (curved glass reflections) */}
      <mesh position={[0.5, 0.35, 0.9]} rotation={[0.1, 0.4, 0.15]}>
        <planeGeometry args={[0.06, 0.7]} />
        <meshBasicMaterial color="white" opacity={0.15} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0.65, 0.2, 0.7]} rotation={[0, 0.5, 0.1]}>
        <planeGeometry args={[0.04, 0.4]} />
        <meshBasicMaterial color="white" opacity={0.08} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[-0.6, 0.4, 0.65]} rotation={[0, -0.3, -0.1]}>
        <planeGeometry args={[0.04, 0.45]} />
        <meshBasicMaterial color="white" opacity={0.06} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// MACHINE BODY
// ═══════════════════════════════════════════════════════
function MachineBody() {
  const bodyColor = '#dc2626'; // Bright red ABS plastic

  return (
    <group>
      {/* === BODY: shorter than dome, boxy cylinder === */}
      <mesh position={[0, -0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.35, 1.4, 1.1, 32]} />
        <meshPhysicalMaterial
          color={bodyColor}
          metalness={0.0}
          roughness={0.35}
          clearcoat={0.7}
          clearcoatRoughness={0.08}
        />
      </mesh>

      {/* Chrome ring where dome sits */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[1.42, 1.38, 0.12, 32]} />
        <meshPhysicalMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} />
      </mesh>

      {/* Chrome base ring */}
      <mesh position={[0, -0.68, 0]}>
        <cylinderGeometry args={[1.42, 1.45, 0.08, 32]} />
        <meshPhysicalMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} />
      </mesh>

      {/* === FRONT PANEL (dark inset where knob lives) === */}
      <group position={[0, -0.1, 1.28]}>
        {/* Panel background */}
        <mesh>
          <planeGeometry args={[1.8, 0.7]} />
          <meshPhysicalMaterial color="#1e1e2e" metalness={0.3} roughness={0.6} />
        </mesh>
        {/* Panel border - recessed look */}
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[1.85, 0.75]} />
          <meshPhysicalMaterial color="#991b1b" metalness={0.1} roughness={0.5} />
        </mesh>
      </group>

      {/* === LABEL AREA (white sticker with product info) === */}
      <group position={[0, 0.18, 1.36]}>
        {/* White label background */}
        <mesh>
          <planeGeometry args={[1.5, 0.18]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        {/* Label text */}
        <Text
          position={[0, 0, 0.005]}
          fontSize={0.055}
          color="#dc2626"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.15}
          fontWeight={700}
        >
          ACTIVITY CREDITS COLLECTION
        </Text>
      </group>

      {/* === PRICE TAG === */}
      <group position={[0.65, 0.18, 1.37]}>
        <mesh>
          <planeGeometry args={[0.25, 0.12]} />
          <meshStandardMaterial color="#fef08a" roughness={0.3} />
        </mesh>
        <Text position={[0, 0, 0.003]} fontSize={0.04} color="#991b1b" anchorX="center" anchorY="middle" fontWeight={700}>
          FREE
        </Text>
      </group>

      {/* === COIN SLOT === */}
      <group position={[0.95, 0.0, 1.34]}>
        <mesh>
          <boxGeometry args={[0.14, 0.025, 0.02]} />
          <meshPhysicalMaterial color="#1a1a2e" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Chrome surround */}
        <mesh position={[0, 0, -0.005]}>
          <boxGeometry args={[0.18, 0.05, 0.01]} />
          <meshPhysicalMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* === SCREWS === */}
      {([[1.05, 0.28, 1.05], [-1.05, 0.28, 1.05], [1.05, -0.55, 1.05], [-1.05, -0.55, 1.05]] as [number, number, number][]).map((pos, i) => (
        <group key={i} position={pos}>
          <mesh><cylinderGeometry args={[0.025, 0.025, 0.01, 8]} /><meshPhysicalMaterial color="#a0a0b0" metalness={0.9} roughness={0.15} /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}><boxGeometry args={[0.03, 0.002, 0.002]} /><meshBasicMaterial color="#666" /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}><boxGeometry args={[0.002, 0.002, 0.03]} /><meshBasicMaterial color="#666" /></mesh>
        </group>
      ))}

      {/* === CAPSULE TRAY (curved opening at bottom) === */}
      <group position={[0, -0.62, 1.25]}>
        {/* Tray cavity */}
        <mesh>
          <boxGeometry args={[0.65, 0.22, 0.35]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
        </mesh>
        {/* Chrome tray rim */}
        <mesh position={[0, 0.11, 0.17]}>
          <boxGeometry args={[0.7, 0.025, 0.025]} />
          <meshPhysicalMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Flap (transparent plastic) */}
        <mesh position={[0, -0.02, 0.18]} rotation={[0.25, 0, 0]}>
          <planeGeometry args={[0.62, 0.2]} />
          <meshPhysicalMaterial color="#888" metalness={0.1} roughness={0.2} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* === FEET === */}
      {([-0.85, 0.85] as number[]).map((x, i) => (
        <group key={i} position={[x, -0.76, 0]}>
          <mesh><cylinderGeometry args={[0.1, 0.12, 0.08, 12]} /><meshPhysicalMaterial color="#a0a0b0" metalness={0.8} roughness={0.2} /></mesh>
          <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.12, 0.12, 0.02, 12]} /><meshStandardMaterial color="#333" roughness={0.95} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// TOP CAP (red lid)
// ═══════════════════════════════════════════════════════
function TopCap() {
  return (
    <group position={[0, 1.88, 0]}>
      {/* Lid disc */}
      <mesh>
        <cylinderGeometry args={[0.45, 0.5, 0.1, 32]} />
        <meshPhysicalMaterial color="#dc2626" metalness={0.0} roughness={0.35} clearcoat={0.6} />
      </mesh>
      {/* Chrome rim */}
      <mesh position={[0, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.49, 0.012, 8, 32]} />
        <meshPhysicalMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} />
      </mesh>
      {/* Small grip knob */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.07, 16]} />
        <meshPhysicalMaterial color="#b91c1c" metalness={0.0} roughness={0.35} clearcoat={0.5} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.06, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshPhysicalMaterial color="#b91c1c" metalness={0.0} roughness={0.3} clearcoat={0.5} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// TURN KNOB
// ═══════════════════════════════════════════════════════
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
    <group
      position={[0, -0.15, 1.42]}
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); if (canDispense) onTurn(); }}
      onPointerEnter={() => { setHovered(true); if (canDispense) document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      {/* Chrome outer ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.1, 24]} />
        <meshPhysicalMaterial
          color={hovered && canDispense ? '#fef08a' : '#d4d4d8'}
          metalness={0.95}
          roughness={0.08}
        />
      </mesh>
      {/* Dark face */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.015]}>
        <cylinderGeometry args={[0.2, 0.2, 0.08, 24]} />
        <meshPhysicalMaterial color="#1e1e2e" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Cross handle */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.32, 0.07, 0.025]} />
        <meshPhysicalMaterial color="#a0a0b0" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.025, 0.07, 0.32]} />
        <meshPhysicalMaterial color="#a0a0b0" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Center cap */}
      <mesh position={[0, 0.055, 0]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshPhysicalMaterial color="#d4d4d8" metalness={0.95} roughness={0.08} />
      </mesh>
      {/* Subtle glow ring when ready */}
      {canDispense && !spinning && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.02]}>
          <torusGeometry args={[0.28, 0.008, 8, 24]} />
          <meshBasicMaterial color="#fbbf24" opacity={0.25} transparent />
        </mesh>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════
// SCENE
// ═══════════════════════════════════════════════════════
function Scene({ balls, shaking, phase, onTurnKnob, tilt, onOrbitTilt }: {
  balls: Ball[]; shaking: boolean; phase: string; onTurnKnob: () => void;
  tilt: { x: number; z: number }; onOrbitTilt: (t: { x: number; z: number }) => void;
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

    // Track camera orbit and convert rotation speed to ball tilt
    const azimuth = Math.atan2(camera.position.x, camera.position.z);
    const azimuthDelta = azimuth - prevAzimuth.current;
    prevAzimuth.current = azimuth;
    // Only apply if delta is significant (user is dragging)
    if (Math.abs(azimuthDelta) > 0.001 && Math.abs(azimuthDelta) < 0.5) {
      onOrbitTilt({ x: azimuthDelta * 25, z: 0 });
    }
  });

  return (
    <>
      {/* Lighting - warm studio setup */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} color="#fff5e6" />
      <pointLight position={[-3, 4, 2]} intensity={0.4} color="#93c5fd" />
      <pointLight position={[3, 2, 3]} intensity={0.3} color="#fde68a" />
      <spotLight position={[0, 5, 3]} angle={0.4} penumbra={0.6} intensity={2} castShadow color="#ffffff" />
      {/* Under-dome uplight for capsule visibility */}
      <pointLight position={[0, 0.6, 0]} intensity={0.3} color="#ffffff" distance={2} />

      <Environment preset="studio" />

      {/* Interactive orbit controls for desktop */}
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.55}
        minAzimuthAngle={-Math.PI * 0.25}
        maxAzimuthAngle={Math.PI * 0.25}
        target={[0, 0.5, 0]}
      />

      <group ref={machineRef}>
        <MachineBody />
        <GlassDome />
        <TopCap />
        <BallsController balls={balls} shaking={shaking} tilt={tilt} />
        <Knob spinning={phase === 'knob-turning'} canDispense={phase === 'idle'} onTurn={onTurnKnob} />
      </group>

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <ContactShadows position={[0, -0.84, 0]} opacity={0.4} scale={6} blur={2.5} far={2.5} />
    </>
  );
}

// ═══════════════════════════════════════════════════════
// CONFETTI
// ═══════════════════════════════════════════════════════
function ConfettiDot({ delay, color, angle, distance }: { delay: number; color: string; angle: number; distance: number }) {
  const size = 3 + Math.random() * 7;
  const isRect = Math.random() > 0.5;
  return (
    <motion.div
      className="absolute"
      style={{
        width: isRect ? size * 0.5 : size, height: size,
        background: color, left: '50%', top: '50%',
        borderRadius: isRect ? '1px' : '50%',
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
      animate={{
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance + 50,
        opacity: 0, scale: 0.15,
        rotate: Math.random() * 900 - 450,
      }}
      transition={{ duration: 0.9 + Math.random() * 0.4, delay, ease: 'easeOut' }}
    />
  );
}

// ═══════════════════════════════════════════════════════
// 2D CAPSULE BALL (for overlay animations)
// ═══════════════════════════════════════════════════════
function CapsuleBall2D({ topColor, bottomColor, showQuestion }: { topColor: string; bottomColor: string; showQuestion?: boolean }) {
  return (
    <div className="relative w-full h-full">
      {/* Top half */}
      <div className="absolute top-0 left-0 right-0 h-1/2 overflow-hidden" style={{ borderRadius: '60px 60px 0 0' }}>
        <div className="w-full h-[120px]" style={{
          background: `radial-gradient(circle at 35% 35%, ${topColor}ee, ${topColor})`,
          borderRadius: '60px',
        }} />
      </div>
      {/* Bottom half */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 overflow-hidden" style={{ borderRadius: '0 0 60px 60px' }}>
        <div className="w-full h-[120px] -mt-[60px]" style={{
          background: `radial-gradient(circle at 35% 65%, ${bottomColor}ee, ${bottomColor === '#ffffff' ? '#e5e7eb' : bottomColor})`,
          borderRadius: '60px',
        }} />
      </div>
      {/* Seam */}
      <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2"
        style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.1) 80%, transparent 95%)' }} />
      {/* Specular highlights */}
      <div className="absolute top-3 left-6 w-9 h-6 rounded-full bg-white/30" style={{ filter: 'blur(1px)' }} />
      <div className="absolute top-2 left-8 w-3 h-2 rounded-full bg-white/50" />
      {/* ? mark */}
      {showQuestion && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <span className="text-2xl font-black" style={{ color: 'rgba(0,0,0,0.12)', textShadow: '0 1px 2px rgba(255,255,255,0.15)' }}>?</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function GachaponScene() {
  const [phase, setPhase] = useState('idle');
  const [prize, setPrize] = useState<PrizeSegment | null>(null);
  const [dispensedColor, setDispensedColor] = useState('#ef4444');
  const [dispensedBottomColor, setDispensedBottomColor] = useState('#ffffff');
  const [shaking, setShaking] = useState(false);
  const [totalCredits, setTotalCredits] = useState(0);
  const [showCollect, setShowCollect] = useState(false);
  const [spinsCount, setSpinsCount] = useState(0);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, z: 0 });

  const ballsRef = useRef<Ball[]>(createBalls());

  // Device motion
  useEffect(() => {
    let shakeTimeout: ReturnType<typeof setTimeout> | null = null;
    let lx = 0, ly = 0, lz = 0, lt = Date.now();

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      setTilt({
        x: Math.max(-2, Math.min(2, (a.x ?? 0) * 0.25)),
        z: Math.max(-2, Math.min(2, -(a.y ?? 0) * 0.25 + 0.3)),
      });
      const now = Date.now();
      if (now - lt > 100) {
        const delta = Math.abs((a.x ?? 0) - lx) + Math.abs((a.y ?? 0) - ly) + Math.abs((a.z ?? 0) - lz);
        if (delta > 18) {
          setShaking(true);
          try { navigator?.vibrate?.(60); } catch {}
          if (shakeTimeout) clearTimeout(shakeTimeout);
          shakeTimeout = setTimeout(() => setShaking(false), 400);
        }
        lx = a.x ?? 0; ly = a.y ?? 0; lz = a.z ?? 0; lt = now;
      }
    };

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        setTilt({
          x: Math.max(-2, Math.min(2, e.gamma / 30)),
          z: Math.max(-2, Math.min(2, (e.beta - 45) / 30)),
        });
      }
    };

    window.addEventListener('devicemotion', onMotion, true);
    window.addEventListener('deviceorientation', onOrientation, true);
    const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DME.requestPermission !== 'function') setMotionEnabled(true);

    return () => {
      window.removeEventListener('devicemotion', onMotion, true);
      window.removeEventListener('deviceorientation', onOrientation, true);
      if (shakeTimeout) clearTimeout(shakeTimeout);
    };
  }, []);

  const requestMotion = useCallback(async () => {
    const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DME.requestPermission === 'function') {
      try { const r = await DME.requestPermission(); if (r === 'granted') setMotionEnabled(true); } catch {}
    } else setMotionEnabled(true);
  }, []);

  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gentle shake (button click)
  const handleShake = useCallback(() => {
    if (phase !== 'idle') return;
    setShaking(true);
    playSound('rattle');
    try { navigator?.vibrate?.(30); } catch {}
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = setTimeout(() => setShaking(false), 600);
  }, [phase]);

  // BIG lottery-style burst - single explosive impulse, no continuous shake
  const handleBigShake = useCallback(() => {
    if (phase !== 'idle') return;
    // One-shot impulse to every ball - like flipping the machine
    for (const ball of ballsRef.current) {
      ball.velocity.set(
        (Math.random() - 0.5) * 7,
        Math.random() * 6 + 3,
        (Math.random() - 0.5) * 7
      );
      ball.angularVel = (Math.random() - 0.5) * 12;
    }
    // Brief visual shake (machine rattles) but NOT continuous ball pushing
    setShaking(true);
    playSound('rattle');
    try { navigator?.vibrate?.([40, 30, 40, 30, 60]); } catch {}
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = setTimeout(() => setShaking(false), 300); // short visual shake only
  }, [phase]);

  const handleDispense = useCallback(() => {
    if (phase !== 'idle') return;
    const { segment, colorIndex } = pickPrize();
    const palette = CAPSULE_PALETTES[colorIndex % CAPSULE_PALETTES.length];
    setPrize(segment);
    setDispensedColor(palette[0]);
    setDispensedBottomColor(palette[1]);
    setSpinsCount(prev => prev + 1);

    setPhase('knob-turning');
    setShaking(true);
    playSound('click');
    try { navigator?.vibrate?.([30, 50, 30, 50, 60]); } catch {}

    // Phase 2: Machine stops shaking, brief pause
    setTimeout(() => {
      setShaking(false);
      playSound('whoosh');
      setPhase('dispensing');
      try { navigator?.vibrate?.(80); } catch {}
    }, 1200);

    // Phase 3: Prize reveal
    setTimeout(() => {
      playSound('ding');
      setPhase('reveal');
      setShowCollect(true);
      try { navigator?.vibrate?.([50, 100, 50]); } catch {}
    }, 2800);
  }, [phase]);

  const handleCollect = useCallback(() => {
    if (prize) setTotalCredits(prev => prev + prize.creditValue);
    setPhase('idle');
    setPrize(null);
    setShowCollect(false);
  }, [prize]);

  // Keyboard: spacebar = big lottery shake, enter = dispense
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleBigShake(); }
      if (e.code === 'Enter' && phase === 'idle') { e.preventDefault(); handleDispense(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBigShake, handleDispense, phase]);

  const confettiColors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#ffffff', '#fcd34d'];

  return (
    <div className="relative w-full h-screen select-none overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [0, 1.4, 5], fov: 40 }}
        gl={{ antialias: true, alpha: false }}
        onClick={handleShake}
      >
        <color attach="background" args={['#111827']} />
        <fog attach="fog" args={['#111827', 8, 16]} />
        <Suspense fallback={null}>
          <Scene
            balls={ballsRef.current}
            shaking={shaking}
            phase={phase}
            onTurnKnob={handleDispense}
            tilt={tilt}
            onOrbitTilt={(orbitTilt) => {
              // Apply orbit rotation as direct impulse to balls
              for (const ball of ballsRef.current) {
                ball.velocity.x += orbitTilt.x * 0.8;
                ball.velocity.z += orbitTilt.z * 0.8;
                ball.velocity.y += Math.abs(orbitTilt.x) * 0.3; // slight upward kick
              }
            }}
          />
        </Suspense>
      </Canvas>

      {/* HUD */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="px-4 py-2.5 rounded-xl" style={{
          background: 'rgba(17, 24, 39, 0.92)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}>
          <span className="text-[10px] tracking-[0.15em] uppercase" style={{ color: 'rgba(251,191,36,0.7)' }}>
            Activity Credits
          </span>
          <div className="text-2xl font-bold" style={{ color: '#fbbf24' }}>
            {totalCredits} AFC
          </div>
          {spinsCount > 0 && (
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {spinsCount} spin{spinsCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Orbit hint */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <div className="px-3 py-1.5 rounded-lg text-[10px]" style={{
          background: 'rgba(17, 24, 39, 0.7)',
          color: 'rgba(255,255,255,0.2)',
        }}>
          Drag to orbit
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 pointer-events-none">
        {phase === 'idle' && (
          <>
            <div className="flex gap-3 mb-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleBigShake(); }}
                className="pointer-events-auto px-6 py-2.5 rounded-full transition-all duration-200 hover:brightness-125 active:scale-95"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                Randomize
              </button>
            </div>
            <p className="text-[10px] tracking-wider" style={{ color: 'rgba(255,255,255,0.18)' }}>
              {motionEnabled ? 'Shake your phone to randomize' : 'SPACE to randomize -- Drag to orbit'}
            </p>
            {!motionEnabled && typeof window !== 'undefined' && 'ontouchstart' in window && (
              <button onClick={requestMotion} className="pointer-events-auto px-4 py-1.5 rounded-full text-[11px] mb-1"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', color: 'rgba(251,191,36,0.6)' }}>
                Enable Shake
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleDispense(); }}
              className="pointer-events-auto px-8 py-3.5 rounded-full transition-all duration-200 hover:brightness-125 active:scale-95 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(220,38,38,0.08))',
                border: '1px solid rgba(220,38,38,0.4)',
                color: 'rgba(252,165,165,0.95)',
                fontSize: '0.9rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              Turn the Knob
            </button>
          </>
        )}
        {phase === 'knob-turning' && (
          <p className="text-sm animate-pulse" style={{ color: 'rgba(251,191,36,0.7)' }}>Turning knob...</p>
        )}
        {phase === 'dispensing' && (
          <p className="text-sm animate-pulse" style={{ color: 'rgba(251,191,36,0.7)' }}>Dispensing...</p>
        )}
      </div>

      {/* === DISPENSING OVERLAY (capsule drops & cracks) === */}
      <AnimatePresence>
        {phase === 'dispensing' && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(17,24,39,0.8), rgba(0,0,0,0.92))' }} />

            {/* Capsule ball - drops, lands, shakes, glows, bursts */}
            <motion.div className="relative z-10"
              style={{ width: 140, height: 140 }}
              animate={{
                y: [-300, 0, -30, 0, -8, 0, 0, 0, 0, 0, 0],
                scale: [0.3, 1.06, 0.95, 1.02, 0.99, 1, 1, 1, 1, 1.3, 1.6],
                rotate: [-200, 15, -8, 3, 0, 0, -3, 4, -3, 0, 0],
                opacity: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0],
              }}
              transition={{
                duration: 1.5,
                times: [0, 0.25, 0.35, 0.42, 0.48, 0.52, 0.6, 0.68, 0.76, 0.9, 1],
                ease: 'easeOut',
              }}
            >
              {/* Solid colored ball (single color, no two-tone eyeball) */}
              <div className="w-full h-full rounded-full" style={{
                background: `radial-gradient(circle at 35% 30%, ${dispensedColor}ff, ${dispensedColor}cc, ${dispensedColor}88)`,
                boxShadow: `0 8px 30px ${dispensedColor}50, inset 0 -4px 12px rgba(0,0,0,0.2), inset 0 2px 6px rgba(255,255,255,0.2)`,
              }}>
                {/* Specular highlights */}
                <div className="absolute top-4 left-7 w-10 h-7 rounded-full bg-white/30" style={{ filter: 'blur(1px)' }} />
                <div className="absolute top-3 left-9 w-4 h-2.5 rounded-full bg-white/50" />
                {/* ? mark */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-black text-white/40" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>?</span>
                </div>
              </div>
            </motion.div>

            {/* Crack lines appear mid-animation */}
            <motion.svg className="absolute z-20" style={{ width: 160, height: 160, left: '50%', top: '50%', marginLeft: -80, marginTop: -80 }}
              viewBox="0 0 160 160"
              initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0, 0, 0, 0, 1, 1, 1, 0] }}
              transition={{ duration: 1.5, times: [0, 0.2, 0.3, 0.4, 0.5, 0.55, 0.62, 0.78, 0.88, 1] }}
            >
              <motion.path d="M 15 80 L 35 70 L 50 85 L 68 65 L 80 78 L 92 67 L 110 80 L 125 72 L 145 80"
                fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1] }}
                transition={{ duration: 1.5, times: [0, 0.2, 0.3, 0.4, 0.5, 0.55, 0.62, 0.78, 0.88, 1] }} />
              <motion.path d="M 68 65 L 62 48 L 68 38" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity={0.6}
                initial={{ pathLength: 0 }} animate={{ pathLength: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1] }}
                transition={{ duration: 1.5, times: [0, 0.2, 0.3, 0.4, 0.5, 0.55, 0.65, 0.75, 0.88, 1] }} />
              <motion.path d="M 92 67 L 98 50 L 92 42" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity={0.5}
                initial={{ pathLength: 0 }} animate={{ pathLength: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1] }}
                transition={{ duration: 1.5, times: [0, 0.2, 0.3, 0.4, 0.5, 0.55, 0.65, 0.72, 0.82, 1] }} />
            </motion.svg>

            {/* Light burst at the end */}
            <motion.div className="absolute z-15 rounded-full"
              style={{ width: 200, height: 200, left: '50%', top: '50%', marginLeft: -100, marginTop: -100 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4], opacity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0] }}
              transition={{ duration: 1.5, times: [0, 0.2, 0.3, 0.4, 0.5, 0.55, 0.65, 0.75, 0.85, 0.92, 1] }}
            >
              <div className="w-full h-full rounded-full" style={{ background: `radial-gradient(circle, ${dispensedColor}90, ${dispensedColor}30, transparent 60%)` }} />
            </motion.div>

            {/* Ground shadow */}
            <motion.div className="absolute z-0 rounded-full"
              style={{ width: 120, height: 16, background: 'radial-gradient(ellipse, rgba(0,0,0,0.35), transparent 70%)', top: '56%', left: '50%', marginLeft: -60 }}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0], opacity: [0, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.3, 0] }}
              transition={{ duration: 1.5, times: [0, 0.25, 0.3, 0.4, 0.5, 0.55, 0.65, 0.75, 0.85, 0.92, 1] }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* === PRIZE REVEAL === */}
      <AnimatePresence>
        {showCollect && prize && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-50"
            style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(17,24,39,0.92), rgba(0,0,0,0.97))' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {/* Confetti */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(40)].map((_, i) => (
                <ConfettiDot key={i} delay={0.05 + Math.random() * 0.2}
                  color={confettiColors[i % confettiColors.length]}
                  angle={(i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.4}
                  distance={80 + Math.random() * 160} />
              ))}
            </div>

            <motion.div className="text-center relative z-10"
              initial={{ scale: 0.3, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}>

              {/* Big emoji */}
              <motion.div className="text-6xl mb-4"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: [0, 1.3, 1], rotate: [null, 10, 0] }}
                transition={{ delay: 0.1, duration: 0.5 }}>
                {prize.emoji}
              </motion.div>

              <motion.div className="text-8xl font-black mb-3"
                style={{ color: '#fbbf24', textShadow: '0 0 60px rgba(251,191,36,0.4), 0 4px 12px rgba(0,0,0,0.5)' }}
                initial={{ scale: 0 }} animate={{ scale: [0, 1.15, 1] }}
                transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}>
                +{prize.creditValue}
              </motion.div>

              <motion.p className="text-xl font-semibold mb-1"
                style={{ color: 'rgba(251,191,36,0.9)' }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}>
                Activity Credits!
              </motion.p>

              <motion.p className="text-sm mb-8"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}>
                {prize.label}
              </motion.p>

              <motion.button onClick={handleCollect}
                className="px-10 py-3.5 rounded-full transition-all duration-200 hover:brightness-125 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.06))',
                  border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24',
                  fontSize: '1rem', fontWeight: 700,
                }}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                Collect
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
