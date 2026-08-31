import { COLS, ROWS, PIECES } from './pieces.js';

const FULL = (1 << COLS) - 1;

// each rotation becomes a list of row bitmasks so the search can drop pieces with shifts
const SHAPES = {};
for (const key of Object.keys(PIECES)) {
  const seen = new Set();
  const list = [];
  PIECES[key].cells.forEach((cells, rot) => {
    const byRow = new Map();
    let minDx = 99;
    let maxDx = -99;
    for (const [dx, dy] of cells) {
      byRow.set(dy, (byRow.get(dy) || 0) | (1 << dx));
      if (dx < minDx) minDx = dx;
      if (dx > maxDx) maxDx = dx;
    }
    const rows = [...byRow.entries()].map(([dy, mask]) => ({ dy, mask })).sort((a, b) => a.dy - b.dy);
    const sig = rows.map((r) => `${r.dy}:${r.mask}`).join(',');
    if (seen.has(sig)) return;
    seen.add(sig);
    list.push({ rot, rows, minDx, maxDx });
  });
  SHAPES[key] = list;
}

const W = {
  landing: -4.500158825082766,
  cleared: 3.4181268101392694,
  rowTrans: -3.2178882868487753,
  colTrans: -9.348695305445199,
  holes: -7.899265427351652,
  wells: -3.3855972247263626
};

// x can be negative when a rotated piece hangs off its origin, and js wraps a negative shift
const shift = (mask, x) => (x >= 0 ? mask << x : mask >>> -x);

function hits(rows, shape, x, y) {
  for (const r of shape.rows) {
    const ry = y + r.dy;
    if (ry < 0) continue;
    if (ry >= ROWS) return true;
    if (rows[ry] & shift(r.mask, x)) return true;
  }
  return false;
}

function evaluate(rows) {
  let holes = 0;
  let colTrans = 0;
  let wells = 0;
  let rowTrans = 0;

  for (let y = 0; y < ROWS; y++) {
    const m = rows[y];
    let prev = 1;
    for (let x = 0; x < COLS; x++) {
      const cur = (m >> x) & 1;
      if (cur !== prev) rowTrans++;
      prev = cur;
    }
    if (prev !== 1) rowTrans++;
  }

  for (let x = 0; x < COLS; x++) {
    const bit = 1 << x;
    let prev = 0;
    let filledAbove = false;
    let wellDepth = 0;
    for (let y = 0; y < ROWS; y++) {
      const cur = rows[y] & bit ? 1 : 0;
      if (cur !== prev) colTrans++;
      prev = cur;
      if (cur) filledAbove = true;
      else if (filledAbove) holes++;

      if (!cur) {
        const left = x === 0 || rows[y] & (bit >> 1);
        const right = x === COLS - 1 || rows[y] & (bit << 1);
        if (left && right) {
          wellDepth++;
          wells += wellDepth;
        } else wellDepth = 0;
      } else wellDepth = 0;
    }
    if (prev !== 1) colTrans++;
  }

  return { holes, colTrans, wells, rowTrans };
}

function scorePlacement(rows, shape, x, y, learningBias = 0) {
  const out = rows.slice();
  for (const r of shape.rows) {
    const ry = y + r.dy;
    if (ry < 0) return null;
    out[ry] |= shift(r.mask, x);
  }

  let cleared = 0;
  const kept = [];
  for (let i = 0; i < ROWS; i++) {
    if (out[i] === FULL) cleared++;
    else kept.push(out[i]);
  }
  while (kept.length < ROWS) kept.unshift(0);

  const f = evaluate(kept);
  
  // Calculate column heights
  const heights = [];
  for (let col = 0; col < COLS; col++) {
    let height = 0;
    for (let row = ROWS - 1; row >= 0; row--) {
      if ((kept[row] >> col) & 1) {
        height = row + 1;
        break;
      }
    }
    heights.push(height);
  }
  
  const maxHeight = Math.max(...heights);
  const minHeight = Math.min(...heights);
  const avgHeight = heights.reduce((a, b) => a + b, 0) / COLS;
  
  // Primary goal: Clear lines (worth 1000 points each)
  const lineClearBonus = cleared * 1000;
  
  // Secondary: Keep board low (penalize high stacks)
  const heightPenalty = maxHeight * maxHeight * 15;
  
  // Tertiary: Keep columns balanced (penalize lopsided boards)
  const imbalancePenalty = (maxHeight - minHeight) * (maxHeight - minHeight) * 50;
  
  // Prevent holes which block future clears
  const holePenalty = f.holes * f.holes * 20;
  
  // Penalize gaps and unevenness
  const gapPenalty = f.colTrans * 10 + f.rowTrans * 8;
  
  // Penalize wells (hard to fill)
  const wellPenalty = f.wells * 3;
  
  // Apply learning from past mistakes
  const learningBonus = learningBias * 10;
  
  const score = lineClearBonus - heightPenalty - imbalancePenalty - holePenalty - gapPenalty - wellPenalty + learningBonus;
  
  return score;
}

