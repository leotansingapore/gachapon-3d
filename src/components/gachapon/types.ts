export interface PrizeSegment {
  id: string;
  label: string;
  creditValue: number;
  weight: number;
  emoji: string;
}

export interface Ball {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  radius: number;
  topColor: string;
  bottomColor: string;
  segmentIndex: number;
  angle: number;
  angularVel: number;
}

export interface GachaponConfig {
  segments: PrizeSegment[];
  capsulePalettes: [string, string][];
  numBalls: number;
  label: string;
  priceLabel: string;
  soundEnabled: boolean;
}

export const DEFAULT_SEGMENTS: PrizeSegment[] = [
  { id: '1', label: '3 Credits', creditValue: 3, weight: 24, emoji: '🥉' },
  { id: '2', label: '6 Credits', creditValue: 6, weight: 18, emoji: '🥈' },
  { id: '3', label: '9 Credits', creditValue: 9, weight: 14, emoji: '🥈' },
  { id: '4', label: '12 Credits', creditValue: 12, weight: 10, emoji: '🥇' },
  { id: '5', label: '15 Credits', creditValue: 15, weight: 7, emoji: '🥇' },
  { id: '6', label: '18 Credits', creditValue: 18, weight: 5, emoji: '💎' },
  { id: '7', label: '21 Credits', creditValue: 21, weight: 3, emoji: '💎' },
  { id: '8', label: '24 Credits', creditValue: 24, weight: 2, emoji: '👑' },
];

export const DEFAULT_PALETTES: [string, string][] = [
  ['#ef4444', '#ffffff'], ['#3b82f6', '#ffffff'], ['#f59e0b', '#ffffff'],
  ['#10b981', '#ffffff'], ['#8b5cf6', '#ffffff'], ['#ec4899', '#ffffff'],
  ['#f97316', '#ffffff'], ['#06b6d4', '#ffffff'], ['#ef4444', '#f59e0b'],
  ['#3b82f6', '#ef4444'], ['#10b981', '#f59e0b'], ['#8b5cf6', '#ec4899'],
  ['#f97316', '#10b981'], ['#3b82f6', '#f59e0b'], ['#ef4444', '#3b82f6'],
  ['#f59e0b', '#10b981'], ['#ec4899', '#8b5cf6'], ['#06b6d4', '#ef4444'],
  ['#f97316', '#3b82f6'], ['#10b981', '#ec4899'],
];

export function pickPrize(segments: PrizeSegment[]): { segment: PrizeSegment; colorIndex: number } {
  const total = segments.reduce((s, seg) => s + seg.weight, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < segments.length; i++) {
    rand -= segments[i].weight;
    if (rand <= 0) return { segment: segments[i], colorIndex: i };
  }
  return { segment: segments[0], colorIndex: 0 };
}
