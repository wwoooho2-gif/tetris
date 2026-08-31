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
  P: [[0, 1, 0], [1, 1, 1], [0, 1, 0]]  // Plus shape for hard mode
};

export const PIECE_KEYS = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
export const PIECE_KEYS_HARD = ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'P'];  // Hard mode includes plus

export const COLORS = {
  I: { light: '#a9fff0', base: '#35f0c8', dark: '#0e7d68' },
  J: { light: '#9dc2ff', base: '#2b7dff', dark: '#123f8c' },
  L: { light: '#ffd0a0', base: '#ff9a3c', dark: '#8f4a10' },
  O: { light: '#fff2a8', base: '#ffd84d', dark: '#8f7212' },
  S: { light: '#a6f5c6', base: '#3ddc84', dark: '#14713f' },
  T: { light: '#d9b4ff', base: '#a05cf0', dark: '#4d1f8c' },
  Z: { light: '#ffb3c6', base: '#ff5b7f', dark: '#8c1f38' },
  P: { light: '#ff9ff0', base: '#ff00ff', dark: '#8c0098' }  // Bright magenta for plus
};

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
const ALL_KEYS = ['I', 'J', 'L', 'O', 'S', 'T', 'Z', 'P'];
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

export function shuffledBag(isHardMode = false) {
  const baseBag = PIECE_KEYS.slice();
  if (!isHardMode) {
    for (let i = baseBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baseBag[i], baseBag[j]] = [baseBag[j], baseBag[i]];
    }
    return baseBag;
  }

  // Hard mode keeps the standard bag but makes the plus-piece much rarer.
  // The plus appears only once in a larger weighted pool, so it is uncommon but still possible.
  const bag = [...PIECE_KEYS, ...PIECE_KEYS, ...PIECE_KEYS, 'P'];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}
