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
  let low = 0;
  let high = ROWS;
  for (const r of shape.rows) {
    const ry = y + r.dy;
    if (ry < 0) return null;
    out[ry] |= shift(r.mask, x);
    if (ry > low) low = ry;
    if (ry < high) high = ry;
  }

  let cleared = 0;
  const kept = [];
  for (let i = 0; i < ROWS; i++) {
    if (out[i] === FULL) cleared++;
    else kept.push(out[i]);
  }
  while (kept.length < ROWS) kept.unshift(0);

  const f = evaluate(kept);
  const landing = ROWS - (low + high) / 2;
  const learnedSafetyBonus = learningBias * ((12 - Math.min(12, f.holes)) * 2.5 + cleared * 8 + (COLS - Math.min(COLS, Math.abs(x))) * 1.4 - f.wells * 2.2);
  return (
    W.landing * landing +
    W.cleared * cleared +
    W.rowTrans * f.rowTrans +
    W.colTrans * f.colTrans +
    W.holes * f.holes +
    W.wells * f.wells +
    learnedSafetyBonus
  );
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
    this.perBeat = 0.5;  // Base speed for piece drops
    this.plan = null;
    this.serial = -1;
    this.timer = 0;
    this.aligned = false;
    this.tries = 0;
    this.failureBias = 0;
    this.failures = 0;
    this.skill = 0;
    
    // Self-learning metrics
    this.gameHistory = [];  // Track last N games
    this.avgScore = 0;
    this.avgLines = 0;
    this.winRate = 0;  // % of games reaching level 5+
    this.aggressionLevel = 1.0;  // 0.5 = defensive, 1.0 = balanced, 1.5 = aggressive
    this.learningEnabled = true;
  }

  getStats() {
    return {
      skill: this.skill.toFixed(2),
      failures: this.failures,
      speed: this.perBeat.toFixed(2),
      winRate: (this.winRate * 100).toFixed(0) + '%',
      avgScore: Math.round(this.avgScore),
      avgLines: Math.round(this.avgLines),
      aggression: this.aggressionLevel.toFixed(2),
      games: this.gameHistory.length
    };
  }

  reset() {
    this.plan = null;
    this.serial = -1;
    this.aligned = false;
    this.tries = 0;
    this.timer = 0;
    this.perBeat = Math.max(0.35, 0.5 - this.skill * 0.08);
  }

  recordFailure(score = 0, lines = 0, level = 1) {
    this.failures += 1;
    
    // Record game result for learning
    if (this.learningEnabled) {
      const gameResult = {
        score,
        lines,
        level,
        timestamp: Date.now(),
        success: level >= 5  // Consider it a win if level 5+
      };
      this.gameHistory.push(gameResult);
      if (this.gameHistory.length > 20) this.gameHistory.shift();  // Keep last 20 games
      
      // Recalculate learning metrics
      this.updateLearningMetrics();
    }
    
    const gain = 0.55 + Math.max(0, 80 - score) / 120 + Math.max(0, 20 - lines) / 18;
    this.failureBias = Math.min(12, this.failureBias + gain);
    this.skill = Math.min(8, this.skill + gain * 0.75 + 0.2);
    this.perBeat = Math.max(0.35, 0.5 - this.skill * 0.08);
  }

  updateLearningMetrics() {
    if (this.gameHistory.length === 0) return;
    
    // Calculate averages
    this.avgScore = this.gameHistory.reduce((sum, g) => sum + g.score, 0) / this.gameHistory.length;
    this.avgLines = this.gameHistory.reduce((sum, g) => sum + g.lines, 0) / this.gameHistory.length;
    this.winRate = this.gameHistory.filter(g => g.success).length / this.gameHistory.length;
    
    // Self-adapt: if winning, become more aggressive; if losing, become more defensive
    if (this.winRate > 0.6) {
      this.aggressionLevel = Math.min(1.8, this.aggressionLevel + 0.1);
      this.failureBias = Math.max(0, this.failureBias - 0.2);  // Less defensive
    } else if (this.winRate < 0.3) {
      this.aggressionLevel = Math.max(0.5, this.aggressionLevel - 0.15);
      this.failureBias = Math.min(10, this.failureBias + 0.3);  // More defensive
    }
    
    // Adapt speed based on performance
    if (this.avgScore > 5000) {
      this.perBeat = Math.max(0.35, this.perBeat - 0.05);  // Speed up if doing well
    } else if (this.avgScore < 1000) {
      this.perBeat = Math.min(1.2, this.perBeat + 0.08);  // Slow down if struggling
    }
  }

  recordSuccess(lines = 0) {
    // Positive reinforcement for clears
    if (this.learningEnabled) {
      this.skill = Math.min(8, this.skill + 0.05 * lines);
    }
  }

  update(dt, game, audio) {
    if (!game.active || game.state !== 'playing') return;

    this.failureBias = Math.max(0, this.failureBias * 0.98);  // Decay slower to learn better
    this.skill = Math.max(0, this.skill * 0.992);
    this.perBeat = Math.max(0.35, 1 - this.skill * 0.11);

    if (this.serial !== game.pieceSerial) {
      this.serial = game.pieceSerial;
      const learningBias = (this.failureBias + this.skill * 0.7) * this.aggressionLevel;
      this.plan = planMove(game, learningBias);
      this.aligned = false;
      this.tries = 0;
    }
    if (!this.plan) {
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

    // Drop as soon as the move is ready and the placement is good; only use the beat timer as a
    // fallback so the bot can react faster and make more efficient placements.
    const shouldDrop = this.aligned && (game.grounded() || this.plan.score > 180 || this.due(dt, audio));
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
    game.quiet = false;
    this.aligned = true;
  }

  due(dt, audio) {
    const step = Math.max(0.35, this.perBeat);
    if (audio && audio.playing && audio.tickFired >= 0) {
      const threshold = Math.max(1, Math.round(step));
      return audio.tickFired % threshold === 0;
    }
    this.timer += dt;
    const gap = (audio ? audio.beatSeconds() : 0.35) / step;
    if (this.timer >= gap) {
      this.timer = 0;
      return true;
    }
    return false;
  }
}
