import { readFileSync, writeFileSync } from 'node:fs';
import { Assembly, unframe, frame, writePayload, presetFromPrst } from '../src/midi/protocol.ts';
const rows = readFileSync('data/editor-controls.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
let chunks = [];
for (const r of rows) {
  if (r.dir !== 'out') continue;
  const raw = Uint8Array.from(r.hex.split(' ').map(x => parseInt(x, 16)));
  const p = unframe(raw);
  if (p?.total !== 1184) continue;
  chunks.push(raw);
  if (chunks.length === 7) break;
}
writeFileSync('tests/fixtures/import-58-A.json', JSON.stringify(chunks.map(c => Buffer.from(c).toString('hex').match(/../g).join(' ')), null, 2) + '\n');
const expected = frame(writePayload(presetFromPrst(new Uint8Array(readFileSync('data/control-test.prst')), 228), 228));
for (let i = 0; i < 7; i++) console.log(i, 'length', chunks[i].length, expected[i].length, 'diff', [...chunks[i]].flatMap((b,j) => b === expected[i][j] ? [] : [{at:j, captured:b, generated:expected[i][j]}]));
const recent = readFileSync('data/hardware-check.jsonl', 'utf8').trim().split('\n').map(JSON.parse).filter(r=>r.t>1790448110);
for(const r of recent) {
  const raw = Uint8Array.from(r.hex.split(' ').map(x=>parseInt(x,16)));
  const p = unframe(raw);
  console.log(r.t, r.dir, raw.length, p?.total, p?.offset, p && Buffer.from(p.data.slice(0,36)).toString('hex'));
}