// the executor rotates at spawn then slides across, so only offer placements that survive that path
function reachable(rows, shape, sx, sy, x) {
  if (hits(rows, shape, sx, sy)) return false;
  const dir = Math.sign(x - sx);
  for (let cx = sx; cx !== x; cx += dir) {
    if (hits(rows, shape, cx + dir, sy)) return false;
  }
  return true;
}

function bestFor(rows, key, learningBias = 0) {
  const spawn = PIECES[key];
  let best = null;
  let fallback = null;
  for (const shape of SHAPES[key]) {
    for (let x = -shape.minDx; x <= COLS - 1 - shape.maxDx; x++) {
      if (hits(rows, shape, x, 0)) continue;
      let y = 0;
      while (!hits(rows, shape, x, y + 1)) y++;
      const score = scorePlacement(rows, shape, x, y, learningBias);
      if (score === null) continue;
      const move = { score, rot: shape.rot, x, y };
      if (!fallback || score > fallback.score) fallback = move;
      if (!reachable(rows, shape, spawn.spawnX, spawn.spawnY, x)) continue;
      if (!best || score > best.score) best = move;
    }
  }
  return best || fallback;
}

export function planMove(game, learningBias = 0) {
  const rows = new Array(ROWS);
  for (let y = 0; y < ROWS; y++) {
    let m = 0;
    for (let x = 0; x < COLS; x++) if (game.grid[y][x]) m |= 1 << x;
    rows[y] = m;
  }

  const direct = bestFor(rows, game.active.key, learningBias);
  if (game.canHold) {
    const swapKey = game.hold || game.queue[0];
    const swapped = bestFor(rows, swapKey, learningBias);
    if (swapped && (!direct || swapped.score > direct.score + 0.5)) {
      return { ...swapped, useHold: true };
    }
  }
  return direct ? { ...direct, useHold: false } : null;
}

export class Bot {
  constructor() {
    this.perBeat = 1;
    this.plan = null;
    this.serial = -1;
    this.timer = 0;
    this.aligned = false;
    this.tries = 0;
    this.failureBias = 0;
    this.failures = 0;
    this.skill = 0;
    this.lastScore = 0;
    this.lastLines = 0;
    this.learningBoost = 0;
    this.memory = new Map();           // Board states to avoid
    this.successMemory = new Map();   // Board states that worked well
    this.memoryCursor = 0;
    this.gameStates = [];             // Track positions during current game
    this.bestScore = 0;
    this.successRate = 0.5;           // Tracks how many games are successful
    this.gamesPlayed = 0;
    this.loadMemory();
    this.loadSkillData();
  }

  loadMemory() {
    try {
      const saved = localStorage.getItem('tetris.bot.memory');
      if (saved) {
        const entries = JSON.parse(saved);
        for (const [key, value] of entries) {
          this.memory.set(key, value);
        }
      }
      
      const successSaved = localStorage.getItem('tetris.bot.success');
      if (successSaved) {
        const entries = JSON.parse(successSaved);
        for (const [key, value] of entries) {
          this.successMemory.set(key, value);
        }
      }
    } catch (e) {
      // localStorage not available or corrupted
    }
  }

  loadSkillData() {
    try {
      const data = JSON.parse(localStorage.getItem('tetris.bot.skill') || '{}');
      this.skill = data.skill || 0;
      this.learningBoost = data.learningBoost || 0;
      this.bestScore = data.bestScore || 0;
      this.successRate = data.successRate || 0.5;
      this.gamesPlayed = data.gamesPlayed || 0;
    } catch (e) {
      // defaults are already set
    }
  }

  saveMemory() {
    try {
      const entries = Array.from(this.memory.entries());
      localStorage.setItem('tetris.bot.memory', JSON.stringify(entries));
      
      const successEntries = Array.from(this.successMemory.entries());
      localStorage.setItem('tetris.bot.success', JSON.stringify(successEntries));
    } catch (e) {
      // localStorage not available
    }
  }

