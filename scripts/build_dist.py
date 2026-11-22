#!/usr/bin/env python3
"""Copy only the publishable site into dist/ (the directory to deploy).

Usage: python3 scripts/build_dist.py
Deploy the dist/ folder, not the repo root, so .git/, tools/, docs/ and
unnecessary_files/ are never published.
"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from site_manifest import asset_revisions, build_id_from, public_files, stamp_sw, sw_asset_paths  # noqa: E402

DIST = os.path.join(ROOT, "dist")


def main():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    count = 0
    for rel in public_files(ROOT):
        dst = os.path.join(DIST, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, rel), dst)
        count += 1

    # Stamp the service worker with a content hash per cached file, and publish
    # build_id.txt so a deploy can be checked against a branch.
    paths = sw_asset_paths(ROOT)
    revisions = asset_revisions(ROOT)
    missing = [rel for rel in paths if rel not in revisions]
    if missing:
        sys.exit("sw.js lists files that do not exist: " + ", ".join(missing))
    build_id = build_id_from(revisions, paths)
    sw_dst = os.path.join(DIST, "sw.js")
    with open(sw_dst, encoding="utf-8") as fh:
        stamped = stamp_sw(fh.read(), revisions, build_id)
    with open(sw_dst, "w", encoding="utf-8") as fh:
        fh.write(stamped)
    with open(os.path.join(DIST, "build_id.txt"), "w", encoding="utf-8") as fh:
        fh.write(build_id + "\n")

    print(f"dist/ built: {count} files (build id {build_id})")


if __name__ == "__main__":
    main()
