// Wires the Vice Panels editor: three photo slots, per-panel crops, grades and
// sizes, a live preview, and a PNG export. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).
import { drawCover, SIZES, GRADES, SAMPLES, panelCount } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const sizeLabel = document.getElementById('sizeLabel');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');

// The editor's state. Each panel names the photo slot it shows and how that
// photo is cropped inside it: zoom in, and shift it sideways or up and down.
const state = {
  sizeKey: 'landscape',
  layout: 'trio',
  gradeKey: 'sunset',
  caption: 'VICE HEIST',
  subtitle: 'WELCOME TO VICE CITY',
  slots: [null, null, null],
  panels: [
    { slot: 0, zoom: 1.15, ox: 0, oy: 0 },
    { slot: 1, zoom: 1.1, ox: 0, oy: 0 },
    { slot: 2, zoom: 1.25, ox: 0.2, oy: 0.3 },
  ],
};

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSlot(index, url, name) {
  state.slots[index] = { img: await loadImage(url), name };
}

function panelImages() {
  // One image per panel, in panel order. A panel whose slot is empty reuses
  // the first loaded photo, so a single photo still fills every panel.
  const first = state.slots.find((s) => s);
  return state.panels.map((panel) => {
    const slot = state.slots[panel.slot] ?? first;
    return slot ? slot.img : null;
  });
}

function redraw() {
  const [w, h] = SIZES[state.sizeKey];
  drawCover(canvas, panelImages(), {
    sizeKey: state.sizeKey,
    layout: state.layout,
    gradeKey: state.gradeKey,
    caption: state.caption,
    subtitle: state.subtitle,
    panels: state.panels,
  });
  sizeLabel.textContent = `${w} × ${h} PNG`;
}

function renderSlots() {
  const host = document.getElementById('slots');
  host.textContent = '';
  state.slots.forEach((slot, i) => {
    const card = document.createElement('div');
    card.className = 'slot';
    const thumb = document.createElement('span');
    thumb.className = 'thumb';
    if (slot) {
      thumb.style.backgroundImage = `url(${slot.img.src})`;
      thumb.textContent = '';
    } else {
      thumb.textContent = '—';
    }
    const name = document.createElement('span');
    name.className = 'slot-name';
    name.textContent = slot ? `Photo ${i + 1}: ${slot.name}` : `Photo ${i + 1}: Empty`;
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.setAttribute('aria-label', `Choose photo ${i + 1}`);
    picker.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await loadSlot(i, URL.createObjectURL(file), file.name);
      renderSlots();
      redraw();
    });
    const sample = document.createElement('button');
    sample.type = 'button';
    sample.className = 'mini';
    sample.textContent = 'Use sample';
    sample.addEventListener('click', async () => {
      const choice = SAMPLES[i % SAMPLES.length];
      await loadSlot(i, `samples/${choice}.jpg`, `${choice}.jpg`);
      renderSlots();
      redraw();
    });
    card.append(thumb, name, picker, sample);
    host.append(card);
  });
}

function renderPanels() {
  const host = document.getElementById('panels');
  host.textContent = '';
  const count = panelCount(state.layout);
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i];
    const box = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = `Panel ${i + 1}`;
    box.append(legend);
    const pick = document.createElement('select');
    pick.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    state.slots.forEach((slot, s) => {
      const option = document.createElement('option');
      option.value = String(s);
      option.textContent = slot ? `Photo ${s + 1}: ${slot.name}` : `Photo ${s + 1}: Empty`;
      pick.append(option);
    });
    pick.value = String(panel.slot);
    pick.addEventListener('change', () => {
      panel.slot = Number(pick.value);
      redraw();
    });
    box.append(pick);
    const sliders = [
      ['Zoom', 'zoom', 1, 2, 0.05],
      ['Shift sideways', 'ox', -1, 1, 0.05],
      ['Shift up and down', 'oy', -1, 1, 0.05],
    ];
    for (const [label, key, min, max, step] of sliders) {
      const row = document.createElement('label');
      row.className = 'slider';
      row.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(panel[key]);
      input.addEventListener('input', () => {
        panel[key] = Number(input.value);
        redraw();
      });
      row.append(input);
      box.append(row);
    }
    host.append(box);
  }
}

function renderChips() {
  const gradeHost = document.getElementById('grades');
  gradeHost.textContent = '';
  for (const [key, grade] of Object.entries(GRADES)) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${key === state.gradeKey ? ' on' : ''}`;
    chip.textContent = grade.label;
    chip.addEventListener('click', () => {
      state.gradeKey = key;
      renderChips();
      redraw();
    });
    gradeHost.append(chip);
  }
  const sizeHost = document.getElementById('sizes');
  sizeHost.textContent = '';
  for (const key of Object.keys(SIZES)) {
    const [w, h] = SIZES[key];
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${key === state.sizeKey ? ' on' : ''}`;
    chip.textContent = `${w} × ${h}`;
    chip.addEventListener('click', () => {
      state.sizeKey = key;
      renderChips();
      redraw();
    });
    sizeHost.append(chip);
  }
}

document.getElementById('layout').addEventListener('change', (e) => {
  state.layout = e.target.value;
  renderPanels();
  redraw();
});
captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});
document.getElementById('export').addEventListener('click', () => {
  const [w, h] = SIZES[state.sizeKey];
  const name = `vice-panels-${w}x${h}.png`;
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    status.textContent = `Saved ${name}`;
  }, 'image/png');
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (setup) => {
    state.sizeKey = setup.sizeKey;
    state.layout = setup.layout;
    state.gradeKey = setup.gradeKey;
    state.caption = setup.caption;
    state.subtitle = setup.subtitle;
    captionInput.value = setup.caption;
    subtitleInput.value = setup.subtitle;
    document.getElementById('layout').value = setup.layout;
    state.slots = [null, null, null];
    for (let i = 0; i < setup.photos.length && i < 3; i++) {
      await loadSlot(i, setup.photos[i], setup.photos[i].split('/').pop());
    }
    state.panels = [
      { slot: 0, zoom: 1.15, ox: 0, oy: 0 },
      { slot: 1, zoom: 1.1, ox: 0, oy: 0 },
      { slot: 2, zoom: 1.25, ox: 0.2, oy: 0.3 },
    ];
    renderSlots();
    renderPanels();
    renderChips();
    redraw();
  });
} else {
  // Open with the three samples loaded, so the cover is there at once.
  Promise.all(SAMPLES.map((name, i) => loadSlot(i, `samples/${name}.jpg`, `${name}.jpg`)))
    .catch(() => {})
    .finally(() => {
      renderSlots();
      renderPanels();
      renderChips();
      redraw();
    });
}
