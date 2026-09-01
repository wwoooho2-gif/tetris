/**
 * FISH THAT STUFF - Tetris
 * Main application entry point and game loop
 * Handles initialization, state management, user input, and HUD updates
 */

import { Game, State } from './game.js';
import { Renderer } from './render.js';
import { AudioEngine, MUSIC_THEMES } from './audio.js';
import { Input } from './input.js';
import { Fx } from './fx.js';
import { Bot } from './bot.js';
import { HIDDEN_ROWS, COLS, PIECES, COLOR_THEMES, getColorTheme } from './pieces.js';
import { STAGES } from './stages.js';
import { UI_THEMES, BG_PRESETS, applyUiTheme, applyBackground, readImageFile, wellFromHex } from './theme.js';
import { canSubmitLeaderboard, normalizePlayerName } from './leaderboard.js';

// ============================================================
// Utility and DOM helpers
// ============================================================

/** Quick access to DOM elements by ID */
const $ = (id) => document.getElementById(id);

/**
 * Interpolate between two hex colors
 * @param {string} color1 - Starting color (e.g., '#ff0000')
 * @param {string} color2 - Ending color (e.g., '#0000ff')
 * @param {number} t - Interpolation factor (0-1)
 * @returns {string} Interpolated hex color
 */
function lerpColor(color1, color2, t) {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  
  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;
  
  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Get background colors based on current level
 * Colors progress through the stage tints and continue cycling
 * @param {number} level - Current game level (1-9999)
 * @returns {Object} Object with bg-color-1, bg-color-2, bg-color-3
 */
function getBackgroundColorsForLevel(level) {
  // Color progression: cycle through complementary colors and stage tints
  const colorPalette = [
    '#40dcf5', // Aqua - THE DOCKS
    '#35f0c8', // Mint - THE SHALLOWS
    '#4fe08a', // Green - KELP LINE
    '#3fb8ff', // Light Blue - THE DROP
    '#6aa8ff', // Periwinkle - COLD CURRENT
    '#7f8cff', // Light Purple - THE TRENCH
    '#a05cf0', // Purple - MIDNIGHT ZONE
    '#ff5b7f', // Red - THE ABYSS
    '#ff00ff', // Magenta - VOID DEPTHS
    '#00ccff', // Cyan - COSMIC TRENCH
    '#ff3300', // Orange Red - PLASMA ZONE
    '#ff6600', // Orange - INFERNO
    '#ffff00', // Yellow - SINGULARITY
    '#ff00ff'  // Magenta - BEYOND
  ];
  
  // Map level to color index (1 stage per ~70 levels after stage progression)
  const stageIndex = Math.floor((level - 1) / 70) % colorPalette.length;
  const nextStageIndex = (stageIndex + 1) % colorPalette.length;
  
  // Interpolation within current level range
  const levelInStage = (level - 1) % 70;
  const t = levelInStage / 70;
  
  const color1 = lerpColor(colorPalette[stageIndex], colorPalette[nextStageIndex], t);
  const color2 = lerpColor(colorPalette[(stageIndex + 1) % colorPalette.length], colorPalette[(stageIndex + 2) % colorPalette.length], t);
  const color3 = lerpColor(colorPalette[(stageIndex + 2) % colorPalette.length], colorPalette[(stageIndex + 3) % colorPalette.length], t);
  
  return { color1, color2, color3 };
}

/**
 * Update background colors based on level
 * @param {number} level - Current game level
 */
function updateBackgroundForLevel(level) {
  const { color1, color2, color3 } = getBackgroundColorsForLevel(level);
  document.documentElement.style.setProperty('--bg-color-1', color1);
  document.documentElement.style.setProperty('--bg-color-2', color2);
  document.documentElement.style.setProperty('--bg-color-3', color3);
}

// ============================================================
// Game settings (loaded from localStorage)
// ============================================================

/** 
 * Default settings merged with saved user preferences
 * Audio: music/sfx volumes and theme
 * Input: keyboard speed (DAS/ARR)
 * Visual: ghost piece, grid, themes, backgrounds
 * Gameplay: stages, autoplay settings
 */
const LEADERBOARD_KEY = 'tetris.leaderboard';
const PLAYER_NAME_KEY = 'tetris.player-name';
const LEADERBOARD_CHANNEL = 'fish-tetris-leaderboard';
const settings = Object.assign(
  {
    music: 35,              // Music volume (0-100)
    sfx: 70,                // Sound effects volume (0-100)
    das: 120,               // Delay Auto Shift in ms (keyboard repeat delay)
    ghost: true,            // Show piece ghost/shadow
    grid: true,             // Show grid lines
    bubbles: true,          // Show particle effects
    stages: true,           // Enable stage progression
    musicOn: true,          // Play background music
    autoplay: false,        // Enable AI auto-play
    botBeat: 1,             // Bot speed setting (1-4)
    refreshRate: 120,       // Target render refresh rate in Hz
    guiScale: 100,          // GUI scale percentage (80-170)
    musicTheme: 'dockside', // Music style
    uiTheme: 'fish',        // Color theme
    uiCustom: '#40dcf5',    // Custom UI color
    bgPreset: 'none',       // Background style
    bgFade: 55,             // Background opacity (0-100)
    bgWell: false,          // Show background in game well
    fullscreen: false,      // Launch window in full-screen mode
    controlsVisible: true,  // Show the right-side controls list
    difficulty: 'normal',   // Game difficulty: easy, normal, hard, extreme,
    pieceTheme: 'default'   // Piece color theme: default, neon, pastel, fire, ice
  },
  JSON.parse(localStorage.getItem('tetris.settings') || '{}')
);

// ============================================================
// Core game engine instances
// ============================================================

const electronApi = (() => {
  try {
    return typeof require === 'function' ? require('electron') : null;
  } catch {
    return null;
  }
})();
const isElectronRuntime = Boolean(electronApi && window && window.process && window.process.type === 'renderer');
const ipcRenderer = isElectronRuntime && electronApi ? electronApi.ipcRenderer : null;

const game = new Game();        // Tetris game state and rules
const fx = new Fx();            // Visual effects and screen shake
const audio = new AudioEngine(); // Sound effects and music
const renderer = new Renderer($('board'), $('hold'), $('next'), getColorTheme(settings.pieceTheme)); // Canvas rendering
const input = new Input(game);  // Keyboard and touch input handler
const bot = new Bot();          // AI auto-play logic

// ============================================================
// UI screen references
// ============================================================

const overlay = $('overlay');
const cards = {
  ready: overlay.querySelector('[data-screen="ready"]'),
  paused: overlay.querySelector('[data-screen="paused"]'),
  over: overlay.querySelector('[data-screen="over"]'),
  beaten: overlay.querySelector('[data-screen="beaten"]'),
  theme: overlay.querySelector('[data-screen="theme"]')
};

// ============================================================
// Runtime state
// ============================================================

let attract = 0;            // Screen saver timer
let themeReturn = 'ready';  // Which screen to return to from theme editor
let bgData = localStorage.getItem('tetris.bg') || ''; // Custom background image data
const bgLayer = $('bg-layer');
const backdrop = new Image();
backdrop.onload = () => {
  renderer.backdrop = backdrop;
};

function applyLook() {
  const { base } = applyUiTheme(settings.uiTheme, settings.uiCustom);
  renderer.accentWell = wellFromHex(base);
  applyBackground(bgLayer, settings.bgPreset, bgData, settings.bgFade);
  renderer.backdropInWell = settings.bgWell && settings.bgPreset === 'custom' && !!bgData;
  renderer.backdropAlpha = 1 - settings.bgFade / 100;
  if (bgData && backdrop.src !== bgData) backdrop.src = bgData;
  if (!bgData) {
    renderer.backdrop = null;
    renderer.backdropInWell = false;
  }
  $('bg-note').textContent = bgData
    ? 'Custom image loaded, pick Custom above to use it.'
    : 'No image loaded. Upload one to use the Custom slot.';
  const bgFadeEl = $('opt-bgfade');
  const bgFadeOut = $('out-bgfade');
  const bgWellEl = $('opt-bgwell');
  if (bgFadeEl) bgFadeEl.value = settings.bgFade;
  if (bgFadeOut) bgFadeOut.textContent = `${settings.bgFade}%`;
  if (bgWellEl) bgWellEl.checked = settings.bgWell;
  const fullscreenEl = $('opt-fullscreen');
  if (fullscreenEl) fullscreenEl.checked = settings.fullscreen;
  const colourEl = $('opt-colour');
  if (colourEl) colourEl.value = settings.uiCustom;
  $('out-colour').textContent = settings.uiTheme === 'custom' ? settings.uiCustom : 'pick a shade';
  markPicked('pick-music', settings.musicTheme);
  markPicked('pick-colour', settings.uiTheme);
  markPicked('pick-bg', settings.bgPreset);
  
  // Update difficulty buttons in sidebar
  ['easy', 'normal', 'hard', 'extreme'].forEach((diff) => {
    const btn = $(`btn-diff-${diff}`);
    if (btn) btn.setAttribute('aria-pressed', String(diff === settings.difficulty));
  });
  
  // Apply piece color theme
  const colorTheme = getColorTheme(settings.pieceTheme);
  renderer.setColorTheme(colorTheme);
  markPicked('pick-theme', settings.pieceTheme);
  
  updateMultiplierBadge();
}

function markPicked(rowId, value) {
  $(rowId).querySelectorAll('[data-value]').forEach((el) => {
    el.setAttribute('aria-pressed', String(el.dataset.value === value));
  });
}

function applyDifficultySettings() {
  game.difficulty = settings.difficulty;
  if (settings.difficulty === 'easy') {
    game.difficultySpeedMultiplier = 0.7;
    game.difficultyScoreMultiplier = 0.5;
  } else if (settings.difficulty === 'hard') {
    game.difficultySpeedMultiplier = 1.5;
    game.difficultyScoreMultiplier = 2.0;
  } else if (settings.difficulty === 'extreme') {
    game.difficultySpeedMultiplier = 2.0;
    game.difficultyScoreMultiplier = 3.5;
  } else {
    game.difficultySpeedMultiplier = 1.0;
    game.difficultyScoreMultiplier = 1.0;
  }
}

function applySettings() {
  const compactMobile = window.matchMedia('(max-width: 700px), (max-height: 560px)').matches;
  const guiMin = compactMobile ? 60 : 80;
  const guiMax = compactMobile ? 160 : 170;
  settings.guiScale = Math.min(guiMax, Math.max(guiMin, Number(settings.guiScale) || guiMax));

  audio.setMusicVolume(settings.music / 100);
  audio.setSfxVolume(settings.sfx / 100);
  audio.toggleMusic(settings.musicOn);
  input.das = settings.das;
  bot.perBeat = settings.botBeat;
  applyDifficultySettings();
  game.autoplay = settings.autoplay;
  game.setStages(settings.stages);
  renderer.showGhost = settings.ghost;
  renderer.showGrid = settings.grid;
  renderer.showBubbles = settings.bubbles;
  renderer.autoplay = settings.autoplay;

  const musicEl = $('opt-music');
  const sfxEl = $('opt-sfx');
  const dasEl = $('opt-das');
  const botBeatEl = $('opt-bot');
  const refreshEl = $('opt-refresh');
  const guiScaleEl = $('opt-gui-scale');
  const ghostEl = $('opt-ghost');
  const gridEl = $('opt-grid');
  const bubblesEl = $('opt-bubbles');
  const stagesEl = $('opt-stages');
  const rowStageEl = $('row-stage');

  if (musicEl) musicEl.value = settings.music;
  if (sfxEl) sfxEl.value = settings.sfx;
  if (dasEl) dasEl.value = settings.das;
  if (botBeatEl) botBeatEl.value = settings.botBeat;
  if (refreshEl) refreshEl.value = settings.refreshRate;
  if (guiScaleEl) {
    guiScaleEl.min = String(guiMin);
    guiScaleEl.max = String(guiMax);
    guiScaleEl.value = settings.guiScale;
  }
  if (ghostEl) ghostEl.checked = settings.ghost;
  if (gridEl) gridEl.checked = settings.grid;
  if (bubblesEl) bubblesEl.checked = settings.bubbles;
  if (stagesEl) stagesEl.checked = settings.stages;
  if (rowStageEl) rowStageEl.hidden = !settings.stages;
  const controlsPanel = document.getElementById('controls-panel');
  const controlsToggle = document.getElementById('controls-toggle');
  if (controlsPanel) {
    controlsPanel.classList.toggle('is-collapsed', !settings.controlsVisible);
  }
  if (controlsToggle) {
    controlsToggle.setAttribute('aria-expanded', String(settings.controlsVisible));
  }
  const musicOut = $('out-music');
  const sfxOut = $('out-sfx');
  const dasOut = $('out-das');
  const botOut = $('out-bot');
  const refreshOut = $('out-refresh');
  const guiScaleOut = $('out-gui-scale');

  if (musicOut) musicOut.textContent = `${settings.music}%`;
  if (sfxOut) sfxOut.textContent = `${settings.sfx}%`;
  if (dasOut) dasOut.textContent = `${settings.das} ms`;
  if (botOut) botOut.textContent = `${settings.botBeat}/beat`;
  if (refreshOut) refreshOut.textContent = `${settings.refreshRate} Hz`;
  if (guiScaleOut) guiScaleOut.textContent = `${settings.guiScale}%`;
  const uiScale = compactMobile
    ? Math.min(1.6, Math.max(0.6, settings.guiScale / 100))
    : Math.min(1.7, Math.max(0.8, settings.guiScale / 100));
  document.documentElement.style.setProperty('--ui-scale', String(uiScale));
  const win = isElectronRuntime && electronApi && electronApi.remote ? electronApi.remote.getCurrentWindow() : null;
  if (win && typeof win.isFullScreen === 'function') {
    const shouldFull = Boolean(settings.fullscreen);
    if (win.isFullScreen() !== shouldFull) win.setFullScreen(shouldFull);
  }
  const soundBtn = $('btn-sound');
  const botBtn = $('btn-bot');

  if (soundBtn) soundBtn.setAttribute('aria-pressed', String(settings.musicOn));
  if (botBtn) botBtn.setAttribute('aria-pressed', String(settings.autoplay));

  const resultScreenVisible = !cards.over.hidden || !cards.beaten.hidden;
  setLeaderboardSubmitVisible(Boolean(resultScreenVisible) && !settings.autoplay && !game.autoplay && game.score > 0);

  audio.setTheme(settings.musicTheme, game.level, game.stageSpeed);
  applyLook();
  localStorage.setItem('tetris.settings', JSON.stringify(settings));
}

function getLeaderboardEntries() {
  try {
    const raw = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveLeaderboardEntries(entries) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event('leaderboard:updated'));

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(LEADERBOARD_CHANNEL);
    channel.postMessage({ type: 'leaderboard-update', entries });
    channel.close();
  }
}

