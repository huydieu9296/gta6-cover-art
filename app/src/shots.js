// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor
// shows the page with photos loaded. Query knobs: size (landscape/square/
// portrait), layout (trio/duo), grade (sunset/neon/dusk/clean), caption,
// subtitle, photo/photo2/photo3 (sample names under samples/). The loader the
// page passes in applies the setup, then window.__shotReady is set once painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const sizeKey = query.get('size') || 'square';
  const layout = query.get('layout') || 'trio';
  const gradeKey = query.get('grade') || 'sunset';
  const caption = query.get('caption') || 'VICE HEIST';
  const subtitle = query.get('subtitle') || 'WELCOME TO VICE CITY';
  const photos = [];
  for (const key of ['photo', 'photo2', 'photo3']) {
    const name = query.get(key);
    if (name) photos.push(`samples/${name}.jpg`);
  }
  if (photos.length === 0) photos.push('samples/pier.jpg');
  await load({ sizeKey, layout, gradeKey, caption, subtitle, photos });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
