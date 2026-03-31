'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useState, useCallback, useEffect, Suspense, Component, type ReactNode } from 'react';
import { GachaponScene3D } from './Machine3D';
import { DispensingOverlay, PrizeRevealOverlay, PullHistory } from './Overlays';
import { playSound, vibrate, setMuted } from './sound';
import { createBalls, applyBurst } from './physics';
import { pickPrize, getRarity, DEFAULT_SEGMENTS, DEFAULT_PALETTES, type PrizeSegment, type Ball, type SpinResult } from './types';

// ── Error Boundary ──
class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="w-full h-full flex items-center justify-center" style={{ background: '#111827', color: '#9ca3af' }}>
          <div className="text-center p-8">
            <p className="text-lg font-semibold mb-2">3D rendering not available</p>
            <p className="text-sm">Your browser or device may not support WebGL.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Loading Spinner ──
function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#111827' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full mx-auto mb-3 animate-spin"
          style={{ border: '3px solid rgba(251,191,36,0.1)', borderTop: '3px solid rgba(251,191,36,0.6)' }} />
        <p className="text-sm" style={{ color: 'rgba(251,191,36,0.5)' }}>Loading machine...</p>
      </div>
    </div>
  );
}

// ── Props Interface ──
export interface GachaponMachineProps {
  /** Prize segments with weights and credit values */
  segments?: PrizeSegment[];
  /** Capsule color palettes [topColor, bottomColor][] */
  palettes?: [string, string][];
  /** Number of capsule balls in the dome */
  numBalls?: number;
  /** Label text on the machine front */
  label?: string;
  /** Price tag text */
  priceLabel?: string;
  /** Whether the machine can dispense (e.g. team member selected) */
  canDispense?: boolean;
  /** Called when a prize is dispensed */
  onDispense?: (segment: PrizeSegment) => void;
  /** Enable/disable sound (default true) */
  soundEnabled?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Custom error fallback */
  errorFallback?: ReactNode;
}

