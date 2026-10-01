// Petits sons synthétisés avec Web Audio (aucun fichier à télécharger).
const KEY = 'sudoku-muted';

let ctx = null;
let muted = false;
try {
  muted = localStorage.getItem(KEY) === '1';
} catch {
  /* stockage indisponible */
}

function audio() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, { at = 0, dur = 0.12, type = 'sine', gain = 0.12, to = null } = {}) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise({ at = 0, dur = 0.25, gain = 0.08 } = {}) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + at;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const src = c.createBufferSource();
  const g = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900 + Math.random() * 1200;
  src.buffer = buffer;
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t);
}

export const sound = {
  isMuted: () => muted,
  setMuted(value) {
    muted = value;
    try {
      localStorage.setItem(KEY, value ? '1' : '0');
    } catch {
      /* ignoré */
    }
  },
  place: () => tone(660, { dur: 0.08, type: 'triangle', gain: 0.09 }),
  note: () => tone(1200, { dur: 0.04, type: 'sine', gain: 0.05 }),
  erase: () => tone(420, { dur: 0.09, type: 'triangle', gain: 0.07, to: 260 }),
  hint() {
    [880, 1175, 1568].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.18, gain: 0.08 }));
  },
  error() {
    tone(220, { dur: 0.18, type: 'square', gain: 0.05 });
    tone(165, { at: 0.16, dur: 0.28, type: 'square', gain: 0.05 });
  },
  win() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      tone(f, { at: i * 0.12, dur: i === 5 ? 0.6 : 0.16, type: 'triangle', gain: 0.12 }),
    );
  },
  pop: () => noise({ dur: 0.35 + Math.random() * 0.3, gain: 0.05 + Math.random() * 0.05 }),
};
