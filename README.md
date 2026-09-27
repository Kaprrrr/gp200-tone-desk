# GP-200 Tone Desk

Version 1.2.4 corrects parameter mapping errors in earlier releases that could send
delay times into feedback controls and produce loud noise.
Use 1.2.4 for further sends/exports; existing songs remain usable but affected
presets on the pedal must be resent after preserving any original undo backup.
See `EFFECT_ENCODING_AUDIT.md` for the independent catalog audit and remaining limits.

A free browser tool for **Valeton GP-200** players who use **SnapTone (NAM) captures**.

- **SnapTone library** – plug in your pedal and it reads which captures and IRs are in each slot. Add what each one really is (the pedal cuts names to 15 characters), where you got it, and the knob settings that work for it.
- **Song patches** – plan a patch for a song: pick your own SnapTones or built-in amps and effects, with every knob from the GP-200's real parameter list.
- **Help from Claude, free** – click *Copy prompt*, paste it into [claude.ai](https://claude.ai) (a free account works), and paste the reply back. The prompt includes your captures, your IRs and the full GP-200 model list, so the patch uses gear you actually have.
- **Share patches** – export a song as a file and send it to others. When someone imports it, captures they don't have are flagged so they can swap in their own.
- **Jump to presets** – note which preset a song is saved in and switch the pedal to it with one click.

Everything stays in your browser. There are no accounts, no server and no API keys.

## Using it

[Download Tone Desk for Windows or Mac](https://github.com/Kaprrrr/gp200-tone-desk/releases/latest).
The Windows download is the working 1.2.5 release with its pedal-icon executable.
The Mac download is version 1.2.6, which uses standalone HTML to avoid the unsigned Mac launcher's approval requirement.
If changing the page location or browser, export your backup and download any Undo preset first.
Restore the backup in the new page.

1. Unzip the release. On Windows, open **GP-200 Tone Desk.exe**. On Mac, Control-click **GP-200 Tone Desk.html**, then choose **Open With > Google Chrome** or **Microsoft Edge**. Safari and iPhone/iPad can't talk to USB MIDI devices.
2. Plug in the GP-200 over USB and **close the official GP-200 editor**, since only one program can use the pedal at a time.
3. Go to **Pedal → Connect**, click **Allow** when the browser asks about MIDI, then **Read slots from pedal**.
4. Fill in your captures on the **SnapTones** tab, then add songs on the **Songs** tab.
5. Use **Backup & About → Export backup** now and then. Your data lives in this browser only.

**Send to pedal:** open a saved song, choose a destination such as 58-A, and click Send.
Confirm the destination to replace that saved preset.
Tone Desk retains the original in browser storage before writing, then reloads the destination and verifies its name, signal chain, models, knobs, and on/off states.
No manual SAVE is needed.
Keep the pedal connected and the page open until verification finishes.

Choose a saved song from the **My songs** dropdown.
Use the collapsed **Undo last send** section to download the previous preset as `.prst` or restore its original slot.
Only one backup is kept, from the most recent send, across all slots.
A restore keeps that backup available for another retry; your next send replaces it.
Older versions' backup histories are reduced to their newest entry when opened.
Download the backup if you want to keep it beyond the next send or clearing browser data; the song/library JSON export does not include it.
If backup storage fails, Tone Desk stops before writing.
If transfer verification fails, reconnect as needed and restore the retained original.

SnapTone and User IR choices refer to captures already loaded on the pedal.
Blocks omitted from a song are bypassed, except the template volume block.
Unspecified knobs use the selected model's defaults.

The Send and Restore buttons were tested through Edge on GP-200 firmware 1.8, including real 58-A readback and restoration.
On this Windows 11 PC, communication recovered after selecting the generic USB Audio driver, restarting Windows, and power-cycling the pedal.
The replacement Mac HTML package passed a rendering check in Edge; opening it on a Mac remains unconfirmed.

## Development

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # one self-contained dist/index.html (see scripts/package-release.ps1)
npm run catalog    # rebuild shared/catalog.json from scripts/algorithm.xml
```

`scripts/algorithm.xml` is the effect list from the official GP-200 editor (v1.8.1). After a firmware or editor update, copy the new one from `C:\Program Files\Valeton\GP-200\Resource\GP-200\File\algorithm.xml` and run `npm run catalog`.

## Credits

- The GP-200's USB MIDI messages were documented by [phash/gp200editor](https://github.com/phash/gp200editor) (GPL-3.0). This project uses its handshake, preset and slot-name messages, checked against firmware 1.8.
- SnapTone behaviour notes (knob ranges, EQ frequencies) are from the community *GP200 Missing Manual*.
- Model "based on" descriptions come from the GP-200 knowledge base in gp-patch-lab.

Not affiliated with or endorsed by Valeton or Hotone.

Tone Desk uses its own charcoal-and-gold pedal icon in the header and browser tab.
The Windows executable displays the pedal icon; the Mac HTML file uses the browser's document icon or a generic file icon.
