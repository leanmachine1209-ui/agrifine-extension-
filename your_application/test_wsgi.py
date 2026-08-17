"""Stdlib tests for the Render Python static-file app."""

from __future__ import annotations

import io
import tempfile
import unittest
from pathlib import Path

from your_application.wsgi import _safe_file, make_app


def _request(app, path: str, method: str = "GET") -> tuple[str, list[tuple[str, str]], bytes]:
    status_holder: list[str] = []
    headers_holder: list[list[tuple[str, str]]] = []

    def start_response(status: str, headers: list[tuple[str, str]], exc_info=None):
        status_holder.append(status)
        headers_holder.append(headers)
        return lambda chunk: None

    environ = {
        "REQUEST_METHOD": method,
        "PATH_INFO": path,
        "wsgi.input": io.BytesIO(),
        "wsgi.errors": io.StringIO(),
        "wsgi.version": (1, 0),
        "wsgi.multithread": False,
        "wsgi.multiprocess": False,
        "wsgi.run_once": True,
        "wsgi.url_scheme": "http",
    }
    body = b"".join(app(environ, start_response))
    return status_holder[0], headers_holder[0], body


class SafeFileTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.dist = Path(self.tmp.name)
        (self.dist / "index.html").write_text("<html>home</html>", encoding="utf-8")
        (self.dist / "assets").mkdir()
        (self.dist / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_root_serves_index(self) -> None:
        self.assertEqual(_safe_file(self.dist, "/"), self.dist / "index.html")

    def test_asset_is_served(self) -> None:
        self.assertEqual(_safe_file(self.dist, "/assets/app.js"), self.dist / "assets" / "app.js")

    def test_unknown_path_falls_back_to_index(self) -> None:
        self.assertEqual(_safe_file(self.dist, "/play"), self.dist / "index.html")

    def test_parent_segments_are_rejected(self) -> None:
        self.assertIsNone(_safe_file(self.dist, "/../secret"))
        self.assertIsNone(_safe_file(self.dist, "/assets/../../secret"))

    def test_missing_asset_with_extension_is_not_index(self) -> None:
        self.assertIsNone(_safe_file(self.dist, "/assets/missing.js"))


class WsgiAppTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.dist = Path(self.tmp.name)
        (self.dist / "index.html").write_text("<html>AGRITAIRE</html>", encoding="utf-8")
        (self.dist / "assets").mkdir()
        (self.dist / "assets" / "app.js").write_text("window.game=1", encoding="utf-8")
        self.app = make_app(self.dist, auto_build=False)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_get_index(self) -> None:
        status, headers, body = _request(self.app, "/")
        self.assertTrue(status.startswith("200"))
        self.assertIn(b"AGRITAIRE", body)
        self.assertTrue(any(k.lower() == "content-type" and "text/html" in v for k, v in headers))

    def test_get_asset(self) -> None:
        status, headers, body = _request(self.app, "/assets/app.js")
        self.assertTrue(status.startswith("200"))
        self.assertEqual(body, b"window.game=1")
        self.assertTrue(any("javascript" in v for k, v in headers if k.lower() == "content-type"))

    def test_head_has_no_body(self) -> None:
        status, headers, body = _request(self.app, "/", method="HEAD")
        self.assertTrue(status.startswith("200"))
        self.assertEqual(body, b"")
        self.assertTrue(any(k.lower() == "content-length" and int(v) > 0 for k, v in headers))

    def test_post_rejected(self) -> None:
        status, _, body = _request(self.app, "/", method="POST")
        self.assertTrue(status.startswith("405"))
        self.assertEqual(body, b"")

    def test_missing_dist_is_503(self) -> None:
        empty = Path(self.tmp.name) / "empty"
        empty.mkdir()
        app = make_app(empty, auto_build=False)
        status, _, body = _request(app, "/")
        self.assertTrue(status.startswith("503"))
        self.assertIn(b"build missing", body)


if __name__ == "__main__":
    unittest.main()
