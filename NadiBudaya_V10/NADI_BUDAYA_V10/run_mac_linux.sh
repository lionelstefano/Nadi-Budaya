#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
  python3.11 -m venv .venv
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r requirements-local.txt
fi
export NADI_CAMERA_BACKEND=browser
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
