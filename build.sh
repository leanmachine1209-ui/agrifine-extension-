#!/usr/bin/env bash
# Optional Render / local helper. The dashboard default is only
# `pip install -r requirements.txt`; gunicorn then builds dist/ if npm exists.
set -euo pipefail
pip install -r requirements.txt
npm ci --include=dev
npm run build
