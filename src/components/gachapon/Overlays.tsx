'use client';

import { useState, useEffect, useRef } from 'react';
import type { PrizeSegment, RarityTier } from './types';
import { getRarity, RARITY_CONFIG } from './types';

// ── CSS keyframes (injected once) ──
const STYLES = `
@keyframes gach-fadein { from { opacity: 0; } to { opacity: 1; } }
@keyframes gach-fadeout { from { opacity: 1; } to { opacity: 0; } }
@keyframes gach-drop {
  0% { transform: translateY(-300px) scale(0.3) rotate(-200deg); opacity: 1; }
  25% { transform: translateY(0) scale(1.06) rotate(15deg); }
  35% { transform: translateY(-30px) scale(0.95) rotate(-8deg); }
  42% { transform: translateY(0) scale(1.02) rotate(3deg); }
  48% { transform: translateY(-8px) scale(0.99) rotate(0); }
  52% { transform: translateY(0) scale(1) rotate(0); }
  60% { transform: translateY(0) scale(1) rotate(-3deg); }
  68% { transform: translateY(0) scale(1) rotate(4deg); }
  76% { transform: translateY(0) scale(1) rotate(-3deg); }
  90% { transform: translateY(0) scale(1.3) rotate(0); opacity: 0.8; }
  100% { transform: translateY(0) scale(1.6) rotate(0); opacity: 0; }
}
@keyframes gach-crack { 0% { stroke-dashoffset: 1; } 100% { stroke-dashoffset: 0; } }
@keyframes gach-burst {
  0% { transform: scale(0); opacity: 0; }
  85% { transform: scale(0); opacity: 0; }
  92% { transform: scale(2); opacity: 0.6; }
  100% { transform: scale(4); opacity: 0; }
}
@keyframes gach-confetti {
  0% { opacity: 1; transform: translate(0,0) scale(1) rotate(0deg); }
  100% { opacity: 0; transform: translate(var(--cx), var(--cy)) scale(0.15) rotate(var(--cr)); }
}
@keyframes gach-scalein {
  0% { transform: scale(0.3); opacity: 0; }
  60% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes gach-slideup {
  0% { transform: translateY(15px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes gach-pulse-question {
  0%,100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.08); opacity: 0.7; }
}
@keyframes gach-ray {
  0% { transform: scaleY(0); opacity: 0; }
  50% { transform: scaleY(1); opacity: 0.5; }
  100% { transform: scaleY(0.7); opacity: 0.15; }
}
@keyframes gach-glow-pulse {
  0%,100% { opacity: 0.3; } 50% { opacity: 0.6; }
}
`;

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = STYLES;
  document.head.appendChild(el);
  stylesInjected = true;
}

