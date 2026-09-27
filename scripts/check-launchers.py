"""Check the launchers as distributed, without contacting a pedal."""

import json
from pathlib import Path
import struct
import zipfile

from PIL import Image


root = Path(__file__).resolve().parent.parent
version = json.loads((root / "package.json").read_text())["version"]
page = (root / "dist/index.html").read_bytes()
shell_icon = root / "release/verified-windows-icon.png"
if shell_icon.exists():
    actual = Image.open(shell_icon).convert("RGBA")
    original = Image.open(root / "assets/tone-desk.ico").ico.getimage(actual.size).convert("RGBA")
    assert actual.tobytes() == original.tobytes(), "Windows shell must display the actual pedal artwork."

with zipfile.ZipFile(root / f"release/GP-200_Tone_Desk_v{version}_Windows.zip") as archive:
    assert sorted(archive.namelist()) == [
        "GP-200 Tone Desk/GP-200 Tone Desk.exe", "GP-200 Tone Desk/READ ME FIRST.txt"
    ], "Windows ZIP must expose the launcher and readme only."
    executable = archive.read("GP-200 Tone Desk/GP-200 Tone Desk.exe")
    pe_offset = struct.unpack_from("<I", executable, 0x3C)[0]
    assert executable[pe_offset:pe_offset + 4] == b"PE\0\0"
    assert struct.unpack_from("<H", executable, pe_offset + 24 + 68)[0] == 2, "Launcher must not open a console."

with zipfile.ZipFile(root / f"release/GP-200_Tone_Desk_v{version}_Mac.zip") as archive:
    assert set(archive.namelist()) == {
        "GP-200 Tone Desk/GP-200 Tone Desk.html", "GP-200 Tone Desk/READ ME FIRST.txt"
    }, "Mac ZIP must contain just HTML and instructions, without an app bundle."
    assert all("\\" not in name for name in archive.namelist()), "ZIP paths must work on macOS."
    assert archive.read("GP-200 Tone Desk/GP-200 Tone Desk.html") == page

print("PASS: Windows launcher format and Mac standalone HTML archive.")
