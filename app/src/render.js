// The cover renderer for Vice Panels. drawCoverArt paints a complete cover onto any
// 2D context at any pixel size: the deep Vice City sky behind everything, each panel's
// photograph cover-fitted and colour-graded inside its leaning polygon, the white
// poster dividers, then the lettering block (a huge condensed title with a sunset
// gradient fill, a neon script subtitle, a caption bar, wanted stars and a badge).
// The editor preview and the exported PNG are the same drawing at different sizes,
// so what the reader sees is exactly what they download.

import { panelsForLayout, polygonBounds, tracePolygon } from './panels.js';
import { findGrade, gradePixels, paintGradeWashes } from './grade.js';

const TITLE_FONT_STACK = '"Arial Narrow", "Liberation Sans Narrow", Impact, "Haettenschweiler", sans-serif';
const SCRIPT_FONT_STACK = '"Segoe Script", "Brush Script MT", "Comic Sans MS", cursive';
const BODY_FONT_STACK = 'system-ui, "Segoe UI", Arial, sans-serif';

/** The post sizes the exporter offers: name, width and height in pixels. */
export const EXPORT_SIZES = [
  { id: 'portrait', name: 'Portrait post', width: 1080, height: 1350 },
  { id: 'square', name: 'Square post', width: 1080, height: 1080 },
  { id: 'wide', name: 'Wide banner', width: 1920, height: 1080 },
  { id: 'story', name: 'Story', width: 1080, height: 1920 },
];