function clearLeaderboard() {
  saveLeaderboardEntries([]);
}

function getDefaultPlayerName() {
  const savedName = localStorage.getItem(PLAYER_NAME_KEY);
  return savedName && String(savedName).trim() ? String(savedName).trim() : 'PLAYER';
}

function syncLeaderboardNameInput(targetId) {
  const input = targetId ? $(targetId) : null;
  if (!input) return;
  input.value = getDefaultPlayerName();
}

function submitScoreToLeaderboard() {
  if (!canSubmitLeaderboard({ autoplay: settings.autoplay || game.autoplay, score: game.score, gameState: game.state })) return;
  const playerName = (document.getElementById('leaderboard-name')?.value || document.getElementById('leaderboard-name-beaten')?.value || '').trim();
  const safeName = normalizePlayerName(playerName || getDefaultPlayerName());
  localStorage.setItem(PLAYER_NAME_KEY, safeName);

  const entries = getLeaderboardEntries();
  const scoreEntry = {
    name: safeName,
    score: Number(game.score) || 0,
    lines: Number(game.lines) || 0,
    level: Number(game.level) || 1,
    date: new Date().toISOString()
  };

  entries.push(scoreEntry);
  entries.sort((a, b) => (b.score - a.score) || (b.lines - a.lines));
  saveLeaderboardEntries(entries.slice(0, 10));

  const inputs = [
    document.getElementById('leaderboard-name'),
    document.getElementById('leaderboard-name-beaten')
  ].filter(Boolean);
  for (const input of inputs) input.value = safeName;
}

