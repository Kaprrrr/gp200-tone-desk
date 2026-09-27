import { useState } from 'react';
import { useApp } from '../App.tsx';
import { parseSlotLabel, slotLabel } from '../midi/gp200.ts';

export function PedalPage() {
  const { pedal, pedalPreset, connect, disconnect, connecting, connectError, readSlots, reading, readChanges, readError, db, goTo } = useApp();
  const [error, setError] = useState('');
  const [jump, setJump] = useState('');

  const doJump = async () => {
    const slot = parseSlotLabel(jump);
    if (slot === null || !pedal) return setError('Enter a preset like 12-B.');
    setError('');
    try { await pedal.selectPreset(slot); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>Connection</h2>
        {!pedal ? (
          <>
            <p className="muted">
              Plug in the GP-200 over USB and close the official GP-200 editor (only one program can use the pedal at a time). Use Chrome or Edge on a computer or Android; Safari and iPhone/iPad can't talk to USB MIDI devices. When you connect, the browser asks to allow MIDI access - click Allow.
            </p>
            <button className="primary" onClick={connect} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Connect to GP-200'}
            </button>
            {connectError && <p className="error">{connectError}</p>}
          </>
        ) : (
          <>
            <p>
              Connected. Active preset: <strong className="mono">{pedalPreset !== null ? slotLabel(pedalPreset) : '—'}</strong>
            </p>
            <div className="row">
              <label className="inline">
                Go to preset
                <input className="mono short" value={jump} onChange={(e) => setJump(e.target.value)} placeholder="12-B" onKeyDown={(e) => e.key === 'Enter' && doJump()} />
              </label>
              <button onClick={doJump} disabled={reading !== null || connecting}>Go</button>
              <span className="spacer" />
              <button disabled={reading !== null || connecting} onClick={() => disconnect().catch((err) => setError(err instanceof Error ? err.message : String(err)))}>Disconnect</button>
            </div>
          </>
        )}
      </section>

      {error && <p className="error" role="alert">{error}</p>}

      <section className="card">
        <h2>Read SnapTone &amp; IR slots</h2>
        <p className="muted">
          Connecting reads the names in all 10 SnapTone slots and 20 User IR slots into your library automatically. Read again after you load new captures or IRs. Your notes are kept; captures you've swapped
          out stay in the library, marked as not on the pedal. This only reads - nothing on the pedal changes.
        </p>
        <button className="primary" onClick={() => readSlots()} disabled={!pedal || reading !== null}>
          {reading ? `Reading… ${reading[0]}/${reading[1]}` : 'Read slots again'}
        </button>
        {!pedal && <p className="muted small">Connect first.</p>}
        {readError && <p className="error">{readError}</p>}
        {readChanges && (
          <div className="notice">
            {readChanges.length ? (
              <ul>{readChanges.map((c) => <li key={c}>{c}</li>)}</ul>
            ) : (
              <p>No changes since the last read.</p>
            )}
            <button className="link" onClick={() => goTo('snaptones')}>Open SnapTone library →</button>
          </div>
        )}
      </section>

      {db.irs.length > 0 && (
        <section className="card">
          <h2>User IR slots</h2>
          <IrTable />
        </section>
      )}
    </div>
  );
}

function IrTable() {
  const { db, update } = useApp();
  const irs = db.irs;
  const save = (slot: number, notes: string) => update((d) => ({ ...d, irs: d.irs.map((i) => (i.slot === slot ? { ...i, notes } : i)) }));
  return (
    <table className="table">
      <thead>
        <tr><th>Slot</th><th>Name on pedal</th><th>Notes (cab, mic, what it's for)</th></tr>
      </thead>
      <tbody>
        {irs.map((ir) => (
          <tr key={ir.slot} className={ir.empty ? 'dim' : ''}>
            <td className="mono">{ir.slot + 1}</td>
            <td>{ir.empty ? 'empty' : ir.name}</td>
            <td>
              {!ir.empty && <input defaultValue={ir.notes} onBlur={(e) => e.target.value !== ir.notes && save(ir.slot, e.target.value)} placeholder="e.g. Mesa 4x12 V30, SM57 cap edge" />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
