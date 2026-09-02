/**
 * Web Audio API engine for FISH THAT STUFF - Tetris
 * Synthesizes sound effects and background music in real-time
 * No audio files needed - all sounds are generated procedurally
 */

// ============================================================
// Musical utilities
// ============================================================

/** Map note names to semitone offsets */
const NOTES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/**
 * Convert note name to frequency in Hz
 * @param {string} name - Note name like "C4", "E5", "A#3"
 * @returns {number} Frequency in Hz
 */
function freq(name) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) return 440;
  const midi = NOTES[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ============================================================
// Music data - chord and melody definitions
// ============================================================

/** Common chord definitions */
const CHORDS = {
  Am: ['A2', 'E3'],
  Em: ['E2', 'B2'],
  E: ['E2', 'B2'],
  Dm: ['D2', 'A2'],
  F: ['F2', 'C3'],
  C: ['C2', 'G2'],
  G: ['G2', 'D3']
};

/** Helper to create a bar of music with chord and melody */
const bar = (chord, mel) => ({ chord, mel });

// Korobeiniki - the classic Tetris theme tune (public domain)
const SECTION_A = [
  bar('Am', [['E5', 4], ['B4', 2], ['C5', 2], ['D5', 4], ['C5', 2], ['B4', 2]]),
  bar('Am', [['A4', 4], ['A4', 2], ['C5', 2], ['E5', 4], ['D5', 2], ['C5', 2]]),
  bar('E', [['B4', 6], ['C5', 2], ['D5', 4], ['E5', 4]]),
  bar('Am', [['C5', 4], ['A4', 4], ['A4', 4], [null, 4]])
];
const SECTION_B = [
  bar('Dm', [['D5', 6], ['F5', 2], ['A5', 4], ['G5', 2], ['F5', 2]]),
  bar('Am', [['E5', 6], ['C5', 2], ['E5', 4], ['D5', 2], ['C5', 2]]),
  bar('E', [['B4', 4], ['B4', 2], ['C5', 2], ['D5', 4], ['E5', 4]]),
  bar('Am', [['C5', 4], ['A4', 4], ['A4', 4], [null, 4]])
];
const SECTION_C = [
  bar('Am', [['E4', 8], ['C4', 8]]),
  bar('Am', [['D4', 8], ['B3', 8]]),
  bar('Am', [['C4', 8], ['A3', 8]]),
  bar('E', [['G#3', 8], ['B3', 8]]),
  bar('Am', [['E4', 8], ['C4', 8]]),
  bar('Am', [['D4', 8], ['B3', 8]]),
  bar('E', [['C4', 4], ['E4', 4], ['A4', 8]]),
  bar('Am', [['G#4', 8], [null, 8]])
];
const DOCKSIDE = [...SECTION_A, ...SECTION_B, ...SECTION_A, ...SECTION_B, ...SECTION_C];

const UNDERTOW = [
  bar('Am', [['A4', 2], ['C5', 2], ['E5', 2], ['A5', 2], ['G5', 2], ['E5', 2], ['C5', 2], ['E5', 2]]),
  bar('F', [['F4', 2], ['A4', 2], ['C5', 2], ['F5', 2], ['E5', 2], ['C5', 2], ['A4', 2], ['C5', 2]]),
  bar('C', [['C5', 2], ['E5', 2], ['G5', 2], ['C6', 2], ['B5', 2], ['G5', 2], ['E5', 2], ['G5', 2]]),
  bar('G', [['G4', 2], ['B4', 2], ['D5', 2], ['G5', 2], ['F5', 2], ['D5', 2], ['B4', 2], ['D5', 2]]),
  bar('Am', [['E5', 4], ['E5', 2], ['D5', 2], ['C5', 4], ['B4', 4]]),
  bar('F', [['A4', 4], ['C5', 2], ['D5', 2], ['E5', 6], [null, 2]]),
  bar('C', [['G5', 4], ['E5', 2], ['G5', 2], ['A5', 6], [null, 2]]),
  bar('G', [['F5', 4], ['D5', 2], ['B4', 2], ['D5', 4], ['E5', 4]])
];

const SLACK = [
  bar('Am', [['A4', 8], ['E5', 8]]),
  bar('Em', [['G4', 8], ['B4', 8]]),
  bar('F', [['A4', 8], ['C5', 8]]),
  bar('C', [['G4', 16]]),
  bar('Am', [['E5', 8], ['C5', 8]]),
  bar('Em', [['B4', 8], ['G4', 8]]),
  bar('F', [['C5', 8], ['A4', 8]]),
  bar('C', [['E5', 16]])
];

const SONAR = [
  bar('Am', [['A5', 2], [null, 6], ['E5', 2], [null, 6]]),
  bar('Am', [['A5', 2], [null, 6], ['G5', 2], [null, 6]]),
  bar('F', [['F5', 2], [null, 6], ['C5', 2], [null, 6]]),
  bar('E', [['E5', 2], [null, 6], ['B4', 2], [null, 6]]),
  bar('Am', [['C6', 2], [null, 6], ['A5', 2], [null, 6]]),
  bar('Dm', [['D5', 2], [null, 6], ['F5', 2], [null, 6]]),
  bar('Am', [['E5', 2], [null, 6], ['C5', 2], [null, 6]]),
  bar('E', [['B4', 2], [null, 6], ['E4', 2], [null, 6]])
];

const LAGOON = [
  bar('Am', [['C5', 4], ['E5', 4], ['G5', 4], ['A5', 4]]),
  bar('F', [['A4', 4], ['C5', 4], ['F5', 6], [null, 2]]),
  bar('C', [['G4', 4], ['E4', 4], ['G4', 4], ['C5', 4]]),
  bar('G', [['B4', 4], ['D5', 4], ['G5', 8]]),
  bar('Am', [['E5', 4], ['C5', 4], ['A4', 4], ['G4', 4]]),
  bar('F', [['F4', 6], ['A4', 2], ['C5', 4], ['A4', 4]]),
  bar('C', [['E5', 4], ['G5', 4], ['E5', 4], ['C5', 4]]),
  bar('G', [['D5', 8], ['B4', 8]])
];

const AFTERGLOW = [
  bar('Em', [['E5', 2], ['G5', 2], ['B5', 4], ['A5', 2], ['G5', 2]]),
  bar('D', [['D5', 2], ['F#5', 2], ['A5', 4], ['G5', 2], ['F#5', 2]]),
  bar('C', [['C5', 2], ['E5', 2], ['G5', 4], ['A5', 2], ['G5', 2]]),
  bar('G', [['G4', 2], ['B4', 2], ['D5', 4], ['F#5', 2], ['D5', 2]]),
  bar('Am', [['A4', 2], ['C5', 2], ['E5', 4], ['G5', 2], ['E5', 2]]),
  bar('F', [['F4', 2], ['A4', 2], ['C5', 4], ['A5', 2], ['C5', 2]]),
  bar('G', [['G4', 4], ['B4', 4], ['D5', 4], ['G5', 4]]),
  bar('Em', [['E5', 8], ['B4', 8]])
];

const NIGHTDRIVE = [
  bar('Am', [['A4', 4], ['C5', 2], ['E5', 2], ['G5', 4], ['E5', 2], ['C5', 2]]),
  bar('F', [['F4', 4], ['A4', 2], ['C5', 2], ['F5', 4], ['E5', 2], ['C5', 2]]),
  bar('C', [['C4', 4], ['E4', 2], ['G4', 2], ['C5', 4], ['B4', 2], ['G4', 2]]),
  bar('G', [['G3', 4], ['B3', 2], ['D4', 2], ['G4', 4], ['F4', 2], ['D4', 2]]),
  bar('Dm', [['D4', 4], ['F4', 2], ['A4', 2], ['D5', 4], ['C5', 2], ['A4', 2]]),
  bar('E', [['E4', 4], ['G#4', 2], ['B4', 2], ['E5', 6], [null, 2]]),
  bar('C', [['C5', 4], ['G4', 2], ['A4', 2], ['G4', 4], ['E4', 2], ['G4', 2]]),
  bar('Am', [['A4', 8], [null, 8]])
];

const HARBOR = [
  bar('Am', [['A4', 8], ['C5', 4], ['E5', 4]]),
  bar('G', [['G4', 8], ['B4', 4], ['D5', 4]]),
  bar('F', [['F4', 8], ['A4', 4], ['C5', 4]]),
  bar('E', [['E4', 8], ['G#4', 4], ['B4', 4]]),
  bar('Am', [['E5', 4], ['C5', 4], ['A4', 8]]),
  bar('D', [['D5', 4], ['A4', 4], ['F#4', 8]]),
  bar('F', [['F5', 4], ['C5', 4], ['A4', 8]]),
  bar('E', [['E5', 8], ['B4', 8]])
];

// Pulse - steady hypnotic rhythm for focused play
const PULSE = [
  bar('Am', [['A4', 4], ['E5', 4], ['A5', 4], ['E5', 4]]),
  bar('Am', [['G4', 4], ['D5', 4], ['G5', 4], ['D5', 4]]),
  bar('F', [['F4', 4], ['C5', 4], ['F5', 4], ['C5', 4]]),
  bar('C', [['C4', 4], ['G4', 4], ['C5', 4], ['G4', 4]]),
  bar('Am', [['A4', 2], ['C5', 2], ['E5', 2], ['A5', 2]]),
  bar('F', [['F4', 2], ['A4', 2], ['C5', 2], ['F5', 2]]),
  bar('G', [['G4', 2], ['B4', 2], ['D5', 2], ['G5', 2]]),
  bar('Am', [['E5', 8], ['C5', 8]])
];

// OpenSea - retro melody with a shallower, fishy glide and watery timbre
const OPENSEA = [
  bar('C', [['C5', 2], ['G4', 2], ['A4', 2], ['E5', 2], ['G5', 2], ['E5', 2], ['D5', 2], ['G4', 2]]),
  bar('F', [['F4', 2], ['C4', 2], ['F4', 2], ['A4', 2], ['C5', 2], ['A4', 2], ['G4', 2], ['C4', 2]]),
  bar('G', [['G4', 2], ['D4', 2], ['E4', 2], ['B4', 2], ['D5', 2], ['B4', 2], ['A4', 2], ['D4', 2]]),
  bar('E', [['E4', 2], ['B3', 2], ['C4', 2], ['G#4', 2], ['B4', 2], ['G#4', 2], ['E4', 2], ['B3', 2]]),
  bar('Am', [['A4', 4], ['E5', 2], ['G5', 2], ['A5', 2], ['G5', 2], ['E5', 2], ['C5', 2], ['A4', 2]]),
  bar('Dm', [['D4', 4], ['A4', 2], ['C5', 2], ['F5', 2], ['E5', 2], ['D5', 2], ['A4', 2], ['F4', 2]]),
  bar('G', [['G4', 4], ['D5', 2], ['E5', 2], ['G5', 2], ['F5', 2], ['E5', 2], ['D5', 2], ['B4', 2]]),
  bar('C', [['C5', 4], ['G4', 4], ['A4', 4], ['E5', 4]])
];

// Trench - extreme dark aggressive theme for extreme difficulty
const TRENCH = [
  bar('Em', [['E4', 2], ['B4', 2], ['E5', 2], ['G5', 2], ['B5', 2], ['G5', 2], ['E5', 2], ['B4', 2]]),
  bar('Am', [['A4', 2], ['E5', 2], ['A5', 2], ['C6', 2], ['A5', 2], ['E5', 2], ['A4', 2], ['E4', 2]]),
  bar('Dm', [['D4', 2], ['A4', 2], ['D5', 2], ['F5', 2], ['A5', 2], ['F5', 2], ['D5', 2], ['A4', 2]]),
  bar('G', [['G4', 2], ['D5', 2], ['G5', 2], ['B5', 2], ['D6', 2], ['B5', 2], ['G5', 2], ['D5', 2]]),
  bar('Em', [['E5', 4], ['B5', 2], ['G5', 2], ['E5', 4], ['B4', 4]]),
  bar('Am', [['A4', 4], ['E5', 2], ['C5', 2], ['A4', 6], [null, 2]]),
  bar('Dm', [['D5', 4], ['A5', 2], ['F5', 2], ['D5', 4], ['A4', 4]]),
  bar('G', [['G5', 4], ['D5', 2], ['B4', 2], ['G4', 4], ['E4', 4]])
];

// Ambient - chill zen mode for relaxed gameplay
const AMBIENT = [
  bar('Am', [['A4', 4], [null, 4], ['E5', 4], [null, 4]]),
  bar('F', [['F4', 4], [null, 4], ['C5', 4], [null, 4]]),
  bar('C', [['C4', 4], [null, 4], ['G4', 4], [null, 4]]),
  bar('G', [['G3', 4], [null, 4], ['B3', 4], [null, 4]]),
  bar('Am', [['A4', 2], ['E5', 2], ['C5', 2], ['A4', 2]]),
  bar('F', [['F4', 2], ['C5', 2], ['A4', 2], ['F4', 2]]),
  bar('G', [['G4', 2], ['D5', 2], ['B4', 2], ['G4', 2]]),
  bar('Am', [['E5', 8], [null, 8]])
];


export const MUSIC_THEMES = {
  dockside: {
    name: 'Dockside',
    bpm: 148,
    bars: DOCKSIDE,
    lead: { type: 'square', gain: 0.09, octave: true, sustain: 0.9 },
    bass: { type: 'triangle', gain: 0.14, pattern: 'walk' },
    kick: true,
    hat: true
  },
  oldClassic: {
    name: 'Old Classic',
    bpm: 112,
    bars: DOCKSIDE,
    lead: { type: 'triangle', gain: 0.06, octave: true, sustain: 1.4 },
    bass: { type: 'sine', gain: 0.18, pattern: 'hold' },
    kick: true,
    hat: false
  },
  lagoon: {
    name: 'Lagoon',
    bpm: 132,
    bars: LAGOON,
    lead: { type: 'triangle', gain: 0.12, octave: true, sustain: 1.1 },
    bass: { type: 'sine', gain: 0.16, pattern: 'walk' },
    kick: true,
    hat: true
  },
  harbor: {
    name: 'Harbor',
    bpm: 108,
    bars: HARBOR,
    lead: { type: 'sine', gain: 0.13, octave: true, sustain: 1.4 },
    bass: { type: 'triangle', gain: 0.18, pattern: 'hold' },
    kick: true,
    hat: false
  },
  korobeiniki: {
    name: 'OpenSea',
    bpm: 132,
    bars: OPENSEA,
    lead: { type: 'sine', gain: 0.12, octave: true, sustain: 1.5 },
    bass: { type: 'triangle', gain: 0.16, pattern: 'walk' },
    kick: true,
    hat: false
  }
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
    this.musicVol = 0.35;
    this.sfxVol = 0.7;
    this.playing = false;
    this.muffled = false;
    this.bar = 0;
    this.nextBarTime = 0;
    this.themeKey = 'dockside';
    this.theme = MUSIC_THEMES.dockside;
    this.bpm = this.theme.bpm;
    this.timer = null;
    this.ticks = [];
    this.tickFired = -1;
    this.pulse = 0;
    this.activeMusicNodes = [];
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') return this.ctx.resume().catch(() => {});
      return Promise.resolve();
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    this.master.connect(comp).connect(this.ctx.destination);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.sfxVol;
    this.sfxBus.connect(this.master);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? this.musicVol : 0;
    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 20000;
    this.musicFilter.Q.value = 0.7;
    this.musicBus.connect(this.musicFilter).connect(this.master);

    this.noiseBuffer = this.makeNoise();
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  setMusicVolume(v) {
    this.musicVol = v;
    this.applyMusicGain();
  }

  setSfxVolume(v) {
    this.sfxVol = v;
    if (this.sfxBus) this.sfxBus.gain.value = v;
  }

  toggleMusic(on) {
    this.musicOn = on;
    this.applyMusicGain();
  }

  applyMusicGain() {
    if (!this.musicBus) return;
    const target = this.musicOn ? this.musicVol * (this.muffled ? 0.3 : 1) : 0;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(target, t, 0.05);
  }

  // pause drops the music behind a wall instead of cutting it
  setMuffled(on) {
    this.muffled = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicFilter.frequency.cancelScheduledValues(t);
    this.musicFilter.frequency.setTargetAtTime(on ? 340 : 20000, t, 0.09);
    this.applyMusicGain();
  }

  tone(opts) {
    if (!this.ctx) return;
    const {
      f = 440,
      to = null,
      type = 'square',
      dur = 0.12,
      gain = 0.25,
      attack = 0.004,
      delay = 0,
      bus = this.sfxBus,
      detune = 0
    } = opts;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(f, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(opts) {
    if (!this.ctx) return;
    const { dur = 0.12, gain = 0.2, cut = 1800, q = 1, delay = 0, type = 'lowpass', bus = this.sfxBus } = opts;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = cut;
    filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(g).connect(bus);
    src.start(t);
    src.stop(t + dur);
  }

  play(name, data = {}) {
    if (!this.ctx) return;
    switch (name) {
      case 'move':
        this.tone({ f: 180, type: 'square', dur: 0.035, gain: 0.09 });
        break;
      case 'rotate':
        this.tone({ f: 330, to: 470, type: 'square', dur: 0.06, gain: 0.11 });
        break;
      case 'blocked':
        this.tone({ f: 120, to: 90, type: 'sawtooth', dur: 0.07, gain: 0.06 });
        break;
      case 'hold':
        this.tone({ f: 520, to: 780, type: 'triangle', dur: 0.11, gain: 0.16 });
        break;
      case 'harddrop':
        this.noise({ dur: 0.09, gain: 0.22, cut: 900 });
        this.tone({ f: 150, to: 55, type: 'triangle', dur: 0.13, gain: 0.2 });
        break;
      case 'lock':
        this.tone({ f: 240, to: 160, type: 'square', dur: 0.05, gain: 0.1 });
        this.noise({ dur: 0.04, gain: 0.08, cut: 2600 });
        break;
      case 'tspin':
        [0, 1, 2].forEach((i) =>
          this.tone({ f: freq(['A4', 'C5', 'E5'][i]), type: 'triangle', dur: 0.4, gain: 0.14, delay: i * 0.03 })
        );
        this.noise({ dur: 0.3, gain: 0.1, cut: 3200, type: 'bandpass', q: 2 });
        break;
      case 'clear': {
        const n = data.count || 1;
        const roots = { 1: ['E5', 'A5'], 2: ['E5', 'A5', 'C6'], 3: ['A4', 'C5', 'E5', 'A5'], 4: ['A4', 'E5', 'A5', 'C6', 'E6'] };
        const seq = roots[n] || roots[1];
        seq.forEach((nt, i) =>
          this.tone({ f: freq(nt), type: n === 4 ? 'square' : 'triangle', dur: 0.28, gain: 0.16, delay: i * 0.045 })
        );
        this.noise({ dur: 0.25, gain: 0.12, cut: 1200 + n * 900 });
        if (n === 4) this.tone({ f: 90, to: 40, type: 'sine', dur: 0.4, gain: 0.3 });
        break;
      }
      case 'combo': {
        const step = Math.min(data.combo || 1, 12);
        this.tone({ f: 440 * Math.pow(2, step / 12), type: 'square', dur: 0.1, gain: 0.13 });
        break;
      }
      case 'perfect':
        ['A4', 'C#5', 'E5', 'A5', 'C#6', 'E6'].forEach((nt, i) =>
          this.tone({ f: freq(nt), type: 'triangle', dur: 0.5, gain: 0.16, delay: i * 0.06 })
        );
        break;
      case 'levelup':
        ['A4', 'C5', 'E5', 'A5'].forEach((nt, i) =>
          this.tone({ f: freq(nt), type: 'square', dur: 0.22, gain: 0.15, delay: i * 0.06 })
        );
        break;
      case 'stage':
        this.tone({ f: 320, to: 70, type: 'sawtooth', dur: 0.75, gain: 0.16 });
        ['A3', 'E4', 'A4', 'C5', 'E5'].forEach((nt, i) =>
          this.tone({ f: freq(nt), type: 'triangle', dur: 0.7, gain: 0.15, delay: 0.18 + i * 0.07 })
        );
        this.noise({ dur: 0.9, gain: 0.12, cut: 700 });
        break;
      case 'start':
        ['A3', 'E4', 'A4'].forEach((nt, i) =>
          this.tone({ f: freq(nt), type: 'triangle', dur: 0.25, gain: 0.18, delay: i * 0.08 })
        );
        break;
      case 'gameover':
        ['A4', 'G4', 'F4', 'E4', 'D4', 'A3'].forEach((nt, i) =>
          this.tone({ f: freq(nt), type: 'sawtooth', dur: 0.4, gain: 0.13, delay: i * 0.11 })
        );
        this.noise({ dur: 1.2, gain: 0.08, cut: 600 });
        break;
      default:
        break;
    }
  }

  async startMusic(level = 1) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
    if (this.playing) this.stopMusic();
    this.playing = true;
    this.bar = 0;
    this.ticks.length = 0;
    this.setTempo(level);
    this.nextBarTime = this.ctx.currentTime + 0.15;
    this.timer = setInterval(() => this.schedule(), 40);
  }

  stopMusic() {
    this.playing = false;
    this.ticks.length = 0;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const node of this.activeMusicNodes) {
      try {
        node.stop();
      } catch (err) {
        // node may already be stopped
      }
    }
    this.activeMusicNodes.length = 0;
  }

  setTheme(key, level = 1, speed = 1) {
    if (!MUSIC_THEMES[key] || key === this.themeKey) return;
    this.themeKey = key;
    this.theme = MUSIC_THEMES[key];
    this.bar = 0;
    this.ticks.length = 0;
    this.setTempo(level, speed);

    if (this.playing && this.ctx) {
      this.stopMusic();
      this.playing = true;
      this.nextBarTime = this.ctx.currentTime + 0.12;
      this.timer = setInterval(() => this.schedule(), 40);
    } else if (this.ctx) {
      this.nextBarTime = this.ctx.currentTime + 0.1;
    }
  }

  setTempo(level, speed = 1) {
    const base = this.theme.bpm;
    this.bpm = Math.min(base * 1.5, base + (level - 1) * 4 + (speed - 1) * 20);
  }

  beatSeconds() {
    return 60 / this.bpm;
  }

  // called once per frame so gameplay and the ui can read the groove
  poll(dt) {
    this.pulse = Math.max(0, this.pulse - dt * 3.4);
    this.tickFired = -1;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    while (this.ticks.length && this.ticks[0].t <= now) {
      const tk = this.ticks.shift();
      this.tickFired = tk.i;
      if (tk.i % 4 === 0) this.pulse = 1;
      else if (tk.i % 2 === 0) this.pulse = Math.max(this.pulse, 0.45);
    }
  }

  schedule() {
    if (!this.playing || !this.ctx) return;
    const bars = this.theme.bars;
    const sixteenth = 60 / this.bpm / 4;
    const barLen = sixteenth * 16;
    while (this.nextBarTime < this.ctx.currentTime + 0.35) {
      this.scheduleBar(bars[this.bar % bars.length], this.nextBarTime, sixteenth);
      for (let i = 0; i < 16; i++) this.ticks.push({ t: this.nextBarTime + i * sixteenth, i });
      this.bar++;
      this.nextBarTime += barLen;
    }
  }

  scheduleBar(b, t0, sixteenth) {
    const { lead, bass, kick, hat } = this.theme;

    let at = 0;
    for (const [note, len] of b.mel) {
      if (note) {
        const t = t0 + at * sixteenth;
        const dur = len * sixteenth * lead.sustain;
        this.musicNote(freq(note), t, dur, lead.type, lead.gain);
        if (lead.octave) this.musicNote(freq(note) * 2, t, dur * 0.5, lead.type, lead.gain * 0.22);
      }
      at += len;
    }

    const [root, fifth] = CHORDS[b.chord] || CHORDS.Am;
    if (bass.pattern === 'hold') {
      this.musicNote(freq(root) / 2, t0, sixteenth * 15, bass.type, bass.gain);
      this.musicNote(freq(fifth) / 2, t0 + sixteenth * 8, sixteenth * 7, bass.type, bass.gain * 0.6);
    } else {
      for (let i = 0; i < 8; i++) {
        const t = t0 + i * sixteenth * 2;
        const drive = i % 4 === 3 ? freq(root) * 2 : freq(root);
        const f = bass.pattern === 'drive' ? drive : freq(i % 2 === 0 ? root : fifth);
        this.musicNote(f, t, sixteenth * (bass.pattern === 'drive' ? 1.2 : 1.6), bass.type, bass.gain);
      }
    }

    for (let i = 0; i < 8; i++) {
      const t = t0 + i * sixteenth * 2;
      if (kick && i % 4 === 0) this.musicPerc(t, 0.09, 160, 0.16);
      if (hat) this.musicPerc(t + sixteenth, 0.03, 7000, 0.035, 'highpass');
    }
  }

  musicNote(f, t, dur, type, gain) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.setValueAtTime(gain, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.musicBus);
    this.activeMusicNodes.push(osc);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  musicPerc(t, dur, cut, gain, type = 'lowpass') {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = cut;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(g).connect(this.musicBus);
    this.activeMusicNodes.push(src);
    src.start(t);
    src.stop(t + dur);
  }
}