function setLeaderboardSubmitVisible(visible) {
  const submitGroup = document.getElementById('leaderboard-submit');
  const submitGroupBeaten = document.getElementById('leaderboard-submit-beaten');
  const isAutoMode = Boolean(settings.autoplay || game.autoplay);
  const allowSubmit = !isAutoMode && Boolean(visible) && canSubmitLeaderboard({
    autoplay: isAutoMode,
    score: game.score,
    gameState: game.state
  });

  const applyVisibility = (node) => {
    if (!node) return;
    node.hidden = !allowSubmit;
    node.style.display = allowSubmit ? '' : 'none';
    node.setAttribute('aria-hidden', String(!allowSubmit));
  };

  applyVisibility(submitGroup);
  applyVisibility(submitGroupBeaten);
}

function showScreen(name) {
  for (const key of Object.keys(cards)) cards[key].hidden = key !== name;
  overlay.hidden = !name;
  input.enabled = !name;

  if (name === 'over' || name === 'beaten') {
    setLeaderboardSubmitVisible(true);
  } else {
    setLeaderboardSubmitVisible(false);
  }
}

async function updateDiscordActivity() {
  if (!isElectronRuntime || !ipcRenderer) return;
  try {
    const activity = {
      details: `Score: ${game.score}`,
      state: `Level ${game.level} - Lines: ${game.lines}`,
      largeImageKey: 'fish_logo',
      largeImageText: 'FISH THAT STUFF',
      smallImageKey: 'fish_logo',
      smallImageText: 'Playing',
      instance: false
    };
    await ipcRenderer.invoke('set-discord-activity', activity);
  } catch (error) {
    console.warn('Failed to update Discord activity:', error);
  }
}

