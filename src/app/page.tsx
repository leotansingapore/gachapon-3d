'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { PrizeSegment } from '@/components/gachapon';

const GachaponMachine = dynamic(
  () => import('@/components/gachapon/GachaponMachine'),
  { ssr: false, loading: () => (
    <div className="w-full flex items-center justify-center" style={{ background: '#111827', height: 'var(--app-h, 100vh)' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full mx-auto mb-3 animate-spin"
          style={{ border: '3px solid rgba(251,191,36,0.1)', borderTop: '3px solid rgba(251,191,36,0.6)' }} />
        <p className="text-sm" style={{ color: 'rgba(251,191,36,0.5)' }}>Loading machine...</p>
      </div>
    </div>
  )}
);

// Set --app-h CSS var to actual window.innerHeight (fixes mobile browser chrome)
function useRealViewportHeight() {
  useEffect(() => {
    function setH() {
      document.documentElement.style.setProperty('--app-h', window.innerHeight + 'px');
    }
    setH();
    window.addEventListener('resize', setH);
    window.addEventListener('orientationchange', () => setTimeout(setH, 100));
    return () => {
      window.removeEventListener('resize', setH);
    };
  }, []);
}

export default function Home() {
  const [totalCredits, setTotalCredits] = useState(0);
  const [spinsCount, setSpinsCount] = useState(0);

  useRealViewportHeight();

  const handleDispense = (segment: PrizeSegment) => {
    setTotalCredits(prev => prev + segment.creditValue);
    setSpinsCount(prev => prev + 1);
  };

  return (
    <div className="relative w-full overflow-hidden"
      style={{ height: 'var(--app-h, 100dvh)' }}>
      <GachaponMachine
        onDispense={handleDispense}
        className="w-full h-full"
      />

      {/* HUD overlay */}
      <div className="absolute top-4 left-4 pointer-events-none z-30">
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
    </div>
  );
}
