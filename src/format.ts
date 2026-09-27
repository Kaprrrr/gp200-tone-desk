/** Pedal SnapTone slot 0-9 -> how the GP-200 editor shows it. */
export const snapSlotLabel = (slot: number) => (slot < 5 ? `AMP ${slot + 1}` : `DST ${slot - 4}`);

/** SnapTone Gain/Volume knob -> dB (0 = -24 dB, 50 = unity, 100 = +24 dB). */
export const snapKnobDb = (v: number) => {
  const db = (v - 50) * 0.48;
  return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
};

/** SnapTone EQ knob -> dB (±6 dB). */
export const snapEqDb = (v: number) => {
  const db = (v - 50) * 0.12;
  return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
};

export const ago = (iso: string | null) => {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} h ago`;
  return new Date(iso).toLocaleDateString();
};
