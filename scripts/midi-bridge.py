"""Expose Windows MIDI to the Node hardware check over JSON lines."""

import importlib.util
import json
from pathlib import Path
import queue
import sys
import threading

spec = importlib.util.spec_from_file_location("pedal_probe", Path(__file__).with_name("pedal-probe.py"))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
pedal = probe.Pedal("data/hardware-check.jsonl")
done = threading.Event()


def receive():
    while not done.is_set():
        try:
            data = pedal.received.get(timeout=.1)
            print(json.dumps({"data": list(data)}), flush=True)
        except queue.Empty:
            pass


reader = threading.Thread(target=receive, daemon=True)
reader.start()
print(json.dumps({"ready": True}), flush=True)
try:
    for line in sys.stdin:
        command = json.loads(line)
        if command.get("close"):
            break
        pedal.send(bytes(command["data"]))
finally:
    done.set()
    reader.join(timeout=1)
    pedal.close()
