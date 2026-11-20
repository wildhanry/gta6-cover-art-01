// Fixed scenes for screenshots, driven by the ?shot= query so the maker's captures
// are reproducible: ?shot=cover renders one exported cover full-frame (the app adds
// the shot-cover class, which hides the editor chrome), and ?shot=editor shows the
// editor with the demo photos loaded. window.__shotReady flips true once the scene
// has painted two frames, which is the screenshot tool's cue.

/** The demo cast: which bundled sample photo fills which panel, per scene. */
const SHOT_CASTS = {
  sunset: ['hero', 'rooftop', 'neon', 'pier', 'neon', 'hero', 'pier', 'rooftop', 'neon'],
  night: ['neon', 'hero', 'pier', 'rooftop', 'hero', 'neon', 'rooftop', 'pier', 'hero'],
  star: ['hero', 'neon', 'rooftop', 'pier', 'neon', 'hero', 'pier', 'rooftop', 'neon'],
};

/** Parses a comma list of per-panel numbers from the query, or an empty list. */
function numberList(query, name) {
  const raw = query.get(name);
  if (!raw) return [];
  return raw.split(',').map((part) => Number(part)).filter((value) => Number.isFinite(value));
}

/** Reads the scene's wording from the query, with defaults that show off the type. */
export function shotWording(query) {
  return {
    title: query.get('title') ?? 'VICE PANELS',
    subtitle: query.get('subtitle') ?? 'welcome to neon coast',
    caption: query.get('caption') ?? 'ONE PHOTO IN — A POSTER OUT',
    badge: query.get('badge') ?? '',
    layout: query.get('layout') ?? 'hero-grid',
    grade: query.get('grade') ?? 'vice-sunset',
    size: query.get('size') ?? 'wide',
    cast: query.get('cast') ?? 'sunset',
    stars: Number(query.get('stars') ?? 4),
    zooms: numberList(query, 'zoom'),
    pans: numberList(query, 'pan'),
  };
}

/**
 * Applies a shot scene: `apply` receives the wording and the sample file names to
 * load into the panels, and resolves once the editor state matches the scene.
 */
export async function runShotScene(query, apply) {
  const shot = query.get('shot');
  if (!shot) return false;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const wording = shotWording(query);
  const cast = SHOT_CASTS[wording.cast] ?? SHOT_CASTS.sunset;
  await apply(wording, cast);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
  return true;
}
