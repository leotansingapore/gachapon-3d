import type { Ball } from './types';

// Physics constants - tuned to match visual dome at position [0, 0.48, 0], radius 1.4
const DOME_CENTER_Y = 0.48;
const DOME_RADIUS = 1.32;
const GRAVITY = -14;
const FRICTION = 0.99;
const BOUNCE = 0.55;
const FLOOR_Y = 0.5;
const CEILING_Y = 1.78;

export { FLOOR_Y };

export function createBalls(
  numBalls: number,
  palettes: [string, string][],
  numSegments: number,
): Ball[] {
  const balls: Ball[] = [];
  for (let i = 0; i < numBalls; i++) {
    const angle = (i / numBalls) * Math.PI * 2 + Math.random() * 0.5;
    const layer = Math.floor(i / 8);
    const r = 0.2 + Math.random() * 0.7;
    const palette = palettes[i % palettes.length];
    balls.push({
      position: {
        x: Math.cos(angle) * r,
        y: FLOOR_Y + 0.15 + layer * 0.2 + Math.random() * 0.2,
        z: Math.sin(angle) * r,
      },
      velocity: {
        x: (Math.random() - 0.5) * 1,
        y: Math.random() * 2,
        z: (Math.random() - 0.5) * 1,
      },
      radius: 0.13 + Math.random() * 0.03,
      topColor: palette[0],
      bottomColor: palette[1],
      segmentIndex: i % numSegments,
      angle: Math.random() * Math.PI * 2,
      angularVel: (Math.random() - 0.5) * 1.5,
    });
  }
  return balls;
}

export function applyBurst(balls: Ball[]) {
  for (const ball of balls) {
    ball.velocity.x = (Math.random() - 0.5) * 7;
    ball.velocity.y = Math.random() * 6 + 3;
    ball.velocity.z = (Math.random() - 0.5) * 7;
    ball.angularVel = (Math.random() - 0.5) * 12;
  }
}

export function applyOrbitForce(balls: Ball[], azimuthDelta: number) {
  for (const ball of balls) {
    ball.velocity.x += azimuthDelta * 0.8;
    ball.velocity.y += Math.abs(azimuthDelta) * 0.3;
  }
}

export function simulate(
  balls: Ball[],
  shaking: boolean,
  delta: number,
  tilt: { x: number; z: number },
) {
  const dt = Math.min(delta, 0.025);

  for (const ball of balls) {
    const { position: p, velocity: v } = ball;

    v.y += GRAVITY * dt;
    v.x += tilt.x * 4 * dt;
    v.z += tilt.z * 4 * dt;

    if (shaking) {
      v.x += (Math.random() - 0.5) * 6 * dt;
      v.y += (Math.random() * 3 + 1) * dt;
      v.z += (Math.random() - 0.5) * 6 * dt;
      ball.angularVel += (Math.random() - 0.5) * 4 * dt;
    }

    v.x *= FRICTION; v.y *= FRICTION; v.z *= FRICTION;
    p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;

    ball.angularVel *= 0.97;
    const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (speed > 0.15) ball.angularVel += speed * 0.4 * dt;
    ball.angle += ball.angularVel * dt;

    // Dome containment (hemisphere)
    const dx = p.x, dy = p.y - DOME_CENTER_Y, dz = p.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const maxDist = DOME_RADIUS - ball.radius;
    if (dist > maxDist && p.y > FLOOR_Y) {
      const nx = dx / dist, ny = dy / dist, nz = dz / dist;
      p.x = nx * maxDist;
      p.y = DOME_CENTER_Y + ny * maxDist;
      p.z = nz * maxDist;
      const vDotN = v.x * nx + v.y * ny + v.z * nz;
      if (vDotN > 0) {
        v.x -= vDotN * (1 + BOUNCE) * nx;
        v.y -= vDotN * (1 + BOUNCE) * ny;
        v.z -= vDotN * (1 + BOUNCE) * nz;
        v.x *= 0.88; v.y *= 0.88; v.z *= 0.88;
      }
    }

    // Floor
    if (p.y - ball.radius < FLOOR_Y) {
      p.y = FLOOR_Y + ball.radius;
      v.y = Math.abs(v.y) * BOUNCE;
      v.x *= 0.93; v.z *= 0.93;
      ball.angularVel += v.x * 0.3;
    }
    // Ceiling
    if (p.y + ball.radius > CEILING_Y) {
      p.y = CEILING_Y - ball.radius;
      v.y = -Math.abs(v.y) * BOUNCE;
    }
    // Hard cylindrical wall fallback (below dome hemisphere)
    const wallR = 1.25;
    const hDist = Math.sqrt(p.x * p.x + p.z * p.z);
    if (hDist + ball.radius > wallR && p.y < DOME_CENTER_Y - 0.3) {
      const scale = (wallR - ball.radius) / hDist;
      p.x *= scale; p.z *= scale;
      const rLen = Math.sqrt(p.x * p.x + p.z * p.z) || 1;
      const rnx = p.x / rLen, rnz = p.z / rLen;
      const vRad = v.x * rnx + v.z * rnz;
      if (vRad > 0) {
        v.x -= vRad * rnx * (1 + BOUNCE);
        v.z -= vRad * rnz * (1 + BOUNCE);
      }
    }

    // Clamp velocity
    const maxV = 7;
    const vLen = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (vLen > maxV) {
      const s = maxV / vLen;
      v.x *= s; v.y *= s; v.z *= s;
    }
  }

  // Ball-to-ball collisions
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j];
      const ddx = b.position.x - a.position.x;
      const ddy = b.position.y - a.position.y;
      const ddz = b.position.z - a.position.z;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
      const minDist = a.radius + b.radius;
      if (dist < minDist && dist > 0.001) {
        const nx = ddx / dist, ny = ddy / dist, nz = ddz / dist;
        const overlap = (minDist - dist) * 0.55;
        a.position.x -= nx * overlap; a.position.y -= ny * overlap; a.position.z -= nz * overlap;
        b.position.x += nx * overlap; b.position.y += ny * overlap; b.position.z += nz * overlap;
        const dvx = a.velocity.x - b.velocity.x;
        const dvy = a.velocity.y - b.velocity.y;
        const dvz = a.velocity.z - b.velocity.z;
        const vRel = dvx * nx + dvy * ny + dvz * nz;
        if (vRel > 0) {
          const imp = vRel * (1 + BOUNCE) * 0.5;
          a.velocity.x -= imp * nx; a.velocity.y -= imp * ny; a.velocity.z -= imp * nz;
          b.velocity.x += imp * nx; b.velocity.y += imp * ny; b.velocity.z += imp * nz;
        }
      }
    }
  }
}
