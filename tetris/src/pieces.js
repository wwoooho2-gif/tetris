export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

const BASE = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  P: [[0, 1, 0], [1, 1, 1], [0, 1, 0]],  // Plus shape for hard mode
  X: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],  // Slash shape for extreme mode
  Q: [[0, 0, 1], [0, 1, 0], [1, 0, 0]]   // Backslash shape for extreme mode
};

export const PIECE_KEYS = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
export const PIECE_KEYS_HARD = ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'P'];  // Hard mode includes plus
export const PIECE_KEYS_EXTREME = ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'P', 'X', 'Q'];  // Extreme mode includes plus, slash, and backslash

export const COLORS = {
  I: { light: '#a9fff0', base: '#35f0c8', dark: '#0e7d68' },
  J: { light: '#9dc2ff', base: '#2b7dff', dark: '#123f8c' },
  L: { light: '#ffd0a0', base: '#ff9a3c', dark: '#8f4a10' },
  O: { light: '#fff2a8', base: '#ffd84d', dark: '#8f7212' },
  S: { light: '#a6f5c6', base: '#3ddc84', dark: '#14713f' },
  T: { light: '#d9b4ff', base: '#a05cf0', dark: '#4d1f8c' },
  Z: { light: '#ffb3c6', base: '#ff5b7f', dark: '#8c1f38' },
  P: { light: '#ff9ff0', base: '#ff00ff', dark: '#8c0098' },  // Bright magenta for plus
  X: { light: '#ffff99', base: '#ffff00', dark: '#999900' },  // Bright yellow for slash
  Q: { light: '#ff9999', base: '#ff3333', dark: '#cc0000' }   // Bright red for backslash
};

// Color theme presets for pieces
export const COLOR_THEMES = {
  default: {
    I: { light: '#a9fff0', base: '#35f0c8', dark: '#0e7d68' },
    J: { light: '#9dc2ff', base: '#2b7dff', dark: '#123f8c' },
    L: { light: '#ffd0a0', base: '#ff9a3c', dark: '#8f4a10' },
    O: { light: '#fff2a8', base: '#ffd84d', dark: '#8f7212' },
    S: { light: '#a6f5c6', base: '#3ddc84', dark: '#14713f' },
    T: { light: '#d9b4ff', base: '#a05cf0', dark: '#4d1f8c' },
    Z: { light: '#ffb3c6', base: '#ff5b7f', dark: '#8c1f38' },
    P: { light: '#ff9ff0', base: '#ff00ff', dark: '#8c0098' },
    X: { light: '#ffff99', base: '#ffff00', dark: '#999900' },
    Q: { light: '#ff9999', base: '#ff3333', dark: '#cc0000' }
  },
  neon: {
    I: { light: '#00ffff', base: '#00ff00', dark: '#00aa00' },
    J: { light: '#ff00ff', base: '#ff0080', dark: '#aa0055' },
    L: { light: '#ffff00', base: '#ff8800', dark: '#aa5500' },
    O: { light: '#ff00ff', base: '#ff00ff', dark: '#aa00aa' },
    S: { light: '#00ff00', base: '#00ff80', dark: '#00aa55' },
    T: { light: '#ff0080', base: '#ff0000', dark: '#aa0000' },
    Z: { light: '#00ffff', base: '#0080ff', dark: '#0055aa' },
    P: { light: '#ffff00', base: '#ffff00', dark: '#aaaa00' },
    X: { light: '#ff00ff', base: '#ff00ff', dark: '#aa00aa' },
    Q: { light: '#ff99ff', base: '#ff00ff', dark: '#aa00aa' }
  },
  pastel: {
    I: { light: '#b4e7f5', base: '#87ceeb', dark: '#5a9fbe' },
    J: { light: '#dda0dd', base: '#ba55d3', dark: '#8b3ba8' },
    L: { light: '#f0e68c', base: '#daa520', dark: '#b8860b' },
    O: { light: '#ffd1dc', base: '#ffb6de', dark: '#cc8fa3' },
    S: { light: '#98fb98', base: '#90ee90', dark: '#5fb55f' },
    T: { light: '#ffc0cb', base: '#ff69b4', dark: '#cc4477' },
    Z: { light: '#ffe4b5', base: '#ffa500', dark: '#cc8400' },
    P: { light: '#e6b3ff', base: '#d580ff', dark: '#aa55cc' },
    X: { light: '#ffffe0', base: '#fffacd', dark: '#cccc99' },
    Q: { light: '#ffb3b3', base: '#ff9999', dark: '#cc6666' }
  },
  fire: {
    I: { light: '#ff6600', base: '#ff3300', dark: '#cc2200' },
    J: { light: '#ffaa00', base: '#ff7700', dark: '#cc6600' },
    L: { light: '#ffdd00', base: '#ffbb00', dark: '#cc9900' },
    O: { light: '#ff4400', base: '#ff2200', dark: '#cc1100' },
    S: { light: '#ff9900', base: '#ff6600', dark: '#cc5500' },
    T: { light: '#ffff00', base: '#ffdd00', dark: '#ccbb00' },
    Z: { light: '#ff5500', base: '#ff3300', dark: '#cc2200' },
    P: { light: '#ff0000', base: '#ff0000', dark: '#cc0000' },
    X: { light: '#ffaa00', base: '#ff8800', dark: '#cc6600' },
    Q: { light: '#ff2200', base: '#ff0000', dark: '#cc0000' }
  },
  ice: {
    I: { light: '#e0ffff', base: '#b0ffff', dark: '#70ccff' },
    J: { light: '#d0e8ff', base: '#a0d8ff', dark: '#6aadcc' },
    L: { light: '#e8f0ff', base: '#c8e0ff', dark: '#8abfff' },
    O: { light: '#f0f8ff', base: '#e0f0ff', dark: '#a8ccff' },
    S: { light: '#d8f8ff', base: '#a8f0ff', dark: '#70cccc' },
    T: { light: '#f0e8ff', base: '#d8d8ff', dark: '#a8a8ff' },
    Z: { light: '#e8e8ff', base: '#c8c8ff', dark: '#9090ff' },
    P: { light: '#d0f0ff', base: '#a0e8ff', dark: '#6accff' },
    X: { light: '#f0f0ff', base: '#e0e0ff', dark: '#b0b0ff' },
    Q: { light: '#e0d0ff', base: '#d0a8ff', dark: '#a070ff' }
  },
  sunset: {
    I: { light: '#ffd7a8', base: '#ff9f43', dark: '#b85c00' },
    J: { light: '#ffc1d9', base: '#ff5d8f', dark: '#a1124d' },
    L: { light: '#ffd6a5', base: '#ffa94d', dark: '#b9681a' },
    O: { light: '#ffe8a3', base: '#f7c948', dark: '#a77d00' },
    S: { light: '#ffd6a5', base: '#ff8c42', dark: '#b45500' },
    T: { light: '#ffd6ff', base: '#d86cff', dark: '#7e2c9f' },
    Z: { light: '#ffc9c9', base: '#ff6b6b', dark: '#ac1f1f' },
    P: { light: '#ffb3f2', base: '#ff5ce1', dark: '#a00d96' },
    X: { light: '#ffe7a3', base: '#ffd166', dark: '#9d7b00' },
    Q: { light: '#ffb3b3', base: '#ff4d4d', dark: '#a30000' }
  },
  aurora: {
    I: { light: '#d9fff4', base: '#5ef2d6', dark: '#1b9f87' },
    J: { light: '#d7f7ff', base: '#59b9ff', dark: '#1b6bb8' },
    L: { light: '#dfffe6', base: '#7fe38a', dark: '#2d8b4c' },
    O: { light: '#dfffb8', base: '#c8ef5e', dark: '#7a9d17' },
    S: { light: '#d9ffe9', base: '#68e39d', dark: '#1f9150' },
    T: { light: '#d8d2ff', base: '#9d8cff', dark: '#4f53b3' },
    Z: { light: '#d9f0ff', base: '#7cc7ff', dark: '#2a6fb0' },
    P: { light: '#efd9ff', base: '#c785ff', dark: '#6832a4' },
    X: { light: '#ebfff0', base: '#9ef7b5', dark: '#2e9b5d' },
    Q: { light: '#dffcff', base: '#6be4ff', dark: '#1f84b3' }
  },
  candy: {
    I: { light: '#fff3c4', base: '#ffd166', dark: '#b67d00' },
    J: { light: '#ffd8f0', base: '#ff87d6', dark: '#b2499a' },
    L: { light: '#ffe0b2', base: '#ffb86c', dark: '#b45700' },
    O: { light: '#fdf1b2', base: '#f7e062', dark: '#a98b00' },
    S: { light: '#d9ffe8', base: '#6ee7a9', dark: '#1d8c5a' },
    T: { light: '#e3d5ff', base: '#b08cff', dark: '#5d4fbe' },
    Z: { light: '#ffd9e0', base: '#ff7ea8', dark: '#aa2d5d' },
    P: { light: '#ffe4ff', base: '#ff8af7', dark: '#ad38b5' },
    X: { light: '#fff0b3', base: '#ffd93d', dark: '#a98300' },
    Q: { light: '#ffc8c8', base: '#ff7d7d', dark: '#ac2a2a' }
  }
};

