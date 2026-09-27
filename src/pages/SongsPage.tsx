import { useMemo, useRef, useState } from 'react';
import type { PatchBlock, SongTone, Suggestion } from '../../shared/types.ts';
import { useApp } from '../App.tsx';
import { buildPrompt, parseReply, type SongRequest } from '../ai/prompt.ts';
import { BlockEditor, blocksAsText } from '../components/BlockEditor.tsx';
import { snapSlotLabel } from '../format.ts';
import { SendToPedal } from '../components/SendToPedal.tsx';
import { exportSong, importSong } from '../songShare.ts';
import { download, newId, now, safeFilename } from '../store.ts';

type Draft = Omit<SongTone, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
type Mode = { kind: 'none' } | { kind: 'new' } | { kind: 'view'; id: string } | { kind: 'edit'; id: string };

const emptyDraft = (): Draft => ({
  title: '', artist: '', part: '', tuning: 'E standard', guitar: '', presetSlot: '',
  blocks: [], summary: '', why: '', playingTips: '', notes: '', source: 'manual',
});

export function SongsPage() {
  const { db, update } = useApp();
  const [mode, setMode] = useState<Mode>({ kind: 'none' });
  const [importMsg, setImportMsg] = useState<{ notes: string[]; error: string } | null>(null);
  const [imported, setImported] = useState<Draft | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const songs = useMemo(() => [...db.songs]
    .sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title)), [db.songs]);

  const save = (d: Draft): SongTone => {
    const stamp = now();
    const existing = d.id ? db.songs.find((s) => s.id === d.id) : undefined;
    const song: SongTone = { ...d, id: d.id ?? newId(), createdAt: existing?.createdAt ?? stamp, updatedAt: stamp };
    update((x) => ({ ...x, songs: existing ? x.songs.map((s) => (s.id === song.id ? song : s)) : [...x.songs, song] }));
    return song;
  };

  const importFile = async (file: File) => {
    try {
      const { song, missing } = importSong(await file.text(), db.snaptones, db.irs);
      setImported(song);
      setImportMsg({ notes: missing, error: '' });
      setMode({ kind: 'new' });
    } catch (err) {
      setImportMsg({ notes: [], error: err instanceof Error ? err.message : String(err) });
    }
  };

  const current = mode.kind === 'view' || mode.kind === 'edit' ? db.songs.find((s) => s.id === mode.id) : undefined;

  return (
    <div className="split">
      <aside className="stack">
        <section className="card">
          <button className="primary wide" onClick={() => { setImported(null); setImportMsg(null); setMode({ kind: 'new' }); }}>+ New song</button>
          <label className="song-picker">My songs ({songs.length})
            <select
              value={current?.id ?? ''}
              disabled={!songs.length}
              onChange={(e) => setMode(e.target.value ? { kind: 'view', id: e.target.value } : { kind: 'none' })}
            >
              <option value="">{songs.length ? 'Choose a song...' : 'No saved songs yet'}</option>
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {[song.title, song.artist, song.part, song.presetSlot].filter(Boolean).join(' - ')}
                </option>
              ))}
            </select>
          </label>
          <button className="link small-link" onClick={() => fileInput.current?.click()}>Import a song someone shared…</button>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
          {importMsg?.error && <p className="error small">{importMsg.error}</p>}
        </section>
      </aside>

      <div className="stack">
        {mode.kind === 'none' && (
          <section className="card empty-state">
            <h2>Plan a patch for a song</h2>
            <ol className="plain">
              <li>Click <strong>New song</strong> and type the song.</li>
              <li>Copy the prompt into Claude and paste its answer back.</li>
              <li>Send the patch to your pedal and verify the saved result.</li>
            </ol>
          </section>
        )}
        {mode.kind === 'new' && (
          <NewSong
            key={imported ? 'import' : 'new'}
            initial={imported ?? emptyDraft()}
            importNotes={importMsg?.notes ?? []}
            onCancel={() => setMode({ kind: 'none' })}
            onSaved={(d) => setMode({ kind: 'view', id: save(d).id })}
          />
        )}
        {mode.kind === 'view' && current && (
          <SongView
            key={current.id}
            song={current}
            onEdit={() => setMode({ kind: 'edit', id: current.id })}
            onUpdate={(patch) => save({ ...current, ...patch })}
            onDelete={() => { update((x) => ({ ...x, songs: x.songs.filter((s) => s.id !== current.id) })); setMode({ kind: 'none' }); }}
          />
        )}
        {mode.kind === 'edit' && current && (
          <SongEdit key={current.id} initial={current} onCancel={() => setMode({ kind: 'view', id: current.id })} onSave={(d) => { save(d); setMode({ kind: 'view', id: current.id }); }} />
        )}
      </div>
    </div>
  );
}