// ── Dispensing Overlay ──
export function DispensingOverlay({ visible, topColor }: { visible: boolean; topColor: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => { injectStyles(); }, []);
  useEffect(() => {
    if (visible) setShow(true);
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t); }
  }, [visible]);

  if (!show) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ animation: visible ? 'gach-fadein 0.3s' : 'gach-fadeout 0.3s forwards' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(17,24,39,0.8), rgba(0,0,0,0.92))' }} />

      {/* Capsule ball */}
      <div className="relative z-10" style={{
        width: 140, height: 140,
        animation: 'gach-drop 1.1s ease-out forwards',
      }}>
        <div className="w-full h-full rounded-full" style={{
          background: `radial-gradient(circle at 35% 30%, ${topColor}ff, ${topColor}cc, ${topColor}88)`,
          boxShadow: `0 8px 30px ${topColor}50, inset 0 -4px 12px rgba(0,0,0,0.2), inset 0 2px 6px rgba(255,255,255,0.2)`,
        }}>
          <div className="absolute top-4 left-7 w-10 h-7 rounded-full bg-white/30" style={{ filter: 'blur(1px)' }} />
          <div className="absolute top-3 left-9 w-4 h-2.5 rounded-full bg-white/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-black text-white/40" style={{
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              animation: 'gach-pulse-question 1.2s infinite',
            }}>?</span>
          </div>
        </div>
      </div>

      {/* Crack lines SVG */}
      <svg className="absolute z-20" style={{ width: 160, height: 160, left: '50%', top: '50%', marginLeft: -80, marginTop: -80 }}
        viewBox="0 0 160 160">
        <path d="M 15 80 L 35 70 L 50 85 L 68 65 L 80 78 L 92 67 L 110 80 L 125 72 L 145 80"
          fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"
          strokeDasharray="1" strokeDashoffset="1"
          style={{ animation: 'gach-crack 0.3s 0.65s forwards' }} />
        <path d="M 68 65 L 62 48 L 68 38" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity={0.6}
          strokeDasharray="1" strokeDashoffset="1"
          style={{ animation: 'gach-crack 0.2s 0.8s forwards' }} />
        <path d="M 92 67 L 98 50 L 92 42" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity={0.5}
          strokeDasharray="1" strokeDashoffset="1"
          style={{ animation: 'gach-crack 0.2s 0.85s forwards' }} />
      </svg>

      {/* Light burst */}
      <div className="absolute z-10 rounded-full"
        style={{
          width: 200, height: 200, left: '50%', top: '50%', marginLeft: -100, marginTop: -100,
          background: `radial-gradient(circle, ${topColor}90, ${topColor}30, transparent 60%)`,
          animation: 'gach-burst 1.1s ease-out forwards',
        }} />

      {/* Shadow */}
      <div className="absolute z-0 rounded-full"
        style={{ width: 120, height: 16, background: 'radial-gradient(ellipse, rgba(0,0,0,0.35), transparent 70%)', top: '56%', left: '50%', marginLeft: -60 }} />
    </div>
  );
}

// ── Prize Reveal (rarity-scaled, CSS only) ──
export function PrizeRevealOverlay({ visible, prize, onCollect }: {
  visible: boolean; prize: PrizeSegment | null; onCollect: () => void;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => { injectStyles(); }, []);
  useEffect(() => {
    if (visible) setShow(true);
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t); }
  }, [visible]);

  if (!show || !prize) return null;
  const rarity = getRarity(prize.creditValue);
  const config = RARITY_CONFIG[rarity];

  const baseColors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#ffffff', '#fcd34d'];
  const confettiColors = rarity === 'legendary'
    ? ['#fbbf24', '#f59e0b', '#fcd34d', '#ffffff', '#fef08a', '#f59e0b', '#fbbf24', '#ffffff']
    : rarity === 'epic'
    ? ['#a855f7', '#c084fc', '#ffffff', '#f59e0b', '#fbbf24', '#d8b4fe', '#a855f7', '#ffffff']
    : baseColors;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, rgba(17,24,39,0.92), rgba(0,0,0,0.97))',
        animation: visible ? 'gach-fadein 0.3s' : 'gach-fadeout 0.3s forwards',
      }}>

      {/* Rarity ambient glow */}
      {(rarity === 'epic' || rarity === 'legendary') && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${config.glowColor}15, transparent 50%)`,
            animation: 'gach-glow-pulse 2s infinite',
          }} />
      )}

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(config.confettiCount)].map((_, i) => {
          const angle = (i / config.confettiCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          const dist = 80 + Math.random() * (rarity === 'legendary' ? 220 : rarity === 'epic' ? 180 : 140);
          const size = 3 + Math.random() * 7;
          const isRect = Math.random() > 0.5;
          return (
            <div key={i} className="absolute" style={{
              width: isRect ? size * 0.5 : size, height: size,
              background: confettiColors[i % confettiColors.length],
              left: '50%', top: '50%',
              borderRadius: isRect ? '1px' : '50%',
              '--cx': `${Math.cos(angle) * dist}px`,
              '--cy': `${Math.sin(angle) * dist + 50}px`,
              '--cr': `${Math.random() * 900 - 450}deg`,
              animation: `gach-confetti ${0.9 + Math.random() * 0.4}s ${0.03 + Math.random() * 0.2}s ease-out forwards`,
            } as React.CSSProperties} />
          );
        })}
      </div>

      {/* Light rays for epic/legendary */}
      {(rarity === 'epic' || rarity === 'legendary') && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(rarity === 'legendary' ? 12 : 6)].map((_, i) => (
            <div key={i} className="absolute" style={{
              left: '50%', top: '50%', width: 3,
              height: rarity === 'legendary' ? 400 : 250,
              background: `linear-gradient(0deg, ${config.glowColor}40, transparent)`,
              transformOrigin: 'center top',
              transform: `rotate(${i * (rarity === 'legendary' ? 30 : 60)}deg)`,
              marginLeft: -1.5,
              animation: `gach-ray 0.8s ${0.1 + i * 0.03}s ease-out forwards`,
              opacity: 0,
            }} />
          ))}
        </div>
      )}

      <div className="text-center relative z-10" style={{ animation: 'gach-scalein 0.4s ease-out' }}>
        {/* Rarity label */}
        {(rarity === 'epic' || rarity === 'legendary') && (
          <div className="mb-2 text-sm font-bold tracking-[0.3em] uppercase"
            style={{ color: config.color, animation: 'gach-slideup 0.3s ease-out' }}>
            {config.label}
          </div>
        )}

        {/* Emoji */}
        <div className={rarity === 'legendary' ? 'text-7xl mb-4' : 'text-6xl mb-4'}
          style={{ animation: 'gach-scalein 0.5s 0.1s ease-out both' }}>
          {prize.emoji}
        </div>

        {/* Credits */}
        <div className={rarity === 'legendary' ? 'text-9xl font-black mb-3' : 'text-8xl font-black mb-3'}
          style={{
            color: config.color,
            textShadow: `0 0 ${rarity === 'legendary' ? '80px' : '40px'} ${config.glowColor}50, 0 4px 12px rgba(0,0,0,0.5)`,
            animation: 'gach-scalein 0.4s 0.2s ease-out both',
          }}>
          +{prize.creditValue}
        </div>

        <p className="text-xl font-semibold mb-1"
          style={{ color: `${config.color}e0`, animation: 'gach-slideup 0.3s 0.35s ease-out both' }}>
          Activity Credits!
        </p>

        <p className="text-sm mb-8"
          style={{ color: 'rgba(255,255,255,0.3)', animation: 'gach-slideup 0.3s 0.4s ease-out both' }}>
          {prize.label}
        </p>

        <button onClick={onCollect}
          className="px-10 py-3.5 rounded-full transition-all duration-200 hover:brightness-125 active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${config.color}30, ${config.color}10)`,
            border: `1px solid ${config.color}60`, color: config.color,
            fontSize: '1rem', fontWeight: 700,
            animation: 'gach-slideup 0.3s 0.5s ease-out both',
          }}>
          Collect
        </button>
      </div>
    </div>
  );
}