export function getColorTheme(themeName = 'default') {
  return COLOR_THEMES[themeName] || COLOR_THEMES.default;
}

function rotateCW(m) {
  const n = m.length;
  const out = [];
  for (let y = 0; y < n; y++) {
    const row = [];
    for (let x = 0; x < n; x++) row.push(m[n - 1 - x][y]);
    out.push(row);
  }
  return out;
}

function cellsOf(m) {
  const out = [];
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m.length; x++) if (m[y][x]) out.push([x, y]);
  }
  return out;
}

export const PIECES = {};
const ALL_KEYS = ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'P', 'X', 'Q'];
for (const key of ALL_KEYS) {
  const states = [BASE[key]];
  for (let i = 1; i < 4; i++) states.push(rotateCW(states[i - 1]));
  const cells = states.map(cellsOf);
  const topRow = Math.min(...cells[0].map((c) => c[1]));
  PIECES[key] = {
    key,
    size: BASE[key].length,
    states,
    cells,
    spawnX: key === 'O' || key === 'P' ? 4 : 3,
    spawnY: HIDDEN_ROWS - topRow
  };
}

// SRS kick tables, converted to screen space where +y points down
const KICKS_JLSTZ = {
  '01': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '10': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '12': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '21': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '23': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '32': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '30': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '03': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]
};

const KICKS_I = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]]
};

// not part of SRS, a forgiving set so the 180 key feels good
const KICKS_180 = [[0, 0], [0, -1], [1, 0], [-1, 0], [1, -1], [-1, -1], [0, 1], [2, 0], [-2, 0]];

export function kicks(key, from, to) {
  if (key === 'O') return [[0, 0]];
  if ((from + 2) % 4 === to) return KICKS_180;
  const table = key === 'I' ? KICKS_I : KICKS_JLSTZ;
  return table[`${from}${to}`] || [[0, 0]];
}

export function shuffledBag(difficultyMode = 'normal') {
  let bag;
  if (difficultyMode === 'extreme') {
    bag = PIECE_KEYS_EXTREME.slice();
  } else if (difficultyMode === 'hard') {
    bag = PIECE_KEYS_HARD.slice();
  } else {
    bag = PIECE_KEYS.slice();
  }
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}
