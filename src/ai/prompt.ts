// Copy-prompt flow: build a self-contained prompt the member pastes into
// claude.ai (or another chatbot), then parse the JSON reply they paste back.
import catalogJson from '../../shared/catalog.json' with { type: 'json' };
import { MODULES, type Catalog, type CatalogEntry, type IrSlot, type ModuleId, type PatchBlock, type SnapTone, type Suggestion } from '../../shared/types.ts';
import { snapSlotLabel } from '../format.ts';

const catalog = catalogJson as unknown as Catalog;

const describeParams = (e: CatalogEntry) =>
  e.params.map((p) => (p.options ? `${p.name}[${p.options.join('/')}]` : `${p.name} ${p.min}..${p.max}`)).join(', ');

const CATALOG_TEXT = MODULES.map((m) => {
  const lines = catalog.modules[m]
    .filter((e) => e.name !== 'SnapTone' && e.name !== 'User IR')
    .map((e) => {
      const info = [e.basedOn && `based on ${e.basedOn}`, e.description].filter(Boolean).join('; ');
      // Cabs all share the same few params; list names only to keep the prompt short.
      return m === 'CAB' ? `- ${e.name}${info ? ` (${info})` : ''}` : `- ${e.name}${info ? ` (${info})` : ''} | ${describeParams(e)}`;
    });
  return `### ${m}\n${lines.join('\n')}`;
}).join('\n\n');

const CAB_PARAMS = describeParams(catalog.modules.CAB.find((e) => e.name !== 'User IR')!);
const SNAP_PARAMS = describeParams(catalog.modules.AMP.find((e) => e.name === 'SnapTone')!);

export interface SongRequest {
  title: string;
  artist: string;
  part: string;
  guitar: string;
  notes: string;
}

function describeLibrary(snaptones: SnapTone[], irs: IrSlot[]) {
  const loaded = snaptones.filter((s) => s.slot !== null).sort((a, b) => a.slot! - b.slot!);
  const snapLines = loaded.length
    ? loaded.map((s) => {
        const bits = [
          s.fullName && s.fullName !== s.pedalName && `full name "${s.fullName}"`,
          `kind: ${s.kind}`,
          s.basedOn && `based on ${s.basedOn}`,
          s.character !== 'other' && `character: ${s.character}`,
          s.tags.length && `tags: ${s.tags.join(', ')}`,
          Object.values(s.defaults).some((v) => v !== 50) &&
            `usual knobs: Gain ${s.defaults.gain}, Volume ${s.defaults.volume}, Bass ${s.defaults.bass}, Middle ${s.defaults.middle}, Treble ${s.defaults.treble}`,
          s.notes && `notes: ${s.notes}`,
        ].filter(Boolean);
        return `- slot ${s.slot} (${snapSlotLabel(s.slot!)}) "${s.pedalName}": ${bits.join('; ')}`;
      })
    : ['- (none loaded)'];
  const irLines = irs.filter((i) => !i.empty).map((i) => `- IR slot ${i.slot} (shown on pedal as IR ${i.slot + 1}) "${i.name}"${i.notes ? `: ${i.notes}` : ''}`);
  return `## My SnapTone captures on the pedal\n${snapLines.join('\n')}\n\n## My User IRs\n${irLines.join('\n') || '- (none)'}`;
}

export function buildPrompt(req: SongRequest, snaptones: SnapTone[], irs: IrSlot[]): string {
  const ask = [
    `Song: "${req.title}"${req.artist ? ` by ${req.artist}` : ''}`,
    req.part && `Part: ${req.part}`,
    req.guitar && `My guitar: ${req.guitar}`,
    req.notes && `What I'm after: ${req.notes}`,
  ].filter(Boolean).join('\n');

  return `I play a Valeton GP-200 multi-effects pedal (firmware 1.8) and want a patch that sounds like a specific song. Please design one GP-200 patch for it and reply in the exact JSON format at the end, because a tool will read your answer.

# My request
${ask}

${describeLibrary(snaptones, irs)}

# How to design the patch
- Prefer my own SnapTone captures above when one is a good match for the amp or drive pedal on the recording. Otherwise use the built-in models from the catalog below.
- Use model and parameter names exactly as written in the catalog. Leave out modules the tone doesn't need.
- Modules, in default order: PRE, WAH, DST, AMP, NR, CAB, EQ, MOD, DLY, RVB, VOL. Each module holds one model.
- Match delay times, modulation rates and mix levels to the recording (e.g. dotted-eighth at the song's tempo).
- Set every Sync switch to OFF (0). Calculate delay times in milliseconds and modulation rates in Hz; this app does not encode tempo-synced note divisions yet.

## SnapTone (NAM captures)
- Model name "SnapTone". Pedal slots 0-4 are in the AMP module, slots 5-9 in the DST module; use the slot's own module.
- Params: ${SNAP_PARAMS}.
- Gain is a clean digital trim INTO the capture, not the amp's gain knob: 0 = -24 dB, 50 = unity, 75 = +12 dB, 100 = +24 dB. Use it to push a capture from clean toward breakup. Volume uses the same scale on the output.
- The EQ is fixed and after the capture: Bass ±6 dB at 120 Hz, Middle ±6 dB at 750 Hz, Treble ±6 dB shelf at 3 kHz. It can't tighten a high-gain capture; use a boost in PRE or DST for that.
- Most NAM captures are amp-only with no cab, so pair them with a CAB model or one of my User IRs. If a capture's notes say it includes a cab, turn CAB off.

## User IRs
CAB model "User IR" with "slot" set to the IR slot number (0-19) loads one of my IRs listed above. Built-in cabs share these params: ${CAB_PARAMS}.

## GP-200 catalog (model | params and ranges)
${CATALOG_TEXT}

# Reply format
Reply with a short sentence if you like, then ONE json code block in exactly this shape:

\`\`\`json
{
  "summary": "one line describing the tone",
  "why": "2-4 sentences on the choices, naming the gear used on the recording when you know it; say so if you're unsure",
  "playingTips": "pickup, guitar volume/tone, picking dynamics",
  "tuning": "e.g. E standard",
  "warnings": ["things to check by ear"],
  "blocks": [
    { "module": "AMP", "enabled": true, "model": "SnapTone", "slot": 0, "params": [{ "name": "Gain", "value": 62 }], "note": "why this block" },
    { "module": "CAB", "enabled": true, "model": "UK GRN 2", "slot": null, "params": [], "note": "" }
  ]
}
\`\`\`

"slot" is the SnapTone slot (0-9) for model "SnapTone", the IR slot (0-19) for model "User IR", and null for everything else. Only include params you'd change from their defaults.`;
}

