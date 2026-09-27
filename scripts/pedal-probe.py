"""Read GP-200 replies through Windows MIDI and retain raw evidence locally."""

import argparse
import ctypes as c
from ctypes import wintypes as w
import json
from pathlib import Path
import queue
import subprocess
import time

HDR = bytes.fromhex("f0 21 25 7e 47 50 2d 32")
DWORD_PTR = c.c_size_t


class MIDIHDR(c.Structure):
    _fields_ = [("lpData", c.c_void_p), ("dwBufferLength", w.DWORD),
                ("dwBytesRecorded", w.DWORD), ("dwUser", DWORD_PTR),
                ("dwFlags", w.DWORD), ("lpNext", c.c_void_p),
                ("reserved", DWORD_PTR), ("dwOffset", w.DWORD),
                ("dwReserved", DWORD_PTR * 8)]


class CAPS(c.Structure):
    _fields_ = [("mid", w.WORD), ("pid", w.WORD), ("version", w.DWORD),
                ("name", w.WCHAR * 32), ("extra", c.c_byte * 32)]


def decode(msg):
    raw = msg[13:-1]
    return bytes((raw[i] << 4) | raw[i + 1] for i in range(0, len(raw) - 1, 2))


def message(sub, payload, cmd=0x12):
    nibbles = bytes(n for b in payload for n in (b >> 4, b & 15))
    return HDR + bytes([cmd, sub, 0, 0, 0]) + nibbles + b"\xf7"


def read_request(slot):
    msg = bytearray(46)
    msg[:10] = HDR + bytes([0x11, 0x10])
    msg[18], msg[22], msg[30], msg[34], msg[45] = 4, 1, 1, 4, 0xf7
    for at in (25, 37, 41):
        msg[at:at + 2] = bytes([slot >> 4, slot & 15])
    return msg


