// Vice Panels editor wiring. The page holds one state object (the same shape the
// renderer consumes), a preview canvas that repaints on every change, and controls
// that edit the selected panel or the whole cover. Photos are read with object URLs
// on this machine only: nothing is uploaded, nothing leaves the browser, and the
// app makes no network request of its own — every file it loads sits beside it.

import { COVER_LAYOUTS, panelsForLayout, polygonBounds } from './panels.js';
import { COLOUR_GRADES } from './grade.js';
import { EXPORT_SIZES, drawCoverArt } from './render.js';
import { runShotScene } from './shots.js';

const MAX_PANELS = 9;

const preview = document.getElementById('preview');
const previewCtx = preview.getContext('2d');
const statusLine = document.getElementById('status');

/** A fresh empty framing slot for one panel. */
function emptySlot() {
  return { image: null, zoom: 1, panX: 0, panY: 0, gradeId: '' };
}

/** The whole cover as the editor currently holds it. */
const state = {
  layout: 'hero-grid',
  slots: Array.from({ length: MAX_PANELS }, emptySlot),
  gradeId: 'vice-sunset',
  gradeStrength: 0.9,
  title: 'VICE PANELS',
  subtitle: 'welcome to neon coast',
  caption: 'ONE PHOTO IN — A POSTER OUT',
  badge: 'FREE OFFLINE',
  stars: 4,
  grain: true,
  vignette: true,
  selectedIndex: 0,
  sizeId: 'portrait',
};

/** The export size currently chosen in the size picker. */
function currentSize() {
  return EXPORT_SIZES.find((size) => size.id === state.sizeId) ?? EXPORT_SIZES[0];
}

/** Repaints the preview canvas at the chosen size's aspect, capped for speed. */
function redrawPreview() {
  const size = currentSize();
  const scale = Math.min(1, 880 / size.width, 880 / size.height);
  preview.width = Math.round(size.width * scale);
  preview.height = Math.round(size.height * scale);
  drawCoverArt(previewCtx, state, preview.width, preview.height);
}

/** Loads an image file or URL into a slot, then repaints. */
function loadIntoSlot(index, source) {
  const image = new Image();
  image.onload = () => {
    state.slots[index].image = image;
    state.selectedIndex = index;
    syncPanelControls();
    redrawPreview();
    setStatus(`Photo placed in panel ${index + 1}. Drag it on the cover to reframe.`);
  };
  image.onerror = () => setStatus('That file could not be read as an image.');
  image.src = source;
}

/** Shows a short-lived line of feedback under the export button. */
function setStatus(message) {
  statusLine.textContent = message;
}

/** Fills the layout picker from the layout table. */
function buildLayoutPicker() {
  const picker = document.getElementById('layout-picker');
  for (const layout of COVER_LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.dataset.layout = layout.id;
    button.innerHTML = `<strong>${layout.name}</strong><span>${layout.hint}</span>`;
    button.addEventListener('click', () => {
      state.layout = layout.id;
      state.selectedIndex = 0;
      markActiveChips();
      syncPanelControls();
      redrawPreview();
    });
    picker.appendChild(button);
  }
}

/** Fills a select element with the grade table, plus an optional inherit entry. */
function fillGradeSelect(select, includeInherit) {
  if (includeInherit) {
    const inherit = document.createElement('option');
    inherit.value = '';
    inherit.textContent = 'Same as cover grade';
    select.appendChild(inherit);
  }
  for (const grade of COLOUR_GRADES) {
    const option = document.createElement('option');
    option.value = grade.id;
    option.textContent = grade.name;
    select.appendChild(option);
  }
}

/** Fills the export size picker. */
function buildSizePicker() {
  const picker = document.getElementById('size-picker');
  for (const size of EXPORT_SIZES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip small';
    button.dataset.size = size.id;
    button.innerHTML = `<strong>${size.name}</strong><span>${size.width} × ${size.height}</span>`;
    button.addEventListener('click', () => {
      state.sizeId = size.id;
      markActiveChips();
      redrawPreview();
    });
    picker.appendChild(button);
  }
}

/** Highlights the chips that match the current layout and size. */
function markActiveChips() {
  document.querySelectorAll('#layout-picker .chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.layout === state.layout);
  });
  document.querySelectorAll('#size-picker .chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.size === state.sizeId);
  });
}

