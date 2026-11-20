// Fixed scenes for screenshots, driven by the ?shot= query so the maker's captures
// are reproducible: ?shot=cover renders one exported cover full-frame (the app adds
// the shot-cover class, which hides the editor chrome), and ?shot=editor shows the
// editor with the demo photos loaded. window.__shotReady flips true once the scene
// has painted two frames, which is the screenshot tool's cue.

/** The demo cast: which bundled sample photo fills which panel, per scene. */
const SHOT_CASTS = {
  sunset: ['hero', 'rooftop', 'neon', 'pier', 'neon', 'hero', 'pier', 'rooftop', 'neon'],
  night: ['neon', 'hero', 'pier', 'rooftop', 'hero', 'neon', 'rooftop', 'pier', 'hero'],
};

/** Reads the scene's wording from the query, with defaults that show off the type. */
export function shotWording(query) {
  return {
    title: query.get('title') ?? 'VICE PANELS',
    subtitle: query.get('subtitle') ?? 'welcome to neon coast',
    caption: query.get('caption') ?? 'ONE PHOTO IN — A POSTER OUT',
    badge: query.get('badge') ?? 'FREE OFFLINE',
    layout: query.get('layout') ?? 'hero-grid',
    grade: query.get('grade') ?? 'vice-sunset',
    size: query.get('size') ?? 'wide',
    cast: query.get('cast') ?? 'sunset',
    stars: Number(query.get('stars') ?? 4),
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
