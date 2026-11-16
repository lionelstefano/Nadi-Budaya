"""Penyimpanan lokal sederhana dengan penulisan atomik."""
from __future__ import annotations

import json
import os
import threading
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_FILE = DATA_DIR / "nadi_budaya_state.json"
_LOCK = threading.RLock()

DEFAULT_STATE: dict[str, Any] = {
    "profile": {"name": "Penjelajah Budaya"},
    "xp": 0,
    "level": 1,
    "stats": {"activities": 0, "quiz_answered": 0, "quiz_correct": 0, "games_finished": 0, "performances_saved": 0},
    "competencies": {
        "structure": 0, "compose": 0, "improvise": 0,
        "story": 0, "performance": 0
    },
    "baseline_saved": False,
    "saved_pantuns": [],
    "performances": [],
    "history": [],
    "practitioner_notes": [],
    "teacher_assessments": [],
    "settings": {
        "theme": "light", "font_scale": 100, "inclusive": False,
        "reduced_motion": False, "captions": True, "large_buttons": False,
        "simple_mode": False, "dyslexia_font": False,
        "reading_font": "standard", "letter_spacing": 0.0,
        "line_spacing": 1.45, "music_enabled": False, "music_volume": 0.3,
        "voice_focus": False, "voice_typing": False, "voice_game": False, "typing_echo": "word",
        "tts_rate": 0.9, "tts_volume": 1.0, "tts_voice": ""
    }
}


def _merge_defaults(data: dict[str, Any]) -> dict[str, Any]:
    state = deepcopy(DEFAULT_STATE)
    for key, value in data.items():
        if key in state and isinstance(state[key], dict) and isinstance(value, dict):
            state[key].update(value)
        elif key in state:
            state[key] = value
    return state


def read_state() -> dict[str, Any]:
    with _LOCK:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not DATA_FILE.exists():
            # Preserve a previous Nadi Budaya/RANCAGITA local state file when
            # project folders are siblings. The source file is copied, never removed.
            project_root = Path(__file__).resolve().parents[1]
            candidates = [
                project_root.parent / "NADI_BUDAYA_V9" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V8_3" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V8_2" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V8_1" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V8" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NadiBudaya_V75" / "NADI_BUDAYA_V7_5" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V7_5" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V7" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V7" / "NADI_BUDAYA_V7" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V7_5" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NadiBudaya_V75" / "NADI_BUDAYA_V7_5" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V6" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V6" / "NADI_BUDAYA_V6" / "app" / "data" / "nadi_budaya_state.json",
                project_root / "NADI_BUDAYA_V6" / "app" / "data" / "nadi_budaya_state.json",
                project_root / "NADI_BUDAYA_V6" / "NADI_BUDAYA_V6" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V5" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V5" / "NADI_BUDAYA_V5" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V4" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "NADI_BUDAYA_V4" / "NADI_BUDAYA_V4" / "app" / "data" / "nadi_budaya_state.json",
                project_root / "NADI_BUDAYA_V4" / "app" / "data" / "nadi_budaya_state.json",
                project_root / "NADI_BUDAYA_V4" / "NADI_BUDAYA_V4" / "app" / "data" / "nadi_budaya_state.json",
                project_root.parent / "RANCAGITA_V3" / "app" / "data" / "rancagita_state.json",
                project_root.parent / "RANCAGITA_V3" / "RANCAGITA_V3" / "app" / "data" / "rancagita_state.json",
                project_root / "RANCAGITA_V3" / "app" / "data" / "rancagita_state.json",
                project_root / "RANCAGITA_V3" / "RANCAGITA_V3" / "app" / "data" / "rancagita_state.json",
            ]
            for legacy in candidates:
                if legacy.is_file():
                    try:
                        raw_legacy = json.loads(legacy.read_text(encoding="utf-8"))
                        if isinstance(raw_legacy, dict):
                            migrated = _merge_defaults(raw_legacy)
                            write_state(migrated)
                            return migrated
                    except (OSError, json.JSONDecodeError, ValueError):
                        pass
            return deepcopy(DEFAULT_STATE)
        try:
            raw = json.loads(DATA_FILE.read_text(encoding="utf-8"))
            if not isinstance(raw, dict):
                raise ValueError("Format penyimpanan tidak sesuai")
            return _merge_defaults(raw)
        except (OSError, json.JSONDecodeError, ValueError):
            # File asli tidak ditimpa otomatis agar data yang rusak masih dapat diperiksa.
            return deepcopy(DEFAULT_STATE)


def write_state(state: dict[str, Any]) -> None:
    with _LOCK:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        tmp = DATA_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, DATA_FILE)


def update(mutator) -> dict[str, Any]:
    with _LOCK:
        state = read_state()
        mutator(state)
        write_state(state)
        return state


def iso_now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def xp_level(xp: int) -> int:
    return max(1, min(50, xp // 100 + 1))
