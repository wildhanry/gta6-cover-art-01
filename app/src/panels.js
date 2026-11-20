// Panel geometry for Vice Panels. Every layout is a set of polygons in normalised
// cover coordinates (0..1 on both axes), so the same layout works at any export size
// and any aspect ratio. The slanted dividers are the signature of the genre's poster
// covers: panels lean a few degrees instead of sitting on a plain rectangular grid.

/** One panel: a stable id, a human label and its polygon as [x, y] pairs. */
function makePanel(id, label, points) {
  return { id, label, points };
}

/** The x position of the hero layout's leaning divider at height y. */
function heroDividerX(y) {
  return 0.635 - 0.07 * y;
}

/** Big portrait panel on the left, three stacked panels leaning against it. */
function heroGridPanels() {
  const panels = [makePanel('hero', 'Hero panel', [[0, 0], [heroDividerX(0) + 0.015, 0], [heroDividerX(1) - 0.015, 1], [0, 1]])];
  for (let row = 0; row < 3; row += 1) {
    const yTop = row / 3;
    const yBottom = (row + 1) / 3;
    panels.push(makePanel(`side-${row}`, `Side panel ${row + 1}`, [
      [heroDividerX(yTop) + 0.015, yTop],
      [1, yTop],
      [1, yBottom],
      [heroDividerX(yBottom) - 0.015, yBottom],
    ]));
  }
  return panels;
}

/** The classic nine-panel cover grid, its two vertical dividers leaning together. */
function nineGridPanels() {
  const lean = (y) => 0.02 * (0.5 - y);
  const colEdge = (col, y) => (col === 0 ? 0 : col === 1 ? 0.345 + lean(y) : col === 2 ? 0.675 + lean(y) : 1);
  const panels = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const yTop = row / 3;
      const yBottom = (row + 1) / 3;
      panels.push(makePanel(`grid-${row}-${col}`, `Grid panel ${row * 3 + col + 1}`, [
        [colEdge(col, yTop), yTop],
        [colEdge(col + 1, yTop), yTop],
        [colEdge(col + 1, yBottom), yBottom],
        [colEdge(col, yBottom), yBottom],
      ]));
    }
  }
  return panels;
}

/** Four tall parallelogram strips, like frames cut from a film reel. */
function filmStripPanels() {
  const panels = [];
  for (let strip = 0; strip < 4; strip += 1) {
    const x0 = strip * 0.25;
    const x1 = x0 + 0.25;
    panels.push(makePanel(`strip-${strip}`, `Strip panel ${strip + 1}`, [
      [x0 + 0.028, 0],
      [x1 + 0.028, 0],
      [x1 - 0.028, 1],
      [x0 - 0.028, 1],
    ]));
  }
  return panels;
}

/** One wide cinematic panel on top, three panels beneath a slanted horizon. */
function topHeroPanels() {
  const horizonY = (x) => 0.615 - 0.075 * x;
  const panels = [makePanel('top', 'Top panel', [[0, 0], [1, 0], [1, horizonY(1)], [0, horizonY(0)]])];
  for (let col = 0; col < 3; col += 1) {
    const x0 = col / 3;
    const x1 = (col + 1) / 3;
    panels.push(makePanel(`under-${col}`, `Lower panel ${col + 1}`, [
      [x0, horizonY(x0) + 0.012],
      [x1, horizonY(x1) + 0.012],
      [x1, 1],
      [x0, 1],
    ]));
  }
  return panels;
}

/** A diagonal two-scene split with a third scene tucked into the lower right. */
function duoSplitPanels() {
  return [
    makePanel('upper', 'Upper scene', [[0, 0], [1, 0], [1, 0.44], [0, 0.605]]),
    makePanel('lower-left', 'Lower left scene', [[0, 0.605], [0.575, 0.475], [0.575, 1], [0, 1]]),
    makePanel('lower-right', 'Lower right scene', [[0.575, 0.475], [1, 0.44], [1, 1], [0.575, 1]]),
  ];
}

/** A single full-bleed photograph, framed like a magazine cover. */
function fullBleedPanels() {
  return [makePanel('full', 'Full-bleed photo', [[0, 0], [1, 0], [1, 1], [0, 1]])];
}

/** The x position of the cover-star layout's leaning hero divider at height y. */
function starDividerX(y) {
  return 0.575 - 0.05 * y;
}

/**
 * The poster-first layout: one tall hero panel takes the left three-fifths of the
 * cover at every aspect ratio, a wide scene leans against its top right, and two
 * smaller scenes split the bottom right corner. Four panels only, each large enough
 * for a face to read at thumbnail size — the hierarchy a game cover leads with,
 * instead of a grid of equal boxes competing for the eye.
 */
function coverStarPanels() {
  const seamY = 0.545;
  const splitTop = 0.80;
  const splitBottom = 0.772;
  return [
    makePanel('star-hero', 'Hero panel', [[0, 0], [starDividerX(0) + 0.012, 0], [starDividerX(1) - 0.012, 1], [0, 1]]),
    makePanel('star-top', 'Top scene', [
      [starDividerX(0) + 0.012, 0],
      [1, 0],
      [1, seamY - 0.012],
      [starDividerX(seamY) - 0.012, seamY - 0.012],
    ]),
    makePanel('star-low-left', 'Lower scene left', [
      [starDividerX(seamY) + 0.012, seamY + 0.012],
      [splitTop, seamY + 0.012],
      [splitBottom, 1],
      [starDividerX(1) - 0.012, 1],
    ]),
    makePanel('star-low-right', 'Lower scene right', [
      [splitTop + 0.024, seamY + 0.012],
      [1, seamY + 0.012],
      [1, 1],
      [splitBottom + 0.024, 1],
    ]),
  ];
}

/** Every layout the editor offers, in the order the picker shows them. */
export const COVER_LAYOUTS = [
  { id: 'cover-star', name: 'Cover Star', hint: 'One hero panel, three scenes leaning in', build: coverStarPanels },
  { id: 'hero-grid', name: 'Hero Grid', hint: 'One star panel, three supporting scenes', build: heroGridPanels },
  { id: 'nine-grid', name: 'Nine Grid', hint: 'The iconic nine-panel poster grid', build: nineGridPanels },
  { id: 'film-strip', name: 'Film Strip', hint: 'Four leaning vertical strips', build: filmStripPanels },
  { id: 'top-hero', name: 'Top Hero', hint: 'Wide scene over a slanted horizon', build: topHeroPanels },
  { id: 'duo-split', name: 'Duo Split', hint: 'Diagonal split, three scenes', build: duoSplitPanels },
  { id: 'full-bleed', name: 'Full Bleed', hint: 'One photo, magazine frame', build: fullBleedPanels },
];

/** Looks a layout up by id, falling back to the hero grid. */
export function findLayout(layoutId) {
  return COVER_LAYOUTS.find((layout) => layout.id === layoutId) ?? COVER_LAYOUTS[0];
}

/** The panel polygons of a layout, freshly built on each call. */
export function panelsForLayout(layoutId) {
  return findLayout(layoutId).build();
}

/** The axis-aligned bounds of a polygon, used to cover-fit a photo inside it. */
export function polygonBounds(points) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Traces a polygon onto a canvas context already scaled to cover pixels. */
export function tracePolygon(ctx, points, width, height) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x * width, y * height);
    else ctx.lineTo(x * width, y * height);
  });
  ctx.closePath();
}
