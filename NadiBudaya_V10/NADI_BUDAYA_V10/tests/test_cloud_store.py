import json
import os
import unittest
from unittest.mock import patch, MagicMock

from app.cloud_store import CloudStoreError, SupabaseStore


class SupabaseStoreTests(unittest.TestCase):
    def make_store(self, **overrides):
        env = {
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_SECRET_KEY": "sb_secret_test_only_not_real",
            "SUPABASE_SERVICE_ROLE_KEY": "legacy_should_not_win",
            "SUPABASE_STORAGE_BUCKET": "nadi-performances",
        }
        env.update(overrides)
        with patch.dict(os.environ, env, clear=True):
            return SupabaseStore()

    def mock_response(self, payload):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = json.dumps(payload).encode("utf-8")
        return response

    def test_secret_key_is_preferred_over_legacy_service_role(self):
        store = self.make_store()
        self.assertEqual(store.key, "sb_secret_test_only_not_real")
        self.assertTrue(store.configured)

    def test_legacy_service_role_fallback_is_supported(self):
        store = self.make_store(SUPABASE_SECRET_KEY="")
        self.assertEqual(store.key, "legacy_should_not_win")

    def test_signed_upload_url_contains_storage_token(self):
        store = self.make_store()
        response = self.mock_response({
            "url": "/object/upload/sign/nadi-performances/p123/v456.webm",
            "token": "signed-token-123",
        })
        with patch("urllib.request.urlopen", return_value=response) as mocked:
            result = store.create_signed_upload("p123/v456.webm")
        self.assertIn("token=signed-token-123", result["upload_url"])
        self.assertEqual(result["token"], "signed-token-123")
        request = mocked.call_args.args[0]
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.get_header("Apikey"), "sb_secret_test_only_not_real")
        self.assertIsNone(request.get_header("Authorization"))


    def test_legacy_service_role_is_sent_as_bearer_jwt(self):
        store = self.make_store(SUPABASE_SECRET_KEY="")
        response = self.mock_response({"url": "/object/upload/sign/nadi-performances/p123/v456.webm", "token": "legacy-token"})
        with patch("urllib.request.urlopen", return_value=response) as mocked:
            store.create_signed_upload("p123/v456.webm")
        request = mocked.call_args.args[0]
        self.assertEqual(request.get_header("Apikey"), "legacy_should_not_win")
        self.assertEqual(request.get_header("Authorization"), "Bearer legacy_should_not_win")

    def test_signed_download_url_is_returned_as_absolute_url(self):
        store = self.make_store()
        response = self.mock_response({
            "signedURL": "/object/sign/nadi-performances/p123/v456.webm?token=download-token"
        })
        with patch("urllib.request.urlopen", return_value=response):
            url = store.create_signed_download("p123/v456.webm")
        self.assertEqual(
            url,
            "https://example.supabase.co/storage/v1/object/sign/nadi-performances/p123/v456.webm?token=download-token",
        )

    def test_delete_uses_object_prefix_endpoint_and_path(self):
        store = self.make_store()
        response = self.mock_response({})
        with patch("urllib.request.urlopen", return_value=response) as mocked:
            store.delete_object("p123/v456.webm")
        request = mocked.call_args.args[0]
        self.assertEqual(request.get_method(), "DELETE")
        self.assertTrue(request.full_url.endswith("/storage/v1/object/nadi-performances"))
        self.assertEqual(json.loads(request.data.decode("utf-8")), {"prefixes": ["p123/v456.webm"]})

    def test_missing_configuration_raises_clear_error(self):
        store = self.make_store(SUPABASE_URL="", SUPABASE_SECRET_KEY="", SUPABASE_SERVICE_ROLE_KEY="")
        with self.assertRaises(CloudStoreError):
            store.read_state("participant")


if __name__ == "__main__":
    unittest.main()
