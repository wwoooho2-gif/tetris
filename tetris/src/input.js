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
    this.vrState = {
      left: false,
      right: false,
      soft: false,
      cw: false,
      ccw: false,
      drop: false,
      hold: false
    };
  }

  static decodeVrGamepad(gamepad = {}) {
    const axes = Array.isArray(gamepad.axes) ? gamepad.axes : [];
    const buttons = Array.isArray(gamepad.buttons) ? gamepad.buttons : [];
    const isPressed = (button) => Boolean(button && (button.pressed || button.value > 0.35));
    const buttonState = (index) => isPressed(buttons[index]);
    const leftX = Number(axes[0] ?? 0);
    const leftY = Number(axes[1] ?? 0);
    const rightX = Number(axes[2] ?? 0);
    const rightY = Number(axes[3] ?? 0);

    return {
      left: leftX < -0.5 || (buttonState(14) && rightX < -0.5),
      right: leftX > 0.5 || (buttonState(15) && rightX > 0.5),
      soft: leftY > 0.6 || rightY > 0.6 || buttonState(0) || buttonState(1),
      cw: buttonState(3) || buttonState(4),
      ccw: buttonState(2) || buttonState(5),
      drop: buttonState(6) || rightY < -0.8 || leftY < -0.8,
      hold: buttonState(7) || buttonState(8),
      any: leftX !== 0 || leftY !== 0 || rightX !== 0 || rightY !== 0 || buttons.some(isPressed)
    };
  }

  updateVrGamepads() {
    if (!navigator || typeof navigator.getGamepads !== 'function') return;
    const pads = navigator.getGamepads();
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      const next = Input.decodeVrGamepad(pad);
      const prev = this.vrState;
      const keys = ['left', 'right', 'soft', 'cw', 'ccw', 'drop', 'hold'];
      for (const key of keys) {
        const enabled = Boolean(next[key]);
        const wasEnabled = Boolean(prev[key]);
        if (enabled && !wasEnabled) {
          if (key === 'left' || key === 'right') this.press(key);
          else this.press(key);
        } else if (!enabled && wasEnabled) {
          if (key === 'left' || key === 'right' || key === 'soft') this.release(key);
        }
        prev[key] = enabled;
      }
      this.vrState = prev;
      return;
    }
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
    this.updateVrGamepads();
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
    root.querySelectorAll('[data-action]').forEach((el) => {
      const action = el.dataset.action;
      const down = (e) => {
        e.preventDefault();
        this.fire('any');
        if (action === 'pause' || action === 'restart') this.fire(action);
        else this.press(action);
        el.classList.add('is-down');
      };
      const up = (e) => {
        e.preventDefault();
        this.release(action);
        el.classList.remove('is-down');
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    });
  }
}
