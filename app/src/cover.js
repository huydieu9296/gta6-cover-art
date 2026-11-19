// Vice Panels' renderer: slanted photo panels, a colour grade, a sun emblem and
// bold caption lettering, drawn on a canvas. Everything here is drawn from
// numbers, never from an image the app did not load itself.

/** The three post sizes the app exports, in pixels. */
export const SIZES = {
  landscape: [1920, 1080],
  square: [1080, 1080],
  portrait: [1080, 1350],
};

/** The sample photos shipped under app/samples/. */
export const SAMPLES = ['pier', 'boulevard', 'neon'];

/** Colour grades: a tint washed top to bottom, a vignette, and the sun's hue. */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    top: 'rgba(255, 150, 70, 0.10)',
    bottom: 'rgba(215, 45, 120, 0.55)',
    glow: 'rgba(255, 110, 60, 0.35)',
    vignette: 0.34,
    sun: ['#fff3b0', '#ffb347', '#ff6b35'],
  },
  neon: {
    label: 'Neon',
    top: 'rgba(255, 46, 136, 0.16)',
    bottom: 'rgba(123, 47, 255, 0.48)',
    glow: 'rgba(255, 46, 136, 0.30)',
    vignette: 0.40,
    sun: ['#fff3b0', '#ff9e5e', '#ff2e88'],
  },
  dusk: {
    label: 'Dusk',
    top: 'rgba(96, 64, 190, 0.20)',
    bottom: 'rgba(38, 18, 92, 0.58)',
    glow: 'rgba(120, 80, 220, 0.28)',
    vignette: 0.46,
    sun: ['#ffe9a8', '#ffb347', '#ff7b5c'],
  },
  clean: {
    label: 'Clean',
    top: 'rgba(255, 255, 255, 0)',
    bottom: 'rgba(10, 10, 30, 0.20)',
    glow: 'rgba(255, 255, 255, 0)',
    vignette: 0.24,
    sun: ['#fff3b0', '#ffd23e', '#ff9e5e'],
  },
};

/** How many panels a layout has. */
export function panelCount(layout) {
  return layout === 'duo' ? 2 : 3;
}

function poly(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

function boundsOf(points) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1 - x0, y1 - y0];
}

/**
 * The panel polygons and the white divider strokes for one size and layout.
 * Each panel is a parallelogram: the outer edges sit flush on the canvas and
 * the shared edges lean, so the panels read as one slanted poster.
 * Returns { panels: [points...], dividers: [[x1, y1, x2, y2]...] }.
 */
export function panelShapes(sizeKey, layout) {
  const [w, h] = SIZES[sizeKey];
  const g = Math.max(4, Math.round(w * 0.004));
  const wide = sizeKey === 'landscape';

  if (wide) {
    // One tall panel on the left, two stacked on the right.
    const lean = 0.03 * w;
    const splitX = (y) => 0.625 * w - lean * (y / h);
    if (layout === 'duo') {
      const top = 0.515 * w;
      const bottom = 0.485 * w;
      return {
        panels: [
          [[0, 0], [top, 0], [bottom, h], [0, h]],
          [[top + g, 0], [w, 0], [w, h], [bottom + g, h]],
        ],
        dividers: [[[top, 0], [bottom, h]]],
      };
    }
    const mid = 0.5 * h;
    return {
      panels: [
        [[0, 0], [0.625 * w, 0], [0.595 * w, h], [0, h]],
        [[0.625 * w + g, 0], [w, 0], [w, mid - g], [splitX(mid - g) + g, mid - g]],
        [[splitX(mid + g) + g, mid + g], [w, mid + g], [w, h], [0.595 * w + g, h]],
      ],
      dividers: [
        [[0.625 * w, 0], [0.595 * w, h]],
        [[splitX(mid) + g, mid], [w, mid]],
      ],
    };
  }

  // Square and portrait: one wide panel on top, two below it.
  const topFrac = sizeKey === 'portrait' ? 0.55 : 0.585;
  const lean = 0.03 * h;
  const splitY = (x) => (topFrac - 0.03 * (x / w)) * h;
  const splitX = (y) => {
    const span = h - splitY(0);
    return (0.52 - 0.03 * ((y - splitY(0)) / span)) * w;
  };
  if (layout === 'duo') {
    return {
      panels: [
        [[0, 0], [w, 0], [w, splitY(w)], [0, splitY(0)]],
        [[0, splitY(0) + g], [w, splitY(w) + g], [w, h], [0, h]],
      ],
      dividers: [[[0, splitY(0)], [w, splitY(w)]]],
    };
  }
  const topY = splitY(0) + g;
  const xr = splitX(topY) - g;
  return {
    panels: [
      [[0, 0], [w, 0], [w, splitY(w)], [0, splitY(0)]],
      [[0, topY], [xr, splitY(xr) + g], [splitX(h) + g, h], [0, h]],
      [[xr + 2 * g, splitY(xr + 2 * g) + g], [w, splitY(w) + g], [w, h], [splitX(h) + 2 * g, h]],
    ],
    dividers: [
      [[0, splitY(0)], [w, splitY(w)]],
      [[splitX(splitY(0)), splitY(0)], [splitX(h), h]],
    ],
  };
}

