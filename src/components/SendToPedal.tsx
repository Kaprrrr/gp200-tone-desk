import { useRef, useState } from 'react';
import type { PatchBlock, SongTone } from '../../shared/types.ts';
import { useApp } from '../App.tsx';
import { parseSlotLabel, slotLabel } from '../midi/gp200.ts';
import { downloadPrst, downloadPrstBytes, encodePrst, prstName } from '../prst.ts';
import { loadTransferBackups, retainTransferBackup, type TransferBackup } from '../transferBackups.ts';
import { SongLevel } from './SongLevel.tsx';

export function SendToPedal({ song, onSetPreset, onSetBlocks }: { song: SongTone; onSetPreset: (slot: string) => void; onSetBlocks: (blocks: PatchBlock[]) => void }) {
  const { pedal, connect, connecting, connectError, reading, transferring, setTransferring } = useApp();
  const [slotText, setSlotText] = useState(song.presetSlot);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [backupState, setBackupState] = useState(() => {
    try { return { backups: loadTransferBackups(), error: '' }; }
    catch { return { backups: [] as TransferBackup[], error: 'Saved pedal backups could not be loaded. Browser storage must be available before sending.' }; }
  });
  const active = useRef(false);
  const busy = transferring || connecting || reading !== null;
  const selected = parseSlotLabel(slotText);
  const reconnect = () => { setError(''); setStatus(''); return connect(); };

  const transfer = async (restore?: TransferBackup) => {
    if (active.current || busy) return;
    setError('');
    setStatus('');
    const slot = restore?.slot ?? selected;
    if (slot === null) return setError('Enter a preset from 1-A to 64-D, such as 58-A.');
    if (!pedal) return setError('Connect the pedal first.');
    let bytes: Uint8Array;
    try { bytes = restore ? Uint8Array.from(restore.bytes) : encodePrst(song.blocks, song.title); }
    catch (err) { return setError(err instanceof Error ? err.message : String(err)); }
    const label = slotLabel(slot);
    const name = restore ? restore.name : prstName(song.title);
    if (!confirm(`Replace the saved preset at ${label} with "${name}"? ${restore ? 'This restores the preset kept before your last send.' : 'The current preset will become your only undo backup, replacing the previous backup.'}`)) return;
    active.current = true;
    setTransferring(true);
    setProgress([0, 9]);
    setStatus(restore ? `Restoring ${label}...` : `Backing up ${label}...`);
    let backedUp = false;
    try {
      await pedal.writePreset(slot, bytes, (original) => {
        // Keep the restore target until another send, so a failed restore can be retried.
        if (!restore) {
          const backup = retainTransferBackup(original);
          setBackupState({ backups: [backup], error: '' });
        }
        backedUp = true;
      }, (done, total) => {
        setProgress([done, total]);
        setStatus(done < total - 2 ? `Writing ${label}...` : `Reading ${label} back to verify...`);
      }, () => setStatus('The pedal stopped answering. Reconnecting and retrying the read...'));
      if (!restore) onSetPreset(label);
      setStatus(`${restore ? 'Restored' : 'Saved'} and verified ${label}: ${name}. No need to press SAVE on the pedal.`);
    } catch (err) {
      setStatus('');
      setError(`${err instanceof Error ? err.message : String(err)}${backedUp ? ' Open Undo last send below to restore the previous preset. Reconnect first if needed.' : ''}`);
    } finally {
      setProgress(null);
      setTransferring(false);
      active.current = false;
    }
  };

  const downloadPatch = () => {
    try { downloadPrst(song.blocks, song.title); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  };

  return (
    <section className="card send-card">
      <h2>Send to pedal</h2>
      <p>Save the complete patch over USB, including every knob and each effect's on/off state. Tone Desk backs up the destination, then reads the saved patch back to verify it.</p>
      <p className="muted small">SnapTone and User IR selections use captures already loaded in your pedal. Blocks omitted from this patch are bypassed; the volume block stays active unless you set it in the patch.</p>
      <SongLevel blocks={song.blocks} disabled={busy || !song.blocks.length} onChange={(blocks) => {
        onSetBlocks(blocks);
        setStatus('Output level saved to this song. Send to pedal to apply it.');
        setError('');
      }} />
      {!pedal && <>
        <p className="muted">Plug in your GP-200 and close the official editor before connecting.</p>
        <button onClick={reconnect} disabled={connecting}>{connecting ? 'Connecting...' : 'Connect pedal'}</button>
      </>}
      <div className="row">
        <label className="inline">Destination preset
          <input className="mono short" value={slotText} disabled={busy} onChange={(e) => { setSlotText(e.target.value.toUpperCase()); setStatus(''); }} placeholder="58-A" />
        </label>
        <button className="primary" onClick={() => transfer()} disabled={!pedal || busy || !song.blocks.length}>
          {progress ? 'Transfer in progress...' : `Send to ${selected === null ? 'pedal' : slotLabel(selected)}`}
        </button>
        {pedal && <button onClick={reconnect} disabled={busy}>Reconnect pedal</button>}
      </div>
      <p className="muted small">This replaces the saved destination preset. Keep the pedal connected and this page open until verification finishes.</p>
      {reading && <p role="status">Reading capture slots... {reading[0]}/{reading[1]}</p>}
      {progress && <progress aria-label="Preset transfer" max={progress[1]} value={progress[0]} />}
      {status && <p className="notice" role="status">{status}</p>}
      {(error || connectError) && <p className="error" role="alert">{error || connectError}</p>}
      <details>
        <summary>Undo last send</summary>
        <p className="muted small">Changed your mind? Restore the preset that was in the pedal slot before your last send. Only that one backup is kept, even after restoring it. Your next send replaces it.</p>
        <p className="muted small">The backup stays in this browser. Download it if you want to keep it beyond your next send or clearing browser data.</p>
        {!backupState.backups.length && !backupState.error && <p className="muted small">No backup yet. One will be saved before your first send.</p>}
        {backupState.error && <p className="error">{backupState.error}</p>}
        <ul className="list">
          {backupState.backups.map((backup) => <li key={backup.id} className="backup-row">
            <span><strong>{slotLabel(backup.slot)}: {backup.name}</strong> <span className="muted small">{new Date(backup.createdAt).toLocaleString()}</span></span>
            <div className="row">
              <button disabled={busy} onClick={() => downloadPrstBytes(Uint8Array.from(backup.bytes), `${slotLabel(backup.slot)}-${prstName(backup.name)}-${backup.createdAt.replace(/[:.]/g, '-')}.prst`)}>Download backup</button>
              <button disabled={!pedal || busy} onClick={() => transfer(backup)}>Restore {slotLabel(backup.slot)}</button>
            </div>
          </li>)}
        </ul>
      </details>
      <details>
        <summary>Use a patch file with the official editor</summary>
        <button onClick={downloadPatch} disabled={busy || !song.blocks.length}>Download "{prstName(song.title)}.prst"</button>
        <p className="muted small">Disconnect Tone Desk on the Pedal tab before opening the official editor. Use Import Patches to choose the file and destination.</p>
      </details>
    </section>
  );
}