/** Creates a detached canvas, in the browser and in nothing else. */
function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/** The painted sky that sits behind the panels and shows through every gap. */
function paintSkyBackdrop(ctx, width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#1b0f3a');
  sky.addColorStop(0.42, '#6d1e5e');
  sky.addColorStop(0.68, '#e0497a');
  sky.addColorStop(0.86, '#ff8c4a');
  sky.addColorStop(1, '#ffc46b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  const sunY = height * 0.66;
  const sunRadius = Math.min(width, height) * 0.30;
  const sun = ctx.createRadialGradient(width / 2, sunY, 0, width / 2, sunY, sunRadius);
  sun.addColorStop(0, 'rgba(255, 224, 150, 0.95)');
  sun.addColorStop(0.55, 'rgba(255, 166, 88, 0.55)');
  sun.addColorStop(1, 'rgba(255, 140, 90, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffd98c';
  ctx.beginPath();
  ctx.arc(width / 2, sunY, sunRadius * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(27, 15, 58, 0.9)';
  const horizon = height * 0.94;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  const skyline = [0.05, 0.10, 0.07, 0.14, 0.09, 0.17, 0.11, 0.08, 0.15, 0.10, 0.06, 0.12, 0.08];
  skyline.forEach((peak, index) => {
    const x = (index / (skyline.length - 1)) * width;
    ctx.lineTo(x, horizon - peak * height * 0.35);
    ctx.lineTo(x + width / skyline.length / 2, horizon - peak * height * 0.35);
  });
  ctx.lineTo(width, horizon);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws one panel: the photo cover-fitted into the polygon's bounds (zoom and pan
 * from the panel's own framing), graded on an offscreen copy so neighbouring panels
 * keep their own grades, then clipped to the leaning polygon.
 */
function paintPanelPhoto(ctx, panel, slot, grade, strength, width, height) {
  const bounds = polygonBounds(panel.points);
  const bx = bounds.minX * width;
  const by = bounds.minY * height;
  const bw = bounds.width * width;
  const bh = bounds.height * height;
  const photo = slot.image;
  if (!photo) {
    ctx.save();
    tracePolygon(ctx, panel.points, width, height);
    ctx.clip();
    const glow = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    glow.addColorStop(0, '#3a1663');
    glow.addColorStop(1, '#93205f');
    ctx.fillStyle = glow;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = `600 ${Math.max(13, Math.min(bw, bh) * 0.09)}px ${BODY_FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText('＋ ADD PHOTO', bx + bw / 2, by + bh / 2 - 6);
    ctx.font = `500 ${Math.max(11, Math.min(bw, bh) * 0.055)}px ${BODY_FONT_STACK}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillText('click or drop an image here', bx + bw / 2, by + bh / 2 + Math.min(bw, bh) * 0.11);
    ctx.restore();
    return;
  }
  const scale = Math.max(bw / photo.naturalWidth, bh / photo.naturalHeight) * (slot.zoom || 1);
  const drawWidth = photo.naturalWidth * scale;
  const drawHeight = photo.naturalHeight * scale;
  const drawX = bx + (bw - drawWidth) / 2 + (slot.panX || 0) * bw;
  const drawY = by + (bh - drawHeight) / 2 + (slot.panY || 0) * bh;
  const tile = makeCanvas(bw, bh);
  const tileCtx = tile.getContext('2d');
  tileCtx.drawImage(photo, drawX - bx, drawY - by, drawWidth, drawHeight);
  if (grade.id !== 'clean' || strength < 1) {
    const pixels = tileCtx.getImageData(0, 0, tile.width, tile.height);
    gradePixels(pixels, grade, strength);
    tileCtx.putImageData(pixels, 0, 0);
  }
  ctx.save();
  tracePolygon(ctx, panel.points, width, height);
  ctx.clip();
  ctx.drawImage(tile, bx, by);
  paintGradeWashes(ctx, grade, bx, by, bw, bh);
  ctx.restore();
}

/** The chunky white dividers and outer frame that make panels read as one poster. */
function paintPanelFrames(ctx, panels, width, height, selectedIndex) {
  const unit = Math.min(width, height);
  ctx.lineJoin = 'round';
  for (const panel of panels) {
    tracePolygon(ctx, panel.points, width, height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = unit * 0.011;
    ctx.stroke();
    tracePolygon(ctx, panel.points, width, height);
    ctx.strokeStyle = 'rgba(20, 8, 40, 0.55)';
    ctx.lineWidth = unit * 0.0035;
    ctx.stroke();
  }
  if (selectedIndex >= 0 && panels[selectedIndex]) {
    tracePolygon(ctx, panels[selectedIndex].points, width, height);
    ctx.strokeStyle = '#22e6ff';
    ctx.lineWidth = unit * 0.008;
    ctx.setLineDash([unit * 0.03, unit * 0.018]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = unit * 0.016;
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);
}

/** Shrinks a font size until the text fits the given width, and returns the size. */
function fitFontSize(ctx, text, maxWidth, startSize, weight, stack) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${stack}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size *= 0.94;
    ctx.font = `${weight} ${size}px ${stack}`;
  }
  return size;
}

/** The five wanted stars under the title: filled stars up to the chosen heat. */
function paintWantedStars(ctx, centreX, y, count, unit) {
  const size = unit * 0.030;
  const gap = size * 2.35;
  const startX = centreX - (gap * 4) / 2;
  for (let star = 0; star < 5; star += 1) {
    const cx = startX + star * gap;
    ctx.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const radius = point % 2 === 0 ? size : size * 0.45;
      const angle = -Math.PI / 2 + (point * Math.PI) / 5;
      const px = cx + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (point === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (star < count) {
      ctx.fillStyle = '#ffd23e';
      ctx.strokeStyle = 'rgba(30, 10, 0, 0.8)';
      ctx.lineWidth = size * 0.10;
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(10, 6, 24, 0.55)';
      ctx.fill();
    }
  }
}

/** A small rotated ribbon badge in the top corner, like a magazine cover line. */
function paintCornerBadge(ctx, text, width, unit) {
  if (!text.trim()) return;
  ctx.save();
  ctx.translate(width - unit * 0.115, unit * 0.115);
  ctx.rotate(Math.PI / 7);
  const radius = unit * 0.088;
  ctx.beginPath();
  for (let point = 0; point < 12; point += 1) {
    const r = point % 2 === 0 ? radius : radius * 0.82;
    const angle = (point * Math.PI) / 6;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (point === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffcf3f';
  ctx.fill();
  ctx.strokeStyle = '#c2185b';
  ctx.lineWidth = unit * 0.006;
  ctx.stroke();
  ctx.fillStyle = '#3a0a2e';
  ctx.textAlign = 'center';
  const words = text.trim().toUpperCase().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > 9 && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, 3);
  const size = fitFontSize(ctx, shown[0] ?? '', radius * 1.35, unit * 0.026, '800', BODY_FONT_STACK);
  ctx.font = `800 ${size}px ${BODY_FONT_STACK}`;
  shown.forEach((textLine, index) => {
    ctx.fillText(textLine, 0, (index - (shown.length - 1) / 2) * size * 1.12 + size * 0.35);
  });
  ctx.restore();
}

/**
 * The lettering block: a script subtitle arched over a huge condensed title with a
 * black outline and a sunset gradient fill, the wanted stars, and a caption bar
 * along the foot of the cover. This block is what turns panels into a cover.
 */
function paintLettering(ctx, state, width, height) {
  const unit = Math.min(width, height);
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const caption = (state.caption || '').trim().toUpperCase();
  ctx.textAlign = 'center';
  if (subtitle) {
    const size = fitFontSize(ctx, subtitle, width * 0.62, unit * 0.052, 'italic 700', SCRIPT_FONT_STACK);
    ctx.font = `italic 700 ${size}px ${SCRIPT_FONT_STACK}`;
    ctx.save();
    ctx.translate(width / 2, height * 0.115);
    ctx.rotate(-0.035);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(18, 4, 31, 0.9)';
    ctx.lineWidth = size * 0.14;
    ctx.strokeText(subtitle, 0, 0);
    ctx.shadowColor = 'rgba(255, 45, 149, 0.95)';
    ctx.shadowBlur = unit * 0.018;
    ctx.fillStyle = '#7df9ff';
    ctx.fillText(subtitle, 0, 0);
    ctx.fillText(subtitle, 0, 0);
    ctx.restore();
  }
  if (title) {
    const size = fitFontSize(ctx, title, width * 0.90, unit * 0.155, '900', TITLE_FONT_STACK);
    ctx.font = `900 ${size}px ${TITLE_FONT_STACK}`;
    const titleY = height * (subtitle ? 0.235 : 0.185);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#12041f';
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(title, width / 2, titleY);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.055;
    ctx.strokeText(title, width / 2, titleY);
    const fill = ctx.createLinearGradient(0, titleY - size, 0, titleY);
    fill.addColorStop(0, '#fff7ae');
    fill.addColorStop(0.45, '#ffb03a');
    fill.addColorStop(0.78, '#ff5e7a');
    fill.addColorStop(1, '#c218a8');
    ctx.fillStyle = fill;
    ctx.fillText(title, width / 2, titleY);
    if (state.stars > 0) paintWantedStars(ctx, width / 2, titleY + unit * 0.052, state.stars, unit);
  }
  if (caption) {
    const barHeight = unit * 0.085;
    const barY = height - barHeight - unit * 0.028;
    ctx.save();
    ctx.translate(width / 2, barY + barHeight / 2);
    ctx.rotate(-0.012);
    ctx.fillStyle = 'rgba(10, 4, 26, 0.88)';
    ctx.fillRect(-width * 0.47, -barHeight / 2, width * 0.94, barHeight);
    ctx.strokeStyle = '#22e6ff';
    ctx.lineWidth = unit * 0.004;
    ctx.strokeRect(-width * 0.47, -barHeight / 2, width * 0.94, barHeight);
    const size = fitFontSize(ctx, caption, width * 0.88, unit * 0.046, '800', TITLE_FONT_STACK);
    ctx.font = `800 ${size}px ${TITLE_FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(caption, 0, size * 0.36);
    ctx.restore();
  }
  paintCornerBadge(ctx, state.badge || '', width, unit);
}

/** Fine deterministic film grain, so flat phone photos gain a printed-poster feel. */
function paintFilmGrain(ctx, width, height, unit) {
  const dots = Math.floor((width * height) / 2600);
  ctx.save();
  for (let i = 0; i < dots; i += 1) {
    const seed = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    const frac = seed - Math.floor(seed);
    const seed2 = Math.sin(i * 269.5 + 183.3) * 28001.8384;
    const frac2 = seed2 - Math.floor(seed2);
    ctx.fillStyle = frac > 0.5 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
    ctx.fillRect(frac * width, frac2 * height, unit * 0.0022, unit * 0.0022);
  }
  ctx.restore();
}

/** A soft dark vignette that pulls the eye to the centre of the cover. */
function paintVignette(ctx, width, height) {
  const radius = Math.max(width, height) * 0.72;
  const gradient = ctx.createRadialGradient(width / 2, height / 2, radius * 0.45, width / 2, height / 2, radius);
  gradient.addColorStop(0, 'rgba(8, 2, 20, 0)');
  gradient.addColorStop(1, 'rgba(8, 2, 20, 0.42)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Paints the whole cover described by `state` onto `ctx` at the given pixel size.
 * State: layout id, per-panel slots ({image, zoom, panX, panY}), a global grade id
 * with optional per-panel grade overrides, grade strength, title, subtitle, caption,
 * badge, wanted stars, grain and vignette switches, and the selected panel index
 * (the editor's dashed highlight; exports pass -1 so no highlight is baked in).
 */
export function drawCoverArt(ctx, state, width, height) {
  const unit = Math.min(width, height);
  paintSkyBackdrop(ctx, width, height);
  const panels = panelsForLayout(state.layout);
  panels.forEach((panel, index) => {
    const slot = state.slots[index] ?? { image: null, zoom: 1, panX: 0, panY: 0 };
    const grade = findGrade(slot.gradeId || state.gradeId);
    paintPanelPhoto(ctx, panel, slot, grade, state.gradeStrength, width, height);
  });
  paintPanelFrames(ctx, panels, width, height, state.selectedIndex ?? -1);
  paintLettering(ctx, state, width, height);
  if (state.grain) paintFilmGrain(ctx, width, height, unit);
  if (state.vignette) paintVignette(ctx, width, height);
}