/** Fills one panel with a photo, cover-fit, zoomed and shifted by the panel. */
function paintPhoto(ctx, img, points, zoom, ox, oy) {
  const [x, y, pw, ph] = boundsOf(points);
  if (!img) {
    const shade = ctx.createLinearGradient(x, y, x + pw, y + ph);
    shade.addColorStop(0, '#3a2b4d');
    shade.addColorStop(1, '#1c1426');
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, pw, ph);
    return;
  }
  const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
  const scale = base * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (pw - dw) / 2 + ox * pw * 0.22;
  const dy = y + (ph - dh) / 2 + oy * ph * 0.22;
  ctx.save();
  poly(ctx, points);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** The grade wash: a tinted gradient, a warm glow at the foot, dark corners. */
function paintGrade(ctx, grade, w, h) {
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  if (grade.glow !== 'rgba(255, 255, 255, 0)') {
    const glow = ctx.createLinearGradient(0, h * 0.55, 0, h);
    glow.addColorStop(0, 'rgba(255, 120, 60, 0)');
    glow.addColorStop(1, grade.glow);
    ctx.fillStyle = glow;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
  }
  const dark = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.78,
  );
  dark.addColorStop(0, 'rgba(0, 0, 0, 0)');
  dark.addColorStop(1, `rgba(0, 0, 0, ${grade.vignette})`);
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, w, h);
}

/** The sun emblem: a glowing disc with short white rays. */
function paintSun(ctx, cx, cy, r, colours) {
  const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  disc.addColorStop(0, colours[0]);
  disc.addColorStop(0.55, colours[1]);
  disc.addColorStop(1, colours[2]);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25);
    ctx.lineTo(cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * 1.6);
    ctx.stroke();
  }
}

/** The words: a yellow letterspaced subtitle over a huge outlined caption. */
function paintWords(ctx, caption, subtitle, w, h) {
  const words = caption.trim().toUpperCase();
  const sub = subtitle.trim().toUpperCase();
  const left = w * 0.045;
  const foot = h - h * 0.045;
  if (words) {
    let size = h * 0.115;
    const face = (s) => `900 ${s}px "Arial Black", Impact, "DejaVu Sans", sans-serif`;
    ctx.font = face(size);
    while (ctx.measureText(words).width > w * 0.92 && size > 24) {
      size -= 4;
      ctx.font = face(size);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(words, left, foot);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(words, left, foot);
    if (sub) {
      const subSize = Math.max(18, h * 0.034);
      ctx.font = `800 ${subSize}px "Arial Black", Impact, "DejaVu Sans", sans-serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${subSize * 0.42}px`;
      ctx.fillStyle = '#ffd23e';
      ctx.fillText(sub, left, foot - size * 1.28);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
  } else if (sub) {
    const subSize = Math.max(18, h * 0.034);
    ctx.font = `800 ${subSize}px "Arial Black", Impact, "DejaVu Sans", sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${subSize * 0.42}px`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd23e';
    ctx.fillText(sub, left, foot);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
}

/**
 * Draws the cover on `canvas` (resized to the chosen size first).
 * `images` is an array of loaded images (or null), one per panel in panel
 * order; `setup` is { sizeKey, layout, gradeKey, caption, subtitle, panels }
 * where each panel is { slot, zoom, ox, oy }.
 */
export function drawCover(canvas, images, setup) {
  const [w, h] = SIZES[setup.sizeKey];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  const grade = GRADES[setup.gradeKey] ?? GRADES.sunset;
  ctx.fillStyle = '#14101c';
  ctx.fillRect(0, 0, w, h);

  const { panels, dividers } = panelShapes(setup.sizeKey, setup.layout);
  panels.forEach((points, i) => {
    const panel = setup.panels[i] ?? { zoom: 1, ox: 0, oy: 0 };
    paintPhoto(ctx, images[i] ?? null, points, panel.zoom, panel.ox, panel.oy);
  });

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, w * 0.003);
  for (const [[x1, y1], [x2, y2]] of dividers) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  paintGrade(ctx, grade, w, h);
  paintSun(ctx, w * 0.92, h * 0.09, Math.min(w, h) * 0.04, grade.sun);
  paintWords(ctx, setup.caption, setup.subtitle, w, h);
}