async function startGame() {
  await audio.unlock();
  fx.clear();
  bot.reset();
  attract = 0;
  clearLeaderboard();
  applyDifficultySettings();
  game.start();
  audio.setMuffled(false);
  audio.setTempo(game.level, game.stageSpeed);
  if (audio.musicOn && !audio.playing) await audio.startMusic(game.level);
  audio.play('start');
  syncLeaderboardNameInput('leaderboard-name');
  syncLeaderboardNameInput('leaderboard-name-beaten');
  setLeaderboardSubmitVisible(false);
  showScreen(null);
  updateDiscordActivity();
}

function toggleAutoplay(on) {
  const previous = settings.autoplay;
  settings.autoplay = on === undefined ? !settings.autoplay : on;
  game.autoplay = settings.autoplay;
  game.scoreEligibleForBest = !game.autoplay;
  bot.reset();
  attract = 0;
  setLeaderboardSubmitVisible(false);
  if (game.state === State.Over || game.state === State.Beaten) {
    showScreen(game.state === State.Over ? 'over' : 'beaten');
  }

  if (!settings.autoplay) {
    // Turning auto mode off always resets the board to a fresh game.
    // This prevents the player from leaving a bot-driven board state behind.
    audio.unlock();
    game.start();
    audio.setMuffled(false);
    audio.setTempo(game.level, game.stageSpeed);
    if (audio.musicOn && !audio.playing) audio.startMusic(game.level);
    audio.play('start');
    showScreen(null);
  } else if (previous && !settings.autoplay) {
    // kept for clarity; logic handled above
  }

  applySettings();
}

function togglePause() {
  if (game.state === State.Over || game.state === State.Ready) return;
  if (game.state === State.Paused) {
    game.pause(false);
    showScreen(null);
    audio.setMuffled(false);
    updateDiscordActivity();
  } else {
    game.pause(true);
    showScreen('paused');
    audio.setMuffled(true);
    // Update Discord activity to show paused
    if (isElectronRuntime && ipcRenderer) {
      ipcRenderer.invoke('set-discord-activity', {
        details: `Score: ${game.score}`,
        state: `Paused - Level ${game.level}`,
        largeImageKey: 'fish_logo',
        largeImageText: 'FISH THAT STUFF',
        smallImageKey: 'fish_logo',
        smallImageText: 'Paused',
        instance: false
      }).catch(error => console.warn('Failed to update Discord on pause:', error));
    }
  }

  const pauseBtn = $('btn-pause');
  if (pauseBtn) pauseBtn.setAttribute('aria-pressed', String(game.state === State.Paused));
}

// board pixel centre of a cell, used for spawning particles
function cellPos(x, y) {
  const c = renderer.cell;
  return { px: (x + 0.5) * c, py: (y - HIDDEN_ROWS + 0.5) * c };
}

