"""Serve the shipped Vite build so a live Render Python service actually loads the game."""

from __future__ import annotations

import os
import sys
from collections.abc import Callable, Iterable
from pathlib import Path
from urllib.parse import unquote
from wsgiref.simple_server import make_server

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
PACKAGE_STATIC = Path(__file__).resolve().parent / "static"
INDEX_NAME = "index.html"

MIME_BY_SUFFIX = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".map": "application/json; charset=utf-8",
}

MISSING_DIST_HTML = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>AGRITAIRE — build missing</title>
  </head>
  <body>
    <h1>AGRITAIRE production build is missing</h1>
    <p>
      The Python service is running, but no shipped <code>your_application/static</code>
      or <code>dist/</code> build was found.
    </p>
    <p>Run <code>npm run build</code> and redeploy, or set the Render build command to:</p>
    <pre>pip install -r requirements.txt &amp;&amp; npm ci --include=dev &amp;&amp; npm run build</pre>
  </body>
</html>
""".encode("utf-8")


def content_type_for(path: Path) -> str:
    return MIME_BY_SUFFIX.get(path.suffix.lower(), "application/octet-stream")


def pick_root(dist: Path, fallback: Path | None = None) -> Path:
    """Prefer a fresh Vite dist, then the committed package static files."""
    if (dist / INDEX_NAME).is_file():
        return dist
    if fallback is not None and (fallback / INDEX_NAME).is_file():
        return fallback
    return dist


def make_app(
    dist: Path,
    root: Path | None = None,
    *,
    fallback: Path | None = None,
    auto_build: bool = False,
):
    """Return a WSGI app that serves the game files (SPA fallback to index.html)."""

    del root, auto_build  # kept for call-site compatibility; never build on request

    def application(
        environ: dict,
        start_response: Callable[[str, list[tuple[str, str]]], Callable[..., None]],
    ) -> Iterable[bytes]:
        method = environ.get("REQUEST_METHOD", "GET").upper()
        if method not in {"GET", "HEAD"}:
            start_response("405 Method Not Allowed", [("Allow", "GET, HEAD"), ("Content-Length", "0")])
            return [b""]

        serve_root = pick_root(dist, fallback)
        url_path = unquote(environ.get("PATH_INFO", "/") or "/")
        target = _safe_file(serve_root, url_path)

        if target is None:
            if not (serve_root / INDEX_NAME).is_file():
                start_response(
                    "503 Service Unavailable",
                    [
                        ("Content-Type", "text/html; charset=utf-8"),
                        ("Content-Length", str(len(MISSING_DIST_HTML))),
                    ],
                )
                return [] if method == "HEAD" else [MISSING_DIST_HTML]
            start_response("404 Not Found", [("Content-Length", "0")])
            return [b""]

        payload = b"" if method == "HEAD" else target.read_bytes()
        headers = [
            ("Content-Type", content_type_for(target)),
            ("Content-Length", str(target.stat().st_size)),
            ("Cache-Control", "no-cache" if target.name == INDEX_NAME else "public, max-age=31536000"),
        ]
        start_response("200 OK", headers)
        if method == "HEAD":
            return [b""]
        return [payload]

    return application


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


application = make_app(DIST, ROOT, fallback=PACKAGE_STATIC)
app = application


def main() -> None:
    port = int(os.environ.get("PORT", "10000"))
    host = os.environ.get("HOST", "0.0.0.0")
    serve = pick_root(DIST, PACKAGE_STATIC)
    print(f"Serving AGRITAIRE from {serve} on {host}:{port}", file=sys.stderr)
    with make_server(host, port, application) as httpd:
        httpd.serve_forever()


if __name__ == "__main__":
    main()
