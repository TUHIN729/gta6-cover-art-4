// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor the
// whole editor. Query knobs: layout, grade, size, title, subtitle, ribbon, photos
// (a comma list of sample names, in slot order). window.__shotReady is set once
// the scene has been painted, so a screenshot tool knows when to capture.
import { LAYOUTS, GRADES } from './cover.js';

const SAMPLES = ['beach.jpg', 'downtown.jpg', 'swamp.jpg', 'boardwalk.jpg'];

export async function runShot(query, state, loadImage, applySize, redraw) {
  const shot = query.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const layout = query.get('layout');
  if (layout && layout in LAYOUTS) {
    state.layout = layout;
    for (const b of document.querySelectorAll('#layouts button')) b.classList.toggle('picked', b.dataset.layout === layout);
  }
  const grade = query.get('grade');
  if (grade && grade in GRADES) {
    state.grade = grade;
    for (const b of document.querySelectorAll('#grades button')) b.classList.toggle('picked', b.dataset.grade === grade);
  }
  const size = query.get('size');
  if (size && /^\d+x\d+$/.test(size)) {
    state.size = size;
    for (const b of document.querySelectorAll('#sizes button')) b.classList.toggle('picked', b.dataset.size === size);
  }
  const title = query.get('title');
  if (title !== null) {
    state.title = title;
    document.getElementById('title').value = title;
  }
  const subtitle = query.get('subtitle');
  if (subtitle !== null) {
    state.subtitle = subtitle;
    document.getElementById('subtitle').value = subtitle;
  }
  const ribbon = query.get('ribbon');
  if (ribbon !== null) {
    state.ribbon = ribbon;
    document.getElementById('ribbon').value = ribbon;
  }

  const wanted = (query.get('photos') || SAMPLES.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
  const loaded = [];
  for (let i = 0; i < 4; i++) {
    const name = wanted[i % wanted.length];
    try {
      loaded.push(await loadImage(`./samples/${name}`));
    } catch {
      loaded.push(null);
    }
  }
  state.photos = loaded;
  applySize();
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
