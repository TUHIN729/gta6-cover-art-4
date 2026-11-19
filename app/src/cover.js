// Leonida Cover Forge renderer: draws the multi-panel GTA-style cover onto a canvas.
// A "state" is { photos: (image|null)[4], layout, grade, title, subtitle, ribbon,
// zoom: number[4], panX: number[4], panY: number[4] }. Nothing here reads the
// network, the clock or randomness, so the same state always draws the same pixels.

/** The four layouts, each a list of panel rectangles in 0..1 cover space. */
export const LAYOUTS = {
  hero: [[0, 0, 1, 1]],
  split: [
    [0, 0, 0.5, 1],
    [0.5, 0, 0.5, 1],
  ],
  grid: [
    [0, 0, 0.5, 0.5],
    [0.5, 0, 0.5, 0.5],
    [0, 0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5, 0.5],
  ],
  strip: [
    [0, 0, 1, 0.66],
    [0, 0.66, 0.5, 0.34],
    [0.5, 0.66, 0.5, 0.34],
  ],
};

/** Colour grades: a top-to-bottom tint and a warm highlight, drawn over the photos. */
export const GRADES = {
  sunset: { top: 'rgba(255, 122, 26, 0.10)', bottom: 'rgba(214, 48, 120, 0.42)', glow: 'rgba(255, 190, 90, 0.20)' },
  neon: { top: 'rgba(20, 120, 255, 0.16)', bottom: 'rgba(255, 46, 136, 0.38)', glow: 'rgba(80, 220, 255, 0.18)' },
  noir: { top: 'rgba(0, 0, 0, 0.22)', bottom: 'rgba(0, 0, 0, 0.55)', glow: 'rgba(255, 255, 255, 0.05)' },
  palm: { top: 'rgba(30, 190, 120, 0.12)', bottom: 'rgba(10, 60, 90, 0.40)', glow: 'rgba(190, 255, 200, 0.16)' },
  vice: { top: 'rgba(255, 80, 200, 0.18)', bottom: 'rgba(90, 20, 140, 0.45)', glow: 'rgba(255, 120, 220, 0.20)' },
};

/** Fallback panel colours, one per slot, used while a photo is still empty. */
const PANEL_FALLBACK = ['#3b1d5e', '#123a5c', '#5c1d3a', '#1d4a3a'];

/**
 * Draws one photo into a rectangle, cover-fitting it, then applying the slot's
 * zoom (1 = fit) and pan (-1..1 in each axis, 0 = centred).
 */
function drawPhotoInto(ctx, photo, rect, zoom, panX, panY) {
  const [rx, ry, rw, rh] = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  if (!photo) {
    ctx.fillStyle = PANEL_FALLBACK[0];
    ctx.fillRect(rx, ry, rw, rh);
    ctx.restore();
    return;
  }
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(rw / iw, rh / ih);
  const scale = base * (zoom || 1);
  const pw = iw * scale;
  const ph = ih * scale;
  const cx = rx + rw / 2 + (panX || 0) * (pw - rw) * 0.5;
  const cy = ry + rh / 2 + (panY || 0) * (ph - rh) * 0.5;
  ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** A thin dark gutter between panels so the collage reads as separate frames. */
function drawGutters(ctx, w, h, layout) {
  ctx.fillStyle = '#0d0714';
  if (layout === 'split') ctx.fillRect(w * 0.5 - 3, 0, 6, h);
  if (layout === 'grid') {
    ctx.fillRect(w * 0.5 - 3, 0, 6, h);
    ctx.fillRect(0, h * 0.5 - 3, w, 6);
  }
  if (layout === 'strip') ctx.fillRect(0, h * 0.66 - 3, w, 6);
  if (layout === 'strip') ctx.fillRect(w * 0.5 - 3, h * 0.66, 6, h * 0.34);
}

/** The grade wash: a vertical tint, a warm glow at the horizon, and a vignette. */
function drawGrade(ctx, w, h, grade) {
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.62, 0, w * 0.5, h * 0.62, w * 0.75);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.42, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** Shrinks a bold font until `text` fits `maxWidth`, then returns the size used. */
function fitFont(ctx, text, maxWidth, startSize, weight = '900') {
  let size = startSize;
  ctx.font = `${weight} ${size}px "Arial Black", "Segoe UI", sans-serif`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px "Arial Black", "Segoe UI", sans-serif`;
  }
  return size;
}

/** White capitals with a heavy black outline, the GTA poster look. */
function posterText(ctx, text, x, y, size) {
  ctx.font = `900 ${size}px "Arial Black", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0a0512';
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

/** The title band, subtitle and the slanted ribbon in the top corner. */
function drawWords(ctx, w, h, state) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const ribbon = (state.ribbon || '').trim().toUpperCase();
  if (title || subtitle) {
    const bandH = h * (subtitle ? 0.20 : 0.15);
    const bandY = h - bandH;
    const band = ctx.createLinearGradient(0, bandY, 0, h);
    band.addColorStop(0, 'rgba(8, 3, 16, 0)');
    band.addColorStop(0.35, 'rgba(8, 3, 16, 0.78)');
    band.addColorStop(1, 'rgba(8, 3, 16, 0.92)');
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY, w, bandH);
    if (title) {
      const size = fitFont(ctx, title, w * 0.92, h * 0.115);
      posterText(ctx, title, w / 2, h - h * (subtitle ? 0.085 : 0.045), size);
    }
    if (subtitle) {
      const size = fitFont(ctx, subtitle, w * 0.86, h * 0.038, '700');
      ctx.font = `700 ${size}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = size * 0.25;
      ctx.fillText(subtitle, w / 2, h - h * 0.028);
      ctx.shadowBlur = 0;
    }
  }
  if (ribbon) {
    const size = fitFont(ctx, ribbon, w * 0.5, h * 0.032, '800');
    const textW = ctx.measureText(ribbon).width;
    // The ribbon crosses the top-right corner: its ends land on the top edge
    // and the right edge, so its centre is the midpoint of that diagonal cut.
    const reach = textW * 0.75 + size * 1.6;
    ctx.save();
    ctx.translate(w - reach / 2, reach / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(-textW / 2 - size * 0.8, -size * 0.95, textW + size * 1.6, size * 1.9);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${size}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ribbon, 0, 0);
    ctx.restore();
  }
}

/**
 * Renders the whole cover for `state` onto `canvas` at the canvas's own size.
 * Photos are drawn per layout, then the grade, gutters and words on top.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.fillStyle = '#0d0714';
  ctx.fillRect(0, 0, w, h);
  layout.forEach(([fx, fy, fw, fh], i) => {
    const rect = [fx * w, fy * h, fw * w, fh * h];
    // Panels after the first reuse the first photo when a slot is still empty,
    // so a one-photo cover still fills every frame instead of showing blanks.
    const photo = state.photos[i] || state.photos[0] || null;
    if (!photo) {
      ctx.fillStyle = PANEL_FALLBACK[i % PANEL_FALLBACK.length];
      ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
      return;
    }
    drawPhotoInto(ctx, photo, rect, (state.zoom || [])[i] ?? 1, (state.panX || [])[i] ?? 0, (state.panY || [])[i] ?? 0);
  });
  drawGutters(ctx, w, h, state.layout);
  drawGrade(ctx, w, h, grade);
  drawWords(ctx, w, h, state);
}
