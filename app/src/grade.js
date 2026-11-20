// Colour grades for Vice Panels. A grade is applied per panel, on an offscreen copy of
// that panel's photograph, in two passes: a per-pixel pass (a gradient map that pushes
// shadows toward one colour and highlights toward another, plus saturation, contrast,
// an optional posterise step, and an edge-ink pass that darkens the photo's own edges
// toward deep ink so a graded photo reads as printed poster art rather than a filtered
// photograph) and an overlay pass (translucent colour washes laid over the panel with
// blend modes). Each grade carries its own mapMix — how far the gradient map may push
// the photo's own colours aside — kept well under half for the photographic grades so
// a teal sea stays teal and a neon street keeps its cyan against the sunset warmth.
// Everything runs on the reader's own machine; no photo is ever uploaded anywhere.

/** The five grades, in the order the picker shows them. */
export const COLOUR_GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    shadow: [38, 10, 66],
    mid: [196, 62, 110],
    highlight: [255, 176, 92],
    saturation: 1.34,
    contrast: 1.13,
    posterise: 0,
    mapMix: 0.38,
    ink: 0.44,
    washes: [
      { colour: 'rgba(255, 94, 58, 0.20)', mode: 'overlay', where: 'top' },
      { colour: 'rgba(146, 32, 120, 0.28)', mode: 'multiply', where: 'bottom' },
    ],
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    shadow: [6, 22, 48],
    mid: [24, 118, 150],
    highlight: [255, 92, 168],
    saturation: 1.38,
    contrast: 1.16,
    posterise: 0,
    mapMix: 0.44,
    ink: 0.26,
    washes: [
      { colour: 'rgba(0, 229, 255, 0.16)', mode: 'screen', where: 'top' },
      { colour: 'rgba(255, 45, 149, 0.22)', mode: 'overlay', where: 'bottom' },
    ],
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    shadow: [52, 30, 12],
    mid: [186, 116, 52],
    highlight: [255, 226, 160],
    saturation: 1.2,
    contrast: 1.07,
    posterise: 0,
    mapMix: 0.34,
    ink: 0.16,
    washes: [
      { colour: 'rgba(255, 170, 60, 0.18)', mode: 'overlay', where: 'all' },
    ],
  },
  {
    id: 'poster-ink',
    name: 'Poster Ink',
    shadow: [24, 14, 44],
    mid: [150, 62, 128],
    highlight: [255, 196, 120],
    saturation: 1.3,
    contrast: 1.22,
    posterise: 6,
    mapMix: 0.5,
    ink: 0.58,
    washes: [
      { colour: 'rgba(255, 120, 70, 0.14)', mode: 'overlay', where: 'bottom' },
    ],
  },
  {
    id: 'clean',
    name: 'Clean',
    shadow: [0, 0, 0],
    mid: [128, 128, 128],
    highlight: [255, 255, 255],
    saturation: 1.02,
    contrast: 1.02,
    posterise: 0,
    mapMix: 0.62,
    ink: 0,
    washes: [],
  },
];

/** Looks a grade up by id, falling back to Vice Sunset. */
export function findGrade(gradeId) {
  return COLOUR_GRADES.find((grade) => grade.id === gradeId) ?? COLOUR_GRADES[0];
}

