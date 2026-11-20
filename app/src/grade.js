// Colour grades for Vice Panels. A grade is applied per panel, on an offscreen copy of
// that panel's photograph, in two passes: a per-pixel pass (a gradient map that pushes
// shadows toward one colour and highlights toward another, plus saturation, contrast
// and an optional posterise step that inks the photo like printed poster art) and an
// overlay pass (translucent colour washes laid over the panel with blend modes).
// Everything runs on the reader's own machine; no photo is ever uploaded anywhere.

/** The five grades, in the order the picker shows them. */
export const COLOUR_GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    shadow: [38, 10, 66],
    mid: [196, 62, 110],
    highlight: [255, 176, 92],
    saturation: 1.28,
    contrast: 1.1,
    posterise: 0,
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
    saturation: 1.35,
    contrast: 1.14,
    posterise: 0,
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
    saturation: 1.16,
    contrast: 1.05,
    posterise: 0,
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
    saturation: 1.22,
    contrast: 1.18,
    posterise: 7,
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

/**
 * Applies a grade's per-pixel pass to image data in place. `strength` blends the
 * graded pixel with the original (0 keeps the photo, 1 is the full grade), which is
 * what the editor's intensity slider drives. The gradient map is mixed at 62% so
 * faces and skin tones stay recognisable under the sunset colours.
 */
export function gradePixels(imageData, grade, strength) {
  const data = imageData.data;
  const mapMix = 0.62 * strength;
  const saturation = 1 + (grade.saturation - 1) * strength;
  const contrast = 1 + (grade.contrast - 1) * strength;
  const steps = grade.posterise;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const mappedR = gradientMapChannel(luminance, grade.shadow[0], grade.mid[0], grade.highlight[0]);
    const mappedG = gradientMapChannel(luminance, grade.shadow[1], grade.mid[1], grade.highlight[1]);
    const mappedB = gradientMapChannel(luminance, grade.shadow[2], grade.mid[2], grade.highlight[2]);
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
      const amount = strength;
      r += (quantise(r) - r) * amount;
      g += (quantise(g) - g) * amount;
      b += (quantise(b) - b) * amount;
    }
    data[i] = clampByte(r);
    data[i + 1] = clampByte(g);
    data[i + 2] = clampByte(b);
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
