// Turn a song's patch into what we can send live, plus the steps the player
// finishes on the pedal (block on/off and SAVE aren't remote-controllable yet).
import catalogJson from '../shared/catalog.json';
import { MODULES, type Catalog, type IrSlot, type ModuleId, type PatchBlock } from '../shared/types.ts';
import { BLOCK_INDEX, type LiveBlock } from './midi/gp200.ts';

const catalog = catalogJson as unknown as Catalog;

export interface PedalPlan {
  live: LiveBlock[];
  /** Blocks to switch on / off by hand, in pedal order. */
  turnOn: ModuleId[];
  turnOff: ModuleId[];
  /** Things the player sets by hand because they can't be sent (User IRs, empty SnapTone picks). */
  manual: string[];
  /** Each block's first knob, which the pedal often ignores over USB - the player checks these. */
  checkKnobs: string[];
}

export function planForPedal(blocks: PatchBlock[], irs: IrSlot[]): PedalPlan {
  const live: LiveBlock[] = [];
  const manual: string[] = [];
  const checkKnobs: string[] = [];
  for (const b of blocks) {
    const entry = catalog.modules[b.module].find((e) =>
      b.model === 'SnapTone' ? e.snaptoneSlot === b.snaptoneSlot : b.model === 'User IR' ? e.irSlot === b.snaptoneSlot : e.name === b.model,
    );
    if (b.model === 'User IR') {
      const ir = irs.find((i) => i.slot === b.snaptoneSlot);
      manual.push(`CAB: choose User IR ${b.snaptoneSlot !== null ? b.snaptoneSlot + 1 : '?'}${ir?.name ? ` ("${ir.name}")` : ''} on the pedal - IRs can't be picked remotely yet.`);
      continue;
    }
    if (!entry) {
      if (b.model === 'SnapTone') manual.push(`${b.module}: pick which SnapTone to use - none is chosen in this patch.`);
      continue;
    }
    live.push({
      block: BLOCK_INDEX[b.module],
      code: entry.code,
      // Send every knob: the ones the patch sets, and defaults for the rest, so
      // nothing is left over from whatever the preset held before.
      params: entry.params.map((p) => ({ idx: p.id, value: b.params.find((x) => x.name === p.name)?.value ?? p.default })),
    });
    const first = entry.params.find((p) => p.id === 0);
    if (first) {
      const v = b.params.find((x) => x.name === first.name)?.value ?? first.default;
      checkKnobs.push(`${b.module} ${first.name} → ${first.options ? first.options[v] ?? v : v}`);
    }
  }
  const on = new Set(blocks.filter((b) => b.enabled).map((b) => b.module));
  return {
    live,
    turnOn: MODULES.filter((m) => on.has(m)),
    turnOff: MODULES.filter((m) => !on.has(m) && m !== 'VOL'),
    manual,
    checkKnobs,
  };
}