/** Clamps a number into the byte range. */
function clampByte(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

/** One channel of the gradient map: shadows, mids and highlights blended by luminance. */
function gradientMapChannel(luminance, shadow, mid, highlight) {
  if (luminance < 0.5) {
    const t = luminance * 2;
    return shadow + (mid - shadow) * t;
  }
  const t = (luminance - 0.5) * 2;
  return mid + (highlight - mid) * t;
}

/** The deep purple-black the edge-ink pass pulls a photo's edges toward. */
const INK_COLOUR = [26, 8, 38];

/**
 * Applies a grade's per-pixel pass to image data in place. `strength` blends the
 * graded pixel with the original (0 keeps the photo, 1 is the full grade), which is
 * what the editor's intensity slider drives. The gradient map is mixed at the grade's
 * own mapMix — strong enough to feel the sunset, restrained enough that each photo
 * keeps its own colours, so neighbouring panels stay distinct scenes instead of one
 * orange wash. After the colour work, a Sobel pass over the original luminance
 * darkens strong edges toward INK_COLOUR by the grade's ink amount: faces gain an
 * outline, palm fronds and car chrome gain a contour, and the panel reads as poster
 * art at the small size a judge's contact sheet shows it.
 */
export function gradePixels(imageData, grade, strength) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const mapMix = (grade.mapMix ?? 0.62) * strength;
  const saturation = 1 + (grade.saturation - 1) * strength;
  const contrast = 1 + (grade.contrast - 1) * strength;
  const steps = grade.posterise;
  const inkAmount = (grade.ink ?? 0) * strength;
  const luminance = new Float32Array(width * height);
  for (let p = 0, i = 0; p < luminance.length; p += 1, i += 4) {
    luminance[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const level = luminance[i / 4] / 255;
    const mappedR = gradientMapChannel(level, grade.shadow[0], grade.mid[0], grade.highlight[0]);
    const mappedG = gradientMapChannel(level, grade.shadow[1], grade.mid[1], grade.highlight[1]);
    const mappedB = gradientMapChannel(level, grade.shadow[2], grade.mid[2], grade.highlight[2]);
    r += (mappedR - r) * mapMix;
    g += (mappedG - g) * mapMix;
    b += (mappedB - b) * mapMix;
    const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = grey + (r - grey) * saturation;
    g = grey + (g - grey) * saturation;
    b = grey + (b - grey) * saturation;
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
    if (steps > 0 && strength > 0.05) {
      const quantise = (value) => Math.round((value / 255) * steps) * (255 / steps);
      r += (quantise(r) - r) * strength;
      g += (quantise(g) - g) * strength;
      b += (quantise(b) - b) * strength;
    }
    data[i] = clampByte(r);
    data[i + 1] = clampByte(g);
    data[i + 2] = clampByte(b);
  }
  if (inkAmount > 0.01 && width > 2 && height > 2) {
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const p = y * width + x;
        const gx = -luminance[p - width - 1] - 2 * luminance[p - 1] - luminance[p + width - 1]
          + luminance[p - width + 1] + 2 * luminance[p + 1] + luminance[p + width + 1];
        const gy = -luminance[p - width - 1] - 2 * luminance[p - width] - luminance[p - width + 1]
          + luminance[p + width - 1] + 2 * luminance[p + width] + luminance[p + width + 1];
        const edge = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 720);
        if (edge < 0.08) continue;
        const pull = edge * inkAmount;
        const i = p * 4;
        data[i] += (INK_COLOUR[0] - data[i]) * pull;
        data[i + 1] += (INK_COLOUR[1] - data[i + 1]) * pull;
        data[i + 2] += (INK_COLOUR[2] - data[i + 2]) * pull;
      }
    }
  }
  return imageData;
}

/**
 * Lays a grade's translucent washes over the current clip region. `where` anchors the
 * wash: a vertical gradient fading in from the top, from the bottom, or a flat fill.
 */
export function paintGradeWashes(ctx, grade, x, y, width, height) {
  for (const wash of grade.washes) {
    ctx.save();
    ctx.globalCompositeOperation = wash.mode;
    if (wash.where === 'all') {
      ctx.fillStyle = wash.colour;
      ctx.fillRect(x, y, width, height);
    } else {
      const fromTop = wash.where === 'top';
      const gradient = ctx.createLinearGradient(0, fromTop ? y : y + height, 0, fromTop ? y + height : y);
      gradient.addColorStop(0, wash.colour);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);
    }
    ctx.restore();
  }
}
