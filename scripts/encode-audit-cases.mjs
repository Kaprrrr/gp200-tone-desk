// Offline only: encode the independent XML audit's test vectors, never open MIDI.
import { readFileSync, writeFileSync } from 'node:fs';
import { encodePrst } from '../src/prst.ts';
import { PRST_TEMPLATE_B64 } from '../src/prstTemplate.ts';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node --experimental-transform-types scripts/encode-audit-cases.mjs INPUT OUTPUT');
const cases = JSON.parse(readFileSync(input, 'utf8'));
const results = cases.map((item) => {
  try { return { name: item.name, prst: Buffer.from(encodePrst([item.block], 'Audit')).toString('base64') }; }
  catch (error) { return { name: item.name, error: error.message }; }
});
writeFileSync(output, JSON.stringify({ template: PRST_TEMPLATE_B64, results }));
