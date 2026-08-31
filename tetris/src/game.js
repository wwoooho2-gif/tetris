/**
 * Core Tetris game engine
 * Handles game state, piece movement, collision detection, scoring, and level progression
 * Implements Standard Rotation System (SRS) with T-spin detection
 */

import { COLS, ROWS, HIDDEN_ROWS, PIECES, kicks, shuffledBag } from './pieces.js';
import { STAGES, stageFor } from './stages.js';

// ============================================================
// Game states
// ============================================================

export const State = {
  Ready: 'ready',       // Waiting to start or after game over
  Playing: 'playing',   // Active gameplay
  Clearing: 'clearing', // Rows are being cleared
  Entry: 'entry',       // Piece entering play area
  Paused: 'paused',     // Game paused
  Over: 'over'          // Game over state
};

// ============================================================
// Game constants and tuning
// ============================================================

const LOCK_DELAY = 0.5;      // Seconds before locked piece lands
const MAX_LOCK_RESETS = 15;  // Max times lock delay can reset
const SOFT_INTERVAL = 1 / 35; // Gravity acceleration interval
const CLEAR_TIME = 0.3;      // Seconds to display clearing animation
const ENTRY_DELAY = 0.08;    // Seconds for piece entry animation
const MAX_LEVEL = 256;       // Maximum game level

const CLEAR_NAME = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'];

// ============================================================
// Main game class
// ============================================================

/**
 * Main Tetris game engine
 * Manages game state, piece logic, collision, scoring, and events
 */
export class Game {
  constructor() {
    this.listeners = [];    // Event subscribers for game events
    this.best = Number(localStorage.getItem('tetris.best') || 0); // Best score ever
    this.autoplay = false;  // Ignore best-score persistence while auto-play is active
    this.stagesOn = true;
    this.difficulty = 'normal';  // Game difficulty for piece selection
    this.difficultySpeedMultiplier = 3.5;  // Speed multiplier based on difficulty
    this.difficultyScoreMultiplier = 1.0;  // Score multiplier based on difficulty
    this.reset();
  }

  /**
   * Subscribe to game events (move, rotate, clear, gameover, etc.)
   */
  on(fn) {
    this.listeners.push(fn);
  }

  /**
   * Emit a game event to all subscribers
   * Suppresses move/rotate/blocked sounds during rapid input
   */
  emit(type, data) {
    if (this.quiet && (type === 'move' || type === 'rotate' || type === 'blocked')) return;
    for (const fn of this.listeners) fn(type, data || {});
  }

  /**
   * Reset game to starting state
   * Called when starting a new game or after game over
   */
  reset() {
    this.grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    this.bag = [];
    this.queue = [];
    for (let i = 0; i < 5; i++) this.queue.push(this.pullBag());
    this.hold = null;
    this.canHold = true;
    this.active = null;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.stage = 0;
    this.combo = -1;
    this.b2b = false;
    this.time = 0;
    this.placed = 0;
    this.pieceSerial = 0;
    this.softDropping = false;
    this.gravityAcc = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.lowestY = -Infinity;
    this.clearRows = null;
    this.clearT = 0;
    this.entryT = 0;
    this.state = State.Ready;
  }

  pullBag() {
    if (this.bag.length === 0) this.bag = shuffledBag(this.difficulty === 'hard');
    return this.bag.pop();
  }

  start() {
    this.reset();
    this.state = State.Playing;
    this.spawn();
    this.emit('start');
  }

  spawn(forcedKey) {
    let key = forcedKey;
    if (!key) {
      key = this.queue.shift();
      this.queue.push(this.pullBag());
    }
    const p = PIECES[key];
    this.active = { key, rot: 0, x: p.spawnX, y: p.spawnY, lastKick: 0, spun: false };
    this.pieceSerial++;
    this.canHold = true;
    this.gravityAcc = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.lowestY = this.active.y;
    if (this.collides(this.active.x, this.active.y, 0)) {
      this.gameOver();
      return;
    }
    this.emit('spawn', { key });
  }