game.on((type, data) => {
  switch (type) {
    case 'move':
      audio.play('move');
      break;
    case 'rotate':
      audio.play('rotate');
      break;
    case 'blocked':
      audio.play('blocked');
      break;
    case 'hold':
      audio.play('hold');
      break;
    case 'sound':
      audio.play(data.name, data);
      break;
    case 'popup':
      fx.popup(data.text, data.sub, data.tone);
      break;
    case 'harddrop': {
      audio.play('harddrop');
      fx.kick((1.5 + Math.min(4, data.dist * 0.35)) * 0.3);
      if (data.dist > 1) {
        const tops = new Map();
        for (const [cx, cy] of PIECES[data.key].cells[data.rot]) {
          const col = data.x + cx;
          if (!tops.has(col) || cy < tops.get(col)) tops.set(col, cy);
        }
        for (const [col, cy] of tops) fx.trail(col, data.fromY + cy, data.toY + cy, data.key);
      }
      break;
    }
    case 'cleared':
      onCleared(data);
      updateDiscordActivity();
      break;
    case 'beaten':
      onBeaten(data);
      break;
    case 'gameover':
      onGameOver();
      break;
    default:
      break;
  }
});

const FLAVOUR = {
  SINGLE: 'NIBBLE',
  DOUBLE: 'GOOD BITE',
  TRIPLE: 'BIG HAUL',
  TETRIS: 'FISH THAT STUFF'
};

function onCleared(data) {
  audio.play('clear', data);
  if (data.combo > 0) audio.play('combo', data);

  fx.kick((data.count >= 4 ? 13 : 3 + data.count * 2) * 0.3);
  fx.flash = data.count >= 4 ? 1 : 0.35;
  if (data.count >= 4) fx.glowBurst(1.4);

  for (const y of data.rows) {
    for (let x = 0; x < COLS; x++) {
      const key = game.grid[y][x];
      if (!key) continue;
      const { px, py } = cellPos(x, y);
      fx.burst(px, py, key, data.count >= 4 ? 6 : 4, data.count >= 4 ? 1.35 : 1);
    }
  }

  const bits = [];
  if (data.b2b) bits.push('back to back');
  if (data.combo > 0) bits.push(`${data.combo + 1} chain`);
  const tone = data.spin ? 'spin' : data.count >= 4 ? 'big' : 'normal';
  fx.popup(FLAVOUR[data.label] || data.label, bits.join('   '), tone);

  if (data.count >= 4) fx.school(18);

  if (data.perfect) {
    fx.popup('CLEAN CATCH', null, 'gold');
    fx.kick(16 * 0.3);
    audio.play('perfect');
  }

  if (data.levelled) {
    fx.popup(`LEVEL ${game.level}`, null, 'gold');
    audio.play('levelup');
  }

  if (data.staged) {
    const stage = STAGES[game.stage];
    fx.popup(stage.name, `stage ${game.stage + 1}`, 'big');
    fx.flash = Math.max(fx.flash, 0.6);
    fx.kick(9 * 0.3);
    audio.play('stage');
  }

  if (data.levelled || data.staged) audio.setTempo(game.level, game.stageSpeed);
}

function onBeaten() {
  if (settings.autoplay) {
    // In autoplay/AFK mode, record the run and restart immediately to keep learning
    bot.recordFailure(game.score, game.lines, game.level);
    // Quick restart: play sound and restart after brief delay
    audio.stopMusic();
    audio.play('levelup');
    fx.kick(20 * 0.3);
    setTimeout(() => {
      game.start();
      audio.setMuffled(false);
      audio.setTempo(game.level, game.stageSpeed);
      if (audio.musicOn) audio.startMusic(game.level);
    }, 800);
  } else {
    // Normal mode: show beaten screen
    audio.stopMusic();
    audio.play('levelup');
    fx.kick(20 * 0.3);
    $('beaten-score').textContent = game.score.toLocaleString();
    $('beaten-lines').textContent = game.lines;
    $('beaten-level').textContent = game.level;
    syncLeaderboardNameInput('leaderboard-name-beaten');
    setLeaderboardSubmitVisible(true);
    showScreen('beaten');
    
    // Update Discord activity with victory
    if (isElectronRuntime && ipcRenderer) {
      ipcRenderer.invoke('set-discord-activity', {
        details: `VICTORY! Final Score: ${game.score}`,
        state: `Beat the Game - Level 9999!`,
        largeImageKey: 'fish_logo',
        largeImageText: 'FISH THAT STUFF',
        smallImageKey: 'fish_logo',
        smallImageText: 'Victory!',
        instance: false
      }).catch(error => console.warn('Failed to update Discord on victory:', error));
    }
  }
}