  saveSkillData() {
    try {
      const data = {
        skill: this.skill,
        learningBoost: this.learningBoost,
        bestScore: this.bestScore,
        successRate: this.successRate,
        gamesPlayed: this.gamesPlayed
      };
      localStorage.setItem('tetris.bot.skill', JSON.stringify(data));
    } catch (e) {
      // localStorage not available
    }
  }

  reset() {
    this.plan = null;
    this.serial = -1;
    this.aligned = false;
    this.tries = 0;
    this.timer = 0;
    this.lastScore = 0;
    this.lastLines = 0;
    this.gameStates = [];  // Reset game state tracking
    this.perBeat = Math.max(0.05, 1.0 - (this.skill + this.learningBoost * 2.2) * 0.11);
  }

  boardSignature(grid) {
    let sig = '';
    for (let y = 0; y < ROWS; y++) {
      let row = 0;
      for (let x = 0; x < COLS; x++) row = (row << 1) | (grid[y][x] ? 1 : 0);
      sig += `${row}|`;
    }
    return sig;
  }

  rememberMistake(game, move = null) {
    if (!game || !game.active) return;
    const sig = `${game.active.key}:${this.boardSignature(game.grid)}:${move ? `${move.rot}:${move.x}:${move.y}` : 'fallback'}`;
    const prev = this.memory.get(sig) || 0;
    const next = Math.min(50, prev + 5);  // More aggressive learning (was 28, 2.8)
    this.memory.set(sig, next);
    
    // Track game state for later analysis
    this.gameStates.push({ sig, score: game.score, lines: game.lines });
    
    if (this.memory.size > 3000) {  // Increase memory size (was 2000)
      // Remove least-learned patterns (lowest values)
      let minKey = null;
      let minVal = Infinity;
      for (const [key, val] of this.memory.entries()) {
        if (val < minVal) {
          minVal = val;
          minKey = key;
        }
      }
      if (minKey) this.memory.delete(minKey);
    }
    
    this.memoryCursor = (this.memoryCursor + 1) % 50;  // Save more often (was 100)
    if (this.memoryCursor === 0) {
      this.saveMemory();
    }
  }

  rememberSuccess(game, move) {
    if (!game || !game.active) return;
    const sig = `${game.active.key}:${this.boardSignature(game.grid)}:${move ? `${move.rot}:${move.x}:${move.y}` : 'fallback'}`;
    const prev = this.successMemory.get(sig) || 0;
    const next = Math.min(30, prev + 1);
    this.successMemory.set(sig, next);
  }

  patternBias(game) {
    if (!game || !game.active) return 0;
    const sig = `${game.active.key}:${this.boardSignature(game.grid)}:${game.active.x}:${game.active.rot}`;
    
    // Strong penalty for bad patterns (learned mistakes)
    const badValue = this.memory.get(sig) || 0;
    const badBias = -Math.min(30, badValue * 5);  // Stronger penalty (was 12, 3.2)
    
    // Bonus for good patterns (successful moves)
    const goodValue = this.successMemory.get(sig) || 0;
    const goodBonus = Math.min(20, goodValue * 2);
    
    return badBias + goodBonus;
  }

  recordFailure(score = 0, lines = 0) {
    this.failures += 1;
    this.gamesPlayed++;
    
    // Mark all game states as bad
    for (const state of this.gameStates) {
      const prev = this.memory.get(state.sig) || 0;
      const penalty = 8 + (score < 100 ? 5 : 0);  // Extra penalty for very short games
      this.memory.set(state.sig, Math.min(50, prev + penalty));
    }
    
    const penalty = 3.0 + Math.max(0, 180 - score) / 40 + Math.max(0, 30 - lines) / 8;
    this.failureBias = Math.min(60, this.failureBias + penalty * 3);  // More aggressive (was 40)
    this.skill = Math.max(0, this.skill - penalty);  // Stronger penalty
    this.learningBoost = Math.min(30, this.learningBoost + penalty * 2);  // More boost (was 18)
    
    const learningLevel = this.skill + this.learningBoost * 2.2;
    this.perBeat = Math.max(0.05, 1.0 - learningLevel * 0.11);
    
    // Update success rate
    const successThreshold = 500;  // Games with score > 500 are considered successful
    if (score > successThreshold) {
      this.successRate = Math.min(0.95, this.successRate * 0.98 + 0.02);  // Learning success
    } else {
      this.successRate = Math.max(0.1, this.successRate * 0.95);  // Failure hurts learning
    }
    
    // Save learning data when game ends
    this.saveMemory();
    this.saveSkillData();
  }