/** Rebuilds the panel strip: one thumbnail button per panel of the layout. */
function buildPanelStrip() {
  const strip = document.getElementById('panel-strip');
  strip.innerHTML = '';
  const panels = panelsForLayout(state.layout);
  panels.forEach((panel, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panel-thumb';
    if (index === state.selectedIndex) button.classList.add('active');
    button.innerHTML = `<span class="thumb-num">${index + 1}</span><span class="thumb-label">${state.slots[index].image ? 'Photo set' : panel.label}</span>`;
    button.addEventListener('click', () => {
      state.selectedIndex = index;
      buildPanelStrip();
      syncPanelControls();
      redrawPreview();
    });
    button.addEventListener('dragover', (event) => {
      event.preventDefault();
      button.classList.add('drop-hint');
    });
    button.addEventListener('dragleave', () => button.classList.remove('drop-hint'));
    button.addEventListener('drop', (event) => {
      event.preventDefault();
      button.classList.remove('drop-hint');
      const file = event.dataTransfer.files[0];
      if (file) loadIntoSlot(index, URL.createObjectURL(file));
    });
    strip.appendChild(button);
  });
}

/** Copies the selected slot's framing into the panel controls. */
function syncPanelControls() {
  const slot = state.slots[state.selectedIndex] ?? state.slots[0];
  document.getElementById('panel-zoom').value = String(slot.zoom);
  document.getElementById('panel-grade').value = slot.gradeId;
  document.getElementById('panel-heading').textContent = `Panel ${state.selectedIndex + 1} of ${panelsForLayout(state.layout).length}`;
  buildPanelStrip();
}

/** Which panel of the current layout sits under a preview point, or -1. */
function panelIndexAt(clientX, clientY) {
  const rect = preview.getBoundingClientRect();
  const nx = (clientX - rect.left) / rect.width;
  const ny = (clientY - rect.top) / rect.height;
  const panels = panelsForLayout(state.layout);
  let best = -1;
  let bestDistance = Infinity;
  panels.forEach((panel, index) => {
    const bounds = polygonBounds(panel.points);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    if (nx >= bounds.minX && nx <= bounds.maxX && ny >= bounds.minY && ny <= bounds.maxY) {
      const distance = (nx - cx) ** 2 + (ny - cy) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
  });
  return best;
}

/** Pointer handling on the preview: click selects, drag reframes the photo. */
function wirePreviewPointer() {
  let drag = null;
  preview.addEventListener('pointerdown', (event) => {
    const index = panelIndexAt(event.clientX, event.clientY);
    if (index < 0) return;
    if (index !== state.selectedIndex) {
      state.selectedIndex = index;
      syncPanelControls();
    }
    drag = { x: event.clientX, y: event.clientY, moved: false };
    preview.setPointerCapture(event.pointerId);
  });
  preview.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = preview.getBoundingClientRect();
    const slot = state.slots[state.selectedIndex];
    const dx = (event.clientX - drag.x) / rect.width;
    const dy = (event.clientY - drag.y) / rect.height;
    if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
    if (drag.moved && slot.image) {
      slot.panX = Math.max(-0.6, Math.min(0.6, slot.panX + dx));
      slot.panY = Math.max(-0.6, Math.min(0.6, slot.panY + dy));
      drag.x = event.clientX;
      drag.y = event.clientY;
      redrawPreview();
    }
  });
  preview.addEventListener('pointerup', () => {
    drag = null;
    redrawPreview();
  });
  preview.addEventListener('wheel', (event) => {
    const slot = state.slots[state.selectedIndex];
    if (!slot.image) return;
    event.preventDefault();
    slot.zoom = Math.max(1, Math.min(3.2, slot.zoom * (event.deltaY < 0 ? 1.07 : 0.93)));
    document.getElementById('panel-zoom').value = String(slot.zoom);
    redrawPreview();
  }, { passive: false });
  preview.addEventListener('dragover', (event) => event.preventDefault());
  preview.addEventListener('drop', (event) => {
    event.preventDefault();
    const index = panelIndexAt(event.clientX, event.clientY);
    const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    if (files.length === 1 && index >= 0) {
      loadIntoSlot(index, URL.createObjectURL(files[0]));
      return;
    }
    files.slice(0, panelsForLayout(state.layout).length).forEach((file, i) => {
      loadIntoSlot(i, URL.createObjectURL(file));
    });
    setStatus(`${files.length} photos spread across the panels.`);
  });
}

/** Renders the cover at full export size and downloads it as a PNG. */
function exportCoverPng() {
  const size = currentSize();
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const exportState = { ...state, selectedIndex: -1 };
  drawCoverArt(canvas.getContext('2d'), exportState, size.width, size.height);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vice-panels-cover-${size.width}x${size.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    setStatus(`Saved vice-panels-cover-${size.width}x${size.height}.png — ready to post.`);
  }, 'image/png');
}