class Pedal:
    def __init__(self, log):
        # A timeout dialog can survive WM_CLOSE and leave the editor sending MIDI.
        processes = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq GP-200.exe", "/FO", "CSV", "/NH"],
            capture_output=True, text=True, check=True, creationflags=subprocess.CREATE_NO_WINDOW,
        ).stdout
        if '"gp-200.exe"' in processes.lower():
            raise RuntimeError("GP-200 editor is still running. Close it completely before this check.")
        self.api = c.WinDLL("winmm")
        self.log = Path(log).open("a", encoding="utf-8")
        self.received = queue.Queue()
        self.buffers = []
        self.closing = False
        self.input = w.HANDLE()
        self.output = w.HANDLE()
        callback_type = c.WINFUNCTYPE(None, w.HANDLE, w.UINT, DWORD_PTR, DWORD_PTR, DWORD_PTR)

        def callback(_handle, event, _instance, param1, _param2):
            if event == 0x3c4:
                hdr = c.cast(param1, c.POINTER(MIDIHDR)).contents
                data = c.string_at(hdr.lpData, hdr.dwBytesRecorded)
                if data:
                    self.received.put(data)
                    self.record("in", data)
                if not self.closing:
                    self.api.midiInAddBuffer(self.input, c.byref(hdr), c.sizeof(hdr))

        self.callback = callback_type(callback)
        ins = self.devices("In")
        outs = self.devices("Out")
        print(json.dumps({"inputs": ins, "outputs": outs}), flush=True)
        inp = next(i for i, name in ins if "GP-200" in name)
        out = next(i for i, name in outs if "GP-200" in name)
        self.check(self.api.midiInOpen(c.byref(self.input), inp, self.callback, 0, 0x30000))
        self.check(self.api.midiOutOpen(c.byref(self.output), out, 0, 0, 0))
        for _ in range(16):
            buf = c.create_string_buffer(4096)
            hdr = MIDIHDR(lpData=c.addressof(buf), dwBufferLength=len(buf))
            self.check(self.api.midiInPrepareHeader(self.input, c.byref(hdr), c.sizeof(hdr)))
            self.check(self.api.midiInAddBuffer(self.input, c.byref(hdr), c.sizeof(hdr)))
            self.buffers.append((buf, hdr))
        self.check(self.api.midiInStart(self.input))

    def devices(self, direction):
        result = []
        for index in range(getattr(self.api, f"midi{direction}GetNumDevs")()):
            caps = CAPS()
            self.check(getattr(self.api, f"midi{direction}GetDevCapsW")(index, c.byref(caps), c.sizeof(caps)))
            result.append((index, caps.name))
        return result

    def check(self, result):
        if result:
            raise RuntimeError(f"Windows MIDI error {result}; close the official editor and other MIDI clients.")

    def record(self, direction, data):
        self.log.write(json.dumps({"t": time.time(), "dir": direction, "hex": data.hex(" ")}) + "\n")
        self.log.flush()

    def send(self, data):
        self.record("out", bytes(data))
        buf = c.create_string_buffer(bytes(data))
        hdr = MIDIHDR(lpData=c.addressof(buf), dwBufferLength=len(data))
        self.check(self.api.midiOutPrepareHeader(self.output, c.byref(hdr), c.sizeof(hdr)))
        self.check(self.api.midiOutLongMsg(self.output, c.byref(hdr), c.sizeof(hdr)))
        end = time.monotonic() + 5
        while not hdr.dwFlags & 1:
            if time.monotonic() > end:
                self.api.midiOutReset(self.output)
                raise TimeoutError("MIDI output did not finish")
            time.sleep(.005)
        self.check(self.api.midiOutUnprepareHeader(self.output, c.byref(hdr), c.sizeof(hdr)))

    def collect(self, seconds=2):
        result = []
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            try:
                result.append(self.received.get(timeout=min(.1, max(.001, end - time.monotonic()))))
            except queue.Empty:
                pass
        return result

    def query(self, data, seconds=2):
        self.collect(.1)
        self.send(data)
        result = self.collect(seconds)
        print(json.dumps([{"sub": x[9] if len(x) > 9 else None, "len": len(x),
                           "header": x[:13].hex(" "), "decoded": decode(x)[:48].hex(" ")}
                          for x in result[:12]]), flush=True)
        if len(result) > 12:
            print(f"{len(result)} total replies; full bytes retained in the log", flush=True)
        return result

    def close(self):
        self.closing = True
        self.api.midiInStop(self.input)
        self.api.midiInReset(self.input)
        for _buf, hdr in self.buffers:
            self.api.midiInUnprepareHeader(self.input, c.byref(hdr), c.sizeof(hdr))
        self.api.midiInClose(self.input)
        self.api.midiOutClose(self.output)
        self.log.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slot", type=int, default=228)
    parser.add_argument("--log", default="data/pedal-read.jsonl")
    parser.add_argument("--reads", type=int, default=1)
    args = parser.parse_args()
    if not 0 <= args.slot <= 255:
        parser.error("slot must be 0..255")
    pedal = Pedal(args.log)
    try:
        for _ in range(3):
            if pedal.query(HDR + bytes.fromhex("11 04 00 00 00 00 01 02 00 00 00 00 00 f7")):
                break
        pedal.send(HDR + bytes.fromhex("11 12 00 00 00 f7"))
        time.sleep(.2)
        pedal.query(HDR + bytes.fromhex("11 04 00 00 00 00 06 01 00 00 00 00 00 f7"))
        pedal.query(HDR + bytes.fromhex("11 0a 00 00 00 00 00 01 00 00 06 00 00 0d 04 0f 07 08 0b 00 00 0c 0b 04 05 f7"))
        for read in range(args.reads):
            result = pedal.query(read_request(args.slot))
            print(f"Read {read + 1}: {len(result)} messages", flush=True)
    finally:
        pedal.send(HDR + bytes.fromhex("11 04 00 00 00 00 02 02 00 00 00 00 00 f7"))
        time.sleep(.1)
        pedal.close()


if __name__ == "__main__":
    main()
