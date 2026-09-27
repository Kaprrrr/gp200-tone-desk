"""Package the browser page without native launchers or installation steps."""

import json
from pathlib import Path
import zipfile


def main():
    """Write the portable Mac HTML package without an application bundle."""
    root = Path(__file__).resolve().parent.parent
    version = json.loads((root / "package.json").read_text(encoding="utf-8"))["version"]
    for platform in ("Mac",):
        path = root / "release" / f"GP-200_Tone_Desk_v{version}_{platform}.zip"
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, source in (
                ("GP-200 Tone Desk.html", root / "dist/index.html"),
                ("READ ME FIRST.txt", root / "scripts/release-readme.txt"),
            ):
                # Forward slashes keep the folder layout portable to macOS.
                archive.write(source, f"GP-200 Tone Desk/{name}")
        print(f"Created {path}")


if __name__ == "__main__":
    main()
