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
from site_manifest import asset_revisions, build_id_from, is_junk, public_files, stamp_sw, sw_asset_paths  # noqa: E402

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

    zip_rel = build_helper_zip()
    print(f"dist/ built: {count} files (build id {build_id}) + {zip_rel}")


# The work-PC helper (pc-helper/) ships as a password-protected zip that ED Doc's
# "PC helper" page links to. ZipCrypto (zip -P), because Windows 7's own "Extract All"
# opens nothing stronger: it keeps casual downloaders out, it is not strong encryption.
# The password lives outside the repo; the zip is not precached by sw.js.
HELPER_DIR = os.path.join(ROOT, "pc-helper")
HELPER_ZIP = "downloads/eddoc-pc-helper.zip"
HELPER_PASSWORD_FILE = os.path.expanduser("~/.hermes/eddoc-helper-zip-password")


def build_helper_zip():
    import re
    import subprocess
    with open(os.path.join(HELPER_DIR, "ehis-to-eddoc.ps1"), encoding="ascii") as fh:
        ps_ver = re.search(r"\$HelperVersion = '([^']+)'", fh.read()).group(1)
    with open(os.path.join(ROOT, "assets", "js", "20-pc-helper.js"), encoding="utf-8") as fh:
        js_ver = re.search(r"EHIS_HELPER_VERSION = '([^']+)'", fh.read()).group(1)
    if ps_ver != js_ver:
        sys.exit(f"helper version mismatch: ehis-to-eddoc.ps1 {ps_ver} vs 20-pc-helper.js {js_ver}")
    if not os.path.isfile(HELPER_PASSWORD_FILE):
        sys.exit("missing " + HELPER_PASSWORD_FILE + " (one line: the helper zip password)")
    with open(HELPER_PASSWORD_FILE, encoding="utf-8") as fh:
        password = fh.read().strip()
    names = sorted(n for n in os.listdir(HELPER_DIR) if os.path.isfile(os.path.join(HELPER_DIR, n)) and not is_junk(n) and not n.endswith(".log") and n != "ehis-cred.txt")
    out = os.path.join(DIST, HELPER_ZIP)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    # -j: flat zip, -X: no Mac extra attributes, -D: no directory entries
    subprocess.run(["zip", "-q", "-j", "-X", "-D", "-P", password, out] + [os.path.join(HELPER_DIR, n) for n in names], check=True)
    return f"{HELPER_ZIP} ({len(names)} files, helper {ps_ver})"


if __name__ == "__main__":
    main()
