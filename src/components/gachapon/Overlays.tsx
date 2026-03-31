'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { PrizeSegment } from './types';

// ── Confetti Dot ──
function ConfettiDot({ delay, color, angle, distance }: { delay: number; color: string; angle: number; distance: number }) {
  const size = 3 + Math.random() * 7;
  const isRect = Math.random() > 0.5;
  return (
    <motion.div className="absolute"
      style={{
        width: isRect ? size * 0.5 : size, height: size,
        background: color, left: '50%', top: '50%',
        borderRadius: isRect ? '1px' : '50%',
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
      animate={{
        x: Math.cos(angle) * distance, y: Math.sin(angle) * distance + 50,
        opacity: 0, scale: 0.15, rotate: Math.random() * 900 - 450,
      }}
      transition={{ duration: 0.9 + Math.random() * 0.4, delay, ease: 'easeOut' }}
    />
  );
}

const CONFETTI_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#ffffff', '#fcd34d'];

// ── Dispensing Overlay (capsule drops, cracks, bursts) ──
export function DispensingOverlay({ visible, topColor }: { visible: boolean; topColor: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="absolute inset-0 z-40 flex items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(17,24,39,0.8), rgba(0,0,0,0.92))' }} />

          {/* Capsule ball animation */}
          <motion.div className="relative z-10" style={{ width: 140, height: 140 }}
            animate={{
              y: [-300, 0, -30, 0, -8, 0, 0, 0, 0, 0, 0],
              scale: [0.3, 1.06, 0.95, 1.02, 0.99, 1, 1, 1, 1, 1.3, 1.6],
              rotate: [-200, 15, -8, 3, 0, 0, -3, 4, -3, 0, 0],
              opacity: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0],
            }}
            transition={{ duration: 1.5, times: [0, 0.25, 0.35, 0.42, 0.48, 0.52, 0.6, 0.68, 0.76, 0.9, 1], ease: 'easeOut' }}>
            <div className="w-full h-full rounded-full" style={{
              background: `radial-gradient(circle at 35% 30%, ${topColor}ff, ${topColor}cc, ${topColor}88)`,
              boxShadow: `0 8px 30px ${topColor}50, inset 0 -4px 12px rgba(0,0,0,0.2), inset 0 2px 6px rgba(255,255,255,0.2)`,
            }}>
              <div className="absolute top-4 left-7 w-10 h-7 rounded-full bg-white/30" style={{ filter: 'blur(1px)' }} />
              <div className="absolute top-3 left-9 w-4 h-2.5 rounded-full bg-white/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-black text-white/40" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>?</span>
              </div>
            </div>
          </motion.div>

          {/* Crack lines */}
          <motion.svg className="absolute z-20" style={{ width: 160, height: 160, left: '50%', top: '50%', marginLeft: -80, marginTop: -80 }}
            viewBox="0 0 160 160"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0, 0, 0, 0, 1, 1, 1, 0] }}
            transition={{ duration: 1.5, times: [0, 0.2, 0.3, 0.4, 0.5, 0.55, 0.62, 0.78, 0.88, 1] }}>
            <motion.path d="M 15 80 L 35 70 L 50 85 L 68 65 L 80 78 L 92 67 L 110 80 L 125 72 L 145 80"
              fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1] }}
              transition={{ duration: 1.5, times: [0, 0.2, 0.3, 0.4, 0.5, 0.55, 0.62, 0.78, 0.88, 1] }} />
            <motion.path d="M 68 65 L 62 48 L 68 38" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity={0.6}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1] }}
              transition={{ duration: 1.5, times: [0, 0.2, 0.3, 0.4, 0.5, 0.55, 0.65, 0.75, 0.88, 1] }} />
            <motion.path d="M 92 67 L 98 50 L 92 42" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" opacity={0.5}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1] }}
              transition={{ duration: 1.5, times: [0, 0.2, 0.3, 0.4, 0.5, 0.55, 0.65, 0.72, 0.82, 1] }} />
          </motion.svg>

          {/* Light burst */}
          <motion.div className="absolute z-15 rounded-full"
            style={{ width: 200, height: 200, left: '50%', top: '50%', marginLeft: -100, marginTop: -100 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4], opacity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0] }}
            transition={{ duration: 1.5, times: [0, 0.2, 0.3, 0.4, 0.5, 0.55, 0.65, 0.75, 0.85, 0.92, 1] }}>
            <div className="w-full h-full rounded-full" style={{ background: `radial-gradient(circle, ${topColor}90, ${topColor}30, transparent 60%)` }} />
          </motion.div>

          {/* Shadow */}
          <motion.div className="absolute z-0 rounded-full"
            style={{ width: 120, height: 16, background: 'radial-gradient(ellipse, rgba(0,0,0,0.35), transparent 70%)', top: '56%', left: '50%', marginLeft: -60 }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0], opacity: [0, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.3, 0] }}
            transition={{ duration: 1.5, times: [0, 0.25, 0.3, 0.4, 0.5, 0.55, 0.65, 0.75, 0.85, 0.92, 1] }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Prize Reveal Overlay ──
export function PrizeRevealOverlay({ visible, prize, onCollect }: {
  visible: boolean; prize: PrizeSegment | null; onCollect: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && prize && (
        <motion.div className="absolute inset-0 flex items-center justify-center z-50"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(17,24,39,0.92), rgba(0,0,0,0.97))' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(40)].map((_, i) => (
              <ConfettiDot key={i} delay={0.05 + Math.random() * 0.2}
                color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
                angle={(i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.4}
                distance={80 + Math.random() * 160} />
            ))}
          </div>

          <motion.div className="text-center relative z-10"
            initial={{ scale: 0.3, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}>

            <motion.div className="text-6xl mb-4"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 1.3, 1], rotate: [null, 10, 0] }}
              transition={{ delay: 0.1, duration: 0.5 }}>
              {prize.emoji}
            </motion.div>

            <motion.div className="text-8xl font-black mb-3"
              style={{ color: '#fbbf24', textShadow: '0 0 60px rgba(251,191,36,0.4), 0 4px 12px rgba(0,0,0,0.5)' }}
              initial={{ scale: 0 }} animate={{ scale: [0, 1.15, 1] }}
              transition={{ delay: 0.2, duration: 0.4 }}>
              +{prize.creditValue}
            </motion.div>

            <motion.p className="text-xl font-semibold mb-1" style={{ color: 'rgba(251,191,36,0.9)' }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              Activity Credits!
            </motion.p>

            <motion.p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.3)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              {prize.label}
            </motion.p>

            <motion.button onClick={onCollect}
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
  );
}
