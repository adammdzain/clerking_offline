#!/usr/bin/env python3
"""Serve ED Doc on localhost only, with the production security headers.

- Binds to 127.0.0.1 (never reachable from other machines on the network).
- Applies the headers from _headers (CSP, Permissions-Policy, ...), which
  plain `python3 -m http.server` ignores.
- Serves only the files listed in site_manifest.py (no .git, tools, docs, ...).
"""
import argparse
import functools
import http.server
import os
import re
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from site_manifest import asset_revisions, build_id_from, is_public, stamp_sw, sw_asset_paths  # noqa: E402

# Hash cache: files are re-hashed only when a cached file's mtime/size changes.
_build_cache = {"key": None, "id": None, "revisions": None}


def current_build():
    """(build id, per-file hashes) for the files as they are on disk right now."""
    paths = sw_asset_paths(ROOT)
    entries = []
    for rel in paths:
        full = os.path.join(ROOT, rel[2:])
        if os.path.isfile(full):
            st = os.stat(full)
            entries.append((rel, st.st_mtime_ns, st.st_size))
        else:
            entries.append((rel, -1, -1))
    key = tuple(entries)
    if _build_cache["key"] != key:
        revisions = asset_revisions(ROOT)
        _build_cache.update(key=key, revisions=revisions, id=build_id_from(revisions, paths))
    return _build_cache["id"], _build_cache["revisions"]


def load_headers(path):
    """Parse the `/*` block of the Netlify/Cloudflare-style _headers file."""
    headers = []
    in_global = False
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.rstrip("\n")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            if not line.startswith(" ") and not line.startswith("\t"):
                in_global = line.strip() == "/*"
                continue
            if in_global:
                m = re.match(r"\s*([A-Za-z-]+):\s*(.+)", line)
                if m:
                    headers.append((m.group(1), m.group(2).strip()))
    return headers


class Handler(http.server.SimpleHTTPRequestHandler):
    extra_headers = []

    def translate_path(self, path):
        rel = urllib.parse.unquote(urllib.parse.urlsplit(path).path).lstrip("/")
        if rel in ("", "."):
            rel = "index.html"
        full = os.path.join(ROOT, rel)
        # Pretend it does not exist: no directory listings, no hidden or unlisted files.
        if not is_public(rel) or os.path.isdir(full):
            return os.path.join(ROOT, "__not_found__")
        return full

    def version_string(self):
        return "ED-Doc"

    def _request_rel(self):
        return urllib.parse.unquote(urllib.parse.urlsplit(self.path).path).lstrip("/")

    def _send_dynamic(self, rel, head_only=False):
        """Serve build-stamped sw.js and build_id.txt (dev equivalent of the
        stamping build_dist.py applies to dist/)."""
        if rel == "build_id.txt":
            body = (current_build()[0] + "\n").encode("utf-8")
            ctype = "text/plain; charset=utf-8"
        elif rel == "sw.js":
            src = os.path.join(ROOT, "sw.js")
            if not os.path.isfile(src):
                self.send_error(404)
                return
            build_id, revisions = current_build()
            with open(src, encoding="utf-8") as fh:
                body = stamp_sw(fh.read(), revisions, build_id).encode("utf-8")
            ctype = "text/javascript; charset=utf-8"
        else:
            return False
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head_only:
            self.wfile.write(body)
        return True

    def do_GET(self):
        if self._send_dynamic(self._request_rel()):
            return
        super().do_GET()

    def do_HEAD(self):
        if self._send_dynamic(self._request_rel(), head_only=True):
            return
        super().do_HEAD()

    def end_headers(self):
        for name, value in self.extra_headers:
            self.send_header(name, value)
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("[serve] %s - %s\n" % (self.address_string(), fmt % args))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8080)
    args = ap.parse_args()

    Handler.extra_headers = load_headers(os.path.join(ROOT, "_headers"))
    handler = functools.partial(Handler, directory=ROOT)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"ED Doc running at http://localhost:{args.port}  (localhost only; Ctrl+C to stop)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
