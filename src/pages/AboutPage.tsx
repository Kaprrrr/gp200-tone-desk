import { useRef, useState } from 'react';
import { useApp } from '../App.tsx';
import { download, parseBackup } from '../store.ts';
import { version } from '../../package.json';

export function AboutPage() {
  const { db, update } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const exportAll = () => {
    download(`gp200-tone-desk-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(db, null, 2));
  };

  const importAll = async (file: File) => {
    setMsg('');
    setError('');
    try {
      const next = parseBackup(await file.text());
      if (!confirm(`Replace everything here with this backup (${next.songs.length} songs, ${next.snaptones.length} SnapTones)?`)) return;
      update(() => next);
      setMsg('Backup restored.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="stack narrow">
      <section className="card">
        <h2>Backup</h2>
        <p className="muted">
          Your songs and SnapTone notes are saved in this browser only - not on a server, and not in your Claude account. Clearing browser data or
          switching computers loses them, so export a backup now and then.
        </p>
        <p>{db.songs.length} songs · {db.snaptones.length} SnapTones · {db.irs.filter((i) => !i.empty).length} IRs</p>
        <div className="row">
          <button className="primary" onClick={exportAll}>Export backup</button>
          <button onClick={() => fileInput.current?.click()}>Restore from backup…</button>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importAll(f); e.target.value = ''; }} />
        </div>
        <p className="muted small">This export contains your songs and library. Download your previous pedal preset separately from Undo last send on any saved song. Only the most recent previous preset is kept.</p>
        {msg && <p className="muted small">{msg}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>About</h2>
        <p className="muted small">Version {version}</p>
        <p>
          GP-200 Tone Desk keeps track of the NAM captures (SnapTones) and IRs loaded on your Valeton GP-200, and helps you plan patches for
          specific songs. It runs entirely in your browser.
        </p>
        <ul className="plain">
          <li><strong>Pedal access:</strong> reads capture slots and switches presets. Send to pedal replaces your chosen saved preset, keeps the original backup, and verifies the saved result. No manual SAVE is needed.</li>
          <li><strong>Claude:</strong> the prompt is copied to your clipboard and you paste it into Claude yourself. This site never talks to Claude or any other server.</li>
          <li><strong>Browsers:</strong> Chrome or Edge on Windows, Mac, Linux or Android. Safari and iPhone/iPad don't support USB MIDI.</li>
        </ul>
        <p className="muted small">
          Not affiliated with or endorsed by Valeton. The GP-200's USB MIDI messages were documented by the{' '}
          <a href="https://github.com/phash/gp200editor" target="_blank" rel="noreferrer">phash/gp200editor</a> project (GPL-3.0) - thanks to them.
          SnapTone behaviour notes are from the community "GP200 Missing Manual".
        </p>
      </section>
    </div>
  );
}
