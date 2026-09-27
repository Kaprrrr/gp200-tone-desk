import assert from 'node:assert/strict';
import test from 'node:test';
import catalog from '../shared/catalog.json' with { type: 'json' };

test('Given models whose control order differs from storage, when loading the catalog, then it addresses hardware IDs', () => {
  const cases = [
    ['DLY', 'Dual Echo', { 'Time A': 2, 'Feedback A': 1, 'Time B': 5, 'Feedback B': 4 }],
    ['DLY', 'Ping Pong', { Time: 2, Feedback: 1 }],
    ['DLY', 'Sweep Echo', { Time: 2, Feedback: 1 }],
    ['DLY', 'Ring Echo', { Time: 2, Feedback: 1 }],
    ['DLY', 'Vintage Rack', { Time: 2, Feedback: 1 }],
    ['DLY', 'Slapback', { Trail: 4 }],
    ['DLY', 'Lofi Echo', { Sync: 6, Trail: 7 }],
    ['PRE', 'Pitch', { 'Hi Vol': 4, 'Low Vol': 5 }],
    ['PRE', 'Harmonizer 1', { 'Smooth Mode': 5 }],
    ['PRE', 'Harmonizer 2', { 'Smooth Mode': 6 }],
    ['DST', 'Black Bass', { 'Hi-mid': 6, Treble: 8, Attack: 9 }],
    ['AMP', 'EV 51', { Presence: 6 }],
  ];
  for (const [module, model, expected] of cases) {
    const entry = catalog.modules[module].find((e) => e.name === model);
    for (const [name, id] of Object.entries(expected)) assert.equal(entry.params.find((p) => p.name === name).id, id, `${module} ${model} ${name}`);
  }
  for (const cab of catalog.modules.CAB) {
    assert.deepEqual(cab.params.map(({ name, id }) => [name, id]), [['Volume', 1], ['Low Cut', 5], ['High Cut', 6]], cab.name);
  }
});

test('Given the generated catalog, when using model defaults, then every ID and value is valid', () => {
  for (const entries of Object.values(catalog.modules)) for (const entry of entries) {
    const ids = new Set();
    for (const param of entry.params) {
      const label = `${entry.module} ${entry.name} ${param.name}`;
      assert.ok(Number.isInteger(param.id) && param.id >= 0 && param.id < 15 && !ids.has(param.id), label);
      ids.add(param.id);
      assert.ok(Number.isFinite(param.default) && param.default >= param.min && param.default <= param.max, label);
      if (param.options) assert.ok(Number.isInteger(param.default), label);
    }
  }
  assert.equal(catalog.modules.MOD.find((e) => e.name === 'Detune').params[0].default, -25);
  assert.equal(catalog.modules.DLY.find((e) => e.name === 'Slapback').params.some((p) => p.name === 'Sync'), false);
});
