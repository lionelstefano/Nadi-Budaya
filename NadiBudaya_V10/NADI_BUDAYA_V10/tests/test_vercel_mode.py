import json
import os
import subprocess
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(__file__))


class VercelModeTests(unittest.TestCase):
    def run_isolated(self, env_overrides, unset=()):
        env = os.environ.copy()
        for key in unset:
            env.pop(key, None)
        env.update(env_overrides)
        script = r'''
import json
from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)
health = client.get('/api/health').json()
print(json.dumps({
    'health': health,
    'write_status': client.post('/api/activity', json={
        'title':'deployment check', 'kind':'quiz', 'score':0,
        'xp':0, 'answered':1, 'correct':0
    }).status_code,
    'teacher_status': client.post('/api/teacher/verify', json={'pin':'2468'}).status_code,
}))
'''
        result = subprocess.run(
            [sys.executable, "-c", script], cwd=ROOT, env=env,
            check=True, capture_output=True, text=True, timeout=30
        )
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_vercel_without_secrets_is_preview_only_and_rejects_writes(self):
        result = self.run_isolated(
            {"VERCEL": "1"},
            unset=("SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NADI_SESSION_SECRET", "NADI_GURU_PIN"),
        )
        health = result["health"]
        self.assertEqual(health["deployment"], "vercel")
        self.assertFalse(health["storage_ready"])
        self.assertFalse(health["security_ready"])
        self.assertFalse(health["teacher_auth_ready"])
        self.assertEqual(result["write_status"], 503)
        self.assertEqual(result["teacher_status"], 503)

    def test_vercel_with_supabase_and_security_environment_reports_ready(self):
        result = self.run_isolated({
            "VERCEL": "1",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_SECRET_KEY": "sb_secret_dummy_only_for_health_test",
            "NADI_SESSION_SECRET": "01234567890123456789012345678901",
            "NADI_GURU_PIN": "TeacherPin-Only-Test",
            "NADI_CAMERA_BACKEND": "browser",
        })
        health = result["health"]
        self.assertTrue(health["storage_ready"])
        self.assertTrue(health["security_ready"])
        self.assertTrue(health["teacher_auth_ready"])
        self.assertEqual(health["camera_backend"], "browser")


if __name__ == "__main__":
    unittest.main()
