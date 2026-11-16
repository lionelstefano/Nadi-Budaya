"""Tes endpoint API dengan berkas penyimpanan sementara."""
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app import store


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_dir = store.DATA_DIR
        self.original_file = store.DATA_FILE
        store.DATA_DIR = Path(self.temp_dir.name)
        store.DATA_FILE = store.DATA_DIR / "test_state.json"
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        store.DATA_DIR = self.original_dir
        store.DATA_FILE = self.original_file
        self.temp_dir.cleanup()

    def test_camera_dance_step_endpoint(self):
        response = self.client.post("/api/camera/dance-step", json={"step": 2})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["dance_step"], 2)
        self.assertEqual(self.client.post("/api/camera/dance-step", json={"step": 8}).status_code, 422)

    @patch("app.main.camera.start")
    def test_camera_start_passes_mode_filter_and_group_effect_mode(self, mocked_start):
        mocked_start.return_value = {"running": True, "mode": "stage", "filter_name": "mahkota", "effect_mode": "mix"}
        response = self.client.post("/api/camera/start", json={"mode": "stage", "filter_name": "mahkota", "effect_mode": "mix"})
        self.assertEqual(response.status_code, 200)
        mocked_start.assert_called_once_with(mode="stage", filter_name="mahkota", effect_mode="mix")

    def test_camera_filter_can_change_without_restarting_camera(self):
        for filter_name in ("ondel_biru", "mahkota_kembang", "bando_emas", "topeng_kembang", "pita_merah", "bunga_tanjung", "pucuk_rebung", "mega_mendung", "mahkota_bintang"):
            response = self.client.post("/api/camera/filter", json={"filter_name": filter_name, "effect_mode": "mix"})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["filter_name"], filter_name)
            self.assertEqual(response.json()["effect_mode"], "mix")
        invalid = self.client.post("/api/camera/filter", json={"filter_name": "unknown"})
        self.assertEqual(invalid.status_code, 400)

    def test_health_and_home(self):
        self.assertEqual(self.client.get("/api/health").status_code, 200)
        self.assertEqual(self.client.get("/api/health").json()["version"], "10.0.0")
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Nadi Budaya", response.text)
        self.assertIn('id="voiceFocusToggle"', response.text)
        self.assertIn('id="voiceTypingToggle"', response.text)
        self.assertIn('id="voiceGameToggle"', response.text)
        self.assertIn('id="betawiAudio"', response.text)
        self.assertIn('id="cameraModeSelect"', response.text)
        self.assertIn('id="stageRecordStart"', response.text)
        self.assertIn('id="danceTutorialFrame"', response.text)
        self.assertIn('id="danceClipStart"', response.text)
        self.assertIn('start=0&end=30', response.text)
        self.assertIn('id="cameraGroupMode"', response.text)
        self.assertIn('id="cameraFaceCount"', response.text)
        self.assertIn('/static/nadi-budaya-emblem.png', response.text)
        self.assertIn('youtube-nocookie.com/embed/jKrG4fNhKVI', response.text)
        self.assertIn('id="accessoryGallery"', response.text)
        self.assertIn('data-camera-filter="topeng"', response.text)
        self.assertIn('data-camera-filter="ondel_merah"', response.text)
        self.assertIn('data-camera-filter="mahkota_kembang"', response.text)
        self.assertIn('data-camera-filter="bando_emas"', response.text)
        self.assertIn('data-camera-filter="topeng_kembang"', response.text)
        self.assertIn('data-camera-filter="pita_merah"', response.text)
        self.assertIn('data-camera-filter="bunga_tanjung"', response.text)
        self.assertIn('data-camera-filter="pucuk_rebung"', response.text)
        self.assertIn('data-camera-filter="mega_mendung"', response.text)
        self.assertIn('data-camera-filter="mahkota_bintang"', response.text)
        self.assertIn('id="cameraFullscreen"', response.text)
        self.assertIn('class="stage-v8-guide-column v81-guide-column"', response.text)
        self.assertIn('class="stage-v8-extras v81-stage-extras"', response.text)
        self.assertEqual(response.text.count('data-camera-filter='), 17)
        self.assertIn('class="stage-v8-guide-column v81-guide-column"', response.text)
        self.assertEqual(response.text.count('id="cameraStream"'), 1)
        self.assertIn('id="stageRecordResult"', response.text)
        self.assertNotIn('id="rhythmOrb"', response.text)
        self.assertEqual(response.text.count('id="danceStepNext"'), 1)
        self.assertIn('id="saveStageToPassport"', response.text)
        self.assertIn('id="performancesList"', response.text)
        self.assertIn('id="passportPerformances"', response.text)
        self.assertIn('Selendang panggung', response.text)
        self.assertNotIn("youtube.com/embed", response.text)
        logo = self.client.get("/static/nadi-budaya-emblem.png")
        self.assertEqual(logo.status_code, 200)
        self.assertIn("image/png", logo.headers.get("content-type", ""))
        favicon = self.client.get("/static/favicon.png")
        self.assertEqual(favicon.status_code, 200)
        audio_help = self.client.get("/static/audio/README_AUDIO.txt")
        self.assertEqual(audio_help.status_code, 200)

    def test_profile_settings_and_competencies(self):
        self.assertEqual(self.client.put("/api/profile", json={"name": "  Nara   Budaya "}).status_code, 200)
        settings = {"theme": "dark", "font_scale": 125, "inclusive": True}
        self.assertEqual(self.client.put("/api/settings", json=settings).status_code, 200)
        comp = {"scores": {"structure": 2, "compose": 1, "improvise": 0}}
        self.assertEqual(self.client.put("/api/competencies", json=comp).status_code, 200)
        state = self.client.get("/api/state").json()
        self.assertEqual(state["profile"]["name"], "Nara Budaya")
        self.assertEqual(state["settings"]["font_scale"], 125)
        self.assertEqual(state["competencies"]["compose"], 1)


    def test_v6_voice_and_audio_preferences_persist(self):
        payload = {
            "music_volume": 0.45,
            "voice_focus": True,
            "voice_typing": True,
            "voice_game": True,
            "typing_echo": "both",
            "tts_volume": 0.75,
        }
        response = self.client.put("/api/settings", json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        settings = self.client.get("/api/state").json()["settings"]
        self.assertEqual(settings["music_volume"], 0.45)
        self.assertTrue(settings["voice_focus"])
        self.assertTrue(settings["voice_typing"])
        self.assertTrue(settings["voice_game"])
        self.assertEqual(settings["typing_echo"], "both")
        self.assertEqual(settings["tts_volume"], 0.75)
        invalid = self.client.put("/api/settings", json={"typing_echo": "secret"})
        self.assertEqual(invalid.status_code, 400)

    def test_pantun_save_awards_xp_and_invalid_stanza_rejected(self):
        lines = [
            "Pergi ke pasar membeli ketan", "Singgah sebentar di tepi kali",
            "Mari menjaga warisan kesenian", "Agar dikenal generasi nanti",
            "Burung nuri hinggap di dahan", "Angin bertiup membawa berita",
            "Belajar bersama penuh ketekunan", "Pantun terjaga sepanjang masa",
        ]
        response = self.client.post("/api/pantuns", json={"title": "Pantun berkait", "lines": lines})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["xp_awarded"], 15)
        state = self.client.get("/api/state").json()
        self.assertEqual(len(state["saved_pantuns"]), 1)
        self.assertEqual(state["xp"], 15)
        self.assertEqual(state["history"][0]["kind"], "studio")
        self.assertEqual(state["history"][0]["score"], 0)
        self.assertEqual(state["stats"]["activities"], 1)
        invalid = self.client.post("/api/pantuns", json={"title": "Tidak valid", "lines": lines[:5]})
        self.assertEqual(invalid.status_code, 400)

    def test_teacher_room_and_accessible_settings(self):
        self.assertEqual(self.client.post("/api/teacher/verify", json={"pin": "wrong"}).status_code, 403)
        self.assertEqual(self.client.post("/api/teacher/verify", json={"pin": "2468"}).status_code, 200)
        assessment = {
            "participant_code": " P-001 ", "teacher_name": "Bu Guru",
            "area": "structure", "assessment_stage": "initial", "score": 3, "evidence": "Peserta dapat membedakan sampiran dan isi pada tugas ini."
        }
        self.assertEqual(self.client.post("/api/teacher/assessment", json=assessment).status_code, 200)
        listed = self.client.get("/api/teacher/assessments?participant_code=P-001").json()["items"]
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0]["participant_code"], "P-001")
        self.assertEqual(listed[0]["assessment_stage"], "initial")
        exported = self.client.get("/api/export.csv")
        self.assertIn("initial", exported.text)
        self.assertIn("tahap_penilaian", exported.text)
        settings = {"reading_font": "verdana", "dyslexia_font": False, "letter_spacing": 0.08,
                    "line_spacing": 1.6, "music_enabled": True, "tts_rate": 1.1, "tts_voice": "Test Indonesian Voice"}
        self.assertEqual(self.client.put("/api/settings", json=settings).status_code, 200)
        saved = self.client.get("/api/state").json()["settings"]
        self.assertEqual(saved["reading_font"], "verdana")
        self.assertTrue(saved["music_enabled"])
        self.assertEqual(saved["tts_rate"], 1.1)
        self.assertEqual(saved["tts_voice"], "Test Indonesian Voice")


    def test_performance_is_saved_to_local_passport_and_can_be_played_and_deleted(self):
        import base64
        # Minimal EBML/WebM signature; camera recordings use the WebM container in Chromium.
        video_bytes = b"\x1a\x45\xdf\xa3" + b"NADI_TEST_VIDEO_DATA"
        payload = {
            "title": "Latihan Panggung Pertama",
            "mode": "stage",
            "filter_name": "pucuk_rebung",
            "effect_mode": "mix",
            "clip_start_seconds": 35,
            "faces_detected": 3,
            "duration_seconds": 27,
            "guide_step_reached": 4,
            "mime_type": "video/webm;codecs=vp9",
            "video_base64": base64.b64encode(video_bytes).decode("ascii"),
        }
        response = self.client.post("/api/performances", json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        item = response.json()["item"]
        performance_id = item["id"]
        self.assertEqual(item["title"], "Latihan Panggung Pertama")
        self.assertEqual(item["duration_seconds"], 27)
        self.assertEqual(item["guide_step_reached"], 4)
        self.assertEqual(item["filter_label"], "Motif Pucuk Rebung ilustratif")
        self.assertEqual(item["effect_mode"], "mix")
        self.assertEqual(item["clip_start_seconds"], 35)
        self.assertEqual(item["faces_detected"], 3)
        self.assertEqual(response.json()["storage"], "local")

        listed = self.client.get("/api/performances").json()
        self.assertEqual(listed["count"], 1)
        self.assertEqual(listed["items"][0]["id"], performance_id)
        state = self.client.get("/api/state").json()
        self.assertEqual(len(state["performances"]), 1)
        self.assertEqual(state["stats"]["performances_saved"], 1)
        self.assertEqual(state["history"][0]["kind"], "performance")

        video_response = self.client.get(f"/api/performances/{performance_id}/video")
        self.assertEqual(video_response.status_code, 200)
        self.assertEqual(video_response.content, video_bytes)
        self.assertIn("video/webm", video_response.headers["content-type"])
        csv_response = self.client.get("/api/export.csv")
        self.assertIn("rekaman_panggung", csv_response.text)
        self.assertIn("Latihan Panggung Pertama", csv_response.text)

        deleted = self.client.delete(f"/api/performances/{performance_id}")
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(self.client.get("/api/performances").json()["count"], 0)
        self.assertEqual(self.client.get(f"/api/performances/{performance_id}/video").status_code, 404)
        self.assertEqual(self.client.get("/api/state").json()["stats"]["performances_saved"], 0)

    def test_performance_validation_rejects_unknown_mime_and_bad_video_data(self):
        import base64
        base = {
            "title": "Tes video",
            "mode": "stage",
            "filter_name": "iket",
            "duration_seconds": 10,
            "guide_step_reached": 2,
            "mime_type": "video/webm",
            "video_base64": base64.b64encode(b"bukan video").decode("ascii"),
        }
        self.assertEqual(self.client.post("/api/performances", json=base).status_code, 400)
        bad_mime = dict(base, mime_type="application/octet-stream")
        self.assertEqual(self.client.post("/api/performances", json=bad_mime).status_code, 415)
        self.assertEqual(self.client.get("/api/performances/../../secret/video").status_code, 404)

    def test_activity_review_and_csv(self):
        event = {"title": "Latihan kuis", "kind": "quiz", "score": 80, "xp": 10, "answered": 10, "correct": 8}
        self.assertEqual(self.client.post("/api/activity", json=event).status_code, 200)
        note = {"role": "Praktisi", "area": "Pantun berkait", "note": "Perlu penelaahan lanjutan."}
        self.assertEqual(self.client.post("/api/review-notes", json=note).status_code, 200)
        csv_response = self.client.get("/api/export.csv")
        self.assertEqual(csv_response.status_code, 200)
        self.assertIn("catatan_penelaah", csv_response.text)
        state = self.client.get("/api/state").json()
        self.assertEqual(state["stats"]["quiz_correct"], 8)
        self.assertEqual(len(state["practitioner_notes"]), 1)


if __name__ == "__main__":
    unittest.main()
