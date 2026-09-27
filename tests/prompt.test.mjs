import assert from 'node:assert/strict';
import test from 'node:test';
import { parseReply } from '../src/ai/prompt.ts';
import { encodePrst } from '../src/prst.ts';

test('Given a fractional modulation rate, when importing an AI reply, then the rate keeps its tenths', () => {
  const suggestion = parseReply(JSON.stringify({ blocks: [{ module: 'MOD', model: 'G-Chorus', params: [{ name: 'Rate', value: 0.5 }] }] }), [], []);
  assert.equal(suggestion.blocks[0].params[0].value, 0.5);
  const bytes = encodePrst(suggestion.blocks, 'Fractional');
  assert.equal(new DataView(bytes.buffer).getFloat32(160 + 7 * 72 + 16, true), 0.5);
});

test('Given tempo sync enabled, when importing and exporting, then the user is warned and a mismatched time encoding is rejected', () => {
  const suggestion = parseReply(JSON.stringify({ blocks: [{ module: 'DLY', model: 'Dual Echo', params: [{ name: 'Time A', value: 643 }, { name: 'Sync A', value: 1 }] }] }), [], []);
  assert.match(suggestion.warnings.join(' '), /Sync A.*OFF/);
  assert.throws(() => encodePrst(suggestion.blocks, 'Sync'), /Tempo sync is not supported/);
});
