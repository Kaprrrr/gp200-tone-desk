import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Catalog } from '../shared/types.ts';
import catalogJson from '../shared/catalog.json';
import { GP200, slotLabel } from './midi/gp200.ts';
import { AboutPage } from './pages/AboutPage.tsx';
import { PedalPage } from './pages/PedalPage.tsx';
import { SnapTonesPage } from './pages/SnapTonesPage.tsx';
import { SongsPage } from './pages/SongsPage.tsx';
import { loadDb, mergePedalRead, persistDb, type Db } from './store.ts';
import toneDeskIcon from './assets/tone-desk.png';

type Tab = 'songs' | 'snaptones' | 'pedal' | 'about';
const TABS: { id: Tab; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'snaptones', label: 'SnapTones' },
  { id: 'pedal', label: 'Pedal' },
  { id: 'about', label: 'Backup & About' },
];

interface AppState {
  catalog: Catalog;
  db: Db;
  /** Apply a change to the saved data (written to this browser immediately). */
  update: (fn: (db: Db) => Db) => void;
  /** Read all SnapTone/IR slot names from the pedal into the library. */
  readSlots: (p?: GP200) => Promise<void>;
  reading: [number, number] | null;
  readChanges: string[] | null;
  readError: string;
  persistent: boolean;
  pedal: GP200 | null;
  pedalPreset: number | null;
  connecting: boolean;
  transferring: boolean;
  setTransferring: (value: boolean) => void;
  connectError: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  goTo: (tab: Tab) => void;
}

const Ctx = createContext<AppState | null>(null);
export const useApp = () => useContext(Ctx)!;
const catalog = catalogJson as unknown as Catalog;

export function App() {
  const [initial] = useState(loadDb);
  const [db, setDb] = useState<Db>(initial.db);
  const [persistent, setPersistent] = useState(initial.persistent);
  const [tab, setTab] = useState<Tab>('songs');
  const [pedal, setPedal] = useState<GP200 | null>(null);
  const [pedalPreset, setPedalPreset] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [reading, setReading] = useState<[number, number] | null>(null);
  const [readChanges, setReadChanges] = useState<string[] | null>(null);
  const [readError, setReadError] = useState('');
  const dbRef = useRef(db);
  const connectionPending = useRef(false);
  dbRef.current = db;

  useEffect(() => (pedal ? pedal.onPresetChange(setPedalPreset) : undefined), [pedal]);

  useEffect(() => {
    if (!transferring) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [transferring]);

  const update = (fn: (db: Db) => Db) => {
    setDb((prev) => {
      const next = fn(prev);
      setPersistent(persistDb(next));
      return next;
    });
  };

  const readSlots = async (p: GP200 | null = pedal) => {
    if (!p) return;
    setReadError('');
    setReadChanges(null);
    setReading([0, 1]);
    try {
      const read = await p.readSlots((done, total) => setReading([done, total]));
      const { db: next, changes } = mergePedalRead(dbRef.current, read);
      update(() => next);
      setReadChanges(changes);
    } catch (err) {
      setReadError(err instanceof Error ? err.message : String(err));
    } finally {
      setReading(null);
    }
  };

  const connect = async () => {
    if (connectionPending.current || transferring || reading) return;
    connectionPending.current = true;
    setConnecting(true);
    setConnectError('');
    let next: GP200 | null = null;
    try {
      await pedal?.close();
      setPedal(null);
      setPedalPreset(null);
      next = await GP200.connect();
      setPedalPreset(await next.currentPreset());
      setPedal(next);
      // Always refresh the library on connect so it matches what's loaded now.
      await readSlots(next);
    } catch (err) {
      await next?.close();
      setPedal(null);
      setPedalPreset(null);
      setConnectError(err instanceof Error ? err.message : String(err));
    } finally {
      connectionPending.current = false;
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (connectionPending.current || transferring || reading) return;
    try { await pedal?.close(); }
    finally { setPedal(null); setPedalPreset(null); }
  };

  const state: AppState = {
    catalog, db, update, readSlots, reading, readChanges, readError, persistent,
    pedal, pedalPreset, connecting, transferring, setTransferring, connectError, connect, disconnect, goTo: setTab,
  };

  return (
    <Ctx.Provider value={state}>
      <header className="topbar">
        <div className="brand">
          <img className="brand-icon" src={toneDeskIcon} alt="" /> GP-200 Tone Desk
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" disabled={transferring} aria-selected={tab === t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <button disabled={transferring} className={pedal ? 'pedal-pill on' : 'pedal-pill'} onClick={() => setTab('pedal')} title="Pedal connection">
          <span className="dot" />
          {reading ? `Reading slots ${reading[0]}/${reading[1]}…` : pedal ? `Pedal · ${pedalPreset !== null ? slotLabel(pedalPreset) : 'connected'}` : 'Pedal offline'}
        </button>
      </header>
      {!persistent && (
        <div className="banner">This browser is blocking storage, so changes won't be kept after you close the page. Use Backup &amp; About → Export to save them.</div>
      )}
      <main className="page">
        <fieldset className="page-controls" disabled={transferring}>
        {tab === 'songs' && <SongsPage />}
        {tab === 'snaptones' && <SnapTonesPage />}
        {tab === 'pedal' && <PedalPage />}
        {tab === 'about' && <AboutPage />}
        </fieldset>
      </main>
      <footer className="footer muted small">
        Community tool, not affiliated with Valeton. Your data stays in this browser.
      </footer>
    </Ctx.Provider>
  );
}