// ── Pull History Panel ──
export function PullHistory({ history, visible }: {
  history: { segment: PrizeSegment; rarity: RarityTier; timestamp: number; topColor: string }[];
  visible: boolean;
}) {
  if (!visible || history.length === 0) return null;

  return (
    <div className="absolute top-16 right-4 z-30 pointer-events-auto">
      <div className="rounded-xl overflow-hidden" style={{
        background: 'rgba(17,24,39,0.92)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        width: 200, maxHeight: 320,
      }}>
        <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-[10px] tracking-[0.1em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Recent Spins ({history.length})
          </span>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 270 }}>
          {history.map((entry, i) => {
            const cfg = RARITY_CONFIG[entry.rarity];
            const diff = Date.now() - entry.timestamp;
            const time = diff < 60000 ? 'just now' : diff < 3600000 ? `${Math.floor(diff / 60000)}m ago` : `${Math.floor(diff / 3600000)}h ago`;
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="w-5 h-5 rounded-full flex-shrink-0" style={{
                  background: `radial-gradient(circle at 35% 35%, ${entry.topColor}, ${entry.topColor}aa)`,
                  boxShadow: entry.rarity !== 'common' ? `0 0 6px ${cfg.glowColor}40` : 'none',
                }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold" style={{ color: cfg.color }}>+{entry.segment.creditValue}</span>
                    <span className="text-[10px]">{entry.segment.emoji}</span>
                    {entry.rarity !== 'common' && (
                      <span className="text-[8px] px-1 rounded" style={{ background: `${cfg.color}20`, color: cfg.color }}>
                        {entry.rarity === 'legendary' ? 'LEG' : entry.rarity === 'epic' ? 'EPIC' : 'RARE'}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
