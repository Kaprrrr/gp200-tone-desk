import type { PatchBlock } from '../../shared/types.ts';

export function SongLevel({ blocks, onChange, disabled }: {
  blocks: PatchBlock[];
  onChange: (blocks: PatchBlock[]) => void;
  disabled: boolean;
}) {
  const volume = blocks.find((block) => block.module === 'VOL');
  // Songs without an explicit VOL block inherit the export template's enabled 100 setting.
  const value = volume?.params.find((param) => param.name === 'Volume')?.value ?? 100;
  const bypassed = volume?.enabled === false;
  const setLevel = (level: number) => {
    const next: PatchBlock = {
      module: 'VOL', model: 'Volume', snaptoneSlot: null, enabled: true,
      params: [{ name: 'Volume', value: level }], note: volume?.note ?? '',
    };
    onChange(volume ? blocks.map((block) => block.module === 'VOL' ? next : block) : [...blocks, next]);
  };

  return (
    <div className="song-level">
      <label>Song output level
        <div className="row">
          <input type="range" min="0" max="100" step="1" value={value} disabled={disabled}
            onChange={(event) => setLevel(Number(event.target.value))} />
          <span className="mono">{value} / 100{bypassed ? ' (bypassed)' : ''}</span>
        </div>
      </label>
      <p className="muted small">Saved with this song. Send to pedal to hear the change. Keep master volume fixed and compare the same riff; lower the louder song to match.</p>
      {bypassed && <p className="muted small">The volume block is bypassed. Moving this slider enables it.</p>}
      <p className="muted small">0 mutes; 100 is maximum. Amp gain stays unchanged. An expression pedal assigned to volume can also change this level.</p>
    </div>
  );
}
