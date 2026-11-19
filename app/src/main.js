// Leonida Cover Forge wiring: photo slots, layout/grade/size pickers, words, export.
// A `?shot=` query instead stages a fixed scene for a screenshot (see ./shots.js).
import { drawCover, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = ['beach.jpg', 'downtown.jpg', 'swamp.jpg', 'boardwalk.jpg'];

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const ribbonInput = document.getElementById('ribbon');

const state = {
  photos: [null, null, null, null],
  layout: 'hero',
  grade: 'sunset',
  title: titleInput.value,
  subtitle: subtitleInput.value,
  ribbon: ribbonInput.value,
  zoom: [1, 1, 1, 1],
  panX: [0, 0, 0, 0],
  panY: [0, 0, 0, 0],
  size: '1080x1080',
};

function redraw() {
  drawCover(canvas, state);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('could not read that file'));
    reader.readAsDataURL(file);
  });
}

/** Builds the four photo slot cards: file picker, sample button, zoom and pan sliders. */
function buildSlots() {
  const host = document.getElementById('slots');
  SAMPLES.forEach((sample, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    const head = document.createElement('div');
    head.className = 'slot-head';
    const label = document.createElement('strong');
    label.textContent = `Photo ${i + 1}`;
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.setAttribute('aria-label', `Photo ${i + 1} file`);
    file.addEventListener('change', async () => {
      const chosen = file.files[0];
      if (!chosen) return;
      try {
        state.photos[i] = await loadImage(await readFile(chosen));
        redraw();
      } catch {
        status.textContent = `Photo ${i + 1}: that file could not be read.`;
      }
    });
    head.append(label, file);
    const sliders = document.createElement('div');
    sliders.className = 'sliders';
    const specs = [
      ['Zoom', 1, 3, 0.05, (v) => { state.zoom[i] = v; }],
      ['Pan X', -1, 1, 0.05, (v) => { state.panX[i] = v; }],
      ['Pan Y', -1, 1, 0.05, (v) => { state.panY[i] = v; }],
    ];
    for (const [name, min, max, step, apply] of specs) {
      const lab = document.createElement('label');
      lab.textContent = name;
      const range = document.createElement('input');
      range.type = 'range';
      range.min = String(min);
      range.max = String(max);
      range.step = String(step);
      range.value = String(name === 'Zoom' ? 1 : 0);
      range.setAttribute('aria-label', `Photo ${i + 1} ${name}`);
      range.addEventListener('input', () => {
        apply(Number(range.value));
        redraw();
      });
      sliders.append(lab, range);
    }
    const sampleBtn = document.createElement('button');
    sampleBtn.type = 'button';
    sampleBtn.className = 'sample-btn';
    sampleBtn.textContent = `Use sample: ${sample.replace('.jpg', '')}`;
    sampleBtn.addEventListener('click', async () => {
      try {
        state.photos[i] = await loadImage(`./samples/${sample}`);
        redraw();
      } catch {
        status.textContent = `Sample ${sample} could not be loaded.`;
      }
    });
    slot.append(head, sliders, sampleBtn);
    host.append(slot);
  });
}

/** One group of picker buttons: exactly one stays picked, and it sets `key`. */
function wirePicker(id, key) {
  const group = document.getElementById(id);
  group.addEventListener('click', (event) => {
    const btn = event.target.closest('button');
    if (!btn) return;
    for (const b of group.querySelectorAll('button')) b.classList.remove('picked');
    btn.classList.add('picked');
    state[key] = btn.dataset[key];
    if (key === 'size') applySize();
    redraw();
  });
}

/** Resizes the canvas to the picked export size, keeping what is drawn. */
function applySize() {
  const [w, h] = state.size.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
}

function wireWords() {
  titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
  subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
  ribbonInput.addEventListener('input', () => { state.ribbon = ribbonInput.value; redraw(); });
}

document.getElementById('export').addEventListener('click', () => {
  applySize();
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed in this browser.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved leonida-cover-${state.size}.png`;
  }, 'image/png');
});

document.getElementById('fill-samples').addEventListener('click', async () => {
  try {
    state.photos = await Promise.all(SAMPLES.map((s) => loadImage(`./samples/${s}`)));
    redraw();
    status.textContent = 'Sample scenes loaded.';
  } catch {
    status.textContent = 'A sample scene could not be loaded.';
  }
});

document.getElementById('reset-all').addEventListener('click', () => {
  state.photos = [null, null, null, null];
  state.zoom = [1, 1, 1, 1];
  state.panX = [0, 0, 0, 0];
  state.panY = [0, 0, 0, 0];
  redraw();
  status.textContent = 'Reset.';
});

buildSlots();
wirePicker('layouts', 'layout');
wirePicker('grades', 'grade');
wirePicker('sizes', 'size');
wireWords();

// Keep the picker labels honest: a layout or grade the renderer does not know is
// never offered, so a stale button cannot pick a dead option.
for (const b of document.querySelectorAll('#layouts button')) b.hidden = !(b.dataset.layout in LAYOUTS);
for (const b of document.querySelectorAll('#grades button')) b.hidden = !(b.dataset.grade in GRADES);

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  runShot(query, state, loadImage, applySize, redraw);
} else {
  redraw();
}
