"""Single source of truth for which files are published/served.

Only these paths ever leave the repo: .git/, unnecessary_files/, tools/, docs/ and
scratch files are never served and never copied into dist/.
"""
import hashlib
import json
import os
import re

PUBLIC_FILES = [
    "index.html",
    "schema_editor.html",
    "manifest.json",
    "sw.js",
    "build_id.txt",  # generated: names the build that is live
]
# Deploy-only config: needed by the host (Cloudflare Pages) but never served by the local server.
DEPLOY_ONLY_FILES = [
    "_headers",
]
PUBLIC_DIRS = [
    "assets",
]


def is_junk(name: str) -> bool:
    """Files the OS or a sync client drops into folders: never published or served.
    Hidden files (.DS_Store, ...) and macOS custom-icon files, named "Icon" plus a
    carriage return, which Google Drive keeps recreating in every folder."""
    return name.startswith(".") or name == "Icon\r"


def is_public(rel_path: str) -> bool:
    """True if a URL path (relative, POSIX-style, no leading slash) may be served."""
    rel = os.path.normpath(rel_path).replace(os.sep, "/")
    if rel.startswith("..") or os.path.isabs(rel):
        return False
    if any(is_junk(part) for part in rel.split("/")):
        return False
    if rel in PUBLIC_FILES:
        return True
    return any(rel == d or rel.startswith(d + "/") for d in PUBLIC_DIRS)


# ------------------------------------------------------------
# Revisions: a content hash for every file sw.js caches.
# They are stamped into sw.js, which stores each file under its
# own hash. A changed file gets a new hash, so an update fetches
# only that file and everything else stays cached.
# The build id is one hash over all of them: it names a build
# (build_id.txt) so a deploy can be checked against a branch.
# No manual version bumps.
# ------------------------------------------------------------
SW_BUILD_LINE = "const BUILD_ID = 'dev';"
SW_REVISIONS_LINE = "const ASSET_REVISIONS = {};"
REVISION_LENGTH = 16


def sw_asset_paths(root: str):
    """Relative './...' asset paths listed in sw.js, in order, without repeats."""
    with open(os.path.join(root, "sw.js"), encoding="utf-8") as fh:
        return list(dict.fromkeys(re.findall(r"'(\./[^']+)'", fh.read())))


def asset_revisions(root: str) -> dict:
    """Content hash of every file sw.js caches. A missing file is left out (and breaks the install, loudly)."""
    revisions = {}
    for rel in sw_asset_paths(root):
        full = os.path.join(root, rel[2:])
        if not os.path.isfile(full):
            continue
        digest = hashlib.sha256()
        with open(full, "rb") as fh:
            for chunk in iter(lambda: fh.read(1 << 20), b""):
                digest.update(chunk)
        revisions[rel] = digest.hexdigest()[:REVISION_LENGTH]
    return revisions


def build_id_from(revisions: dict, paths) -> str:
    digest = hashlib.sha256()
    for rel in paths:
        digest.update(("%s=%s\n" % (rel, revisions.get(rel, "MISSING"))).encode())
    return digest.hexdigest()[:12]


def compute_build_id(root: str) -> str:
    return build_id_from(asset_revisions(root), sw_asset_paths(root))


def stamp_sw(sw_text: str, revisions: dict, build_id: str) -> str:
    """Write the build id and the per-file hashes into sw.js."""
    for line in (SW_BUILD_LINE, SW_REVISIONS_LINE):
        if line not in sw_text:
            raise ValueError("sw.js is missing the line to stamp: " + line)
    table = json.dumps(revisions, indent=2, sort_keys=True)
    return (sw_text
            .replace(SW_BUILD_LINE, "const BUILD_ID = '%s';" % build_id)
            .replace(SW_REVISIONS_LINE, "const ASSET_REVISIONS = %s;" % table))


def public_files(root: str):
    """Yield every publishable file under root as a relative POSIX path."""
    for name in PUBLIC_FILES + DEPLOY_ONLY_FILES:
        if os.path.isfile(os.path.join(root, name)):
            yield name
    for d in PUBLIC_DIRS:
        base = os.path.join(root, d)
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [x for x in dirnames if not is_junk(x)]
            for fn in filenames:
                if is_junk(fn):
                    continue
                full = os.path.join(dirpath, fn)
                yield os.path.relpath(full, root).replace(os.sep, "/")
