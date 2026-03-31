let globalMuted = false;

export function setMuted(muted: boolean) { globalMuted = muted; }
export function isMuted() { return globalMuted; }

export function playSound(type: 'click' | 'clack' | 'ding' | 'whoosh' | 'rattle') {
  if (globalMuted) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;

    switch (type) {
      case 'click':
        osc.frequency.value = 900;
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.start(); osc.stop(t + 0.06);
        break;
      case 'clack':
        osc.frequency.value = 350; osc.type = 'square';
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(); osc.stop(t + 0.12);
        break;
      case 'ding':
        osc.frequency.value = 1400;
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.start(); osc.stop(t + 0.6);
        break;
      case 'whoosh':
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.25);
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(); osc.stop(t + 0.25);
        break;
      case 'rattle':
        for (let i = 0; i < 5; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = 600 + Math.random() * 400;
          o.type = 'square';
          g.gain.setValueAtTime(0.04, t + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.04);
          o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.04);
        }
        gain.gain.value = 0; osc.start(); osc.stop(t + 0.01);
        break;
    }
  } catch { /* AudioContext may not be available */ }
}

export function vibrate(pattern: number | number[]) {
  try { navigator?.vibrate?.(pattern); } catch { /* not supported */ }
}