  update(dt, game, audio) {
    if (!game.active || game.state !== 'playing') return;

    const scoreGain = Math.max(0, game.score - this.lastScore);
    const lineGain = Math.max(0, game.lines - this.lastLines);
    const levelGain = Math.max(0, game.level - 1) * 0.05;
    
    // Enhanced learning: more aggressive skill growth
    const progressGain = dt * (0.1 + lineGain * 0.2 + Math.min(1.0, scoreGain / 1000) + game.level * 0.05 + levelGain * 0.5);
    
    if (scoreGain > 0 || lineGain > 0) {
      this.skill = Math.min(40, this.skill + progressGain * 2);      // Stronger growth (was 24, 1.2)
      this.learningBoost = Math.min(50, this.learningBoost + progressGain * 2);  // Stronger boost (was 18, 1.4)
      
      // Track successful states during good games
      for (const state of this.gameStates) {
        this.rememberSuccess(game, { x: 0 });  // Mark states during good scoring as positive
      }
    } else {
      this.skill = Math.max(0, this.skill - dt * 0.005);  // Slower decay (was 0.02)
      this.learningBoost = Math.max(0, this.learningBoost - dt * 0.02);  // Slower decay (was 0.06)
    }

    this.failureBias = Math.max(0, this.failureBias * 0.99 - dt * 0.05);  // Faster recovery (was 0.985, 0.035)
    this.skill = Math.max(0, this.skill * 0.995 + dt * 0.05 + game.level * 0.003);  // Faster growth
    
    // Update best score and track improvement
    if (game.score > this.bestScore) {
      this.bestScore = game.score;
      this.saveSkillData();  // Save immediately on new best score
    }
    
    const learningLevel = this.skill + this.learningBoost * 2.2;
    this.perBeat = Math.max(0.05, 1.0 - learningLevel * 0.15);  // More speed boost as skill grows
    this.lastScore = game.score;
    this.lastLines = game.lines;

    if (this.serial !== game.pieceSerial) {
      this.serial = game.pieceSerial;
      const adaptiveBias = this.failureBias + this.skill * 2 + this.learningBoost * 1.5 + this.patternBias(game) + game.level * 2;
      this.plan = planMove(game, adaptiveBias);
      if (this.plan) this.rememberMistake(game, this.plan);
      this.aligned = false;
      this.tries = 0;
    }
    if (!this.plan) {
      this.rememberMistake(game);
      game.hardDrop();
      return;
    }

    if (this.plan.useHold) {
      this.plan.useHold = false;
      game.holdPiece();
      this.serial = game.pieceSerial;
      this.aligned = false;
      return;
    }

    if (!this.aligned) this.align(game);

    const shouldDrop = this.aligned && (game.grounded() || this.plan.score > 75 || this.due(dt, audio));
    if (shouldDrop) {
      game.hardDrop();
      this.aligned = false;
    }
  }

  // done in one frame so the piece is parked before gravity or the beat arrives
  align(game) {
    game.quiet = true;
    let guard = 0;
    while (game.active.rot !== this.plan.rot && guard++ < 4) {
      const diff = (this.plan.rot - game.active.rot + 4) % 4;
      const before = game.active.rot;
      game.rotate(diff === 3 ? -1 : diff === 2 ? 2 : 1);
      if (game.active.rot === before) break;
    }
    guard = 0;
    while (game.active.x !== this.plan.x && guard++ < COLS + 2) {
      if (!game.move(Math.sign(this.plan.x - game.active.x), 0)) break;
    }
    if (game.active.x !== this.plan.x && this.tries < 2) {
      this.tries++;
      const drift = Math.sign(this.plan.x - game.active.x);
      if (drift !== 0) game.move(drift, 0);
    }
    game.quiet = false;
    this.aligned = true;
  }

  due(dt, audio) {
    const step = Math.max(0.05, this.perBeat);
    if (audio && audio.playing && audio.tickFired >= 0) {
      const threshold = Math.max(1, Math.round(step));
      return audio.tickFired % threshold === 0;
    }
    this.timer += dt;
    const gap = (audio ? audio.beatSeconds() : 0.22) / step;
    if (this.timer >= gap) {
      this.timer = 0;
      return true;
    }
    return false;
  }
}
