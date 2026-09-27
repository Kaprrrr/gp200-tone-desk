"""
Record the MIDI messages the official Valeton GP-200 editor sends to the pedal.

Starts GP-200.exe with a Frida hook on winmm's MIDI functions (nothing is
installed or changed) and writes every message to a timestamped log. Use the
editor normally, then close it - the log is written as you go.

Usage:  python scripts/record-editor.py [log-file]
"""
import datetime
import argparse
import json
import sys
import time

import frida

EDITOR = r"C:\Program Files\Valeton\GP-200\GP-200.exe"

HOOK = r"""
const winmm = Process.getModuleByName('winmm.dll');
function hex(ptr, len) {
  const bytes = new Uint8Array(ptr.readByteArray(len));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(' ');
}
// Outgoing SysEx: midiOutLongMsg(hmo, MIDIHDR* hdr, cb). MIDIHDR: lpData @0, dwBufferLength @4 (32-bit).
Interceptor.attach(winmm.getExportByName('midiOutLongMsg'), {
  onEnter(args) {
    const hdr = args[1];
    const data = hdr.readPointer();
    const len = hdr.add(Process.pointerSize).readU32();
    send({ dir: 'out', hex: hex(data, len) });
  }
});
// Outgoing short messages (CC, program change...).
Interceptor.attach(winmm.getExportByName('midiOutShortMsg'), {
  onEnter(args) {
    const m = args[1].toUInt32();
    send({ dir: 'out-short', hex: [m & 0xff, (m >> 8) & 0xff, (m >> 16) & 0xff].map(b => b.toString(16).padStart(2, '0')).join(' ') });
  }
});
// Capture filled buffers at the callback, before the editor clears/requeues them.
const callbacks = new Set();
// An already-open editor cannot expose its callback through midiInOpen again.
// Its completed buffers are still readable before unprepare returns them.
Interceptor.attach(winmm.getExportByName('midiInUnprepareHeader'), {
  onEnter(args) {
    const hdr = args[1];
    const rec = hdr.add(Process.pointerSize + 4).readU32();
    if (rec > 0 && rec <= 65536) send({ dir: 'in-buffer', hex: hex(hdr.readPointer(), rec) });
  }
});
Interceptor.attach(winmm.getExportByName('midiInOpen'), {
  onEnter(args) {
    const callback = args[2];
    if ((args[4].toUInt32() & 0x70000) !== 0x30000 || callback.isNull() || callbacks.has(callback.toString())) return;
    callbacks.add(callback.toString());
    Interceptor.attach(callback, {
      onEnter(cb) {
        if (cb[1].toUInt32() !== 0x3c4) return;
        const hdr = cb[3];
        const rec = hdr.add(Process.pointerSize + 4).readU32();
        if (rec > 0 && rec <= 65536) send({ dir: 'in', hex: hex(hdr.readPointer(), rec) });
      }
    });
  }
});
send({ dir: 'info', hex: 'hooks installed' });
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("log", nargs="?", default=f"editor-capture-{datetime.datetime.now():%Y%m%d-%H%M%S}.jsonl")
    parser.add_argument("--attach", type=int, metavar="PID", help="Attach after the editor has loaded, without restarting it")
    args = parser.parse_args()
    out = open(args.log, "a", encoding="utf-8")
    start = time.time()
    counts = {"out": 0, "in": 0}

    def on_message(message, _data):
        if message["type"] != "send":
            print(message)
            return
        p = message["payload"]
        p["t"] = round(time.time() - start, 3)
        p["utc"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        out.write(json.dumps(p) + "\n")
        out.flush()
        if p["dir"] in counts:
            counts[p["dir"]] += 1
        else:
            print(f"[{p['t']:8.2f}s] {p['dir']}: {p['hex']}")

    pid = args.attach if args.attach else frida.spawn([EDITOR])
    session = frida.attach(pid)
    script = session.create_script(HOOK)
    script.on("message", on_message)
    script.load()
    if not args.attach:
        frida.resume(pid)
    print(f"Recording GP-200 editor (pid {pid}) to {args.log}. Ctrl+C stops recording without closing the editor.", flush=True)
    done = []
    session.on("detached", lambda *_: done.append(True))
    try:
        while not done:
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    if not done:
        session.detach()
    out.close()
    print(f"\nSaved {counts['out']} outgoing / {counts['in']} incoming messages to {args.log}")


if __name__ == "__main__":
    main()
