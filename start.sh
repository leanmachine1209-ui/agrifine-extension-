#!/usr/bin/env bash
# Render start helper. Dashboard default `gunicorn your_application.wsgi`
# also works because gunicorn.conf.py binds 0.0.0.0:$PORT.
set -euo pipefail
export PORT="${PORT:-10000}"
exec gunicorn your_application.wsgi --bind "0.0.0.0:${PORT}" --timeout 120 --workers 1
