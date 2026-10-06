// packs/*.json 을 pack.schema.json 으로 검증
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ajv = new Ajv({ allErrors: true }); addFormats(ajv);
const validate = ajv.compile(JSON.parse(fs.readFileSync(path.join(root, 'schema/pack.schema.json'), 'utf8')));
let bad = 0;
for (const f of fs.readdirSync(path.join(root, 'packs')).filter(f => f.endsWith('.json'))) {
  const ok = validate(JSON.parse(fs.readFileSync(path.join(root, 'packs', f), 'utf8')));
  console.log(ok ? `✅ ${f}` : `❌ ${f}\n` + validate.errors.map(e => `  - ${e.instancePath} ${e.message}`).join('\n'));
  if (!ok) bad++;
}
process.exit(bad ? 1 : 0);