function onGameOver() {
  // Record bot failure if in autoplay mode
  if (settings.autoplay) bot.recordFailure(game.score, game.lines, game.level);
  
  audio.stopMusic();
  audio.play('gameover');
  fx.kick(14 * 0.3);
  $('over-score').textContent = game.score.toLocaleString();
  $('over-lines').textContent = game.lines;
  $('over-level').textContent = game.level;
  const isBestRun = game.score > 0 && game.scoreEligibleForBest && game.score >= game.best;
  $('over-title').textContent = isBestRun ? 'New personal best' : 'One that got away';
  syncLeaderboardNameInput('leaderboard-name');
  setLeaderboardSubmitVisible(!settings.autoplay && game.score > 0);
  showScreen('over');
  
  // Update Discord activity with final score
  if (isElectronRuntime && ipcRenderer) {
    ipcRenderer.invoke('set-discord-activity', {
      details: `Final Score: ${game.score}`,
      state: `Game Over - Level ${game.level}`,
      largeImageKey: 'fish_logo',
      largeImageText: 'FISH THAT STUFF',
      smallImageKey: 'fish_logo',
      smallImageText: 'Game Over',
      instance: false
    }).catch(error => console.warn('Failed to update Discord on game over:', error));
  }
}

const hud = {
  score: $('ui-score'),
  best: $('ui-best'),
  level: $('ui-level'),
  lines: $('ui-lines'),
  progressFill: $('ui-level-progress-fill'),
  progressText: $('ui-level-progress-text'),
  time: $('ui-time'),
  stage: $('ui-stage'),
  b2b: $('ui-b2b'),
  combo: $('ui-combo')
};
const last = { score: -1, best: -1, level: -1, lines: -1, progressText: '', progressPct: -1, time: '', stage: -1, b2b: null, combo: -1 };

function bump(el) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function updateHud() {
  if (game.score !== last.score) {
    hud.score.textContent = game.score.toLocaleString();
    if (game.score > last.score && last.score >= 0) bump(hud.score);
    last.score = game.score;
  }
  if (game.best !== last.best) {
    hud.best.textContent = game.best.toLocaleString();
    last.best = game.best;
  }
  if (game.level !== last.level) {
    hud.level.textContent = game.level;
    if (last.level >= 0) bump(hud.level);
    last.level = game.level;
    
    // Update background colors based on level
    updateBackgroundForLevel(game.level);
    
    // Update background intensity based on level
    // At level 256+, gradually increase visual intensity
    let levelIntensity = 0;
    if (game.level >= 256) {
      levelIntensity = Math.min(1, (game.level - 256) / 100);
    }
    document.documentElement.style.setProperty('--level-intensity', levelIntensity);
  }
  if (game.lines !== last.lines) {
    hud.lines.textContent = game.lines;
    last.lines = game.lines;
  }

  const progressLines = game.level > 20 ? (game.lines - 200) % 10 : game.lines - ((game.level - 1) * 10);
  const progressPct = game.level > 20 ? Math.min(100, Math.max(0, ((progressLines % 10) / 10) * 100)) : Math.min(100, Math.max(0, (progressLines / 10) * 100));
  const progressText = game.level > 20 ? `${Math.min(10, Math.max(0, (progressLines % 10)))} / 10` : `${Math.min(10, Math.max(0, progressLines))} / 10`;
  if (Math.round(progressPct) !== last.progressPct || progressText !== last.progressText) {
    hud.progressFill.style.width = `${progressPct}%`;
    hud.progressText.textContent = progressText;
    last.progressPct = Math.round(progressPct);
    last.progressText = progressText;
  }

  const secs = Math.floor(game.time);
  const stamp = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  if (stamp !== last.time) {
    hud.time.textContent = stamp;
    last.time = stamp;
  }
  if (game.stage !== last.stage) {
    hud.stage.textContent = STAGES[game.stage].name;
    last.stage = game.stage;
  }
  if (game.b2b !== last.b2b) {
    hud.b2b.classList.toggle('on', game.b2b);
    last.b2b = game.b2b;
  }
  if (game.combo !== last.combo) {
    hud.combo.classList.toggle('on', game.combo > 0);
    if (game.combo > 0) hud.combo.textContent = `Combo \u00d7${game.combo + 1}`;
    last.combo = game.combo;
  }
  
  // Update multiplier badge
  updateMultiplierBadge();
}

function updateMultiplierBadge() {
  const multiplierEl = $('ui-multiplier');
  if (!multiplierEl) return;
  
  const mult = game.difficultyScoreMultiplier;
  if (mult > 1.0) {
    multiplierEl.textContent = `×${mult} Points`;
    multiplierEl.hidden = false;
  } else if (mult < 1.0) {
    multiplierEl.textContent = `×${mult} Points`;
    multiplierEl.hidden = false;
  } else {
    multiplierEl.hidden = true;
  }
}

input.handlers = {
  any: () => audio.unlock(),
  pause: () => {
    if (!cards.theme.hidden) showScreen(themeReturn);
    else togglePause();
  },
  restart: () => startGame(),
  bot: () => {
    audio.unlock();
    toggleAutoplay();
  },
  mute: () => {
    settings.musicOn = !settings.musicOn;
    applySettings();
  },
  confirm: () => {
    if (!cards.theme.hidden) showScreen(themeReturn);
    else if (game.state === State.Ready || game.state === State.Over) startGame();
    else if (game.state === State.Paused) togglePause();
  }
};
input.attach();
input.bindTouch($('touch'));
document.addEventListener('pointerdown', () => audio.unlock(), { once: true });
document.addEventListener('touchstart', () => audio.unlock(), { once: true });
window.addEventListener('keydown', () => audio.unlock(), { once: true });

