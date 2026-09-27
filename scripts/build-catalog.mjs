// Builds shared/catalog.json from the GP-200 editor's algorithm.xml (the
// authoritative effect/param list for the installed firmware), enriched with
// the "based on" notes from gp-patch-lab's knowledge base.
//
// Usage: node scripts/build-catalog.mjs [path/to/algorithm.xml]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const xmlPath = process.argv[2] ?? path.join(here, 'algorithm.xml');
// Commented controls are not exposed by the official editor (Slapback Sync).
const xml = fs.readFileSync(xmlPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');

const attrs = (tag) => {
  const out = {};
  for (const m of tag.matchAll(/(\w[\w-]*)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
};

// "based on" lookup from the knowledge base (name -> { basedOn, type, description })
const kbSrc = fs.readFileSync(path.join(here, 'knowledge-base.ts'), 'utf8');
const basedOn = new Map();
for (const m of kbSrc.matchAll(/\{\s*name:\s*'([^']+)',\s*type:\s*'([^']+)',\s*basedOn:\s*'([^']*)'(?:,\s*description:\s*'([^']*)')?/g)) {
  basedOn.set(m[1].toLowerCase(), { type: m[2], basedOn: m[3], description: m[4] });
}

const modules = {};
for (const alg of xml.matchAll(/<Alg\b([^>]*)>([\s\S]*?)<\/Alg>/g)) {
  const a = attrs(alg[1]);
  const params = [];
  for (const p of alg[2].matchAll(/<(Knob|Slider|Switch|Combox)\b([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/g)) {
    const pa = attrs(p[2]);
    // ID addresses the stored parameter; idx only orders the editor controls.
    // They differ for cabinets and several delays (including time vs feedback).
    const param = { id: Number(pa.ID), name: pa.Name, kind: p[1].toLowerCase(), default: Number.parseFloat(pa.default) };
    if (p[1] === 'Knob' || p[1] === 'Slider') {
      param.min = Number(pa.Dmin);
      param.max = Number(pa.Dmax);
      param.step = Number(pa.step ?? 1);
    } else {
      param.options = [...(p[4] ?? '').matchAll(/<Menu\b([^>]*)\/>/g)].map((m) => attrs(m[1]).Name);
      param.min = 0;
      param.max = param.options.length - 1;
      if (p[1] === 'Switch' && /sync/i.test(pa.Name)) param.tempoSync = true;
    }
    if (!Number.isInteger(param.id) || param.id < 0 || param.id >= 15 || params.some((x) => x.id === param.id)) {
      throw new Error(`${a.Module} ${a.Name}: invalid or duplicate parameter ID for ${param.name}`);
    }
    // Detune's XML default includes a unit suffix ("-25 Cents"). Never emit NaN/null.
    if (!Number.isFinite(param.default) || param.default < param.min || param.default > param.max
      || (param.options && !Number.isInteger(param.default))) {
      throw new Error(`${a.Module} ${a.Name}: invalid default for ${param.name}`);
    }
    params.push(param);
  }
  const kb = basedOn.get(a.Name.toLowerCase());
  const entry = { name: a.Name, module: a.Module, code: Number(a.Code), index: Number(a.Index), params };
  if (a.Name === 'User IR') {
    // The 20 User IR entries map in order to the pedal's IR slots 0-19
    entry.irSlot = (modules.CAB ?? []).filter((e) => e.name === 'User IR').length;
  } else if (a.Name === 'SnapTone') {
    // AMP SnapTone codes are 0x0F000000..04 (pedal slots 0-4), DST are ..05..09 (slots 5-9)
    entry.snaptoneSlot = Number(a.Code) - 0x0f000000;
  } else if (kb) {
    entry.type = kb.type;
    entry.basedOn = kb.basedOn;
    if (kb.description) entry.description = kb.description;
  }
  (modules[a.Module] ??= []).push(entry);
}

fs.mkdirSync(path.join(root, 'shared'), { recursive: true });
fs.writeFileSync(path.join(root, 'shared', 'catalog.json'), JSON.stringify({ source: path.basename(xmlPath), modules }, null, 1));
const summary = Object.entries(modules).map(([m, list]) => `${m}:${list.length}`).join(' ');
const withInfo = Object.values(modules).flat().filter((e) => e.basedOn).length;
console.log(`catalog written - ${summary} (${withInfo} with "based on" info)`);
