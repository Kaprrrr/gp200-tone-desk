GP-200 TONE DESK  v1.2.6
A free tool for Valeton GP-200 players who use SnapTone (NAM) captures.

NEW IN 1.2.6
On Mac, Tone Desk opens directly as an HTML page in Chrome or Edge again.
The Mac ZIP has no .app launcher to install or approve.
Windows keeps its pedal-icon .exe launcher.
The patch encoder is unchanged from 1.2.4.

IF YOU ALREADY HAVE SAVED SONGS
Before moving to a new file location or browser, open your previous Tone Desk
and choose Backup & About > Export backup. Download Undo last send separately
if needed. In the new page, choose Backup & About > Restore from backup.
Keep the old copy until you check your imported songs.

IMPORTANT UPDATE FROM 1.2.3 AND EARLIER
Earlier versions used the editor's display positions instead of stored parameter
IDs for some models. This could swap delay time and feedback and cause loud noise.
Version 1.2.4 corrects those mappings across the catalog, including cabinet controls.
Stop using the old release for sends or patch-file exports.
Your songs remain usable. Reopen this version and resend affected songs to repair
their saved pedal presets; updating the app alone does not change the pedal.
First download any original preset you want to keep from Undo last send, because
the next send replaces that backup. Check repaired presets at low master volume.
This fix passed an independent offline audit of all 322 model entries and 1400
exposed parameters. It does not mean every effect has been tested by listening.
Check Backup & About for the installed version number.

WHAT IT DOES
- Reads which SnapTone captures and User IRs are loaded in each slot of your
  GP-200, and keeps a library where you note what each one really is, where
  you got it, and the knob settings that work for it.
- Helps you plan a patch for a song using YOUR captures, IRs and the GP-200's
  built-in models, with every knob from the pedal's real parameter list.
- Free patch suggestions from Claude: click "Copy prompt", paste it into
  claude.ai (a free account works), then paste the reply back.
- Share song patches with other players as files (Share / Import).
- Sends complete patches over USB, backs up the destination, and verifies
  the saved result. Restore or download the original preset from the song page.
- One-click jump to the preset a song is saved in.

HOW TO USE
1. Unzip this folder anywhere (Desktop, Documents...).
2. Plug in your GP-200 with USB and CLOSE the official GP-200 editor
   (only one program can talk to the pedal at a time).
3. Mac: Control-click "GP-200 Tone Desk.html" and choose Open With > Google
   Chrome or Microsoft Edge. Once either is the file's default browser,
   double-click to open it.
   Windows: double-click "GP-200 Tone Desk.exe", the pedal icon.
   The Windows launcher opens Edge, or Chrome if Edge is not installed.
4. Go to the Pedal tab > Connect to GP-200. When the browser asks to allow
   MIDI access, click Allow. Capture slots are read automatically.
5. Fill in your captures on the SnapTones tab, then add songs on the
   Songs tab.
6. Choose a saved song from My songs, select the destination under Send to pedal, then click
   Send and confirm. Keep the pedal connected until Saved and verified appears.
   You do not need to press SAVE on the pedal.

YOUR DATA
Everything is saved inside your browser on this computer - no account, no
server, nothing uploaded. Use "Backup & About > Export backup" now and then,
especially before clearing browser data or moving to a new computer.
On Mac, keep the HTML file in the same place and use the same browser so it
finds your saved data. Export a backup before changing either.
The Windows launcher keeps its page address stable between updates.

BALANCE SONG VOLUMES
Choose a saved song and adjust Song output level above Send to pedal.
The setting is saved with that song; send it again to hear the change.
Keep the master volume fixed, play the same riff through your reference preset
or pedal, and lower the louder song until the levels match by ear.
The slider uses the final VOL block from 0 (mute) to 100 (maximum setting).
It leaves amp gain and the other effects unchanged. Moving the slider enables
VOL if it was bypassed. An expression pedal assigned to VOL can also change it.
This is manual level balancing; Tone Desk does not measure audio loudness.

WHAT CHANGES ON MY PEDAL?
Send replaces the saved preset in the slot you confirm. It keeps the original
in this browser before writing and reads the saved result back to verify it.
If browser storage is unavailable or full, it stops before writing.
If verification fails, reconnect as needed and restore the original from
Undo last send on any saved song. Only one backup is kept, from your latest
send across all slots. Restore keeps that same backup available for retries.
Your next send replaces it. Old backup histories shrink to the latest entry.
Download the backup as a .prst file to keep it beyond the next send or clearing
browser data. This backup is separate from the song/library JSON export.
SnapTone and User IR choices use captures already loaded on your pedal.
Blocks omitted from the song are bypassed, except the volume block.
Unspecified knobs use model defaults.
Tempo sync is not supported in generated patches yet. Keep Sync switches OFF
and set delay times in milliseconds or modulation rates directly.
Songs with unsupported Sync settings are rejected before sending.

IF A TRANSFER STOPS RESPONDING
Tone Desk automatically reconnects once after repeated incomplete preset reads.
It retries the read without repeating a preset write.
If the backup cannot finish, no preset is written. If verification cannot finish,
the preset may have changed; the previous preset remains under Undo last send.
Use Reconnect pedal on the song page before retrying a failed transfer.
Keep other Tone Desk tabs and the official editor disconnected.
If the pedal still does not answer, unplug USB, power-cycle the pedal,
reconnect USB, then click Reconnect pedal.

REQUIREMENTS
- Use Chrome or Edge. Windows hardware transfers have been tested; corrected
  Mac transfers still need verification on an actual Mac.
- Safari and iPhone/iPad can't talk to USB MIDI devices.
- Tested with GP-200 firmware 1.8.

CREDITS
- The GP-200's USB MIDI messages were documented by the phash/gp200editor
  project (github.com/phash/gp200editor). Thank you!
- SnapTone notes (knob ranges, EQ frequencies) are from the community
  "GP200 Missing Manual".

Not affiliated with or endorsed by Valeton or Hotone.

APP ICON
The pedal icon appears inside Tone Desk and on its browser tab.
The Mac HTML file uses the browser's document icon or a generic file icon.
The Windows launcher has the pedal icon built in.