/** Pull the JSON object out of a pasted reply (handles code fences and chatter around it). */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error("Couldn't find the patch in that reply. Paste Claude's whole answer, including the json block.");
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new Error('The patch in that reply is incomplete or garbled. Ask Claude to "resend the json block" and paste it again.');
  }
}

interface RawBlock {
  module?: string;
  enabled?: boolean;
  model?: string;
  slot?: number | null;
  snaptoneSlot?: number | null;
  params?: { name?: string; value?: number }[];
  note?: string;
}

/** Parse and check a pasted reply against the catalog and the member's library. */
export function parseReply(text: string, snaptones: SnapTone[], irs: IrSlot[]): Suggestion {
  const raw = extractJson(text) as Record<string, unknown>;
  if (!raw || !Array.isArray(raw.blocks)) throw new Error("That reply doesn't contain a patch (no \"blocks\" list).");
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const warnings: string[] = Array.isArray(raw.warnings) ? raw.warnings.filter((w): w is string => typeof w === 'string') : [];
  let blocks: PatchBlock[] = [];

  for (const b of raw.blocks as RawBlock[]) {
    const module = String(b.module ?? '').toUpperCase() as ModuleId;
    if (!MODULES.includes(module)) {
      warnings.push(`Skipped a block with unknown module "${b.module}".`);
      continue;
    }
    const entry = catalog.modules[module].find((e) => e.name.toLowerCase() === String(b.model ?? '').toLowerCase());
    if (!entry) {
      warnings.push(`${module}: "${b.model}" isn't a GP-200 model name, so that block was left out.`);
      continue;
    }
    const slot = typeof b.slot === 'number' ? b.slot : typeof b.snaptoneSlot === 'number' ? b.snaptoneSlot : null;
    const block: PatchBlock = { module, enabled: b.enabled !== false, model: entry.name, snaptoneSlot: null, params: [], note: str(b.note) };

    if (entry.name === 'SnapTone') {
      block.snaptoneSlot = slot;
      const ok = slot !== null && (module === 'AMP' ? slot < 5 : slot >= 5) && snaptones.some((s) => s.slot === slot);
      if (!ok) warnings.push(`${module}: SnapTone slot ${slot} isn't one of your loaded ${module} captures - pick one by hand.`);
    } else if (entry.name === 'User IR') {
      block.snaptoneSlot = slot;
      if (!irs.some((i) => i.slot === slot && !i.empty)) warnings.push(`CAB: User IR slot ${slot} is empty on your pedal - pick one by hand.`);
    }
    for (const p of b.params ?? []) {
      const def = entry.params.find((x) => x.name.toLowerCase() === String(p.name ?? '').toLowerCase());
      if (!def || typeof p.value !== 'number') {
        warnings.push(`${module} ${entry.name}: ignored unknown param "${p.name}".`);
        continue;
      }
      const step = def.options ? 1 : def.step ?? 1;
      const value = Math.min(def.max, Math.max(def.min, Number((Math.round((p.value - def.min) / step) * step + def.min).toFixed(6))));
      if (def.tempoSync && value !== 0) warnings.push(`${module}: set ${def.name} to OFF before sending; tempo sync is not supported yet.`);
      block.params.push({ name: def.name, value });
    }
    blocks = blocks.filter((x) => x.module !== module); // one model per module; last one wins
    blocks.push(block);
  }
  blocks.sort((a, b) => MODULES.indexOf(a.module) - MODULES.indexOf(b.module));
  if (!blocks.length) throw new Error('None of the blocks in that reply matched GP-200 models.');

  return { summary: str(raw.summary), why: str(raw.why), playingTips: str(raw.playingTips), tuning: str(raw.tuning), blocks, warnings };
}
