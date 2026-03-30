'use client';

import dynamic from 'next/dynamic';

const GachaponScene = dynamic(() => import('@/components/GachaponScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center" style={{ background: '#0a0e1a' }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 animate-spin"
          style={{
            border: '3px solid rgba(196,162,77,0.1)',
            borderTop: '3px solid rgba(196,162,77,0.6)',
          }}
        />
        <p className="text-sm tracking-wider" style={{ color: 'rgba(196,162,77,0.5)' }}>
          Loading Gachapon Machine...
        </p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <GachaponScene />;
}
