"""Build the Windows launcher with its embedded icon and browser page."""

import json
import os
from pathlib import Path
import subprocess
import zipfile


ROOT = Path(__file__).resolve().parent.parent


def write_zip(path, entries):
    """Store only the explicitly selected release files."""
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, source, mode in entries:
            info = zipfile.ZipInfo(name)
            info.create_system = 3
            info.external_attr = (0o100000 | mode) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, source.read_bytes())


def main():
    """Build the Windows launcher from the already-built standalone HTML."""
    version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
    release = ROOT / "release"
    windows = release / "Windows"
    windows.mkdir(parents=True, exist_ok=True)
    compiler = Path(os.environ["WINDIR"]) / "Microsoft.NET/Framework64/v4.0.30319/csc.exe"
    executable = windows / "GP-200 Tone Desk.exe"
    subprocess.run([
        str(compiler), "/nologo", "/target:winexe", "/platform:anycpu", "/optimize+",
        "/reference:System.Windows.Forms.dll", f"/out:{executable}",
        f"/win32icon:{ROOT / 'assets/tone-desk.ico'}",
        f"/resource:{ROOT / 'dist/index.html'},ToneDesk.html",
        str(ROOT / "scripts/launchers/ToneDesk.cs"),
    ], check=True)

    readme = ROOT / "scripts/release-readme.txt"
    windows_zip = release / f"GP-200_Tone_Desk_v{version}_Windows.zip"
    write_zip(windows_zip, [
        ("GP-200 Tone Desk/GP-200 Tone Desk.exe", executable, 0o755),
        ("GP-200 Tone Desk/READ ME FIRST.txt", readme, 0o644),
    ])
    print(f"Created {windows_zip}")


if __name__ == "__main__":
    main()