// ── Main Component ──
export default function GachaponMachine({
  segments = DEFAULT_SEGMENTS,
  palettes = DEFAULT_PALETTES,
  numBalls = 20,
  label = 'ACTIVITY CREDITS COLLECTION',
  priceLabel = 'FREE',
  canDispense = true,
  onDispense,
  soundEnabled: initialSoundEnabled = true,
  className = '',
  errorFallback,
}: GachaponMachineProps) {
  const [phase, setPhase] = useState('idle');
  const [prize, setPrize] = useState<PrizeSegment | null>(null);
  const [dispensedColor, setDispensedColor] = useState('#ef4444');
  const [shaking, setShaking] = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, z: 0 });
  const [history, setHistory] = useState<SpinResult[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  const ballsRef = useRef<Ball[]>(createBalls(numBalls, palettes, segments.length));
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync sound state
  useEffect(() => { setMuted(!soundEnabled); }, [soundEnabled]);

  // ── Device motion ──
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
          vibrate(60);
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
      try { const r = await DME.requestPermission(); if (r === 'granted') setMotionEnabled(true); } catch { /* denied */ }
    } else setMotionEnabled(true);
  }, []);

  // ── Actions ──
  const handleBigShake = useCallback(() => {
    if (phase !== 'idle') return;
    applyBurst(ballsRef.current);
    setShaking(true);
    playSound('rattle');
    vibrate([40, 30, 40, 30, 60]);
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = setTimeout(() => setShaking(false), 300);
  }, [phase]);

  const handleDispense = useCallback(() => {
    if (phase !== 'idle' || !canDispense) return;
    const { segment, colorIndex } = pickPrize(segments);
    const palette = palettes[colorIndex % palettes.length];
    setPrize(segment);
    setDispensedColor(palette[0]);

    setPhase('knob-turning');
    setShaking(true);
    playSound('click');
    vibrate([30, 50, 30, 50, 60]);

    setTimeout(() => {
      setShaking(false);
      playSound('whoosh');
      setPhase('dispensing');
      vibrate(80);
    }, 1200);

    setTimeout(() => {
      playSound('ding');
      setPhase('reveal');
      setShowCollect(true);
      vibrate([50, 100, 50]);
    }, 2800);
  }, [phase, canDispense, segments, palettes]);

  const handleCollect = useCallback(() => {
    if (prize) {
      onDispense?.(prize);
      setHistory(prev => [{
        segment: prize,
        rarity: getRarity(prize.creditValue),
        timestamp: Date.now(),
        topColor: dispensedColor,
      }, ...prev].slice(0, 50)); // Keep last 50
    }
    setPhase('idle');
    setPrize(null);
    setShowCollect(false);
  }, [prize, onDispense, dispensedColor]);

  // ── Keyboard ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleBigShake(); }
      if (e.code === 'Enter' && phase === 'idle') { e.preventDefault(); handleDispense(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBigShake, handleDispense, phase]);

  return (
    <div className={`relative w-full h-full select-none overflow-hidden ${className}`}>
      <WebGLErrorBoundary fallback={errorFallback}>
        {/* 3D Canvas */}
        <Canvas shadows camera={{ position: [0, 1.4, 5], fov: 40 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
          onClick={handleBigShake}>
          <color attach="background" args={['#111827']} />
          <fog attach="fog" args={['#111827', 8, 16]} />
          <Suspense fallback={null}>
            <GachaponScene3D
              balls={ballsRef.current} shaking={shaking} phase={phase}
              onTurnKnob={handleDispense} tilt={tilt} label={label} priceLabel={priceLabel}
            />
          </Suspense>
        </Canvas>

        {/* Loading overlay (shows while Suspense is pending) */}
        <div className="absolute inset-0 pointer-events-none" id="gachapon-loading">
          <LoadingFallback />
          <style>{`canvas ~ #gachapon-loading { display: none; }`}</style>
        </div>
      </WebGLErrorBoundary>

      {/* Sound toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-100"
        style={{ background: 'rgba(17,24,39,0.7)', color: 'rgba(255,255,255,0.4)', opacity: 0.6 }}
        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 pointer-events-none">
        {phase === 'idle' && (
          <>
            <div className="flex gap-3 mb-2">
              <button onClick={(e) => { e.stopPropagation(); handleBigShake(); }}
                className="pointer-events-auto px-6 py-2.5 rounded-full transition-all duration-200 hover:brightness-125 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 600 }}>
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
            <button onClick={(e) => { e.stopPropagation(); handleDispense(); }}
              disabled={!canDispense}
              className={`pointer-events-auto px-8 py-3.5 rounded-full transition-all duration-200 ${canDispense ? 'hover:brightness-125 active:scale-95 hover:shadow-lg' : 'opacity-40 cursor-not-allowed'}`}
              style={{
                background: canDispense ? 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(220,38,38,0.08))' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${canDispense ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: canDispense ? 'rgba(252,165,165,0.95)' : 'rgba(255,255,255,0.3)',
                fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.04em',
              }}>
              {canDispense ? 'Turn the Knob' : 'Select a member first'}
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

      {/* Pull history */}
      <PullHistory history={history} visible={showHistory && phase === 'idle' && history.length > 0} />

      {/* History toggle (only shows after first spin) */}
      {history.length > 0 && phase === 'idle' && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="absolute top-14 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-100 z-30"
          style={{ background: 'rgba(17,24,39,0.7)', color: 'rgba(255,255,255,0.4)', opacity: 0.6 }}
          title={showHistory ? 'Hide history' : 'Show history'}
        >
          {showHistory ? '📋' : '📋'}
        </button>
      )}

      {/* Overlays */}
      <DispensingOverlay visible={phase === 'dispensing'} topColor={dispensedColor} />
      <PrizeRevealOverlay visible={showCollect} prize={prize} onCollect={handleCollect} />
    </div>
  );
}
