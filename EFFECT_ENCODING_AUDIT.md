# Effect encoding audit, 2026-09-26

Version 1.2.4 fixes a confirmed encoder defect that can explain the loud noise
Chris reported after sending Beautiful, Strange from a Mac.
The defect also exists in the Windows build of earlier releases.
The actual noisy preset has not been exported from the pedal, so the causal
conclusion is based on reproducing the faulty encoding of Chris's shared song,
not an audio recording or a readback of that exact destination.

## Cause and failure of earlier verification

The official editor XML uses `idx` for control display order and `ID` for stored
parameter positions in the effect's 15-float array.
The catalog builder incorrectly selected `idx`.
The same mapping generated both the outgoing preset and its expected readback,
so byte-for-byte storage confirmation could accept semantically wrong settings.
Earlier tests did not independently cover the whole catalog against the official IDs.

The reported song uses built-in Super OD, L-Star OD, Gate 1, SUP Star,
Dual Echo, and Hall. It uses no SnapTone or User IR.
Its requested feedback values are 30 and 25, with delay times 643 and 857 ms.

| Control | Old stored ID | Correct stored ID | Requested value |
|---|---:|---:|---:|
| Dual Echo Time A | 1 | 2 | 643 |
| Dual Echo Feedback A | 2 | 1 | 30 |
| Dual Echo Time B | 4 | 5 | 857 |
| Dual Echo Feedback B | 5 | 4 | 25 |
| CAB Volume | 0 | 1 | 50, model default |
| CAB Low Cut | 1 | 5 | 80 |
| CAB High Cut | 2 | 6 | 7500 |

The old encoder therefore put 643 and 857 into delay feedback positions whose
documented range is -100 through 100.
Regression tests reproduced this before the fix and passed after it.

## Scope of corrections

The official XML contains 322 model entries and 1,400 exposed controls.
The XML is byte-identical to the installed official GP-200 editor's copy.
Its SHA256 is `d95d6e019d602e4dafd5b2b0aec7c1494dd52546b0e67f0ee6663d8fa6cb8e0e`.

102 entries contain differences between display order and stored IDs:

- All 90 CAB entries, including 20 User IR slots.
- Dual Echo, Ping Pong, Sweep Echo, Ring Echo, Vintage Rack, Lofi Echo, and Slapback.
- Pitch, Harmonizer 1, and Harmonizer 2 in PRE.
- Black Bass in DST and EV 51 in AMP.

Slapback's Trail position had already used an ID fallback, so the old mapping
defect itself affected 101 entries; the full audit also corrected Slapback's
commented-out Sync control being accidentally included by the XML parser.

Additional corrections:

- Preserve valid hidden CAB mic fields from the editor-exported template.
- Initialize EV 51's unexposed position 5 to 50, matching all available EV 51 captures.
- Parse the XML's unit-bearing Detune default as -25 instead of emitting null.
- Preserve tenths in modulation-rate sliders and AI reply parsing.
- Reject tempo-sync ON in generated presets rather than treating milliseconds/Hz
  as the note-division indices expected in that mode.
  Existing raw preset backup restoration still preserves sync settings exactly.
- Fail generation on invalid/duplicate hardware IDs or invalid defaults.
- Validate every supplied or defaulted value before encoding.

## Independent offline validation

Run `python scripts/audit-effects.py` or `npm run audit:effects`.
Python's XML parser reads the official XML independently from the catalog builder.
The script creates default, bypass, per-control boundary/intermediate, and invalid cases.
It invokes the actual TypeScript encoder and decodes the resulting files independently
with Python's `struct` module, using XML IDs rather than the generated catalog.

Results:

- 322 model entries, 1,400 parameters.
- 4,901 generated patches checked for model, hardware parameter positions, exact
  float32 values, bypass, checksum, unchanged other effect data, and hidden CAB values.
- 2,849 invalid or unsupported input cases rejected.
- Total: 7,750 cases. No MIDI port is opened and no case is sent to a pedal.

Evidence is in `data/effect-audit/report.json`, `cases.json`, and `encoded.json`.
The historical escaped label `Wow &amp;` is compared to its decoded XML name;
its stored spelling remains unchanged for compatibility with saved songs.

Run `python scripts/audit-captured-presets.py` for the saved hardware evidence.
The existing capture contains 111 unique preset slots; diagnostic slots 0 and 228
are excluded from the reference comparison.
185 catalog model entries appear in the remaining records, including bypassed blocks.
Exposed values fit the corrected IDs/ranges after accounting for tempo-synced note
indices and Slapback's legacy hidden sync bit.
There are no unexplained out-of-range controls in that comparison.
This range check supports the mapping but is not an independent audible test of 185 effects.
Details are in `data/effect-audit/capture-report.json`.

The SUP Star block from captured factory preset 10-D is retained as a regression
fixture for the actual CAB Volume/Low Cut/High Cut positions.
The exact reported song's blocks are retained in `tests/fixtures/beautiful-strange-blocks.json`.
Its complete source is retained privately in `data/reported-beautiful-strange.gp200song.json`.

27 Node tests and 10 Edge browser tests passed after the final code changes.
The browser checks assert actual transmitted delay/cab values independently of
the driver's expected readback and exercise fractional sliders and rejected Sync ON.
TypeScript and the standalone Vite build passed.

## Limits and next hardware check

No new diagnostic hardware writes were performed during this audit.
All individual effects have not been auditioned on real hardware.
No corrected transfer has yet been verified on Chris's Mac.
Chris subsequently reported that another song worked on the Mac.
He did not specify its settings or app version, so that success does not validate this repair.
Factory captures cover only part of the catalog and cannot prove every exposed
label or unexposed field's audible effect.
Unexposed Pitch/Harmonizer positions lack a matching capture in this reference set;
they retain the encoder's zero initialization and are not claimed hardware-verified.
Legal maximum feedback/gain values can still produce undesirable sound; legal
parameter ranges are not an audio loudness guarantee.

To retest the reported song, preserve its previous undo backup, open version 1.2.4
at the existing app location, and resend the unchanged song with physical output low.
Confirm the saved Dual Echo feedback reads 30/25 and its time values read 643/857.
An official-editor export/readback of the actual preset would provide independent
confirmation; then Chris can judge its sound at low output.
The updated app does not automatically repair presets already stored on the pedal.