/** Connects every control on the page to the state. */
function wireControls() {
  const bindText = (id, key) => {
    document.getElementById(id).addEventListener('input', (event) => {
      state[key] = event.target.value;
      redrawPreview();
    });
  };
  bindText('title-input', 'title');
  bindText('subtitle-input', 'subtitle');
  bindText('caption-input', 'caption');
  bindText('badge-input', 'badge');
  document.getElementById('stars-input').addEventListener('input', (event) => {
    state.stars = Number(event.target.value);
    redrawPreview();
  });
  document.getElementById('grade-select').addEventListener('change', (event) => {
    state.gradeId = event.target.value;
    redrawPreview();
  });
  document.getElementById('grade-strength').addEventListener('input', (event) => {
    state.gradeStrength = Number(event.target.value);
    redrawPreview();
  });
  document.getElementById('grain-input').addEventListener('change', (event) => {
    state.grain = event.target.checked;
    redrawPreview();
  });
  document.getElementById('vignette-input').addEventListener('change', (event) => {
    state.vignette = event.target.checked;
    redrawPreview();
  });
  document.getElementById('panel-zoom').addEventListener('input', (event) => {
    state.slots[state.selectedIndex].zoom = Number(event.target.value);
    redrawPreview();
  });
  document.getElementById('panel-grade').addEventListener('change', (event) => {
    state.slots[state.selectedIndex].gradeId = event.target.value;
    redrawPreview();
  });
  document.getElementById('panel-photo').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) loadIntoSlot(state.selectedIndex, URL.createObjectURL(file));
    event.target.value = '';
  });
  document.getElementById('bulk-photo').addEventListener('change', (event) => {
    const files = [...event.target.files].filter((file) => file.type.startsWith('image/'));
    files.slice(0, panelsForLayout(state.layout).length).forEach((file, i) => {
      loadIntoSlot(i, URL.createObjectURL(file));
    });
    event.target.value = '';
  });
  document.getElementById('fill-one').addEventListener('click', () => {
    const source = state.slots.find((slot) => slot.image);
    if (!source) {
      setStatus('Add one photo first, then spread it across every panel.');
      return;
    }
    state.slots.forEach((slot) => {
      slot.image = source.image;
    });
    redrawPreview();
    setStatus('One photo now fills every panel — reframe each panel for variety.');
  });
  document.getElementById('demo-button').addEventListener('click', () => loadDemoCast());
  document.getElementById('export-button').addEventListener('click', exportCoverPng);
}

/** Loads the bundled demo photographs so the app shows a finished cover at once. */
async function loadDemoCast(cast = ['hero', 'rooftop', 'neon', 'pier', 'neon', 'hero', 'pier', 'rooftop', 'neon']) {
  const panels = panelsForLayout(state.layout);
  await Promise.all(panels.map((panel, index) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      state.slots[index].image = image;
      resolve();
    };
    image.onerror = () => resolve();
    image.src = `samples/${cast[index % cast.length]}.jpg`;
  })));
  redrawPreview();
}

/** Starts the editor, or the fixed screenshot scene when ?shot= is present. */
async function startEditor() {
  buildLayoutPicker();
  buildSizePicker();
  fillGradeSelect(document.getElementById('grade-select'), false);
  fillGradeSelect(document.getElementById('panel-grade'), true);
  document.getElementById('grade-select').value = state.gradeId;
  wireControls();
  wirePreviewPointer();
  markActiveChips();
  syncPanelControls();
  const query = new URLSearchParams(location.search);
  const isShot = await runShotScene(query, async (wording, cast) => {
    state.layout = wording.layout;
    state.sizeId = wording.size;
    state.gradeId = wording.grade;
    state.title = wording.title;
    state.subtitle = wording.subtitle;
    state.caption = wording.caption;
    state.badge = wording.badge;
    state.stars = wording.stars;
    document.getElementById('grade-select').value = state.gradeId;
    document.getElementById('title-input').value = state.title;
    document.getElementById('subtitle-input').value = state.subtitle;
    document.getElementById('caption-input').value = state.caption;
    document.getElementById('badge-input').value = state.badge;
    state.selectedIndex = query.get('shot') === 'cover' ? -1 : 0;
    markActiveChips();
    await loadDemoCast(cast);
    syncPanelControls();
  });
  if (!isShot) await loadDemoCast();
  redrawPreview();
}

startEditor();
