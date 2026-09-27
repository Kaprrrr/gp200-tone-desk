import { useState } from 'react';
import type { SnapTone } from '../../shared/types.ts';
import { useApp } from '../App.tsx';
import { newSnapTone, now } from '../store.ts';
import { ago, snapEqDb, snapKnobDb, snapSlotLabel } from '../format.ts';

const KINDS: SnapTone['kind'][] = ['amp', 'pedal', 'amp+pedal', 'other'];
const CHARACTERS: SnapTone['character'][] = ['clean', 'edge', 'crunch', 'high-gain', 'fuzz', 'other'];

export function SnapTonesPage() {
  const { db, update, goTo } = useApp();
  const snaptones = db.snaptones;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = snaptones.find((s) => s.id === selectedId) ?? null;
  const bySlot = (slot: number) => snaptones.find((s) => s.slot === slot);
  const offPedal = snaptones.filter((s) => s.slot === null).sort((a, b) => a.fullName.localeCompare(b.fullName));

  const addOffPedal = () => {
    const created = newSnapTone({ fullName: 'New capture' });
    update((d) => ({ ...d, snaptones: [...d.snaptones, created] }));
    setSelectedId(created.id);
  };

  const Slot = ({ slot }: { slot: number }) => {
    const s = bySlot(slot);
    return (
      <button className={`slot ${s ? 'filled' : 'empty'} ${s && s.id === selectedId ? 'selected' : ''}`} onClick={() => s && setSelectedId(s.id)} disabled={!s}>
        <span className="slot-label">{snapSlotLabel(slot)}</span>
        {s ? (
          <>
            <span className="slot-name">{s.fullName || s.pedalName}</span>
            <span className="slot-meta">{[s.character !== 'other' && s.character, s.basedOn].filter(Boolean).join(' · ') || 'add details →'}</span>
          </>
        ) : (
          <span className="slot-name muted">empty</span>
        )}
      </button>
    );
  };

  return (
    <div className="split">
      <div className="stack">
        {snaptones.length === 0 && (
          <div className="notice">
            <p>No SnapTones yet. Connect the pedal and read its slots to fill this in.</p>
            <button className="link" onClick={() => goTo('pedal')}>Go to Pedal →</button>
          </div>
        )}
        <section className="card">
          <h2>On the pedal</h2>
          <h3 className="section-label">AMP block</h3>
          <div className="slots">{[0, 1, 2, 3, 4].map((s) => <Slot key={s} slot={s} />)}</div>
          <h3 className="section-label">DST block</h3>
          <div className="slots">{[5, 6, 7, 8, 9].map((s) => <Slot key={s} slot={s} />)}</div>
        </section>
        <section className="card">
          <div className="row">
            <h2>Not on the pedal</h2>
            <span className="spacer" />
            <button onClick={addOffPedal}>Add a capture</button>
          </div>
          <p className="muted small">Captures you've swapped out, or NAMs you own but haven't loaded. They stay here with your notes.</p>
          {offPedal.length === 0 ? (
            <p className="muted">None.</p>
          ) : (
            <ul className="list">
              {offPedal.map((s) => (
                <li key={s.id}>
                  <button className={s.id === selectedId ? 'list-item selected' : 'list-item'} onClick={() => setSelectedId(s.id)}>
                    <strong>{s.fullName || s.pedalName || 'Untitled'}</strong>
                    <span className="muted small"> {[s.basedOn, s.character !== 'other' && s.character].filter(Boolean).join(' · ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <aside className="card editor-panel">
        {selected ? (
          <SnapToneEditor key={selected.id} snap={selected} onDeleted={() => setSelectedId(null)} />
        ) : (
          <p className="muted">Pick a capture to add what it is, where it came from, and the knob settings that work for it.</p>
        )}
      </aside>
    </div>
  );
}

function SnapToneEditor({ snap, onDeleted }: { snap: SnapTone; onDeleted: () => void }) {
  const { update } = useApp();
  const [draft, setDraft] = useState<SnapTone>(snap);
  const [saved, setSaved] = useState(true);
  const set = <K extends keyof SnapTone>(k: K, v: SnapTone[K]) => {
    setDraft({ ...draft, [k]: v });
    setSaved(false);
  };
  const setKnob = (k: keyof SnapTone['defaults'], v: number) => set('defaults', { ...draft.defaults, [k]: v });

  const save = () => {
    // Keep slot/pedal fields from the latest pedal read, in case it ran while editing.
    update((d) => ({ ...d, snaptones: d.snaptones.map((s) => (s.id === snap.id ? { ...draft, slot: s.slot, pedalName: s.pedalName, lastSeenOnPedal: s.lastSeenOnPedal, updatedAt: now() } : s)) }));
    setSaved(true);
  };
  const remove = () => {
    if (!confirm(`Remove "${draft.fullName || draft.pedalName}" from your library?`)) return;
    update((d) => ({ ...d, snaptones: d.snaptones.filter((s) => s.id !== snap.id) }));
    onDeleted();
  };

  const knobs: { k: keyof SnapTone['defaults']; label: string; fmt: (v: number) => string }[] = [
    { k: 'gain', label: 'Gain (input trim)', fmt: snapKnobDb },
    { k: 'volume', label: 'Volume', fmt: snapKnobDb },
    { k: 'bass', label: 'Bass (120 Hz)', fmt: snapEqDb },
    { k: 'middle', label: 'Middle (750 Hz)', fmt: snapEqDb },
    { k: 'treble', label: 'Treble (3 kHz shelf)', fmt: snapEqDb },
  ];

  return (
    <div className="stack tight">
      <div>
        <p className="eyebrow">{snap.slot !== null ? `${snapSlotLabel(snap.slot)} · seen ${ago(snap.lastSeenOnPedal)}` : 'Not on the pedal'}</p>
        <h2>{draft.fullName || draft.pedalName || 'Untitled'}</h2>
        {draft.pedalName && <p className="muted small mono">On pedal as "{draft.pedalName}"</p>}
      </div>
      <label>Full name<input value={draft.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="e.g. Fender Super Reverb - Normal channel, vol 5" /></label>
      <label>Based on (real gear)<input value={draft.basedOn} onChange={(e) => set('basedOn', e.target.value)} placeholder="e.g. 1965 Fender Super Reverb" /></label>
      <div className="grid2">
        <label>Type
          <select value={draft.kind} onChange={(e) => set('kind', e.target.value as SnapTone['kind'])}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        </label>
        <label>Character
          <select value={draft.character} onChange={(e) => set('character', e.target.value as SnapTone['character'])}>{CHARACTERS.map((k) => <option key={k}>{k}</option>)}</select>
        </label>
      </div>
      <label>Source<input value={draft.source} onChange={(e) => set('source', e.target.value)} placeholder="e.g. TONE3000 link, pack name…" /></label>
      <label>Tags<input value={draft.tags.join(', ')} onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} placeholder="e.g. blues, country, includes cab" /></label>
      <fieldset>
        <legend>Starting knob settings</legend>
        {knobs.map(({ k, label, fmt }) => (
          <label key={k} className="knob-row">
            <span>{label}</span>
            <input type="range" min={0} max={100} value={draft.defaults[k]} onChange={(e) => setKnob(k, Number(e.target.value))} />
            <span className="mono knob-val">{draft.defaults[k]}</span>
            <span className="muted small knob-db">{fmt(draft.defaults[k])}</span>
          </label>
        ))}
      </fieldset>
      <label>Notes<textarea rows={4} value={draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Captured at edge of breakup; needs Gain ~65 with humbuckers. No cab in the capture." /></label>
      <div className="row">
        <button className="primary" onClick={save} disabled={saved}>{saved ? 'Saved' : 'Save'}</button>
        <span className="spacer" />
        <button className="danger" onClick={remove}>Remove</button>
      </div>
    </div>
  );
}