/* ---------------- New song: 1 details → 2 Claude → 3 review ---------------- */

function NewSong({ initial, importNotes, onCancel, onSaved }: { initial: Draft; importNotes: string[]; onCancel: () => void; onSaved: (d: Draft) => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [step, setStep] = useState<1 | 2 | 3>(initial.blocks.length ? 3 : 1);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState('');
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const toStep = (s: 2 | 3) => (d.title.trim() ? (setError(''), setStep(s)) : setError('Type the song title first.'));

  const applySuggestion = (s: Suggestion) => {
    setSuggestion(s);
    setD((prev) => ({ ...prev, blocks: s.blocks, summary: s.summary, why: s.why, playingTips: s.playingTips, tuning: s.tuning || prev.tuning, source: 'ai' }));
    setStep(3);
  };

  return (
    <section className="card">
      <ol className="stepper" aria-label="Steps">
        {['The song', 'Get the patch', 'Review & save'].map((label, i) => (
          <li key={label} className={step === i + 1 ? 'current' : step > i + 1 ? 'done' : ''}>{i + 1}. {label}</li>
        ))}
      </ol>

      {importNotes.length > 0 && (
        <div className="notice"><strong>Imported song</strong><ul>{importNotes.map((n) => <li key={n}>{n}</li>)}</ul></div>
      )}

      {step === 1 && (
        <div className="stack tight">
          <div className="grid2">
            <label>Song title *<input value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Sultans of Swing" autoFocus /></label>
            <label>Artist<input value={d.artist} onChange={(e) => set('artist', e.target.value)} placeholder="e.g. Dire Straits" /></label>
            <label>Which part<input value={d.part} onChange={(e) => set('part', e.target.value)} placeholder="e.g. Rhythm, Solo, Intro" /></label>
            <label>Your guitar / pickup<input value={d.guitar} onChange={(e) => set('guitar', e.target.value)} placeholder="e.g. Strat, neck + middle" /></label>
          </div>
          <label>Anything specific? (optional)<textarea rows={2} value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. The live 1978 version" /></label>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="primary" onClick={() => toStep(2)}>Next: get the patch →</button>
            <button className="link" onClick={() => toStep(3)}>Skip - I'll build it myself</button>
            <span className="spacer" />
            <button onClick={onCancel}>Cancel</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="stack tight">
          <AskClaude request={d} onLoaded={applySuggestion} />
          <div className="row">
            <button onClick={() => setStep(1)}>← Back</button>
            <span className="spacer" />
            <button className="link" onClick={() => setStep(3)}>Skip - I'll build it myself</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="stack tight">
          <h2>{d.title}{d.artist ? <span className="muted"> · {d.artist}</span> : null}</h2>
          {d.summary && <p className="lead">{d.summary}</p>}
          {d.why && <p>{d.why}</p>}
          {suggestion && suggestion.warnings.length > 0 && <ul className="warnings">{suggestion.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
          {d.blocks.length > 0 && <PatchSummary blocks={d.blocks} />}
          <details open={!d.blocks.length}>
            <summary>{d.blocks.length ? 'Adjust the patch' : 'Build the patch'}</summary>
            <BlockEditor blocks={d.blocks} onChange={(b) => set('blocks', b)} />
          </details>
          <div className="grid2">
            <label>Pedal preset to use (optional)<input className="mono" value={d.presetSlot} onChange={(e) => set('presetSlot', e.target.value.toUpperCase())} placeholder="e.g. 12-B" /></label>
            <label>Tuning<input value={d.tuning} onChange={(e) => set('tuning', e.target.value)} /></label>
          </div>
          <div className="row">
            <button className="primary" onClick={() => onSaved(d)}>Save song</button>
            <button onClick={() => setStep(2)}>← Ask Claude again</button>
            <span className="spacer" />
            <button onClick={onCancel}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- Copy prompt / paste answer ---------------- */

function AskClaude({ request, onLoaded }: { request: SongRequest; onLoaded: (s: Suggestion) => void }) {
  const { db } = useApp();
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState('');
  const [error, setError] = useState('');

  const copy = async () => {
    const prompt = buildPrompt(request, db.snaptones, db.irs);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setShown('');
    } catch {
      setShown(prompt); // clipboard blocked - show it for manual copy
    }
  };

  const tryLoad = (text: string) => {
    if (!text.trim()) return;
    try {
      onLoaded(parseReply(text, db.snaptones, db.irs));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <ol className="steps">
      <li>
        <p><strong>Copy the prompt.</strong> It includes your song, your SnapTones and IRs, and every GP-200 model.</p>
        <div className="row">
          <button className="primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy prompt'}</button>
          <button className="link" onClick={() => setShown(shown ? '' : buildPrompt(request, db.snaptones, db.irs))}>{shown ? 'Hide prompt' : 'Show prompt'}</button>
        </div>
        {shown && <textarea className="prompt-box mono" rows={6} readOnly value={shown} onFocus={(e) => e.target.select()} />}
      </li>
      <li>
        <p><strong>Paste it into Claude</strong> and send it. A free account works.</p>
        <a className="button-link" href="https://claude.ai/new" target="_blank" rel="noreferrer">Open claude.ai ↗</a>
      </li>
      <li>
        <p><strong>Copy Claude's whole answer and paste it here.</strong> The patch loads as soon as you paste.</p>
        <textarea
          rows={4}
          placeholder="Paste Claude's answer here…"
          onPaste={(e) => { const t = e.clipboardData.getData('text'); setTimeout(() => tryLoad(t), 0); }}
          onChange={(e) => { setError(''); if (e.target.value.includes('"blocks"')) tryLoad(e.target.value); }}
        />
        {error && <p className="error">{error}</p>}
      </li>
    </ol>
  );
}

/* ---------------- Saved song ---------------- */

function SongView({ song, onEdit, onUpdate, onDelete }: { song: SongTone; onEdit: () => void; onUpdate: (patch: Partial<Draft>) => void; onDelete: () => void }) {
  const { db } = useApp();
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyText = async () => {
    const snapName = (slot: number) => db.snaptones.find((s) => s.slot === slot)?.fullName ?? '?';
    const irName = (slot: number) => db.irs.find((i) => i.slot === slot)?.name ?? '?';
    const lines = [`${song.title}${song.artist ? ` - ${song.artist}` : ''}${song.part ? ` (${song.part})` : ''}`, `Tuning: ${song.tuning}${song.presetSlot ? ` · Preset ${song.presetSlot}` : ''}`];
    if (song.summary) lines.push(song.summary);
    lines.push('', blocksAsText(song.blocks, snapName, irName));
    if (song.playingTips) lines.push('', `Playing: ${song.playingTips}`);
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <section className="card">
        <div className="song-head">
          <div>
            <h2>{song.title}</h2>
            <p className="muted">{[song.artist, song.part, song.tuning].filter(Boolean).join(' · ')}</p>
          </div>
          {song.presetSlot && <span className="badge mono big">{song.presetSlot}</span>}
        </div>
        {song.summary && <p className="lead">{song.summary}</p>}
        {song.why && <p>{song.why}</p>}
        {song.playingTips && <p><strong>Playing:</strong> {song.playingTips}</p>}
        <div className="row">
          <button onClick={onEdit}>Edit</button>
          <button onClick={() => setAsking(!asking)}>Ask Claude again</button>
          <button onClick={copyText}>{copied ? 'Copied ✓' : 'Copy as text'}</button>
          <button onClick={() => download(`${safeFilename(`${song.title} - ${song.artist}`)}.gp200song.json`, exportSong(song, db.snaptones, db.irs))} title="Save a file you can send to other GP-200 players">Share</button>
          <span className="spacer" />
          <button className="danger" onClick={() => confirm(`Delete "${song.title}"?`) && onDelete()}>Delete</button>
        </div>
      </section>

      {asking && (
        <section className="card ask">
          <h2>Ask Claude for a new version</h2>
          <AskClaude request={song} onLoaded={(s) => { onUpdate({ blocks: s.blocks, summary: s.summary, why: s.why, playingTips: s.playingTips, tuning: s.tuning || song.tuning, source: 'ai' }); setAsking(false); }} />
        </section>
      )}

      <SendToPedal song={song} onSetPreset={(presetSlot) => onUpdate({ presetSlot })} onSetBlocks={(blocks) => onUpdate({ blocks })} />

      <section className="card">
        <h2>Patch</h2>
        {song.blocks.length ? <PatchSummary blocks={song.blocks} /> : <p className="muted">No blocks yet - click Edit to build the patch.</p>}
      </section>
    </>
  );
}

/** Read-only, compact view of a patch. */
function PatchSummary({ blocks }: { blocks: PatchBlock[] }) {
  const { db } = useApp();
  return (
    <ul className="patch-summary">
      {blocks.map((b) => {
        const model =
          b.model === 'SnapTone' ? `SnapTone ${b.snaptoneSlot !== null ? `${snapSlotLabel(b.snaptoneSlot)}: ${db.snaptones.find((s) => s.slot === b.snaptoneSlot)?.fullName ?? 'empty'}` : '(choose one)'}`
          : b.model === 'User IR' ? `User IR ${b.snaptoneSlot !== null ? `${b.snaptoneSlot + 1}: ${db.irs.find((i) => i.slot === b.snaptoneSlot)?.name ?? ''}` : '(choose one)'}`
          : b.model;
        return (
          <li key={b.module} className={b.enabled ? '' : 'dim'}>
            <span className="mono block-mod">{b.module}</span>
            <span className="ps-model">{model}{!b.enabled && ' (off)'}</span>
            <span className="ps-params muted small">{b.params.map((p) => `${p.name} ${p.value}`).join(' · ')}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- Edit ---------------- */

function SongEdit({ initial, onCancel, onSave }: { initial: SongTone; onCancel: () => void; onSave: (d: Draft) => void }) {
  const [d, setD] = useState<Draft>(initial);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  return (
    <section className="card">
      <h2>Edit song</h2>
      <div className="grid2">
        <label>Song title<input value={d.title} onChange={(e) => set('title', e.target.value)} /></label>
        <label>Artist<input value={d.artist} onChange={(e) => set('artist', e.target.value)} /></label>
        <label>Part<input value={d.part} onChange={(e) => set('part', e.target.value)} /></label>
        <label>Tuning<input value={d.tuning} onChange={(e) => set('tuning', e.target.value)} /></label>
        <label>Guitar / pickup<input value={d.guitar} onChange={(e) => set('guitar', e.target.value)} /></label>
        <label>Pedal preset<input className="mono" value={d.presetSlot} onChange={(e) => set('presetSlot', e.target.value.toUpperCase())} placeholder="e.g. 12-B" /></label>
      </div>
      <label>Summary<input value={d.summary} onChange={(e) => set('summary', e.target.value)} /></label>
      <h3 className="section-label">Patch</h3>
      <BlockEditor blocks={d.blocks} onChange={(b) => set('blocks', b)} />
      <label>Playing tips<textarea rows={2} value={d.playingTips} onChange={(e) => set('playingTips', e.target.value)} /></label>
      <div className="row">
        <button className="primary" onClick={() => onSave(d)} disabled={!d.title.trim()}>Save changes</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}