overlay.addEventListener('click', (e) => {
  const cmd = e.target.closest('[data-cmd]');
  if (!cmd) return;
  e.stopPropagation();  // Prevent event from reaching other handlers
  audio.unlock();
  const action = cmd.dataset.cmd;
  if (action === 'start') startGame();
  else if (action === 'resume') togglePause();
  else if (action === 'restart') startGame();
  else if (action === 'customise') {
    themeReturn = cards.paused.hidden ? 'ready' : 'paused';
    showScreen('theme');
  } else if (action === 'back') showScreen(themeReturn);
});

// Close button handler for mobile / settings flows
overlay.addEventListener('click', (e) => {
  if (!e.target.closest('.card-close')) return;
  e.stopPropagation();  // Prevent event from reaching other handlers

  if (!cards.theme.hidden) {
    showScreen(themeReturn);
    return;
  }

  if (!cards.paused.hidden) {
    if (game.state === State.Paused) {
      togglePause();
    } else {
      showScreen(null);
    }
    return;
  }

  showScreen(null);
});

// option pickers are built from the data so the markup stays short
function buildPicker(rowId, entries, onPick, render) {
  const row = $(rowId);
  row.innerHTML = '';
  for (const [value, label] of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = value;
    b.setAttribute('aria-pressed', 'false');
    if (render) render(b, value, label);
    else {
      b.className = 'opt';
      b.textContent = label;
    }
    b.addEventListener('click', () => {
      audio.unlock();
      onPick(value);
    });
    row.appendChild(b);
  }
}

buildPicker(
  'pick-music',
  Object.entries(MUSIC_THEMES).map(([k, t]) => [k, t.name]),
  (value) => {
    settings.musicTheme = value;
    applySettings();
    audio.play('hold');
  }
);

buildPicker(
  'pick-colour',
  Object.entries(UI_THEMES).map(([k, t]) => [k, t.name]),
  (value) => {
    settings.uiTheme = value;
    applySettings();
  },
  (b, value, label) => {
    b.className = 'opt swatch';
    b.title = label;
    b.setAttribute('aria-label', label);
    const s = UI_THEMES[value].stops;
    b.style.background = `linear-gradient(135deg, ${s[0]}, ${s[1]} 45%, ${s[2]})`;
  }
);

buildPicker(
  'pick-bg',
  Object.entries(BG_PRESETS),
  (value) => {
    if (value === 'custom' && !bgData) {
      $('bg-file').click();
      return;
    }
    settings.bgPreset = value;
    applySettings();
  }
);

buildPicker(
  'pick-theme',
  Object.entries(COLOR_THEMES).map(([k]) => [k, k.charAt(0).toUpperCase() + k.slice(1)]),
  (value) => {
    settings.pieceTheme = value;
    applySettings();
    audio.play('hold');
  }
);

$('bg-file').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    bgData = await readImageFile(file);
    localStorage.setItem('tetris.bg', bgData);
    backdrop.src = bgData;
    settings.bgPreset = 'custom';
    applySettings();
  } catch (err) {
    // quota failures still leave the image usable for this session
    if (bgData) {
      backdrop.src = bgData;
      settings.bgPreset = 'custom';
      applySettings();
      $('bg-note').textContent = 'Image loaded but too big to remember after a reload.';
    } else {
      $('bg-note').textContent = String(err.message || err);
    }
  }
});

$('btn-bg-upload').addEventListener('click', () => $('bg-file').click());

$('btn-bg-clear').addEventListener('click', () => {
  bgData = '';
  localStorage.removeItem('tetris.bg');
  backdrop.removeAttribute('src');
  renderer.backdrop = null;
  if (settings.bgPreset === 'custom') settings.bgPreset = 'none';
  applySettings();
});

const bgWellInput = $('opt-bgwell');
if (bgWellInput) {
  bgWellInput.addEventListener('change', (e) => {
    settings.bgWell = e.target.checked;
    applySettings();
  });
}

const colourInput = $('opt-colour');
if (colourInput) {
  colourInput.addEventListener('input', (e) => {
    settings.uiCustom = e.target.value;
    settings.uiTheme = 'custom';
    applySettings();
  });
}

const controlsToggle = $('controls-toggle');
if (controlsToggle) {
  controlsToggle.addEventListener('click', () => {
    settings.controlsVisible = !settings.controlsVisible;
    applySettings();
  });
}

const difficultyToggle = $('difficulty-toggle');
if (difficultyToggle) {
  const difficultyPanel = document.getElementById('difficulty-panel');
  const difficultyButtons = document.getElementById('difficulty-buttons');
  const setDifficultyPanelState = (collapsed) => {
    if (!difficultyPanel) return;
    difficultyPanel.classList.toggle('is-collapsed', collapsed);
    if (difficultyToggle) difficultyToggle.setAttribute('aria-expanded', String(!collapsed));
    if (difficultyButtons) difficultyButtons.hidden = collapsed;
  };
  setDifficultyPanelState(true);
  difficultyToggle.addEventListener('click', () => {
    const collapsed = !difficultyPanel || difficultyPanel.classList.contains('is-collapsed');
    setDifficultyPanelState(!collapsed);
  });
}

const soundBtn = $('btn-sound');
if (soundBtn) {
  soundBtn.addEventListener('click', () => {
    audio.unlock();
    settings.musicOn = !settings.musicOn;
    applySettings();
  });
}

