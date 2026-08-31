import { COLS, ROWS, HIDDEN_ROWS, VISIBLE_ROWS, PIECES, COLORS } from './pieces.js';
import { State } from './game.js';
import { STAGES } from './stages.js';

const rgbCache = new Map();
function rgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) {
    v = `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
    rgbCache.set(hex, v);
  }
  return v;
}

const DISPLAY_FONT = '"FantasyPixel", "Courier New", monospace';
const pixelSize = (n) => Math.max(8, Math.round(n / 4) * 4);

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const rad = Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2);
    this.moveTo(x + rad, y);
    this.arcTo(x + w, y, x + w, y + h, rad);
    this.arcTo(x + w, y + h, x, y + h, rad);
    this.arcTo(x, y + h, x, y, rad);
    this.arcTo(x, y, x + w, y, rad);
    this.closePath();
  };
}

export class Renderer {
  constructor(boardCanvas, holdCanvas, nextCanvas) {
    this.board = boardCanvas;
    this.bctx = boardCanvas.getContext('2d');
    this.hold = holdCanvas;
    this.hctx = holdCanvas.getContext('2d');
    this.next = nextCanvas;
    this.nctx = nextCanvas.getContext('2d');
    this.bctx.gid = 'b';
    this.hctx.gid = 'h';
    this.nctx.gid = 'n';
    this.gradients = new Map();
    this.cell = 30;
    this.dpr = 1;
    this.previewCell = 19;
    this.nextRow = false;
    this.lastFit = '';
    this.showGhost = true;
    this.showGrid = true;
    this.showBubbles = true;
    this.autoplay = false;
    this.bubbles = [];
    this.backdrop = null;
    this.backdropInWell = false;
    this.backdropAlpha = 1;
    this.activeStage = STAGES[0];
    this.t = 0;
  }

  resize() {
    const wrap = this.board.parentElement;
    const availH = wrap.clientHeight;
    const availW = wrap.clientWidth;
    if (availH < 40 || availW < 40) return;

    const compact = window.matchMedia('(max-width: 700px), (max-height: 560px)').matches;
    const stacked = compact && window.innerWidth <= window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // the 6px covers the 2px border each side plus a little slack
    const cell = Math.max(9, Math.floor(Math.min((availH - 6) / VISIBLE_ROWS, (availW - 6) / COLS)));
    const fit = `${cell}:${dpr}:${compact}:${stacked}`;
    if (fit === this.lastFit) return;
    this.lastFit = fit;

    this.cell = cell;
    this.dpr = dpr;
    this.nextRow = stacked;
    this.previewCell = compact ? 12 : 19;
    this.gradients.clear();

    const w = cell * COLS;
    const h = cell * VISIBLE_ROWS;
    this.board.style.width = `${w}px`;
    this.board.style.height = `${h}px`;
    this.board.width = Math.round(w * dpr);
    this.board.height = Math.round(h * dpr);
    this.bctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const p = this.previewCell;
    this.sizePreview(this.hold, this.hctx, 4.6 * p, 3 * p);
    if (stacked) this.sizePreview(this.next, this.nctx, 5 * 4.6 * p, 3 * p);
    else this.sizePreview(this.next, this.nctx, 4.6 * p, 5 * 3.2 * p);
  }

  sizePreview(canvas, ctx, w, h) {
    const dpr = this.dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  gradient(ctx, key, size) {
    const id = `${ctx.gid}:${key}:${size}`;
    let g = this.gradients.get(id);
    if (!g) {
      const c = COLORS[key];
      g = ctx.createLinearGradient(0, 0, size * 0.35, size);
      g.addColorStop(0, c.light);
      g.addColorStop(0.42, c.base);
      g.addColorStop(1, c.dark);
      this.gradients.set(id, g);
    }
    return g;
  }

  block(ctx, px, py, size, key, alpha = 1, scale = 1) {
    const c = COLORS[key];
    const s = size * scale;
    const off = (size - s) / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(px + off, py + off);

    const r = Math.max(2, s * 0.14);
    const inset = Math.max(0.5, s * 0.045);
    const bw = s - inset * 2;

    ctx.beginPath();
    ctx.roundRect(inset, inset, bw, bw, r);
    ctx.fillStyle = this.gradient(ctx, key, size);
    ctx.fill();

    // glossy top edge
    ctx.beginPath();
    ctx.roundRect(inset + bw * 0.12, inset + bw * 0.1, bw * 0.76, bw * 0.28, r * 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(inset + 0.5, inset + 0.5, bw - 1, bw - 1, r);
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.strokeStyle = c.dark;
    ctx.globalAlpha = alpha * 0.8;
    ctx.stroke();

    ctx.restore();
  }

  ghost(ctx, px, py, size, key) {
    const c = COLORS[key];
    const inset = Math.max(1.5, size * 0.11);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px + inset, py + inset, size - inset * 2, size - inset * 2, Math.max(2, size * 0.1));
    ctx.fillStyle = c.base;
    ctx.globalAlpha = 0.1;
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(1.5, size * 0.07);
    ctx.strokeStyle = c.base;
    ctx.stroke();
    ctx.restore();
  }

  draw(game, fx, dt) {
    this.t += dt;
    const ctx = this.bctx;
    const cell = this.cell;
    const w = cell * COLS;
    const h = cell * VISIBLE_ROWS;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    if (fx.shake > 0) {
      const a = Math.random() * Math.PI * 2;
      ctx.translate(Math.cos(a) * fx.shake, Math.sin(a) * fx.shake);
    }

    this.activeStage = STAGES[game.stagesOn ? game.stage : 0];
    if (!game.stagesOn && this.accentWell) this.activeStage = this.accentWell;
    this.drawWell(ctx, w, h, game);
    this.drawBubbles(ctx, w, h, dt, fx);
    this.drawFish(ctx, fx);

    const clearing = game.clearRows;
    const prog = game.clearProgress;

    for (let y = HIDDEN_ROWS; y < ROWS; y++) {
      const isClearing = clearing && clearing.includes(y);
      const sy = (y - HIDDEN_ROWS) * cell;
      for (let x = 0; x < COLS; x++) {
        const key = game.grid[y][x];
        if (!key) continue;
        if (isClearing) {
          const fade = 1 - prog;
          this.block(ctx, x * cell, sy, cell, key, fade, 1 - prog * 0.65);
        } else {
          this.block(ctx, x * cell, sy, cell, key, 1, 1);
        }
      }
      if (isClearing) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, 0.85 - prog * 1.1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, sy, w, cell);
        ctx.restore();
      }
    }

    const a = game.active;
    if (a && game.state !== State.Over) {
      const piece = PIECES[a.key];
      const cells = piece.cells[a.rot];

      if (this.showGhost) {
        const gy = game.ghostY();
        if (gy !== a.y) {
          for (const [cx, cy] of cells) {
            const by = gy + cy;
            if (by < HIDDEN_ROWS) continue;
            this.ghost(ctx, (a.x + cx) * cell, (by - HIDDEN_ROWS) * cell, cell, a.key);
          }
        }
      }

      // pulse while the lock timer is running so the player can feel it
      const lockPulse = game.grounded() ? 0.55 + 0.45 * Math.cos(this.t * 22) : 1;
      for (const [cx, cy] of cells) {
        const by = a.y + cy;
        if (by < HIDDEN_ROWS) continue;
        this.block(ctx, (a.x + cx) * cell, (by - HIDDEN_ROWS) * cell, cell, a.key, lockPulse);
      }
    }

    this.drawParticles(ctx, fx);
    ctx.restore();
    if (fx.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fx.flash * 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    this.drawPopups(ctx, fx, w, h);
    this.drawFrame(ctx, w, h, game);
  }

  drawWell(ctx, w, h, game) {
    const stage = this.activeStage;
    const tint = rgb(stage.tint);
    const showBackdrop = this.backdrop && this.backdropInWell && this.backdrop.complete;

    if (showBackdrop) {
      const s = Math.max(w / this.backdrop.width, h / this.backdrop.height);
      const iw = this.backdrop.width * s;
      const ih = this.backdrop.height * s;
      ctx.save();
      ctx.globalAlpha = this.backdropAlpha;
      ctx.drawImage(this.backdrop, (w - iw) / 2, (h - ih) / 2, iw, ih);
      ctx.restore();
    }

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, stage.top);
    g.addColorStop(0.55, stage.mid);
    g.addColorStop(1, stage.bottom);
    ctx.save();
    if (showBackdrop) ctx.globalAlpha = 0.62;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // slow light shaft drifting across the water
    const shaft = ctx.createLinearGradient(0, 0, w, h);
    const s = (Math.sin(this.t * 0.25) + 1) / 2;
    shaft.addColorStop(Math.max(0, s - 0.28), `rgba(${tint},0)`);
    shaft.addColorStop(s, `rgba(${tint},0.07)`);
    shaft.addColorStop(Math.min(1, s + 0.28), `rgba(${tint},0)`);
    ctx.fillStyle = shaft;
    ctx.fillRect(0, 0, w, h);

    const danger = game.danger;
    if (danger > 0.01) {
      const dg = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      dg.addColorStop(0, `rgba(255,91,127,${0.3 * danger})`);
      dg.addColorStop(1, 'rgba(255,91,127,0)');
      ctx.fillStyle = dg;
      ctx.fillRect(0, 0, w, h * 0.55);
    }

    if (this.showGrid) {
      ctx.save();
      ctx.strokeStyle = `rgba(${tint},0.06)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 1; x < COLS; x++) {
        ctx.moveTo(x * this.cell + 0.5, 0);
        ctx.lineTo(x * this.cell + 0.5, h);
      }
      for (let y = 1; y < VISIBLE_ROWS; y++) {
        ctx.moveTo(0, y * this.cell + 0.5);
        ctx.lineTo(w, y * this.cell + 0.5);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  drawBubbles(ctx, w, h, dt, fx = null) {
    if (!this.showBubbles) return;
    while (this.bubbles.length < 22) {
      this.bubbles.push({
        x: Math.random() * w,
        y: h + Math.random() * h,
        r: 1 + Math.random() * 3.5,
        v: 12 + Math.random() * 34,
        phase: Math.random() * 6.28
      });
    }
    const bubbleGlow = fx ? Math.min(1.1, fx.glow) : 0;
    const glowBoost = Math.min(1.6, this.t * 0.18);
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.activeStage.tint;
    for (const b of this.bubbles) {
      b.y -= b.v * dt;
      if (b.y < -6) {
        b.y = h + Math.random() * 40;
        b.x = Math.random() * w;
      }
      const wobble = Math.sin(this.t * 1.6 + b.phase) * 5;
      const glow = 0.18 + Math.min(0.6, bubbleGlow * 0.22);
      ctx.globalAlpha = glow;
      ctx.beginPath();
      ctx.arc(b.x + wobble, b.y, b.r + glowBoost + bubbleGlow * 1.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.08 + Math.min(0.22, bubbleGlow * 0.1);
      ctx.fillStyle = '#dffcff';
      ctx.fill();
    }
    ctx.restore();
  }

  drawFrame(ctx, w, h, game) {
    ctx.save();
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);

    const top = ctx.createLinearGradient(0, 0, 0, this.cell * 1.6);
    top.addColorStop(0, 'rgba(0,0,0,0.55)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, this.cell * 1.6);
    ctx.restore();

    if (game.state === State.Paused) {
      ctx.save();
      ctx.fillStyle = 'rgba(4,8,14,0.78)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (this.autoplay && game.state !== State.Paused) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `${pixelSize(this.cell * 0.42)}px ${DISPLAY_FONT}`;
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(this.t * 3);
      ctx.fillStyle = '#35f0c8';
      ctx.fillText('AUTO FISHING', w / 2, this.cell * 0.95);
      ctx.restore();
    }
  }

  drawParticles(ctx, fx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const t of fx.trails) {
      const k = 1 - t.age / t.life;
      const c = COLORS[t.key];
      const x = t.col * this.cell;
      const y1 = (t.toRow - HIDDEN_ROWS) * this.cell;
      // only streak the last stretch of the fall so long drops do not paint the whole well
      const y0 = Math.max((t.fromRow - HIDDEN_ROWS) * this.cell, y1 - this.cell * 7);
      const g = ctx.createLinearGradient(0, y0, 0, y1 + this.cell);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.6, c.dark);
      g.addColorStop(1, c.base);
      ctx.globalAlpha = k * k * 0.38;
      ctx.fillStyle = g;
      ctx.fillRect(x + this.cell * 0.22, y0, this.cell * 0.56, y1 - y0);
    }
    for (const p of fx.particles) {
      const k = 1 - p.age / p.life;
      ctx.globalAlpha = k * k;
      ctx.fillStyle = p.color;
      const s = p.size * (0.4 + k * 0.6);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.restore();
  }

  drawFish(ctx, fx) {
    if (!fx.fish.length) return;
    ctx.save();
    for (const f of fx.fish) {
      const fade = Math.min(1, f.age * 2.5) * Math.max(0, 1 - f.age / f.life);
      const wob = Math.sin(f.by * 0.9 + f.phase) * f.sway;
      const x = (f.bx + wob) * this.cell;
      const y = (f.by - HIDDEN_ROWS) * this.cell;
      const r = f.size * this.cell * 0.5;
      const dir = f.flip ? -1 : 1;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(f.by * 0.9 + f.phase) * 0.25 - Math.PI / 2);
      ctx.scale(dir, 1);
      ctx.globalAlpha = fade * 0.5;
      ctx.fillStyle = f.tint;
      ctx.shadowColor = f.tint;
      ctx.shadowBlur = r * 1.6;

      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-r * 0.82, 0);
      ctx.lineTo(-r * 1.6, -r * 0.6);
      ctx.lineTo(-r * 1.6, r * 0.6);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = fade * 0.9;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#04121a';
      ctx.beginPath();
      ctx.arc(r * 0.42, -r * 0.14, Math.max(1, r * 0.11), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawPopups(ctx, fx, w, h) {
    if (!fx.popups.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    fx.popups.forEach((p, i) => {
      const k = p.age / p.life;
      const alpha = k < 0.12 ? k / 0.12 : Math.max(0, 1 - (k - 0.12) / 0.88);
      const pop = k < 0.15 ? 1 + (0.15 - k) * 2.2 : 1;
      const y = h * 0.34 + i * (this.cell * 1.1) - k * 26;
      const color = p.tone === 'spin' ? '#c79bff' : p.tone === 'big' ? '#35f0c8' : p.tone === 'gold' ? '#ffd84d' : '#eaf6ff';

      ctx.save();
      ctx.translate(w / 2, y);
      ctx.scale(pop, pop);
      ctx.globalAlpha = alpha;
      ctx.font = `${pixelSize(this.cell * 0.6)}px ${DISPLAY_FONT}`;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = color;
      ctx.fillText(p.text, 0, 0);
      if (p.sub) {
        ctx.font = `${pixelSize(this.cell * 0.32)}px ${DISPLAY_FONT}`;
        ctx.globalAlpha = alpha * 0.9;
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#7fe9ff';
        ctx.fillText(p.sub, 0, this.cell * 0.62);
      }
      ctx.restore();
    });
    ctx.restore();
  }

  drawPreview(ctx, key, x, y, slot, cell, dim = false) {
    const piece = PIECES[key];
    const cells = piece.cells[0];
    const xs = cells.map((c) => c[0]);
    const ys = cells.map((c) => c[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pw = (maxX - minX + 1) * cell;
    const ph = (maxY - minY + 1) * cell;
    const ox = x + (slot.w - pw) / 2 - minX * cell;
    const oy = y + (slot.h - ph) / 2 - minY * cell;
    for (const [cx, cy] of cells) {
      this.block(ctx, ox + cx * cell, oy + cy * cell, cell, key, dim ? 0.3 : 1);
    }
  }

  drawSide(game) {
    const cell = this.previewCell;
    const hctx = this.hctx;
    const hw = this.hold.width / this.dpr;
    const hh = this.hold.height / this.dpr;
    hctx.clearRect(0, 0, hw, hh);
    if (game.hold) this.drawPreview(hctx, game.hold, 0, 0, { w: hw, h: hh }, cell, !game.canHold);

    const nctx = this.nctx;
    const nw = this.next.width / this.dpr;
    const nh = this.next.height / this.dpr;
    nctx.clearRect(0, 0, nw, nh);
    const count = Math.min(5, game.queue.length);
    for (let i = 0; i < count; i++) {
      const scale = i === 0 ? 1 : 0.84;
      if (this.nextRow) {
        const slot = nw / 5;
        this.drawPreview(nctx, game.queue[i], i * slot, 0, { w: slot, h: nh }, cell * scale, false);
      } else {
        const slot = nh / 5;
        this.drawPreview(nctx, game.queue[i], 0, i * slot, { w: nw, h: slot }, cell * scale, false);
      }
    }
  }
}
