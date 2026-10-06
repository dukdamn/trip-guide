#!/usr/bin/env node
// MD(또는 trip.json) → 데이터가 들어간 HTML 파일 하나
// 사용: node tools/build-html.mjs trips/danang-2026.md [-o dist/danang-2026.html] [--resolve]
import fs from 'fs';
import path from 'path';
import { parseTripMd, resolveShortLinks } from './md2json.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const input = args.find((a, i) => !a.startsWith('-') && args[i - 1] !== '-o');
if (!input) { console.error('사용법: node tools/build-html.mjs <trip.md|trip.json> [-o out.html] [--resolve]'); process.exit(1); }

const packs = {};
for (const f of fs.readdirSync(path.join(root, 'packs')).filter(f => f.endsWith('.json')))
  packs[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(root, 'packs', f), 'utf8'));

let trip;
if (input.endsWith('.json')) trip = JSON.parse(fs.readFileSync(input, 'utf8'));
else {
  const r = parseTripMd(fs.readFileSync(input, 'utf8'), { packs });
  r.warnings.forEach(w => console.error('⚠️  ' + w));
  if (r.errors.length) { console.error('❌ ' + r.errors.join('\n❌ ')); process.exit(2); }
  trip = r.trip;
  if (args.includes('--resolve')) { const x = await resolveShortLinks(trip); console.error(`🔗 짧은 링크 ${x.total}개 중 ${x.ok}개 좌표 채움`); }
}

// </script> 가 데이터 안에 있어도 깨지지 않게
const inline = (obj) => obj ? JSON.stringify(obj).replace(/</g, '\\u003c') : '';
let html = fs.readFileSync(path.join(root, 'template.html'), 'utf8');
html = html
  .replace('<script type="application/json" id="trip-data"></script>', `<script type="application/json" id="trip-data">${inline(trip)}</script>`)
  .replace('<script type="application/json" id="pack-data"></script>', `<script type="application/json" id="pack-data">${inline(packs[trip.meta.country])}</script>`)
  .replace('<html lang="ko">', `<html lang="${trip.meta.lang ?? 'ko'}">`)
  .replace('<title>Travel Guide</title>', `<title>${trip.meta.title.replace(/</g, '&lt;')}</title>`);

const slug = trip.meta.id ?? path.basename(input).replace(/\.(md|json)$/, '');
const out = args.includes('-o') ? args[args.indexOf('-o') + 1] : path.join(root, 'dist', `${slug}.html`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.error(`✅ ${out} (${(html.length / 1024).toFixed(0)}KB)`);
