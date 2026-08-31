import { COLORS, COLS, VISIBLE_ROWS } from './pieces.js';

export class Fx {
  constructor() {
    this.particles = [];
    this.popups = [];
    this.fish = [];
    this.trails = [];
    this.shake = 0;
    this.flash = 0;
    this.glow = 0;
  }

  burst(x, y, key, count = 8, power = 1) {
    const c = COLORS[key] || COLORS.I;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (40 + Math.random() * 220) * power;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 60 * power,
        life: 0.45 + Math.random() * 0.5,
        age: 0,
        size: 2 + Math.random() * 4,
        color: Math.random() < 0.35 ? c.light : c.base
      });
    }
  }

  popup(text, sub, tone = 'normal') {
    this.popups.push({ text, sub, tone, age: 0, life: 1.25 });
    if (this.popups.length > 4) this.popups.shift();
  }

  // a school swims up through the well whenever four rows go at once
  school(count = 16) {
    for (let i = 0; i < count; i++) {
      this.fish.push({
        bx: 0.4 + Math.random() * (COLS - 0.8),
        by: VISIBLE_ROWS + 0.6 + Math.random() * 4,
        v: 2.4 + Math.random() * 4.2,
        size: 0.42 + Math.random() * 0.62,
        phase: Math.random() * 6.28,
        sway: 0.45 + Math.random() * 1.1,
        age: 0,
        life: 3.2 + Math.random() * 1.8,
        flip: Math.random() < 0.5,
        tint: Math.random() < 0.4 ? '#35f0c8' : '#7fe9ff'
      });
    }
  }

  trail(col, fromRow, toRow, key) {
    this.trails.push({ col, fromRow, toRow, key, age: 0, life: 0.28 });
  }

  kick(amount) {
    this.shake = Math.min(18, this.shake + amount);
  }

  glowBurst(amount = 1) {
    this.glow = Math.min(2.2, this.glow + amount);
  }

  update(dt) {
    this.shake *= Math.pow(0.0008, dt);
    if (this.shake < 0.05) this.shake = 0;
    this.flash = Math.max(0, this.flash - dt * 3.2);
    this.glow = Math.max(0, this.glow - dt * 2);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += 900 * dt;
      p.vx *= Math.pow(0.15, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      this.popups[i].age += dt;
      if (this.popups[i].age >= this.popups[i].life) this.popups.splice(i, 1);
    }

    for (let i = this.fish.length - 1; i >= 0; i--) {
      const f = this.fish[i];
      f.age += dt;
      f.by -= f.v * dt;
      if (f.age >= f.life || f.by < -2) this.fish.splice(i, 1);
    }

    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].age += dt;
      if (this.trails[i].age >= this.trails[i].life) this.trails.splice(i, 1);
    }
  }

  clear() {
    this.particles.length = 0;
    this.popups.length = 0;
    this.fish.length = 0;
    this.trails.length = 0;
    this.shake = 0;
    this.flash = 0;
    this.glow = 0;
  }
}
