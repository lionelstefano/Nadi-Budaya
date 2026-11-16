"""Kamera Panggung Betawi: filter wajah grup hingga empat orang, panduan pose, dan stream lokal.

Semua pemrosesan berlangsung lokal. Modul ini tidak menyimpan atau mengunggah
video. Perekaman 30 detik dilakukan di browser dari stream yang sudah diberi
filter; file hanya disimpan ketika pengguna menekan tombol unduh.

Aksesori visual adalah ilustrasi digital terinspirasi ornamen Betawi, bukan
representasi busana adat yang telah divalidasi. Urutan gerak adalah contoh
latihan pengantar dan harus ditelaah praktisi sebelum disebut koreografi tari
tradisional Betawi.
"""
from __future__ import annotations

import platform
import threading
import time
from collections import deque
from typing import Optional

import cv2
import numpy as np

VALID_MODES = {"filter", "dance", "stage"}
VALID_FILTERS = {
    "none", "iket", "mahkota", "kembang", "selendang",
    "topeng", "ondel_merah", "ondel_biru", "abang",
    "mahkota_kembang", "bando_emas", "topeng_kembang", "pita_merah",
    "bunga_tanjung", "pucuk_rebung", "mega_mendung", "mahkota_bintang",
}
FILTER_VARIATION_ORDER = [
    "iket", "mahkota", "kembang", "ondel_merah", "ondel_biru", "topeng",
    "mahkota_kembang", "bando_emas", "topeng_kembang", "pita_merah",
    "bunga_tanjung", "pucuk_rebung", "mega_mendung", "mahkota_bintang", "abang",
]


def face_filter_sequence(selected_filter: str, effect_mode: str, face_count: int) -> list[str]:
    """Return a predictable filter assignment for the detected people in one frame."""
    count = max(0, min(4, int(face_count)))
    if effect_mode != "mix" or selected_filter == "none":
        return [selected_filter] * count
    ordered = [selected_filter] + [name for name in FILTER_VARIATION_ORDER if name != selected_filter]
    return [ordered[index % len(ordered)] for index in range(count)]
DANCE_STEPS = [
    "Posisi awal: berdiri nyaman menghadap kamera",
    "Rentangkan kedua tangan mendekati tinggi bahu",
    "Angkat tangan kanan ke atas secara perlahan",
    "Angkat tangan kiri ke atas secara perlahan",
    "Turunkan kedua tangan dan kembali ke posisi nyaman",
]


def is_peace_gesture(landmarks) -> bool:
    """Pemeriksaan sederhana gestur ✌ berdasarkan posisi landmark jari."""
    try:
        index_up = landmarks[8].y < landmarks[6].y
        middle_up = landmarks[12].y < landmarks[10].y
        ring_down = landmarks[16].y > landmarks[14].y
        pinky_down = landmarks[20].y > landmarks[18].y
        return bool(index_up and middle_up and ring_down and pinky_down)
    except (IndexError, AttributeError, TypeError):
        return False


def evaluate_dance_pose(landmarks, step: int) -> tuple[bool, str]:
    """Umpan balik perkiraan pose untuk urutan latihan contoh (bukan skor tari)."""
    try:
        # MediaPipe Pose indices: left shoulder/elbow/wrist 11/13/15,
        # right shoulder/elbow/wrist 12/14/16.
        required = [11, 12, 15, 16]
        if any(getattr(landmarks[i], "visibility", 1.0) < 0.35 for i in required):
            return False, "Pastikan bahu dan kedua tangan terlihat oleh kamera."
        ls, rs = landmarks[11], landmarks[12]
        lw, rw = landmarks[15], landmarks[16]
        if step == 0:
            return True, "Tubuh terdeteksi. Kamu siap memulai latihan."
        if step == 1:
            left_ok = abs(lw.y - ls.y) < 0.24 and abs(lw.x - ls.x) > 0.12
            right_ok = abs(rw.y - rs.y) < 0.24 and abs(rw.x - rs.x) > 0.12
            ok = left_ok and right_ok
            return ok, "Bagus, kedua tangan sudah terbuka." if ok else "Coba rentangkan kedua tangan mendekati tinggi bahu."
        if step == 2:
            ok = rw.y < rs.y - 0.08
            return ok, "Gerakan tangan kanan terdeteksi." if ok else "Coba angkat tangan kanan sedikit lebih tinggi."
        if step == 3:
            ok = lw.y < ls.y - 0.08
            return ok, "Gerakan tangan kiri terdeteksi." if ok else "Coba angkat tangan kiri sedikit lebih tinggi."
        if step == 4:
            ok = lw.y > ls.y - 0.05 and rw.y > rs.y - 0.05
            return ok, "Kamu sudah kembali ke posisi nyaman." if ok else "Turunkan kedua tangan perlahan."
        return False, "Pilih langkah latihan yang tersedia."
    except (IndexError, AttributeError, TypeError):
        return False, "Pose belum dapat dibaca. Coba atur posisi tubuh di dalam kamera."


