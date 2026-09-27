import type { CatalogEntry, ModuleId, PatchBlock } from '../../shared/types.ts';
import { MODULES } from '../../shared/types.ts';
import { useApp } from '../App.tsx';
import { snapEqDb, snapKnobDb, snapSlotLabel } from '../format.ts';

const MODULE_NAMES: Record<ModuleId, string> = {
  PRE: 'Pre / Comp / Boost', WAH: 'Wah', DST: 'Drive', AMP: 'Amp', NR: 'Noise gate', CAB: 'Cab',
  EQ: 'EQ', MOD: 'Modulation', DLY: 'Delay', RVB: 'Reverb', VOL: 'Volume',
};

function snapDbHint(entry: CatalogEntry, param: string, v: number) {
  if (entry.name !== 'SnapTone') return '';
  return param === 'Gain' || param === 'Volume' ? snapKnobDb(v) : snapEqDb(v);
}

export function BlockEditor({ blocks, onChange }: { blocks: PatchBlock[]; onChange: (b: PatchBlock[]) => void }) {
  const { catalog, db: { snaptones, irs } } = useApp();
  if (!catalog) return null;

  const update = (module: ModuleId, patch: Partial<PatchBlock> | null) => {
    const rest = blocks.filter((b) => b.module !== module);
    if (patch === null) return onChange(rest);
    const current = blocks.find((b) => b.module === module) ?? { module, enabled: true, model: '', snaptoneSlot: null, params: [], note: '' };
    onChange([...rest, { ...current, ...patch }].sort((a, b) => MODULES.indexOf(a.module) - MODULES.indexOf(b.module)));
  };

  return (
    <div className="blocks">
      {MODULES.map((module) => {
        const block = blocks.find((b) => b.module === module);
        const entries = catalog.modules[module].filter((e) => e.name !== 'SnapTone' && e.name !== 'User IR');
        const hasSnap = catalog.modules[module].some((e) => e.name === 'SnapTone');
        const entry = block && catalog.modules[module].find((e) => e.name === block.model);

        if (!block) {
          return (
            <div key={module} className="block off">
              <span className="block-mod mono">{module}</span>
              <span className="muted small">{MODULE_NAMES[module]}</span>
              <span className="spacer" />
              <button className="small-btn" onClick={() => update(module, { model: entries[0]?.name ?? '' })}>+ Add</button>
            </div>
          );
        }

        const slotChoices = module === 'AMP' ? [0, 1, 2, 3, 4] : [5, 6, 7, 8, 9];
        const value = (name: string, def: number) => block.params.find((p) => p.name === name)?.value ?? def;
        const setParam = (name: string, v: number) =>
          update(module, { params: [...block.params.filter((p) => p.name !== name), { name, value: v }] });

        return (
          <div key={module} className={block.enabled ? 'block' : 'block bypassed'}>
            <div className="block-head">
              <label className="switch" title={block.enabled ? 'On' : 'Bypassed'}>
                <input type="checkbox" checked={block.enabled} onChange={(e) => update(module, { enabled: e.target.checked })} />
                <span className="block-mod mono">{module}</span>
              </label>
              <select
                value={block.model === 'SnapTone' ? `snap:${block.snaptoneSlot}` : block.model === 'User IR' ? `ir:${block.snaptoneSlot}` : block.model}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.startsWith('snap:')) {
                    // Start from the knob settings saved for that capture in the library.
                    const slot = Number(v.slice(5));
                    const d = snaptones.find((x) => x.slot === slot)?.defaults;
                    const params = d
                      ? [{ name: 'Gain', value: d.gain }, { name: 'Volume', value: d.volume }, { name: 'Bass', value: d.bass }, { name: 'Middle', value: d.middle }, { name: 'Treble', value: d.treble }]
                      : [];
                    update(module, { model: 'SnapTone', snaptoneSlot: slot, params });
                  }
                  else if (v.startsWith('ir:')) update(module, { model: 'User IR', snaptoneSlot: Number(v.slice(3)), params: [] });
                  else update(module, { model: v, snaptoneSlot: null, params: [] });
                }}
              >
                {block.snaptoneSlot === null && (block.model === 'SnapTone' || block.model === 'User IR') && (
                  <option value={`${block.model === 'SnapTone' ? 'snap' : 'ir'}:null`} disabled>Choose one of yours…</option>
                )}
                {hasSnap && (
                  <optgroup label="My SnapTones">
                    {slotChoices.map((slot) => {
                      const s = snaptones.find((x) => x.slot === slot);
                      return <option key={slot} value={`snap:${slot}`}>{snapSlotLabel(slot)}: {s ? s.fullName || s.pedalName : '(empty)'}</option>;
                    })}
                  </optgroup>
                )}
                {module === 'CAB' && irs.some((i) => !i.empty) && (
                  <optgroup label="My User IRs">
                    {irs.filter((i) => !i.empty).map((i) => <option key={i.slot} value={`ir:${i.slot}`}>IR {i.slot + 1}: {i.name}</option>)}
                  </optgroup>
                )}
                <optgroup label="Built-in">
                  {entries.map((e) => (
                    <option key={e.name} value={e.name}>{e.name}{e.basedOn ? ` - ${e.basedOn}` : ''}</option>
                  ))}
                </optgroup>
              </select>
              <button className="small-btn" onClick={() => update(module, null)} title="Remove from patch">✕</button>
            </div>
            {entry && entry.params.length > 0 && (
              <div className="params">
                {entry.params.map((p) => {
                  const v = value(p.name, p.default);
                  const isSet = block.params.some((x) => x.name === p.name);
                  return (
                    <label key={p.name} className={isSet ? 'param' : 'param default'}>
                      <span className="param-name">{p.name}</span>
                      {p.options ? (
                        <select value={v} onChange={(e) => setParam(p.name, Number(e.target.value))}>
                          {p.options.map((o, i) => <option key={o} value={i} disabled={p.tempoSync && i !== 0}>{o}{p.tempoSync && i !== 0 ? ' (not supported yet)' : ''}</option>)}
                        </select>
                      ) : (
                        <>
                          <input type="range" min={p.min} max={p.max} step={p.step ?? 1} value={v} onChange={(e) => setParam(p.name, Number(e.target.value))} />
                          <span className="mono param-val">{v}</span>
                          <span className="muted small">{snapDbHint(entry, p.name, v)}</span>
                        </>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
            <input className="block-note" value={block.note} onChange={(e) => update(module, { note: e.target.value })} placeholder="Note for this block" />
          </div>
        );
      })}
    </div>
  );
}

/** Plain-text cheat sheet for a patch, for printing or pasting into notes. */
export function blocksAsText(blocks: PatchBlock[], snaptoneName: (slot: number) => string, irName: (slot: number) => string) {
  return blocks
    .map((b) => {
      const model =
        b.model === 'SnapTone' && b.snaptoneSlot !== null ? `SnapTone ${snapSlotLabel(b.snaptoneSlot)} (${snaptoneName(b.snaptoneSlot)})`
        : b.model === 'User IR' && b.snaptoneSlot !== null ? `User IR ${b.snaptoneSlot + 1} (${irName(b.snaptoneSlot)})`
        : b.model;
      const params = b.params.map((p) => `${p.name} ${p.value}`).join(', ');
      return `${b.module}${b.enabled ? '' : ' [off]'}: ${model}${params ? ` - ${params}` : ''}${b.note ? `  (${b.note})` : ''}`;
    })
    .join('\n');
}
