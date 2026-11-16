from __future__ import annotations

import csv
import io
import os
import base64
import binascii
import re
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import store
from .cloud_store import SupabaseStore, CloudStoreError

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
except ImportError:
    pass

IS_VERCEL = bool(os.getenv("VERCEL"))
cloud = SupabaseStore()
CLOUD_MODE = bool(cloud.configured and (IS_VERCEL or os.getenv("NADI_STORAGE_MODE", "").lower() == "supabase"))
CAMERA_BACKEND = os.getenv("NADI_CAMERA_BACKEND", "browser" if IS_VERCEL else "python").lower()

if CAMERA_BACKEND == "python":
    try:
        from .camera import CameraService
        camera = CameraService()
    except ImportError:
        camera = None
else:
    camera = None

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
app = FastAPI(title="Nadi Budaya", version="10.0.0", docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class CameraStartInput(BaseModel):
    mode: str = Field(default="stage", max_length=16)
    filter_name: str = Field(default="iket", max_length=24)
    effect_mode: str = Field(default="same", max_length=12)


class CameraFilterInput(BaseModel):
    filter_name: str = Field(default="iket", max_length=24)
    effect_mode: str | None = Field(default=None, max_length=12)


class DanceStepInput(BaseModel):
    step: int = Field(ge=0, le=4)


class ProfileInput(BaseModel):
    name: str = Field(min_length=1, max_length=32)


class SettingsInput(BaseModel):
    theme: str | None = None
    font_scale: int | None = Field(default=None, ge=90, le=175)
    inclusive: bool | None = None
    reduced_motion: bool | None = None
    captions: bool | None = None
    large_buttons: bool | None = None
    simple_mode: bool | None = None
    dyslexia_font: bool | None = None
    letter_spacing: float | None = Field(default=None, ge=0.0, le=0.2)
    line_spacing: float | None = Field(default=None, ge=1.0, le=2.0)
    music_enabled: bool | None = None
    music_volume: float | None = Field(default=None, ge=0.0, le=1.0)
    voice_focus: bool | None = None
    voice_typing: bool | None = None
    voice_game: bool | None = None
    typing_echo: str | None = None
    tts_volume: float | None = Field(default=None, ge=0.2, le=1.0)
    reading_font: str | None = None
    tts_rate: float | None = Field(default=None, ge=0.65, le=1.35)
    tts_voice: str | None = Field(default=None, max_length=160)


class ActivityInput(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    kind: str = Field(min_length=1, max_length=30)
    score: int = Field(default=0, ge=0, le=100)
    xp: int = Field(default=0, ge=0, le=100)
    answered: int = Field(default=0, ge=0, le=100)
    correct: int = Field(default=0, ge=0, le=100)


class PantunInput(BaseModel):
    title: str = Field(default="Pantun karyaku", max_length=60)
    lines: list[str] = Field(min_length=4, max_length=12)


class CompetencyInput(BaseModel):
    scores: dict[str, int]


class ReviewInput(BaseModel):
    role: str = Field(default="Praktisi/penelaah", max_length=40)
    area: str = Field(min_length=2, max_length=80)
    note: str = Field(min_length=3, max_length=1000)


class TeacherVerifyInput(BaseModel):
    pin: str = Field(min_length=4, max_length=32)


class TeacherAssessmentInput(BaseModel):
    participant_code: str = Field(min_length=2, max_length=24)
    teacher_name: str = Field(min_length=2, max_length=50)
    area: str = Field(min_length=2, max_length=40)
    assessment_stage: str = Field(default="ongoing", max_length=16)
    score: int = Field(ge=0, le=4)
    evidence: str = Field(default="", max_length=1000)


class PerformanceSaveInput(BaseModel):
    title: str = Field(default="Penampilan Panggung Betawi", min_length=1, max_length=60)
    mode: str = Field(default="stage", max_length=16)
    filter_name: str = Field(default="iket", max_length=24)
    effect_mode: str = Field(default="same", max_length=12)
    clip_start_seconds: int = Field(default=0, ge=0, le=142)
    faces_detected: int = Field(default=1, ge=0, le=4)
    duration_seconds: int = Field(ge=1, le=30)
    guide_step_reached: int = Field(default=0, ge=0, le=5)
    mime_type: str = Field(default="video/webm", max_length=80)
    video_base64: str = Field(min_length=16, max_length=28_000_000)


class PerformanceUploadUrlInput(BaseModel):
    title: str = Field(default="Penampilan Panggung Betawi", min_length=1, max_length=60)
    mode: str = Field(default="stage", max_length=16)
    filter_name: str = Field(default="iket", max_length=24)
    effect_mode: str = Field(default="same", max_length=12)
    clip_start_seconds: int = Field(default=0, ge=0, le=142)
    faces_detected: int = Field(default=1, ge=0, le=4)
    duration_seconds: int = Field(ge=1, le=30)
    guide_step_reached: int = Field(default=0, ge=0, le=5)
    mime_type: str = Field(default="video/webm", max_length=80)
    size_bytes: int = Field(ge=1, le=20 * 1024 * 1024)


class PerformanceCompleteInput(BaseModel):
    id: str = Field(min_length=32, max_length=32)
    path: str = Field(min_length=10, max_length=240)
    title: str = Field(default="Penampilan Panggung Betawi", min_length=1, max_length=60)
    mode: str = Field(default="stage", max_length=16)
    filter_name: str = Field(default="iket", max_length=24)
    effect_mode: str = Field(default="same", max_length=12)
    clip_start_seconds: int = Field(default=0, ge=0, le=142)
    faces_detected: int = Field(default=1, ge=0, le=4)
    duration_seconds: int = Field(ge=1, le=30)
    guide_step_reached: int = Field(default=0, ge=0, le=5)
    mime_type: str = Field(default="video/webm", max_length=80)
    size_bytes: int = Field(ge=1, le=20 * 1024 * 1024)


def _session_secret() -> bytes:
    secret = os.getenv("NADI_SESSION_SECRET", "")
    if IS_VERCEL:
        # Public deployments require a high-entropy secret; never fall back to a known demo key.
        return secret.encode("utf-8") if len(secret) >= 32 else b""
    if secret:
        return secret.encode("utf-8")
    return b"nadi-budaya-local-demo-secret-change-before-research"


def _signed_participant_cookie(participant_id: str) -> str:
    import hashlib, hmac
    secret = _session_secret()
    if not secret:
        raise HTTPException(503, "NADI_SESSION_SECRET belum diatur pada Vercel.")
    signature = hmac.new(secret, participant_id.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{participant_id}.{signature}"


def _verify_participant_cookie(value: str | None) -> str | None:
    import hashlib, hmac
    if not value or "." not in value:
        return None
    participant_id, signature = value.rsplit(".", 1)
    if not re.fullmatch(r"[a-f0-9]{32}", participant_id):
        return None
    secret = _session_secret()
    if not secret:
        return None
    expected = hmac.new(secret, participant_id.encode("ascii"), hashlib.sha256).hexdigest()
    return participant_id if hmac.compare_digest(signature, expected) else None


@app.middleware("http")
async def participant_session_middleware(request: Request, call_next):
    # The app only expects same-origin browser writes. Reject cross-origin
    # state-changing requests when an Origin header is present.
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("origin")
        host = request.headers.get("host", "").lower()
        if origin:
            from urllib.parse import urlparse
            if urlparse(origin).netloc.lower() != host:
                return JSONResponse({"detail": "Permintaan lintas-origin ditolak."}, status_code=403)
    participant_id = _verify_participant_cookie(request.cookies.get("nadi_participant"))
    created = participant_id is None
    if created:
        participant_id = uuid.uuid4().hex
    request.state.participant_id = participant_id
    response = await call_next(request)
    if created and _session_secret():
        response.set_cookie(
            "nadi_participant",
            _signed_participant_cookie(participant_id),
            max_age=60 * 60 * 24 * 365,
            httponly=True,
            secure=IS_VERCEL or request.url.scheme == "https",
            samesite="lax",
            path="/",
        )
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(self), microphone=(self)")
    if IS_VERCEL and request.url.scheme == "https":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "private, no-store")
    return response


def read_user_state(request: Request) -> dict[str, Any]:
    if CLOUD_MODE:
        try:
            return cloud.read_state(request.state.participant_id)
        except CloudStoreError as exc:
            raise HTTPException(503, str(exc)) from exc
    if IS_VERCEL:
        return store._merge_defaults({})
    return store.read_state()


def update_user_state(request: Request, mutator) -> dict[str, Any]:
    if IS_VERCEL and not _session_secret():
        raise HTTPException(503, "NADI_SESSION_SECRET belum diatur. Admin perlu melengkapi environment variables.")
    if CLOUD_MODE:
        try:
            return cloud.update_state(request.state.participant_id, mutator)
        except CloudStoreError as exc:
            raise HTTPException(503, str(exc)) from exc
    if IS_VERCEL:
        raise HTTPException(503, "Penyimpanan cloud belum aktif. Konfigurasikan Supabase terlebih dahulu; data tidak akan disimpan pada filesystem sementara Vercel.")
    return store.update(mutator)


def teacher_cookie_token() -> str:
    import base64, hashlib, hmac, json, time
    secret = _session_secret()
    if not secret:
        raise HTTPException(503, "NADI_SESSION_SECRET belum diatur.")
    payload = json.dumps({"role": "teacher", "exp": int(time.time()) + 8 * 60 * 60}, separators=(",", ":")).encode("utf-8")
    encoded = base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")
    signature = hmac.new(secret, encoded.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def require_teacher(request: Request) -> None:
    import base64, hashlib, hmac, json, time
    raw = request.cookies.get("nadi_teacher_session", "")
    if "." not in raw:
        raise HTTPException(401, "Sesi Guru belum aktif. Silakan masuk kembali.")
    encoded, signature = raw.rsplit(".", 1)
    secret = _session_secret()
    if not secret:
        raise HTTPException(503, "NADI_SESSION_SECRET belum diatur.")
    expected = hmac.new(secret, encoded.encode("ascii"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(401, "Sesi Guru tidak valid. Silakan masuk kembali.")
    try:
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
    except Exception as exc:
        raise HTTPException(401, "Sesi Guru tidak valid.") from exc
    if payload.get("role") != "teacher" or int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(401, "Sesi Guru telah berakhir. Silakan masuk kembali.")


@app.get("/")
def home():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health():
    security_ready = bool(_session_secret())
    storage_ready = (CLOUD_MODE and security_ready) if IS_VERCEL else True
    storage_name = "supabase" if CLOUD_MODE and security_ready else ("cloud-incomplete" if IS_VERCEL else "local")
    return {
        "ok": True,
        "app": "Nadi Budaya",
        "version": "10.0.0",
        "storage": storage_name,
        "storage_ready": storage_ready,
        "camera_backend": "browser" if IS_VERCEL else CAMERA_BACKEND,
        "deployment": "vercel" if IS_VERCEL else "local",
        "teacher_auth_ready": (len(os.getenv("NADI_GURU_PIN", "")) >= 8) if IS_VERCEL else True,
        "security_ready": security_ready,
    }


@app.get("/api/state")
def get_state(request: Request):
    state = read_user_state(request)
    state["_meta"] = {
        "storage": "supabase" if CLOUD_MODE else ("not-configured" if IS_VERCEL else "local"),
        "persistent": CLOUD_MODE if IS_VERCEL else True,
    }
    return state


@app.put("/api/profile")
def save_profile(payload: ProfileInput, request: Request):
    name = " ".join(payload.name.split())
    if not name:
        raise HTTPException(400, "Nama tidak boleh kosong.")
    return update_user_state(request, lambda state: state["profile"].update({"name": name}))


@app.put("/api/settings")
def save_settings(payload: SettingsInput, request: Request):
    updates = payload.model_dump(exclude_none=True)
    if "theme" in updates and updates["theme"] not in {"light", "dark", "contrast"}:
        raise HTTPException(400, "Tema tidak dikenal.")
    if "reading_font" in updates and updates["reading_font"] not in {"standard", "dyslexia", "verdana"}:
        raise HTTPException(400, "Pilihan font tidak dikenal.")
    if "typing_echo" in updates and updates["typing_echo"] not in {"word", "letter", "both"}:
        raise HTTPException(400, "Mode baca ketikan tidak dikenal.")
    return update_user_state(request, lambda state: state["settings"].update(updates))


@app.post("/api/activity")
def log_activity(payload: ActivityInput, request: Request):
    def mutate(state):
        state["xp"] = max(0, int(state["xp"])) + payload.xp
        state["level"] = store.xp_level(state["xp"])
        state["stats"]["activities"] += 1
        if payload.kind == "quiz":
            state["stats"]["quiz_answered"] += payload.answered
            state["stats"]["quiz_correct"] += min(payload.correct, payload.answered)
        if payload.kind == "game":
            state["stats"]["games_finished"] += 1
        state["history"].insert(0, {
            "title": payload.title, "kind": payload.kind, "score": payload.score,
            "xp": payload.xp, "at": store.iso_now()
        })
        state["history"] = state["history"][:100]
    return update_user_state(request, mutate)


@app.post("/api/pantuns")
def save_pantun(payload: PantunInput, request: Request):
    lines = [" ".join(line.strip().split()) for line in payload.lines]
    if any(len(line) > 150 for line in lines):
        raise HTTPException(400, "Setiap baris maksimal 150 karakter.")
    if len(lines) % 4 != 0:
        raise HTTPException(400, "Jumlah baris harus berupa kelipatan empat untuk setiap bait.")
    if any(not line for line in lines):
        raise HTTPException(400, "Semua baris dalam setiap bait harus diisi.")
    item = {"title": payload.title.strip() or "Pantun karyaku", "lines": lines, "at": store.iso_now()}
    def mutate(state):
        state["saved_pantuns"].insert(0, item)
        state["saved_pantuns"] = state["saved_pantuns"][:100]
        # Menyimpan karya juga dicatat sebagai aktivitas belajar, secara atomik.
        state["xp"] = max(0, int(state.get("xp", 0))) + 15
        state["level"] = store.xp_level(state["xp"])
        state["stats"]["activities"] = int(state["stats"].get("activities", 0)) + 1
        state["history"].insert(0, {
            "title": "Karya pantun tersimpan", "kind": "studio",
            "score": 0, "xp": 15, "at": store.iso_now()
        })
        state["history"] = state["history"][:100]
    update_user_state(request, mutate)
    return {"ok": True, "item": item, "xp_awarded": 15}


@app.put("/api/competencies")
def save_competencies(payload: CompetencyInput, request: Request):
    allowed = {"structure", "compose", "improvise", "story", "performance"}
    if set(payload.scores) - allowed:
        raise HTTPException(400, "Ada kompetensi yang tidak dikenal.")
    if any(not isinstance(v, int) or v < 0 or v > 4 for v in payload.scores.values()):
        raise HTTPException(400, "Skor kompetensi harus 0 sampai 4.")
    def mutate(state):
        state["competencies"].update(payload.scores)
        state["baseline_saved"] = True
    return update_user_state(request, mutate)


@app.post("/api/review-notes")
def add_review(payload: ReviewInput, request: Request):
    item = {"role": payload.role, "area": payload.area.strip(),
            "note": payload.note.strip(), "at": store.iso_now()}
    def mutate(state):
        state["practitioner_notes"].insert(0, item)
        state["practitioner_notes"] = state["practitioner_notes"][:100]
    update_user_state(request, mutate)
    return {"ok": True, "item": item}


@app.post("/api/teacher/verify")
def verify_teacher(payload: TeacherVerifyInput, request: Request, response: Response):
    import hmac
    expected = os.getenv("NADI_GURU_PIN")
    if IS_VERCEL and (not expected or len(expected) < 8):
        raise HTTPException(503, "Ruang Guru belum dikonfigurasi. Admin harus mengatur NADI_GURU_PIN minimal 8 karakter di Vercel Environment Variables.")
    if not expected:
        expected = "2468"  # Local demo only; change before collecting research data.
    if not hmac.compare_digest(payload.pin, expected):
        raise HTTPException(403, "PIN guru tidak sesuai.")
    response.set_cookie(
        "nadi_teacher_session", teacher_cookie_token(), max_age=8 * 60 * 60,
        httponly=True, secure=IS_VERCEL or request.url.scheme == "https",
        samesite="strict", path="/",
    )
    return {"ok": True, "role": "teacher", "expires_in": 8 * 60 * 60}


@app.post("/api/teacher/logout")
def logout_teacher(response: Response):
    response.delete_cookie("nadi_teacher_session", path="/")
    return {"ok": True}


@app.post("/api/teacher/assessment")
def save_teacher_assessment(payload: TeacherAssessmentInput, request: Request):
    require_teacher(request)
    allowed = {"structure", "compose", "improvise", "story", "performance"}
    if payload.area not in allowed:
        raise HTTPException(400, "Area kompetensi tidak dikenal.")
    participant_code = " ".join(payload.participant_code.split()).upper()
    teacher_name = " ".join(payload.teacher_name.split())
    if payload.assessment_stage not in {"initial", "ongoing", "final"}:
        raise HTTPException(400, "Tahap penilaian tidak dikenal.")
    evidence = payload.evidence.strip()
    item = {
        "participant_code": participant_code,
        "teacher_name": teacher_name,
        "area": payload.area,
        "assessment_stage": payload.assessment_stage,
        "score": payload.score,
        "evidence": evidence,
        "at": store.iso_now(),
    }
    def mutate(state):
        state.setdefault("teacher_assessments", []).insert(0, item)
        state["teacher_assessments"] = state["teacher_assessments"][:500]
    update_user_state(request, mutate)
    return {"ok": True, "item": item}


@app.get("/api/teacher/assessments")
def list_teacher_assessments(request: Request, participant_code: str | None = None):
    require_teacher(request)
    items = read_user_state(request).get("teacher_assessments", [])
    if participant_code:
        code = " ".join(participant_code.split()).upper()
        items = [item for item in items if item.get("participant_code") == code]
    return {"items": items[:200]}


PERFORMANCE_MAX_BYTES = 20 * 1024 * 1024
PERFORMANCE_FILTER_LABELS = {
    "iket": "Iket motif",
    "mahkota": "Mahkota panggung",
    "kembang": "Kembang kepala",
    "selendang": "Selendang panggung",
    "topeng": "Topeng ilustratif",
    "ondel_merah": "Ondel merah ilustratif",
    "ondel_biru": "Ondel biru ilustratif",
    "abang": "Iket abang ilustratif",
    "mahkota_kembang": "Mahkota kembang ilustratif",
    "bando_emas": "Bando emas ilustratif",
    "topeng_kembang": "Topeng kembang ilustratif",
    "pita_merah": "Pita merah ilustratif",
    "bunga_tanjung": "Bunga Tanjung ilustratif",
    "pucuk_rebung": "Motif Pucuk Rebung ilustratif",
    "mega_mendung": "Mega Mendung ilustratif",
    "mahkota_bintang": "Mahkota Bintang ilustratif",
    "none": "Tanpa aksesori",
}


def _performance_dir() -> Path:
    folder = Path(store.DATA_DIR) / "performances"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _safe_performance_id(performance_id: str) -> bool:
    return bool(re.fullmatch(r"[a-f0-9]{32}", performance_id))


@app.get("/api/performances")
def list_performances(request: Request):
    items = read_user_state(request).get("performances", [])
    return {"items": items[:100], "count": len(items)}


def _validate_performance_metadata(mode: str, filter_name: str, mime_type: str) -> tuple[str, str]:
    if mode not in {"filter", "dance", "stage"}:
        raise HTTPException(400, "Mode kamera tidak dikenal.")
    if filter_name not in PERFORMANCE_FILTER_LABELS:
        raise HTTPException(400, "Aksesori kamera tidak dikenal.")
    mime = mime_type.split(";", 1)[0].strip().lower()
    extension = {"video/webm": ".webm", "video/mp4": ".mp4"}.get(mime)
    if extension is None:
        raise HTTPException(415, "Format video tidak didukung. Gunakan WebM atau MP4.")
    return mime, extension


def _append_performance(request: Request, item: dict[str, Any]) -> None:
    def mutate(state):
        previous = state.setdefault("performances", [])
        state["performances"] = [item] + previous[:99]
        state.setdefault("stats", {})["performances_saved"] = len(state["performances"])
        state["stats"]["activities"] = int(state["stats"].get("activities", 0)) + 1
        state.setdefault("history", []).insert(0, {
            "title": f"Rekaman panggung: {item['title']}",
            "kind": "performance", "performance_id": item["id"],
            "score": 0, "xp": 0, "at": item["at"]
        })
        state["history"] = state["history"][:100]
    update_user_state(request, mutate)


@app.post("/api/performances")
def save_performance(payload: PerformanceSaveInput, request: Request):
    # Local-only upload path. Vercel uses a signed direct-to-Storage upload route
    # because serverless request bodies are not suitable for large base64 videos.
    if IS_VERCEL:
        raise HTTPException(410, "Gunakan alur unggah bertanda tangan: /api/performances/upload-url lalu /complete.")
    mime, extension = _validate_performance_metadata(payload.mode, payload.filter_name, payload.mime_type)
    try:
        video_bytes = base64.b64decode(payload.video_base64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "Data video tidak dapat dibaca.")
    if not video_bytes:
        raise HTTPException(400, "Rekaman video kosong.")
    if len(video_bytes) > PERFORMANCE_MAX_BYTES:
        raise HTTPException(413, "Ukuran video maksimal 20 MB. Unduh rekaman ke perangkat sebagai alternatif.")
    is_webm = video_bytes.startswith(b"\x1a\x45\xdf\xa3")
    is_mp4 = len(video_bytes) >= 8 and video_bytes[4:8] == b"ftyp"
    if (mime == "video/webm" and not is_webm) or (mime == "video/mp4" and not is_mp4):
        raise HTTPException(400, "Isi file tidak cocok dengan format video yang dikirim.")

    performance_id = uuid.uuid4().hex
    folder = _performance_dir()
    filename = f"{performance_id}{extension}"
    destination = folder / filename
    temporary = folder / f".{performance_id}.tmp"
    item = {
        "id": performance_id,
        "title": " ".join(payload.title.split()) or "Penampilan Panggung Betawi",
        "at": store.iso_now(),
        "duration_seconds": payload.duration_seconds,
        "size_bytes": len(video_bytes),
        "mime_type": mime,
        "filter_name": payload.filter_name,
        "filter_label": PERFORMANCE_FILTER_LABELS[payload.filter_name],
        "effect_mode": payload.effect_mode if payload.effect_mode in {"same", "mix"} else "same",
        "clip_start_seconds": payload.clip_start_seconds,
        "faces_detected": payload.faces_detected,
        "mode": payload.mode,
        "guide_step_reached": payload.guide_step_reached,
        "video_url": f"/api/performances/{performance_id}/video",
        "storage": "local",
    }
    try:
        temporary.write_bytes(video_bytes)
        os.replace(temporary, destination)
        _append_performance(request, item)
    except Exception:
        temporary.unlink(missing_ok=True)
        destination.unlink(missing_ok=True)
        raise
    return {"ok": True, "item": item, "storage": "local"}


@app.post("/api/performances/upload-url")
def create_performance_upload(payload: PerformanceUploadUrlInput, request: Request):
    if IS_VERCEL and not _session_secret():
        raise HTTPException(503, "NADI_SESSION_SECRET belum diatur oleh admin.")
    if not CLOUD_MODE:
        raise HTTPException(503, "Signed cloud upload hanya aktif setelah Supabase dikonfigurasi pada deployment Vercel.")
    mime, extension = _validate_performance_metadata(payload.mode, payload.filter_name, payload.mime_type)
    performance_id = uuid.uuid4().hex
    participant_id = request.state.participant_id
    object_path = f"{participant_id}/{performance_id}{extension}"
    try:
        signed = cloud.create_signed_upload(object_path)
    except CloudStoreError as exc:
        raise HTTPException(503, str(exc)) from exc
    return {
        "ok": True,
        "id": performance_id,
        "path": object_path,
        "upload_url": signed["upload_url"],
        "token": signed["token"],
        "mime_type": mime,
        "expires_in": 7200,
    }


@app.post("/api/performances/complete")
def complete_performance_upload(payload: PerformanceCompleteInput, request: Request):
    if IS_VERCEL and not _session_secret():
        raise HTTPException(503, "NADI_SESSION_SECRET belum diatur oleh admin.")
    if not CLOUD_MODE:
        raise HTTPException(503, "Penyimpanan cloud belum dikonfigurasi.")
    if not _safe_performance_id(payload.id):
        raise HTTPException(400, "ID rekaman tidak valid.")
    mime, extension = _validate_performance_metadata(payload.mode, payload.filter_name, payload.mime_type)
    expected_path = f"{request.state.participant_id}/{payload.id}{extension}"
    if payload.path != expected_path:
        raise HTTPException(400, "Lokasi video tidak sesuai dengan sesi peserta.")
    item = {
        "id": payload.id,
        "title": " ".join(payload.title.split()) or "Penampilan Panggung Betawi",
        "at": store.iso_now(),
        "duration_seconds": payload.duration_seconds,
        "size_bytes": payload.size_bytes,
        "mime_type": mime,
        "filter_name": payload.filter_name,
        "filter_label": PERFORMANCE_FILTER_LABELS[payload.filter_name],
        "effect_mode": payload.effect_mode if payload.effect_mode in {"same", "mix"} else "same",
        "clip_start_seconds": payload.clip_start_seconds,
        "faces_detected": payload.faces_detected,
        "mode": payload.mode,
        "guide_step_reached": payload.guide_step_reached,
        "storage": "supabase",
        "storage_path": payload.path,
        "video_url": f"/api/performances/{payload.id}/video",
    }
    try:
        _append_performance(request, item)
    except Exception:
        try:
            cloud.delete_object(payload.path)
        except CloudStoreError:
            pass
        raise
    return {"ok": True, "item": item, "storage": "supabase"}


@app.get("/api/performances/{performance_id}/video")
def get_performance_video(performance_id: str, request: Request):
    if not _safe_performance_id(performance_id):
        raise HTTPException(404, "Rekaman tidak ditemukan.")
    items = read_user_state(request).get("performances", [])
    item = next((x for x in items if x.get("id") == performance_id), None)
    if not item:
        raise HTTPException(404, "Rekaman tidak ditemukan di Paspor Budaya.")
    if item.get("storage") == "supabase":
        try:
            signed_url = cloud.create_signed_download(item.get("storage_path", ""))
        except CloudStoreError as exc:
            raise HTTPException(503, str(exc)) from exc
        return RedirectResponse(signed_url, status_code=307, headers={"Cache-Control": "private, no-store"})
    extension = ".mp4" if item.get("mime_type") == "video/mp4" else ".webm"
    path = _performance_dir() / f"{performance_id}{extension}"
    if not path.is_file():
        raise HTTPException(404, "File video lokal tidak ditemukan.")
    return FileResponse(path, media_type=item.get("mime_type", "video/webm"),
                        filename=f"nadi-panggung-{performance_id[:8]}{extension}",
                        headers={"Cache-Control": "private, no-store"})


@app.delete("/api/performances/{performance_id}")
def delete_performance(performance_id: str, request: Request):
    if not _safe_performance_id(performance_id):
        raise HTTPException(404, "Rekaman tidak ditemukan.")
    state = read_user_state(request)
    item = next((x for x in state.get("performances", []) if x.get("id") == performance_id), None)
    if not item:
        raise HTTPException(404, "Rekaman tidak ditemukan di Paspor Budaya.")
    if item.get("storage") == "supabase":
        try:
            cloud.delete_object(item.get("storage_path", ""))
        except CloudStoreError as exc:
            raise HTTPException(503, str(exc)) from exc
    else:
        extension = ".mp4" if item.get("mime_type") == "video/mp4" else ".webm"
        (_performance_dir() / f"{performance_id}{extension}").unlink(missing_ok=True)
    def mutate(current):
        current["performances"] = [x for x in current.get("performances", []) if x.get("id") != performance_id]
        current["history"] = [x for x in current.get("history", []) if x.get("performance_id") != performance_id]
        current.setdefault("stats", {})["performances_saved"] = len(current["performances"])
    update_user_state(request, mutate)
    return {"ok": True, "deleted": performance_id}


@app.get("/api/export.csv")
def export_csv(request: Request):
    state = read_user_state(request)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["jenis", "judul", "skor", "xp", "waktu", "catatan", "area", "tahap_penilaian", "kode_peserta", "penilai"])
    for item in state["history"]:
        writer.writerow(["aktivitas", item.get("title", ""), item.get("score", ""),
                         item.get("xp", ""), item.get("at", ""), "", "", "", "", ""])
    for item in state["saved_pantuns"]:
        writer.writerow(["pantun", item.get("title", ""), "", "", item.get("at", ""),
                         " | ".join(item.get("lines", [])), "", "", "", ""])
    for item in state["practitioner_notes"]:
        writer.writerow(["catatan_penelaah", item.get("area", ""), "", "",
                         item.get("at", ""), item.get("note", ""), item.get("area", ""), "", "", item.get("role", "")])
    for item in state.get("teacher_assessments", []):
        writer.writerow(["penilaian_guru", item.get("participant_code", ""),
                         item.get("score", ""), "", item.get("at", ""), item.get("evidence", ""),
                         item.get("area", ""), item.get("assessment_stage", "ongoing"),
                         item.get("participant_code", ""), item.get("teacher_name", "")])
    for item in state.get("performances", []):
        writer.writerow(["rekaman_panggung", item.get("title", ""), "", "", item.get("at", ""),
                         f"Durasi {item.get('duration_seconds', 0)} detik; aksesori {item.get('filter_label', '')}; mode efek {item.get('effect_mode', 'same')}; jumlah wajah {item.get('faces_detected', 0)}; cuplikan mulai detik {item.get('clip_start_seconds', 0)}; tahap panduan terakhir {item.get('guide_step_reached', 0)}",
                         "Panggung Betawi", "", "", ""])
    return Response(content="\ufeff" + buffer.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": "attachment; filename=nadi-budaya-data-lokal.csv"})


@app.post("/api/camera/start")
def start_camera(payload: CameraStartInput):
    if CAMERA_BACKEND == "browser":
        return {"running": True, "available": True, "browser": True, "max_faces": 4, "gesture_available": True, "mode": payload.mode, "filter_name": payload.filter_name, "effect_mode": payload.effect_mode}
    if camera is None:
        raise HTTPException(503, "Kamera server tidak tersedia. Gunakan kamera browser pada deployment Vercel.")
    return camera.start(mode=payload.mode, filter_name=payload.filter_name, effect_mode=payload.effect_mode)


@app.post("/api/camera/dance-step")
def set_camera_dance_step(payload: DanceStepInput):
    if CAMERA_BACKEND == "browser":
        return {"ok": True, "step": payload.step, "browser": True}
    if camera is None:
        raise HTTPException(503, "Pelacakan kamera tidak tersedia pada server.")
    return camera.set_dance_step(payload.step)


@app.post("/api/camera/filter")
def set_camera_filter(payload: CameraFilterInput):
    if CAMERA_BACKEND == "browser":
        if payload.filter_name not in PERFORMANCE_FILTER_LABELS:
            raise HTTPException(400, "Aksesori kamera tidak dikenal.")
        return {"ok": True, "filter_name": payload.filter_name, "effect_mode": payload.effect_mode or "same", "browser": True}
    if camera is None:
        raise HTTPException(503, "Pelacakan kamera tidak tersedia pada server.")
    try:
        return camera.set_filter(payload.filter_name, payload.effect_mode)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/camera/stop")
def stop_camera():
    if CAMERA_BACKEND == "browser":
        return {"running": False, "browser": True}
    if camera is None:
        return {"running": False}
    return camera.stop()


@app.get("/api/camera/status")
def camera_status():
    if CAMERA_BACKEND == "browser":
        return {"running": False, "available": True, "browser": True, "face_count": 0, "max_faces": 4}
    if camera is None:
        return {"running": False, "available": False, "error": "Kamera tidak tersedia."}
    return camera.status()


@app.get("/api/camera/stream")
def camera_stream():
    if CAMERA_BACKEND == "browser" or camera is None:
        raise HTTPException(404, "Stream kamera berjalan langsung di browser pada mode deployment.")
    state = camera.status()
    if not state["running"]:
        raise HTTPException(409, "Kamera belum dinyalakan.")
    return StreamingResponse(camera.frames(), media_type="multipart/x-mixed-replace; boundary=frame",
                             headers={"Cache-Control": "no-store, no-cache, must-revalidate"})


@app.on_event("shutdown")
def shutdown_camera():
    if camera is not None:
        camera.stop()
