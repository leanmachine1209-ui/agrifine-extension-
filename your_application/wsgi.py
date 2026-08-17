"""Serve the Vite production build so a default Render Python service can host AGRITAIRE."""

from __future__ import annotations

import mimetypes
import os
import subprocess
import sys
from collections.abc import Callable, Iterable
from pathlib import Path
from shutil import which
from urllib.parse import unquote
from wsgiref.simple_server import make_server

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
INDEX_NAME = "index.html"

MISSING_DIST_HTML = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>AGRITAIRE — build missing</title>
  </head>
  <body>
    <h1>AGRITAIRE production build is missing</h1>
    <p>
      The Python service is running, but <code>dist/index.html</code> was not found
      and <code>npm</code> is not available to build it.
    </p>
    <p>In the Render dashboard, set the build command to:</p>
    <pre>pip install -r requirements.txt &amp;&amp; npm ci --include=dev &amp;&amp; npm run build</pre>
    <p>Or create a <strong>Static Site</strong> with publish directory <code>./dist</code>.</p>
  </body>
</html>
""".encode("utf-8")


def make_app(dist: Path, root: Path | None = None, *, auto_build: bool = True):
    """Return a WSGI app that serves ``dist`` (SPA fallback to index.html)."""

    root = root or dist.parent
    built = False

    def ensure_dist() -> None:
        nonlocal built
        if built or (dist / INDEX_NAME).is_file():
            built = True
            return
        if not auto_build:
            return
        npm = _find_npm()
        if npm is None:
            return
        env = os.environ.copy()
        subprocess.check_call([npm, "ci", "--include=dev"], cwd=root, env=env)
        subprocess.check_call([npm, "run", "build"], cwd=root, env=env)
        built = True

    def application(
        environ: dict,
        start_response: Callable[[str, list[tuple[str, str]]], Callable[..., None]],
    ) -> Iterable[bytes]:
        ensure_dist()
        method = environ.get("REQUEST_METHOD", "GET").upper()
        if method not in {"GET", "HEAD"}:
            start_response("405 Method Not Allowed", [("Allow", "GET, HEAD"), ("Content-Length", "0")])
            return [b""]

        url_path = unquote(environ.get("PATH_INFO", "/") or "/")
        target = _safe_file(dist, url_path)

        if target is None:
            if not (dist / INDEX_NAME).is_file():
                start_response(
                    "503 Service Unavailable",
                    [("Content-Type", "text/html; charset=utf-8"), ("Content-Length", str(len(MISSING_DIST_HTML)))],
                )
                return [] if method == "HEAD" else [MISSING_DIST_HTML]
            start_response("404 Not Found", [("Content-Length", "0")])
            return [b""]

        payload = b"" if method == "HEAD" else target.read_bytes()
        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {"application/javascript", "application/json"}:
            content_type = f"{content_type}; charset=utf-8"
        headers = [
            ("Content-Type", content_type),
            ("Content-Length", str(target.stat().st_size)),
        ]
        start_response("200 OK", headers)
        if method == "HEAD":
            return [b""]
        return [payload]

    return application


def _find_npm() -> str | None:
    candidates = ["npm.cmd", "npm"] if os.name == "nt" else ["npm"]
    for name in candidates:
        found = which(name)
        if found:
            return found
    return None


def _safe_file(dist: Path, url_path: str) -> Path | None:
    """Resolve a URL path to a file under ``dist``, with SPA fallback."""
    dist = dist.resolve()
    rel = url_path.lstrip("/")
    if rel == "" or url_path.endswith("/"):
        index = dist / INDEX_NAME
        return index if index.is_file() else None

    candidate = Path(rel)
    if candidate.is_absolute() or ".." in candidate.parts:
        return None

    target = (dist / candidate).resolve()
    try:
        target.relative_to(dist)
    except ValueError:
        return None

    if target.is_file():
        return target

    index = dist / INDEX_NAME
    if index.is_file() and "." not in Path(rel).name:
        return index
    return None


application = make_app(DIST, ROOT)
app = application


def main() -> None:
    port = int(os.environ.get("PORT", "10000"))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Serving AGRITAIRE from {DIST} on {host}:{port}", file=sys.stderr)
    with make_server(host, port, application) as httpd:
        httpd.serve_forever()


if __name__ == "__main__":
    main()