def _point(landmarks, index: int, width: int, height: int) -> tuple[int, int]:
    item = landmarks[index]
    return int(item.x * width), int(item.y * height)


def _draw_flower(frame, center: tuple[int, int], scale: int) -> None:
    """Bunga hias bergaya ilustratif dalam palet emas-merah-hijau."""
    x, y = center
    petal = max(3, int(scale * 0.18))
    distance = max(4, int(scale * 0.20))
    for dx, dy in [(0, -distance), (distance, 0), (0, distance), (-distance, 0), (int(distance*.7), -int(distance*.7))]:
        cv2.circle(frame, (x + dx, y + dy), petal, (52, 86, 198), -1, cv2.LINE_AA)
        cv2.circle(frame, (x + dx, y + dy), petal, (205, 185, 112), 1, cv2.LINE_AA)
    cv2.circle(frame, (x, y), max(3, int(scale * 0.12)), (48, 177, 226), -1, cv2.LINE_AA)


def draw_betawi_filter(frame, face_landmarks, filter_name: str) -> None:
    """Gambar aksesori kepala 2D yang mengikuti landmark wajah."""
    if filter_name == "none" or not face_landmarks:
        return
    height, width = frame.shape[:2]
    try:
        pts = face_landmarks.landmark
        left = _point(pts, 127, width, height)
        right = _point(pts, 356, width, height)
        top = _point(pts, 10, width, height)
        face_width = max(50, int(np.linalg.norm(np.array(right) - np.array(left))))
        scale = max(16, int(face_width * 0.22))
        cx = (left[0] + right[0]) // 2
        base_y = top[1] + int(face_width * 0.10)
        left_x = left[0] - int(face_width * 0.05)
        right_x = right[0] + int(face_width * 0.05)

        if filter_name == "iket":
            # Pita kepala melengkung dengan garis emas dan ornamen tengah.
            xs = np.linspace(left_x, right_x, 18).astype(int)
            curve = []
            for i, x in enumerate(xs):
                t = i / max(1, len(xs) - 1)
                y = int(base_y + np.sin(t * np.pi) * face_width * 0.035)
                curve.append((int(x), y))
            cv2.polylines(frame, [np.array(curve, dtype=np.int32)], False, (45, 69, 37), max(12, int(face_width * .095)), cv2.LINE_AA)
            cv2.polylines(frame, [np.array(curve, dtype=np.int32)], False, (74, 166, 190), max(5, int(face_width * .035)), cv2.LINE_AA)
            cv2.polylines(frame, [np.array(curve, dtype=np.int32)], False, (190, 205, 220), 2, cv2.LINE_AA)
            _draw_flower(frame, (cx, base_y + int(face_width * .015)), scale)
        elif filter_name == "mahkota":
            y = top[1] - int(face_width * 0.19)
            poly = np.array([
                [left_x, base_y], [left_x + int(face_width*.08), y + int(face_width*.10)],
                [cx - int(face_width*.12), y + int(face_width*.06)], [cx, y],
                [cx + int(face_width*.12), y + int(face_width*.06)],
                [right_x - int(face_width*.08), y + int(face_width*.10)], [right_x, base_y]
            ], dtype=np.int32)
            cv2.fillPoly(frame, [poly], (48, 82, 43), cv2.LINE_AA)
            cv2.polylines(frame, [poly], True, (74, 177, 220), max(3, int(face_width*.018)), cv2.LINE_AA)
            for frac in [0.22, 0.5, 0.78]:
                xx = int(left_x + (right_x-left_x)*frac)
                cv2.circle(frame, (xx, int(base_y - face_width*.045)), max(4, int(face_width*.025)), (58, 82, 206), -1, cv2.LINE_AA)
            _draw_flower(frame, (cx, y + int(face_width*.075)), scale)
        elif filter_name == "kembang":
            _draw_flower(frame, (left[0], base_y), scale)
            _draw_flower(frame, (right[0], base_y), scale)
            cv2.ellipse(frame, (cx, base_y + int(face_width*.10)),
                        (int(face_width*.40), max(5, int(face_width*.045))), 0, 0, 180,
                        (74, 166, 190), max(3, int(face_width*.025)), cv2.LINE_AA)
        elif filter_name in {"ondel_merah", "ondel_biru"}:
            # Character-inspired forehead crown; an illustrative digital effect,
            # not a replica of an Ondel-Ondel mask or costume.
            primary = (48, 58, 190) if filter_name == "ondel_merah" else (154, 105, 35)
            accent = (74, 181, 225) if filter_name == "ondel_merah" else (180, 190, 80)
            crown_top = top[1] - int(face_width * 0.24)
            crown_bottom = base_y + int(face_width * 0.03)
            poly = np.array([
                [left_x, crown_bottom],
                [left_x + int(face_width*.04), crown_top + int(face_width*.14)],
                [cx - int(face_width*.15), crown_top + int(face_width*.05)],
                [cx, crown_top - int(face_width*.02)],
                [cx + int(face_width*.15), crown_top + int(face_width*.05)],
                [right_x - int(face_width*.04), crown_top + int(face_width*.14)],
                [right_x, crown_bottom],
            ], dtype=np.int32)
            cv2.fillPoly(frame, [poly], primary, cv2.LINE_AA)
            cv2.polylines(frame, [poly], True, accent, max(3, int(face_width*.022)), cv2.LINE_AA)
            for frac in (0.18, 0.36, 0.64, 0.82):
                point = (int(left_x + (right_x-left_x)*frac), int(crown_top + face_width*.13))
                cv2.circle(frame, point, max(3, int(face_width*.018)), (65, 75, 205), -1, cv2.LINE_AA)
            _draw_flower(frame, (cx, crown_top + int(face_width*.09)), max(12, int(scale*.82)))
        elif filter_name == "abang":
            # Simple dark headpiece with gold piping, inspired by stage styling.
            cap_top = top[1] - int(face_width * 0.16)
            cap_bottom = base_y + int(face_width * 0.02)
            poly = np.array([
                [left_x, cap_bottom], [left_x + int(face_width*.07), cap_top + int(face_width*.08)],
                [right_x - int(face_width*.07), cap_top + int(face_width*.08)], [right_x, cap_bottom]
            ], dtype=np.int32)
            cv2.fillPoly(frame, [poly], (38, 42, 37), cv2.LINE_AA)
            cv2.polylines(frame, [poly], True, (74, 166, 210), max(3, int(face_width*.02)), cv2.LINE_AA)
            cv2.line(frame, (left_x + int(face_width*.06), cap_bottom - int(face_width*.03)),
                     (right_x - int(face_width*.06), cap_bottom - int(face_width*.03)),
                     (65, 190, 224), max(3, int(face_width*.018)), cv2.LINE_AA)
            _draw_flower(frame, (cx, cap_top + int(face_width*.10)), max(10, int(scale*.65)))
        elif filter_name == "topeng":
            # Soft translucent eye-band with decorative edges. Eye and face
            # landmarks remain internal; no tracking dots are drawn on screen.
            eye_y = int((pts[33].y + pts[263].y) * 0.5 * height)
            band_top = eye_y - int(face_width*.13)
            band_bottom = eye_y + int(face_width*.12)
            overlay = frame.copy()
            mask_poly = np.array([
                [left_x, band_top + int(face_width*.05)],
                [left_x + int(face_width*.16), band_top],
                [cx, band_top + int(face_width*.07)],
                [right_x - int(face_width*.16), band_top],
                [right_x, band_top + int(face_width*.05)],
                [right_x - int(face_width*.10), band_bottom],
                [cx, band_bottom - int(face_width*.02)],
                [left_x + int(face_width*.10), band_bottom],
            ], dtype=np.int32)
            cv2.fillPoly(overlay, [mask_poly], (45, 82, 38), cv2.LINE_AA)
            cv2.polylines(overlay, [mask_poly], True, (74, 175, 220), max(2, int(face_width*.018)), cv2.LINE_AA)
            cv2.addWeighted(overlay, 0.52, frame, 0.48, 0, frame)
            for x in (left_x + int(face_width*.13), right_x - int(face_width*.13)):
                cv2.circle(frame, (x, eye_y), max(3, int(face_width*.025)), (70, 170, 220), -1, cv2.LINE_AA)
            _draw_flower(frame, (cx, band_top + int(face_width*.04)), max(10, int(scale*.58)))
        elif filter_name == "mahkota_kembang":
            crown_top = top[1] - int(face_width * 0.25)
            crown_bottom = base_y + int(face_width * 0.025)
            poly = np.array([
                [left_x, crown_bottom], [left_x + int(face_width*.10), crown_top + int(face_width*.12)],
                [cx - int(face_width*.18), crown_top + int(face_width*.06)], [cx, crown_top],
                [cx + int(face_width*.18), crown_top + int(face_width*.06)],
                [right_x - int(face_width*.10), crown_top + int(face_width*.12)], [right_x, crown_bottom]
            ], dtype=np.int32)
            cv2.fillPoly(frame, [poly], (43, 77, 47), cv2.LINE_AA)
            cv2.polylines(frame, [poly], True, (74, 166, 190), max(3, int(face_width*.022)), cv2.LINE_AA)
            for frac in (0.22, 0.5, 0.78):
                fx = int(left_x + (right_x-left_x)*frac)
                _draw_flower(frame, (fx, crown_top + int(face_width*.13)), max(10, int(scale*.52)))
        elif filter_name == "bando_emas":
            xs = np.linspace(left_x, right_x, 24).astype(int)
            curve = []
            for i, x in enumerate(xs):
                t = i / max(1, len(xs)-1)
                y = int(base_y - face_width*.015 + np.sin(t*np.pi)*face_width*.025)
                curve.append((int(x), y))
            cv2.polylines(frame, [np.array(curve, dtype=np.int32)], False, (38, 49, 34), max(11, int(face_width*.09)), cv2.LINE_AA)
            cv2.polylines(frame, [np.array(curve, dtype=np.int32)], False, (65, 176, 220), max(5, int(face_width*.042)), cv2.LINE_AA)
            cv2.polylines(frame, [np.array(curve, dtype=np.int32)], False, (235, 216, 153), 2, cv2.LINE_AA)
            for frac in (0.18, 0.38, 0.62, 0.82):
                px = int(left_x + (right_x-left_x)*frac)
                py = int(base_y - face_width*.01)
                diamond = np.array([[px, py-int(face_width*.025)], [px+int(face_width*.02), py], [px, py+int(face_width*.025)], [px-int(face_width*.02), py]], dtype=np.int32)
                cv2.fillPoly(frame, [diamond], (65, 88, 202), cv2.LINE_AA)
        elif filter_name == "topeng_kembang":
            eye_y = int((pts[33].y + pts[263].y) * 0.5 * height)
            band_top = eye_y - int(face_width*.13)
            band_bottom = eye_y + int(face_width*.12)
            overlay = frame.copy()
            mask_poly = np.array([
                [left_x, band_top + int(face_width*.05)], [left_x + int(face_width*.13), band_top],
                [cx, band_top + int(face_width*.06)], [right_x - int(face_width*.13), band_top],
                [right_x, band_top + int(face_width*.05)], [right_x-int(face_width*.08), band_bottom],
                [cx, band_bottom-int(face_width*.025)], [left_x+int(face_width*.08), band_bottom]
            ], dtype=np.int32)
            cv2.fillPoly(overlay, [mask_poly], (49, 66, 47), cv2.LINE_AA)
            cv2.polylines(overlay, [mask_poly], True, (72, 169, 210), max(3, int(face_width*.02)), cv2.LINE_AA)
            cv2.addWeighted(overlay, .55, frame, .45, 0, frame)
            _draw_flower(frame, (left[0]+int(face_width*.05), eye_y), max(9, int(scale*.48)))
            _draw_flower(frame, (right[0]-int(face_width*.05), eye_y), max(9, int(scale*.48)))
        elif filter_name == "pita_merah":
            knot_y = base_y - int(face_width*.035)
            knot_size = max(7, int(face_width*.055))
            left_loop = np.array([[cx, knot_y], [cx-int(face_width*.18), knot_y-int(face_width*.12)], [cx-int(face_width*.22), knot_y+int(face_width*.02)], [cx-int(face_width*.06), knot_y+int(face_width*.08)]], dtype=np.int32)
            right_loop = np.array([[cx, knot_y], [cx+int(face_width*.18), knot_y-int(face_width*.12)], [cx+int(face_width*.22), knot_y+int(face_width*.02)], [cx+int(face_width*.06), knot_y+int(face_width*.08)]], dtype=np.int32)
            cv2.fillPoly(frame, [left_loop, right_loop], (50, 52, 177), cv2.LINE_AA)
            cv2.polylines(frame, [left_loop, right_loop], True, (90, 174, 224), max(2, int(face_width*.012)), cv2.LINE_AA)
            cv2.circle(frame, (cx, knot_y), knot_size, (52, 65, 190), -1, cv2.LINE_AA)
            cv2.circle(frame, (cx, knot_y), max(3, knot_size//2), (77, 177, 228), 2, cv2.LINE_AA)
        elif filter_name == "bunga_tanjung":
            # Floral side ornaments, presented as a stylized digital motif.
            _draw_flower(frame, (left[0] - int(face_width*.07), base_y + int(face_width*.025)), max(10, int(scale*.62)))
            _draw_flower(frame, (right[0] + int(face_width*.07), base_y + int(face_width*.025)), max(10, int(scale*.62)))
            cv2.ellipse(frame, (cx, base_y + int(face_width*.045)), (int(face_width*.43), max(5, int(face_width*.045))), 0, 180, 360, (55, 88, 190), max(3, int(face_width*.018)), cv2.LINE_AA)
        elif filter_name == "pucuk_rebung":
            # Repeating triangular ornament band inspired by pucuk-rebung geometry.
            points = []
            for i in range(9):
                x = int(left_x + (right_x-left_x) * i / 8)
                peak_y = int(base_y - face_width*.13 - (face_width*.08 if i % 2 else 0))
                points.append((x, peak_y))
            cv2.polylines(frame, [np.array(points, dtype=np.int32)], False, (52, 72, 196), max(4, int(face_width*.025)), cv2.LINE_AA)
            cv2.line(frame, (left_x, base_y-int(face_width*.10)), (right_x, base_y-int(face_width*.10)), (67, 176, 218), max(3, int(face_width*.018)), cv2.LINE_AA)
            _draw_flower(frame, (cx, base_y-int(face_width*.16)), max(9, int(scale*.52)))
        elif filter_name == "mega_mendung":
            # Soft cloud-like decorative arcs above the forehead.
            overlay = frame.copy()
            cloud_y = base_y - int(face_width*.12)
            thickness = max(4, int(face_width*.035))
            for offset, color in ((0,(55,80,190)),(int(face_width*.055),(70,174,220)),(int(face_width*.11),(210,177,91))):
                cv2.ellipse(overlay, (cx, cloud_y-offset), (int(face_width*.48), max(5,int(face_width*.13))), 0, 190, 350, color, thickness, cv2.LINE_AA)
            cv2.addWeighted(overlay, .9, frame, .1, 0, frame)
            _draw_flower(frame, (cx, cloud_y-int(face_width*.12)), max(9, int(scale*.48)))
        elif filter_name == "mahkota_bintang":
            crown_top = top[1] - int(face_width*.28)
            crown_bottom = base_y + int(face_width*.02)
            poly = np.array([[left_x,crown_bottom],[left_x+int(face_width*.07),crown_top+int(face_width*.12)],[cx-int(face_width*.22),crown_top+int(face_width*.08)],[cx-int(face_width*.10),crown_top-int(face_width*.02)],[cx,crown_top+int(face_width*.05)],[cx+int(face_width*.10),crown_top-int(face_width*.02)],[cx+int(face_width*.22),crown_top+int(face_width*.08)],[right_x-int(face_width*.07),crown_top+int(face_width*.12)],[right_x,crown_bottom]], dtype=np.int32)
            cv2.fillPoly(frame, [poly], (45, 70, 46), cv2.LINE_AA)
            cv2.polylines(frame, [poly], True, (76, 175, 220), max(3,int(face_width*.022)), cv2.LINE_AA)
            for frac in (.25,.5,.75):
                sx=int(left_x+(right_x-left_x)*frac); sy=crown_top+int(face_width*.11)
                cv2.drawMarker(frame,(sx,sy),(55,76,201),cv2.MARKER_STAR,max(10,int(face_width*.10)),max(2,int(face_width*.012)),cv2.LINE_AA)
    except (IndexError, AttributeError, TypeError, ValueError):
        # Missing face landmarks on a frame must not interrupt the camera stream.
        return


def draw_betawi_pose_filter(frame, pose_landmarks, filter_name: str) -> None:
    """Gambar ilustrasi selendang bahu sederhana saat pose tubuh terlihat."""
    if filter_name != "selendang" or pose_landmarks is None:
        return
    height, width = frame.shape[:2]
    try:
        pts = pose_landmarks.landmark
        required = [11, 12, 23, 24]
        if any(getattr(pts[i], "visibility", 1.0) < 0.35 for i in required):
            return
        left_shoulder = _point(pts, 11, width, height)
        right_shoulder = _point(pts, 12, width, height)
        left_hip = _point(pts, 23, width, height)
        right_hip = _point(pts, 24, width, height)
        overlay = frame.copy()
        thickness = max(12, int(width * 0.035))
        # Two diagonal bands evoke a stage sash; the overlay is intentionally
        # illustrative and must be reviewed before being described as adat wear.
        cv2.line(overlay, left_shoulder, right_hip, (50, 80, 176), thickness, cv2.LINE_AA)
        cv2.line(overlay, left_shoulder, right_hip, (77, 166, 194), max(3, thickness // 4), cv2.LINE_AA)
        cv2.line(overlay, right_shoulder, left_hip, (48, 92, 45), thickness, cv2.LINE_AA)
        cv2.line(overlay, right_shoulder, left_hip, (74, 181, 221), max(3, thickness // 4), cv2.LINE_AA)
        cv2.addWeighted(overlay, 0.58, frame, 0.42, 0, frame)
        center = ((left_shoulder[0] + right_shoulder[0] + left_hip[0] + right_hip[0]) // 4,
                  (left_shoulder[1] + right_shoulder[1] + left_hip[1] + right_hip[1]) // 4)
        cv2.circle(frame, center, max(7, int(width * 0.018)), (74, 181, 221), -1, cv2.LINE_AA)
        cv2.circle(frame, center, max(4, int(width * 0.010)), (48, 72, 45), -1, cv2.LINE_AA)
    except (IndexError, AttributeError, TypeError, ValueError):
        return


class CameraService:
    def __init__(self, device_index: int = 0):
        self.device_index = device_index
        self._capture = None
        self._hands = None
        self._face_mesh = None
        self._pose = None
        self._mp = None
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._lock = threading.RLock()
        self._frame = None
        self._running = False
        self._available = False
        self._blur_active = False
        self._gesture_available = False
        self._hand_count = 0
        self._peace_count = 0
        self._face_detected = False
        self._pose_detected = False
        self._dance_step = 0
        self._dance_feedback = "Kamera belum aktif."
        self._mode = "stage"
        self._filter_name = "iket"
        self._effect_mode = "same"
        self._face_count = 0
        self._gesture_history = deque(maxlen=4)
        self._error = ""

    def status(self) -> dict:
        with self._lock:
            return {
                "running": self._running,
                "available": self._available,
                "gesture_available": self._gesture_available,
                "blur_active": self._blur_active,
                "hand_count": self._hand_count,
                "peace_count": self._peace_count,
                "face_detected": self._face_detected,
                "face_count": self._face_count,
                "effect_mode": self._effect_mode,
                "max_faces": 4,
                "pose_detected": self._pose_detected,
                "mode": self._mode,
                "filter_name": self._filter_name,
                "dance_step": self._dance_step,
                "dance_feedback": self._dance_feedback,
                "error": self._error,
                "privacy": "Video diproses lokal. Tidak ada rekaman otomatis atau unggahan.",
            }

    def _open_capture(self):
        if platform.system() == "Windows":
            backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]
        else:
            backends = [cv2.CAP_ANY]
        for backend in backends:
            cap = cv2.VideoCapture(self.device_index, backend)
            if cap is not None and cap.isOpened():
                return cap
            if cap is not None:
                cap.release()
        return None

    def start(self, mode: str = "stage", filter_name: str = "iket", effect_mode: str = "same") -> dict:
        mode = mode if mode in VALID_MODES else "stage"
        filter_name = filter_name if filter_name in VALID_FILTERS else "iket"
        effect_mode = effect_mode if effect_mode in {"same", "mix"} else "same"
        with self._lock:
            if self._running:
                # A running session may be changed without reopening the device.
                self._mode = mode
                self._filter_name = filter_name
                self._effect_mode = effect_mode
                return self.status()
            self._error = ""
            self._mode = mode
            self._filter_name = filter_name
            self._effect_mode = effect_mode
            self._face_count = 0
            self._dance_step = 0
            self._dance_feedback = DANCE_STEPS[0]
            self._stop.clear()
            self._gesture_history.clear()
            self._hand_count = 0
            self._peace_count = 0
            self._face_detected = False
            self._pose_detected = False
            cap = self._open_capture()
            if cap is None:
                self._error = (
                    "Kamera tidak dapat dibuka. Tutup aplikasi lain yang memakai kamera, "
                    "periksa izin Windows, lalu coba lagi."
                )
                self._running = False
                self._available = False
                return self.status()
            # Request a wider 16:9 frame where the webcam supports it. This
            # helps include shoulders/arms for dance practice; the preview uses
            # object-fit: contain, so it never crops the captured image.
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            cap.set(cv2.CAP_PROP_FPS, 20)
            self._capture = cap
            tracking_errors = []
            try:
                import mediapipe as mp
                self._mp = mp
            except Exception as exc:
                self._mp = None
                tracking_errors.append(f"MediaPipe belum tersedia: {exc}")
            if self._mp is not None and mode in {"filter", "stage"}:
                try:
                    self._face_mesh = self._mp.solutions.face_mesh.FaceMesh(
                        static_image_mode=False, max_num_faces=4, refine_landmarks=False,
                        min_detection_confidence=0.55, min_tracking_confidence=0.5,
                    )
                except Exception as exc:
                    tracking_errors.append(f"Pelacakan wajah tidak tersedia: {exc}")
            if self._mp is not None and (mode in {"dance", "stage"} or filter_name == "selendang"):
                try:
                    self._pose = self._mp.solutions.pose.Pose(
                        static_image_mode=False, model_complexity=0, smooth_landmarks=True,
                        enable_segmentation=False, min_detection_confidence=0.5,
                        min_tracking_confidence=0.5,
                    )
                except Exception as exc:
                    tracking_errors.append(f"Pelacakan tubuh tidak tersedia: {exc}")
            self._gesture_available = bool(self._face_mesh is not None or self._pose is not None)
            self._error = " ".join(tracking_errors)
            if self._mp is None:
                self._face_mesh = None
                self._pose = None
            self._running = True
            self._available = True
            self._thread = threading.Thread(target=self._reader, name="nadi-stage-camera", daemon=True)
            self._thread.start()
            return self.status()

    def set_dance_step(self, step: int) -> dict:
        step = max(0, min(len(DANCE_STEPS) - 1, int(step)))
        with self._lock:
            self._dance_step = step
            self._dance_feedback = DANCE_STEPS[step]
            return self.status()

    def set_filter(self, filter_name: str, effect_mode: str | None = None) -> dict:
        if filter_name not in VALID_FILTERS:
            raise ValueError("Aksesori kamera tidak dikenal.")
        if effect_mode is not None and effect_mode not in {"same", "mix"}:
            raise ValueError("Mode aksesori grup tidak dikenal.")
        with self._lock:
            self._filter_name = filter_name
            if effect_mode is not None:
                self._effect_mode = effect_mode
            # Selendang is a shoulder overlay. If it is chosen while the camera
            # is already running in face-filter mode, lazily enable pose tracking.
            if self._running and filter_name == "selendang" and self._pose is None and self._mp is not None:
                try:
                    self._pose = self._mp.solutions.pose.Pose(
                        static_image_mode=False, model_complexity=0, smooth_landmarks=True,
                        enable_segmentation=False, min_detection_confidence=0.5,
                        min_tracking_confidence=0.5,
                    )
                    self._gesture_available = True
                except Exception as exc:
                    self._error = f"Pelacakan tubuh untuk selendang belum tersedia: {exc}"
            self._dance_feedback = f"Aksesori dipilih: {filter_name.replace('_', ' ')}."
            return self.status()

    def _reader(self) -> None:
        failures = 0
        cap = self._capture
        try:
            while not self._stop.is_set():
                if cap is None:
                    break
                try:
                    ok, frame = cap.read()
                except Exception as exc:
                    with self._lock:
                        self._error = f"Kamera gagal membaca frame: {exc}"
                    break
                if not ok or frame is None:
                    failures += 1
                    if failures >= 20:
                        with self._lock:
                            self._error = "Kamera terputus atau tidak mengirim gambar. Coba mulai ulang kamera."
                        break
                    time.sleep(0.05)
                    continue
                failures = 0
                frame = cv2.flip(frame, 1)
                height, width = frame.shape[:2]
                face_found = False
                face_count = 0
                pose_found = False
                feedback = "Arahkan tubuh ke kamera."
                try:
                    # Run landmarks on a smaller same-aspect frame to keep multi-face tracking
                    # responsive on ordinary school laptops. Normalized landmarks still map to
                    # the full-resolution preview when overlays are drawn below.
                    detection_frame = cv2.resize(frame, (640, 360), interpolation=cv2.INTER_AREA)
                    rgb = cv2.cvtColor(detection_frame, cv2.COLOR_BGR2RGB)
                    rgb.flags.writeable = False
                    face_count = 0
                    if self._face_mesh is not None:
                        face_result = self._face_mesh.process(rgb)
                        faces = (face_result.multi_face_landmarks or [])[:4]
                        face_count = len(faces)
                        face_found = face_count > 0
                        if faces and self._mode in {"filter", "stage"}:
                            with self._lock:
                                selected_filter = self._filter_name
                                selected_effect_mode = self._effect_mode
                            face_effects = face_filter_sequence(selected_filter, selected_effect_mode, len(faces))
                            for face_landmarks, effect_for_face in zip(faces, face_effects):
                                draw_betawi_filter(frame, face_landmarks, effect_for_face)
                    if self._pose is not None:
                        pose_result = self._pose.process(rgb)
                        pose = pose_result.pose_landmarks
                        pose_found = pose is not None
                        if pose is not None:
                            if self._filter_name == "selendang":
                                draw_betawi_pose_filter(frame, pose, self._filter_name)
                            # Pose landmarks are kept internal for movement feedback.
                            # Do not draw face/body mesh dots or skeleton over the user's preview.
                            ok_step, feedback = evaluate_dance_pose(pose.landmark, self._dance_step)
                            if ok_step:
                                feedback = "✓ " + feedback
                    rgb.flags.writeable = True
                except Exception as exc:
                    with self._lock:
                        self._error = f"Pelacakan mengalami kendala pada satu frame: {exc}"
                    feedback = "Pelacakan sementara terganggu."

                with self._lock:
                    mode = self._mode
                    filter_name = self._filter_name
                    step = self._dance_step
                # Keep the camera image clean: status and instructions are presented
                # in adjacent UI panels, not burned into the recorded image.
                encoded, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 84])
                if encoded:
                    with self._lock:
                        self._frame = buffer.tobytes()
                        self._face_detected = face_found
                        self._face_count = face_count if self._face_mesh is not None else 0
                        self._pose_detected = pose_found
                        self._dance_feedback = feedback
                        self._blur_active = False
                        self._hand_count = 0
                        self._peace_count = 0
                time.sleep(0.035)
        finally:
            with self._lock:
                self._running = False
                self._available = False
                self._blur_active = False
                self._face_detected = False
                self._face_count = 0
                self._pose_detected = False
                if self._capture is cap:
                    self._capture = None
                hands, face_mesh, pose = self._hands, self._face_mesh, self._pose
                self._hands = None
                self._face_mesh = None
                self._pose = None
                self._mp = None
            if cap is not None:
                try:
                    cap.release()
                except Exception:
                    pass
            for resource in (hands, face_mesh, pose):
                if resource is not None:
                    try:
                        resource.close()
                    except Exception:
                        pass

    def frames(self):
        while True:
            with self._lock:
                frame = self._frame
                running = self._running
            if frame:
                yield (b"--frame\r\nContent-Type: image/jpeg\r\nCache-Control: no-cache\r\n\r\n" + frame + b"\r\n")
            elif not running:
                break
            time.sleep(0.04)

    def stop(self) -> dict:
        self._stop.set()
        thread = self._thread
        if thread and thread.is_alive():
            thread.join(timeout=2.0)
        with self._lock:
            if self._capture is not None:
                self._capture.release()
                self._capture = None
            for attr in ("_hands", "_face_mesh", "_pose"):
                resource = getattr(self, attr)
                if resource is not None:
                    try:
                        resource.close()
                    except Exception:
                        pass
                    setattr(self, attr, None)
            self._mp = None
            self._frame = None
            self._running = False
            self._available = False
            self._blur_active = False
            self._hand_count = 0
            self._peace_count = 0
            self._face_detected = False
            self._face_count = 0
            self._pose_detected = False
            self._gesture_history.clear()
            self._thread = None
            return self.status()
