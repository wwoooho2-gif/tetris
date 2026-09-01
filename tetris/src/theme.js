export const UI_THEMES = {
  fish: { name: 'Fish', stops: ['#35f0c8', '#40dcf5', '#2b7dff'] },
  sunset: { name: 'Sunset', stops: ['#ffd166', '#ff8f5a', '#ff4d8d'] },
  toxic: { name: 'Toxic', stops: ['#c6ff4d', '#5ef08a', '#12b981'] },
  vapor: { name: 'Vapor', stops: ['#ff9ae0', '#b98cff', '#5b6cff'] },
  ember: { name: 'Ember', stops: ['#ffd08a', '#ff8a4d', '#e0342f'] },
  mono: { name: 'Mono', stops: ['#eaf6ff', '#9db4c6', '#5b7285'] }
};

export const BG_PRESETS = {
  none: 'None',
  reef: 'Reef',
  ink: 'Ink',
  tide: 'Tide',
  aurora: 'Aurora',
  ember: 'Ember',
  dusk: 'Dusk',
  frost: 'Frost',
  custom: 'Custom'
};

const GRADIENTS = {
  reef: `radial-gradient(760px 520px at 18% 16%, color-mix(in srgb, var(--aqua) 30%, transparent), transparent 70%),
         radial-gradient(640px 540px at 84% 78%, color-mix(in srgb, var(--blue) 28%, transparent), transparent 72%),
         radial-gradient(520px 420px at 52% 112%, color-mix(in srgb, var(--mint) 22%, transparent), transparent 70%)`,
  ink: `radial-gradient(700px 600px at 78% 12%, color-mix(in srgb, var(--blue) 24%, transparent), transparent 68%),
        radial-gradient(560px 520px at 14% 84%, color-mix(in srgb, #6b2fb5 60%, transparent), transparent 70%),
        repeating-linear-gradient(118deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 26px)`,
  tide: `linear-gradient(180deg, color-mix(in srgb, var(--aqua) 22%, transparent), transparent 46%),
         linear-gradient(0deg, color-mix(in srgb, var(--blue) 34%, transparent), transparent 52%),
         repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 7px)`,
  aurora: `radial-gradient(680px 560px at 20% 18%, rgba(83, 255, 220, 0.22), transparent 64%),
          radial-gradient(720px 540px at 72% 28%, rgba(126, 132, 255, 0.22), transparent 68%),
          linear-gradient(180deg, rgba(6, 20, 28, 0.1), rgba(4, 12, 20, 0.7)),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 16px)`,
  ember: `radial-gradient(780px 520px at 30% 12%, rgba(255, 150, 80, 0.34), transparent 62%),
         radial-gradient(720px 640px at 68% 70%, rgba(255, 80, 120, 0.34), transparent 70%),
         linear-gradient(180deg, rgba(17, 6, 9, 0.18), rgba(10, 4, 5, 0.82))`,
  dusk: `radial-gradient(660px 620px at 50% 16%, rgba(180, 154, 255, 0.22), transparent 62%),
        radial-gradient(760px 560px at 18% 74%, rgba(70, 135, 255, 0.18), transparent 68%),
        linear-gradient(180deg, rgba(12, 10, 28, 0.18), rgba(8, 6, 20, 0.82)),
        repeating-linear-gradient(120deg, rgba(255,255,255,0.015) 0 2px, transparent 2px 18px)`,
  frost: `radial-gradient(760px 620px at 25% 20%, rgba(188, 234, 255, 0.18), transparent 62%),
         radial-gradient(720px 560px at 80% 72%, rgba(120, 179, 255, 0.16), transparent 70%),
         linear-gradient(180deg, rgba(5, 17, 24, 0.08), rgba(3, 11, 18, 0.8)),
         repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 9px)`
};

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const hsl = (h, s, l) => `hsl(${((h % 360) + 360) % 360} ${clamp(s, 0, 100).toFixed(1)}% ${clamp(l, 0, 100).toFixed(1)}%)`;

function hslToHex(h, s, l) {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const chan = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const to = (v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0');
  return `#${to(chan(hh + 1 / 3))}${to(chan(hh))}${to(chan(hh - 1 / 3))}`;
}

// one picked colour fans out into the three gradient stops the ui is built from
function stopsFromHex(hex) {
  const [h, s, l] = hexToHsl(hex);
  const sat = clamp(s, 45, 96);
  return [
    hslToHex(h - 20, sat, clamp(l + 12, 35, 82)),
    hslToHex(h, sat, clamp(l, 30, 74)),
    hslToHex(h + 26, sat, clamp(l - 14, 22, 62))
  ];
}

// water colours for when stages are switched off and the accent owns the well
export function wellFromHex(hex) {
  const [h, s] = hexToHsl(hex);
  return {
    name: 'CUSTOM',
    speed: 1,
    top: hslToHex(h, clamp(s * 0.6, 22, 62), 13),
    mid: hslToHex(h, clamp(s * 0.55, 20, 58), 8),
    bottom: hslToHex(h + 10, clamp(s * 0.5, 18, 52), 4),
    tint: hex
  };
}

export function applyUiTheme(key, customHex) {
  const base = key === 'custom' ? customHex || '#40dcf5' : (UI_THEMES[key] || UI_THEMES.fish).stops[1];
  const stops = key === 'custom' ? stopsFromHex(base) : (UI_THEMES[key] || UI_THEMES.fish).stops;
  const root = document.documentElement.style;
  root.setProperty('--mint', stops[0]);
  root.setProperty('--aqua', stops[1]);
  root.setProperty('--blue', stops[2]);

  const [h, s] = hexToHsl(base);
  root.setProperty('--line', hsl(h, clamp(s * 0.55, 12, 48), 23));
  root.setProperty('--line-soft', hsl(h, clamp(s * 0.5, 10, 42), 14));
  root.setProperty('--muted', hsl(h, 16, 60));
  root.setProperty('--dim', hsl(h, 18, 42));
  return { stops, base };
}

export function applyBackground(layer, preset, dataUrl, fade) {
  const useImage = preset === 'custom' && dataUrl;
  layer.style.opacity = String(clamp(1 - fade / 100, 0, 1));
  if (useImage) {
    layer.style.backgroundImage = `url("${dataUrl}")`;
    layer.style.backgroundSize = 'cover';
    layer.style.backgroundPosition = 'center';
  } else if (GRADIENTS[preset]) {
    layer.style.backgroundImage = GRADIENTS[preset];
    layer.style.backgroundSize = 'cover';
  } else {
    layer.style.backgroundImage = 'none';
  }
}

// shrink whatever the player picked so it survives a trip through localStorage
export function readImageFile(file, maxEdge = 1600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('could not read that file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('that file is not an image'));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/webp', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
