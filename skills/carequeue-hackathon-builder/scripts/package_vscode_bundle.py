#!/usr/bin/env python3
"""Package a VS Code-ready source tree and ZIP while excluding secrets/build artifacts."""
from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path

EXCLUDED_DIRS = {
    ".git", ".hg", ".svn", "node_modules", ".pnpm-store", "dist", "build", "coverage",
    ".cache", ".vite", ".next", ".nuxt", ".webdev", ".manus-logs", "__pycache__",
    ".pytest_cache", ".venv", "venv", "screenshots",
}
EXCLUDED_FILES = {".project-config.json", ".DS_Store", "Thumbs.db"}
EXCLUDED_RELATIVE_FILES = {"client/public/__manus__/version.json"}


def include_file(path: Path) -> bool:
    name = path.name
    if name in EXCLUDED_FILES or name.endswith((".pyc", ".tsbuildinfo", ".log", ".pid")):
        return False
    if name == ".env.example":
        return True
    if name == ".env" or name.startswith(".env."):
        return False
    return path.is_file() and not path.is_symlink()


def iter_project_files(source: Path, excluded_paths: set[Path]):
    for current, dirnames, filenames in __import__("os").walk(source):
        current_path = Path(current)
        dirnames[:] = [
            name for name in dirnames
            if name not in EXCLUDED_DIRS
            and not (current_path / name).is_symlink()
            and (current_path / name).resolve() not in excluded_paths
        ]
        for filename in filenames:
            path = current_path / filename
            relative = path.relative_to(source).as_posix()
            if relative in EXCLUDED_RELATIVE_FILES or path.resolve() in excluded_paths or not include_file(path):
                continue
            yield path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Project root to package")
    parser.add_argument("--output", type=Path, default=Path("HACKATHON.zip"), help="Destination ZIP path")
    parser.add_argument("--folder-name", default="HACKATHON", help="Top-level folder name inside the ZIP")
    parser.add_argument("--overwrite", action="store_true", help="Allow replacing the destination folder and ZIP")
    args = parser.parse_args()

    source = args.source.resolve()
    output = args.output.resolve()
    folder = output.parent / args.folder_name
    if not source.is_dir():
        parser.error(f"Source directory does not exist: {source}")
    if source == folder.resolve() or source in folder.resolve().parents:
        parser.error("Destination folder must not be inside the source tree")
    if (folder.exists() or output.exists()) and not args.overwrite:
        parser.error("Destination exists; choose another output or pass --overwrite explicitly")
    if args.overwrite:
        if folder.exists():
            shutil.rmtree(folder)
        if output.exists():
            output.unlink()

    output.parent.mkdir(parents=True, exist_ok=True)
    folder.mkdir(parents=True, exist_ok=True)
    excluded = {folder.resolve(), output.resolve()}
    files = sorted(iter_project_files(source, excluded))
    if not files:
        parser.error("No source files found")

    for path in files:
        relative = path.relative_to(source)
        destination = folder / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)

    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in sorted(folder.rglob("*")):
            if path.is_file():
                archive.write(path, (Path(args.folder_name) / path.relative_to(folder)).as_posix())

    print(f"Copied {len(files)} files to {folder}")
    print(f"Created {output} ({output.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
