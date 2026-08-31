const BINDINGS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'soft',
  ArrowUp: 'cw',
  KeyX: 'cw',
  KeyZ: 'ccw',
  ControlLeft: 'ccw',
  ControlRight: 'ccw',
  KeyA: 'flip',
  Space: 'drop',
  KeyC: 'hold',
  ShiftLeft: 'hold',
  ShiftRight: 'hold',
  Escape: 'pause',
  KeyP: 'pause',
  KeyR: 'restart',
  KeyB: 'bot',
  KeyM: 'mute',
  Enter: 'confirm'
};

export class Input {
  constructor(game) {
    this.game = game;
    this.das = 120;
    this.arr = 25;
    this.held = new Set();
    this.dir = 0;
    this.dasTimer = 0;
    this.arrTimer = 0;
    this.handlers = {};
    this.enabled = true;
  }

  attach() {
    window.addEventListener('keydown', (e) => this.onDown(e));
    window.addEventListener('keyup', (e) => this.onUp(e));
    window.addEventListener('blur', () => {
      this.held.clear();
      this.dir = 0;
      this.game.softDropping = false;
    });
  }

  fire(name) {
    if (this.handlers[name]) this.handlers[name]();
  }

  onDown(e) {
    const action = BINDINGS[e.code];
    if (!action) return;
    e.preventDefault();
    this.fire('any');
    if (e.repeat) return;

    if (action === 'pause' || action === 'restart' || action === 'mute' || action === 'confirm' || action === 'bot') {
      this.fire(action);
      return;
    }
    this.press(action);
  }

  onUp(e) {
    const action = BINDINGS[e.code];
    if (!action) return;
    e.preventDefault();
    this.release(action);
  }

  press(action) {
    if (!this.enabled) return;
    const g = this.game;
    switch (action) {
      case 'left':
        this.held.add('left');
        this.dir = -1;
        this.dasTimer = 0;
        this.arrTimer = 0;
        g.move(-1, 0);
        break;
      case 'right':
        this.held.add('right');
        this.dir = 1;
        this.dasTimer = 0;
        this.arrTimer = 0;
        g.move(1, 0);
        break;
      case 'soft':
        this.held.add('soft');
        g.gravityAcc = 0;
        g.softDropping = true;
        break;
      case 'cw':
        g.rotate(1);
        break;
      case 'ccw':
        g.rotate(-1);
        break;
      case 'flip':
        g.rotate(2);
        break;
      case 'drop':
        g.hardDrop();
        break;
      case 'hold':
        g.holdPiece();
        break;
      default:
        break;
    }
  }

  release(action) {
    if (action === 'left' || action === 'right') {
      this.held.delete(action);
      if (this.held.has('left')) this.dir = -1;
      else if (this.held.has('right')) this.dir = 1;
      else this.dir = 0;
      this.dasTimer = 0;
      this.arrTimer = 0;
    } else if (action === 'soft') {
      this.held.delete('soft');
      this.game.softDropping = false;
    }
  }

  update(dt) {
    if (!this.dir || !this.enabled) return;
    const ms = dt * 1000;
    this.dasTimer += ms;
    if (this.dasTimer < this.das) return;
    if (this.arr <= 0) {
      while (this.game.move(this.dir, 0));
      return;
    }
    this.arrTimer += ms;
    let guard = 0;
    while (this.arrTimer >= this.arr && guard++ < 12) {
      this.arrTimer -= this.arr;
      if (!this.game.move(this.dir, 0)) break;
    }
  }

  bindTouch(root) {
    const touchStates = new Map();  // Track active touch points
    
    root.querySelectorAll('[data-action]').forEach((el) => {
      const action = el.dataset.action;
      const touchId = Symbol(action);
      
      const down = (e) => {
        if (e.pointerType === 'touch') e.preventDefault();
        
        // Prevent duplicate presses on multi-touch
        if (touchStates.has(action)) return;
        touchStates.set(action, true);
        
        this.fire('any');
        if (action === 'pause' || action === 'restart') this.fire(action);
        else this.press(action);
        el.classList.add('is-down');
      };
      
      const up = (e) => {
        if (e.pointerType === 'touch') e.preventDefault();
        touchStates.delete(action);
        this.release(action);
        el.classList.remove('is-down');
      };
      
      const cancel = (e) => {
        if (e.pointerType === 'touch') e.preventDefault();
        touchStates.delete(action);
        this.release(action);
        el.classList.remove('is-down');
      };
      
      el.addEventListener('pointerdown', down, { passive: false });
      el.addEventListener('pointerup', up, { passive: false });
      el.addEventListener('pointercancel', cancel, { passive: false });
      el.addEventListener('pointerleave', cancel, { passive: false });
      
      // Fallback touch events for older devices
      el.addEventListener('touchstart', down, { passive: false });
      el.addEventListener('touchend', up, { passive: false });
      el.addEventListener('touchcancel', cancel, { passive: false });
    });
  }
}
