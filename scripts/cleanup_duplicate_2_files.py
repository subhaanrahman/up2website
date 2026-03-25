#!/usr/bin/env python3
"""Remove macOS Finder-style duplicates: ``name 2.ext`` or ``name 2`` next to ``name.ext``.

- If the canonical file exists and matches, or differs: remove the duplicate (keep canonical).
- If the canonical file is missing: rename duplicate to canonical (recover orphan).
- Same for directories. Symlinks named ``... 2`` pointing at the same skill are removed by hand if needed.

Skips node_modules (reinstall deps if that tree had duplicates: ``rm -rf node_modules && npm ci``).
"""
from __future__ import annotations

import os
import re
import shutil
import sys
from pathlib import Path

SKIP_DIRS = {
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    "coverage",
    ".turbo",
    "ios/Pods",
    "android/.gradle",
    "DerivedData",
}


def should_skip(path: Path) -> bool:
    parts = path.parts
    return any(p in SKIP_DIRS or p.startswith(".") and p in {".git"} for p in parts)


def canonical_name(name: str) -> str | None:
    m = re.match(r"^(.+) 2(\.[^/]+)$", name)
    if m:
        return m.group(1) + m.group(2)
    if name.endswith(" 2"):
        return name[:-3]
    return None


def collect(root: Path) -> tuple[list[Path], list[Path]]:
    files: list[Path] = []
    dirs: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(root, topdown=True):
        dp = Path(dirpath)
        # prune
        dirnames[:] = [d for d in dirnames if not should_skip(dp / d)]
        if should_skip(dp):
            continue
        for fn in filenames:
            if " 2." in fn or fn.endswith(" 2"):
                files.append(dp / fn)
        for d in dirnames:
            if d.endswith(" 2") or " 2." in d:
                dirs.append(dp / d)
    return files, dirs


def main() -> int:
    root = Path(".").resolve()
    files, dup_dirs = collect(root)
    report: list[str] = []
    errors: list[str] = []
    deleted = 0

    for p in sorted(files):
        if p.is_symlink():
            try:
                p.unlink()
                deleted += 1
                report.append(f"SYMLINK removed {p.relative_to(root)}")
            except OSError as e:
                errors.append(f"{p.relative_to(root)}: {e}")
            continue
        if not p.is_file():
            continue
        can = canonical_name(p.name)
        if can is None:
            errors.append(f"no canonical rule: {p.relative_to(root)}")
            continue
        canon = p.parent / can
        try:
            if canon.exists() and canon.is_file():
                a, b = p.read_bytes(), canon.read_bytes()
                if a != b:
                    report.append(
                        f"DIFF {p.relative_to(root)} vs {canon.relative_to(root)} ({len(a)} vs {len(b)} bytes)"
                    )
                p.unlink()
                deleted += 1
            else:
                report.append(f"ORPHAN -> rename {p.relative_to(root)} to {canon.relative_to(root)}")
                shutil.move(str(p), str(canon))
                deleted += 1
        except OSError as e:
            errors.append(f"{p.relative_to(root)}: {e}")

    # Remove duplicate directories (deepest first)
    dup_dirs_sorted = sorted({d.resolve() for d in dup_dirs}, key=lambda x: len(x.parts), reverse=True)
    for d in dup_dirs_sorted:
        if not d.is_dir():
            continue
        base = d.name
        if base.endswith(" 2"):
            canon_dir = d.parent / base[:-3]
        elif " 2." in base:
            can = canonical_name(base)
            if can is None:
                errors.append(f"dir no rule: {d.relative_to(root)}")
                continue
            canon_dir = d.parent / can
        else:
            continue
        try:
            if canon_dir.exists():
                shutil.rmtree(d)
                deleted += 1
                report.append(f"RMDIR duplicate {d.relative_to(root)} (canonical dir exists)")
            else:
                shutil.move(str(d), str(canon_dir))
                deleted += 1
                report.append(f"DIR orphan -> {canon_dir.relative_to(root)}")
        except OSError as e:
            errors.append(f"{d.relative_to(root)}: {e}")

    print(f"Operations: {deleted}")
    if errors:
        print("Errors:", len(errors), file=sys.stderr)
        for e in errors[:40]:
            print(e, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
