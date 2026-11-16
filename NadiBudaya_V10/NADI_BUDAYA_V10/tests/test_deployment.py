import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DeploymentPackagingTests(unittest.TestCase):
    def test_vercel_config_includes_static_assets_and_function_duration(self):
        config = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
        function = config["functions"]["main.py"]
        self.assertEqual(function["maxDuration"], 60)
        self.assertIn("app/static/**", function["includeFiles"])

    def test_root_asgi_entrypoint_exports_fastapi_app(self):
        source = (ROOT / "main.py").read_text(encoding="utf-8")
        self.assertIn("from app.main import app", source)
        self.assertIn("__all__ = [\"app\"]", source)

    def test_runtime_python_is_pinned_and_local_camera_dependencies_are_separate(self):
        self.assertEqual((ROOT / ".python-version").read_text(encoding="utf-8").strip(), "3.12")
        pyproject = (ROOT / "pyproject.toml").read_text(encoding="utf-8")
        self.assertIn('requires-python = ">=3.11,<3.13"', pyproject)
        runtime_reqs = (ROOT / "requirements.txt").read_text(encoding="utf-8")
        local_reqs = (ROOT / "requirements-local.txt").read_text(encoding="utf-8")
        self.assertNotIn("mediapipe", runtime_reqs.lower())
        self.assertNotIn("opencv", runtime_reqs.lower())
        self.assertIn("mediapipe", local_reqs.lower())

    def test_gitignore_protects_secrets_recordings_and_unverified_audio(self):
        ignored = (ROOT / ".gitignore").read_text(encoding="utf-8")
        for rule in [".env", "app/data/performances/*", "app/static/audio/*.mp3"]:
            self.assertIn(rule, ignored)

    def test_supabase_secret_names_and_tokens_are_not_embedded_in_frontend(self):
        static = ROOT / "app" / "static"
        for relative in ["index.html", "app.js", "browser_camera.js", "styles.css"]:
            source = (static / relative).read_text(encoding="utf-8")
            self.assertNotIn("SUPABASE_SECRET_KEY", source)
            self.assertNotIn("SUPABASE_SERVICE_ROLE_KEY", source)
            self.assertNotIn("sb_secret_", source)

    def test_browser_camera_and_logo_assets_are_present(self):
        for relative in [
            "app/static/browser_camera.js",
            "app/static/nadi-budaya-emblem.png",
            "app/static/favicon.png",
            "app/static/audio/betawi-background.mp3",
        ]:
            self.assertTrue((ROOT / relative).is_file(), relative)


if __name__ == "__main__":
    unittest.main()
