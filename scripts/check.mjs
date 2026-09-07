import { readFile } from 'node:fs/promises';

const files = ['dist/index.html', 'dist/styles.css', 'dist/app.js', 'dist/lib.js'];
for (const file of files) {
  const content = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  if (!content.trim()) throw new Error(`${file} is empty`);
}
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
for (const marker of ['id="search-form"', 'id="study-list"', 'id="phase-chart"', 'id="map-visual"']) {
  if (!html.includes(marker)) throw new Error(`Missing ${marker}`);
}
console.log('Static build is complete and required surfaces are present.');