  collides(x, y, rot, key = this.active.key) {
    const cells = PIECES[key].cells[rot];
    for (let i = 0; i < cells.length; i++) {
      const bx = x + cells[i][0];
      const by = y + cells[i][1];
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && this.grid[by][bx]) return true;
    }
    return false;
  }

  grounded() {
    const a = this.active;
    return !a || this.collides(a.x, a.y + 1, a.rot);
  }

  gravityInterval() {
    const l = Math.min(this.level, MAX_LEVEL);
    const levelRamp = 1 / (1 + (l - 1) * 0.085);
    const base = Math.pow(0.86 - (l - 1) * 0.006, Math.max(1, l - 1));
    return Math.max(0.006, (base * levelRamp / this.stageSpeed) / this.difficultySpeedMultiplier);
  }

  get stageSpeed() {
    return this.stagesOn ? STAGES[this.stage].speed : 1;
  }

  setStages(on) {
    this.stagesOn = on;
    this.stage = on ? stageFor(this.lines) : 0;
  }

  // lock delay refreshes on every action, but only 15 times per resting height
  touch() {
    const a = this.active;
    if (a.y > this.lowestY) {
      this.lowestY = a.y;
      this.lockResets = 0;
      this.lockTimer = 0;
    } else if (this.grounded() && this.lockResets < MAX_LOCK_RESETS) {
      this.lockResets++;
      this.lockTimer = 0;
    }
  }

  move(dx, dy) {
    if (this.state !== State.Playing || !this.active) return false;
    const a = this.active;
    if (this.collides(a.x + dx, a.y + dy, a.rot)) return false;
    a.x += dx;
    a.y += dy;
    a.spun = false;
    this.touch();
    if (dx !== 0) this.emit('move');
    return true;
  }

  rotate(dir) {
    if (this.state !== State.Playing || !this.active) return false;
    const a = this.active;
    const from = a.rot;
    const to = (from + (dir === 2 ? 2 : dir) + 4) % 4;
    if (to === from) return false;
    const list = kicks(a.key, from, to);
    for (let i = 0; i < list.length; i++) {
      const [kx, ky] = list[i];
      if (!this.collides(a.x + kx, a.y + ky, to)) {
        a.x += kx;
        a.y += ky;
        a.rot = to;
        a.lastKick = i;
        a.spun = true;
        this.touch();
        this.emit('rotate');
        return true;
      }
    }
    this.emit('blocked');
    return false;
  }

  ghostY() {
    const a = this.active;
    if (!a) return 0;
    let y = a.y;
    while (!this.collides(a.x, y + 1, a.rot)) y++;
    return y;
  }

  hardDrop() {
    if (this.state !== State.Playing || !this.active) return;
    const a = this.active;
    const from = a.y;
    a.y = this.ghostY();
    const dist = a.y - from;
    if (dist > 0) {
      a.spun = false;
      this.score += Math.floor(dist * 2 * this.difficultyScoreMultiplier);
    }
    this.emit('harddrop', { dist, key: a.key, rot: a.rot, x: a.x, fromY: from, toY: a.y });
    this.lock();
  }

  holdPiece() {
    if (this.state !== State.Playing || !this.active || !this.canHold) {
      if (this.active && !this.canHold) this.emit('blocked');
      return;
    }
    const current = this.active.key;
    const swap = this.hold;
    this.hold = current;
    this.spawn(swap || undefined);
    this.canHold = false;
    this.emit('hold');
  }

  // 3 corner rule, plus the kick-5 exception that promotes a mini to a full spin
  detectSpin() {
    const a = this.active;
    if (!a.spun || a.key !== 'T') return null;
    const cx = a.x + 1;
    const cy = a.y + 1;
    const corner = (dx, dy) => {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y < 0) return false;
      return !!this.grid[y][x];
    };
    const tl = corner(-1, -1);
    const tr = corner(1, -1);
    const bl = corner(-1, 1);
    const br = corner(1, 1);
    const filled = tl + tr + bl + br;
    if (filled < 3) return null;
    const fronts = [[tl, tr], [tr, br], [br, bl], [bl, tl]][a.rot];
    const full = (fronts[0] && fronts[1]) || a.lastKick === 4;
    return full ? 'tspin' : 'mini';
  }

  lock() {
    const a = this.active;
    const cells = PIECES[a.key].cells[a.rot];
    let highest = ROWS;
    for (const [cx, cy] of cells) {
      const by = a.y + cy;
      if (by >= 0) {
        this.grid[by][a.x + cx] = a.key;
        if (by < highest) highest = by;
      }
    }
    const spin = this.detectSpin();
    this.placed++;

    const rows = [];
    for (let y = 0; y < ROWS; y++) {
      if (this.grid[y].every((c) => c !== null)) rows.push(y);
    }

    this.active = null;

    if (rows.length === 0) {
      if (spin) {
        this.score += Math.floor((spin === 'mini' ? 100 : 400) * this.level * this.difficultyScoreMultiplier);
        this.emit('popup', { text: spin === 'mini' ? 'T-SPIN MINI' : 'T-SPIN', tone: 'spin' });
        this.emit('sound', { name: 'tspin' });
      } else {
        this.emit('sound', { name: 'lock' });
      }
      this.combo = -1;
      this.state = State.Entry;
      this.entryT = ENTRY_DELAY;
      return;
    }

    this.scoreClear(rows, spin);
    this.clearRows = rows;
    this.clearT = 0;
    this.state = State.Clearing;
  }

  scoreClear(rows, spin) {
    const n = rows.length;
    const lvl = this.level;
    let points = 0;
    let label = '';
    if (spin === 'tspin') {
      points = [0, 800, 1200, 1600][n] || 0;
      label = `T-SPIN ${CLEAR_NAME[n]}`;
    } else if (spin === 'mini') {
      points = [0, 200, 400, 0][n] || 0;
      label = `T-SPIN MINI ${CLEAR_NAME[n]}`;
    } else {
      points = [0, 100, 300, 500, 800][n];
      label = CLEAR_NAME[n];
    }

    const difficult = !!spin || n === 4;
    const chained = difficult && this.b2b;
    if (chained) points = Math.floor(points * 1.5);
    this.b2b = difficult;

    this.combo++;
    if (this.combo > 0) points += 50 * this.combo * lvl;

    this.score += Math.floor(points * lvl * this.difficultyScoreMultiplier);
    this.lines += n;

    const perfect = this.grid.every((row, y) => rows.includes(y) || row.every((c) => c === null));
    if (perfect) {
      this.score += Math.floor(([0, 800, 1200, 1800, 2000][n] || 0) * lvl * this.difficultyScoreMultiplier);
    }

    const nextLevel = Math.min(MAX_LEVEL, Math.floor(this.lines / 10) + 1);
    const levelled = nextLevel > this.level;
    this.level = nextLevel;

    const nextStage = this.stagesOn ? stageFor(this.lines) : 0;
    const staged = nextStage > this.stage;
    this.stage = nextStage;

    this.emit('cleared', {
      rows,
      count: n,
      label,
      spin,
      b2b: chained,
      combo: this.combo,
      perfect,
      levelled,
      staged,
      points
    });
  }

  gameOver() {
    this.state = State.Over;
    this.active = null;
    if (!this.autoplay && this.score > this.best) {
      this.best = this.score;
      localStorage.setItem('tetris.best', String(this.best));
    }
    this.emit('gameover');
  }

  pause(on) {
    if (on && (this.state === State.Playing || this.state === State.Entry || this.state === State.Clearing)) {
      this.resumeState = this.state;
      this.state = State.Paused;
      this.emit('pause');
    } else if (!on && this.state === State.Paused) {
      this.state = this.resumeState || State.Playing;
      this.emit('resume');
    }
  }

  collapse() {
    for (const y of this.clearRows) {
      this.grid.splice(y, 1);
      this.grid.unshift(new Array(COLS).fill(null));
    }
    this.clearRows = null;
  }

  update(dt) {
    if (this.state === State.Playing) {
      this.time += dt;
      const base = this.gravityInterval();
      const step = this.softDropping ? Math.min(base, SOFT_INTERVAL) : base;
      this.gravityAcc += dt;
      const maxSteps = this.softDropping ? 1 : 32;
      let guard = 0;
      while (this.gravityAcc >= step && guard++ < maxSteps) {
        this.gravityAcc -= step;
        if (this.collides(this.active.x, this.active.y + 1, this.active.rot)) {
          this.gravityAcc = 0;
          break;
        }
        this.active.y++;
        this.active.spun = false;
        if (this.softDropping) this.score += Math.floor(this.difficultyScoreMultiplier);
        this.touch();
      }
      if (this.grounded()) {
        this.lockTimer += dt;
        if (this.lockTimer >= LOCK_DELAY) this.lock();
      } else {
        this.lockTimer = 0;
      }
    } else if (this.state === State.Clearing) {
      this.time += dt;
      this.clearT += dt;
      if (this.clearT >= CLEAR_TIME) {
        this.collapse();
        this.state = State.Entry;
        this.entryT = ENTRY_DELAY;
      }
    } else if (this.state === State.Entry) {
      this.time += dt;
      this.entryT -= dt;
      if (this.entryT <= 0) {
        this.state = State.Playing;
        this.spawn();
      }
    }
  }

  get clearProgress() {
    return this.clearRows ? Math.min(1, this.clearT / CLEAR_TIME) : 0;
  }

  // how close the stack is to the ceiling, 0 to 1
  get danger() {
    for (let y = 0; y < ROWS; y++) {
      if (this.grid[y].some((c) => c !== null)) {
        return Math.max(0, 1 - (y - HIDDEN_ROWS) / 6);
      }
    }
    return 0;
  }
}