const settingsBtn = $('btn-settings');
if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    audio.unlock();
    if (game.state === State.Playing) {
      themeReturn = 'paused';
      game.pause(true);
      showScreen('paused');
      audio.setMuffled(true);
    } else if (game.state === State.Paused) {
      themeReturn = 'paused';
      showScreen('paused');
    } else {
      themeReturn = 'ready';
      showScreen('paused');
    }
  });
}

const leaderboardBtn = $('btn-leaderboard');
if (leaderboardBtn) {
  leaderboardBtn.addEventListener('click', () => {
    audio.unlock();
    const leaderboardUrl = new URL('./leaderboard-demo.html', window.location.href).toString();
    window.open(leaderboardUrl, '_blank', 'noopener,noreferrer');
  });
}

const botBtn = $('btn-bot');
if (botBtn) {
  botBtn.addEventListener('click', () => {
    audio.unlock();
    toggleAutoplay();
  });
}

const scoreSubmitBtn = $('btn-submit-score');
if (scoreSubmitBtn) {
  scoreSubmitBtn.addEventListener('click', async () => {
    submitScoreToLeaderboard();
    setLeaderboardSubmitVisible(false);
    showScreen(null);
    await startGame();
  });
}

const scoreSubmitBtnBeaten = $('btn-submit-score-beaten');
if (scoreSubmitBtnBeaten) {
  scoreSubmitBtnBeaten.addEventListener('click', async () => {
    submitScoreToLeaderboard();
    setLeaderboardSubmitVisible(false);
    showScreen(null);
    await startGame();
  });
}

// Difficulty selector buttons
['easy', 'normal', 'hard', 'extreme'].forEach((diff) => {
  const btn = $(`btn-diff-${diff}`);
  if (btn) {
    btn.addEventListener('click', () => {
      audio.unlock();
      settings.difficulty = diff;
      game.difficulty = diff;
      applySettings();
      // Update all difficulty buttons
      ['easy', 'normal', 'hard', 'extreme'].forEach((d) => {
        const b = $(`btn-diff-${d}`);
        if (b) b.setAttribute('aria-pressed', String(d === diff));
      });
      audio.play('hold');
      updateMultiplierBadge();
      // Restart game if one is in progress
      if (game.state !== State.Ready && game.state !== State.Over) {
        startGame();
      }
    });
  }
});


const bindRange = (id, key) => {
  $(id).addEventListener('input', (e) => {
    settings[key] = Number(e.target.value);
    applySettings();
  });
};
bindRange('opt-music', 'music');
bindRange('opt-sfx', 'sfx');
bindRange('opt-das', 'das');
bindRange('opt-bot', 'botBeat');
bindRange('opt-refresh', 'refreshRate');
bindRange('opt-gui-scale', 'guiScale');

$('opt-ghost').addEventListener('change', (e) => {
  settings.ghost = e.target.checked;
  applySettings();
});
$('opt-grid').addEventListener('change', (e) => {
  settings.grid = e.target.checked;
  applySettings();
});
$('opt-bubbles').addEventListener('change', (e) => {
  settings.bubbles = e.target.checked;
  applySettings();
});
$('opt-stages').addEventListener('change', (e) => {
  settings.stages = e.target.checked;
  applySettings();
  audio.setTempo(game.level, game.stageSpeed);
});

$('opt-fullscreen').addEventListener('change', (e) => {
  settings.fullscreen = e.target.checked;
  applySettings();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === State.Playing) togglePause();
});

window.addEventListener('resize', () => renderer.resize());
window.addEventListener('orientationchange', () => setTimeout(() => renderer.resize(), 120));
new ResizeObserver(() => renderer.resize()).observe(document.querySelector('.board-wrap'));

applySettings();
renderer.resize();
showScreen('ready');

if (document.fonts) {
  document.fonts.load('24px FantasyPixel').then(() => renderer.resize());
}

const root = document.documentElement;

let prev = performance.now();
let frameAccumulator = 0;
let lastFrameAt = 0;
let discordUpdateTimer = 0;

function frame(now) {
  const targetFrameMs = 1000 / settings.refreshRate;
  if (lastFrameAt && now - lastFrameAt < targetFrameMs) {
    requestAnimationFrame(frame);
    return;
  }
  lastFrameAt = now;

  const dt = Math.min(0.05, (now - prev) / 1000);
  prev = now;
  frameAccumulator += dt;

  audio.poll(dt);
  root.style.setProperty('--beat', audio.pulse.toFixed(3));
  root.style.setProperty('--flash', (Math.min(1, fx.flash * 1.6)).toFixed(3));
  root.style.setProperty('--pulse', (Math.max(audio.pulse, fx.flash)).toFixed(3));

  if (settings.autoplay) {
    if (game.state === State.Playing) bot.update(dt, game, audio);
    else if (game.state === State.Ready || game.state === State.Over) {
      attract += dt;
      if (attract > 2.2) startGame();
    }
  }

  input.update(dt);
  game.update(dt);
  fx.update(dt);
  renderer.draw(game, fx, dt);
  renderer.drawSide(game);
  updateHud();
  
  // Update Discord activity every second during gameplay
  if (game.state === State.Playing) {
    discordUpdateTimer += dt;
    if (discordUpdateTimer >= 1) {
      discordUpdateTimer = 0;
      updateDiscordActivity();
    }
  }
  
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
