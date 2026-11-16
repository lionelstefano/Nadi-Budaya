"""Minimal Supabase REST/Storage adapter for Vercel deployments.

The service-role key is only read server-side. It must never be exposed in the
frontend or committed to Git. Participant isolation is provided by a signed,
HTTP-only participant cookie and the participant_id column.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from copy import deepcopy
from typing import Any
from datetime import datetime, timezone

from . import store


class CloudStoreError(RuntimeError):
    pass


class SupabaseStore:
    def __init__(self) -> None:
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        # Prefer the newer Supabase secret key; retain legacy service_role support.
        self.key = os.getenv("SUPABASE_SECRET_KEY", "") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "nadi-performances")

    @property
    def configured(self) -> bool:
        return bool(self.url and self.key)

    def _request(self, method: str, path: str, payload: Any = None, headers: dict[str, str] | None = None) -> Any:
        if not self.configured:
            raise CloudStoreError("Supabase belum dikonfigurasi. Tambahkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di Vercel Environment Variables.")
        url = f"{self.url}{path}"
        data = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        request_headers = {
            "apikey": self.key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        # New Supabase sb_secret_* API keys are opaque API keys, not JWTs.
        # Send them only via apikey. Legacy service_role keys are JWTs and
        # remain compatible with the Authorization: Bearer header.
        if not self.key.startswith("sb_secret_"):
            request_headers["Authorization"] = f"Bearer {self.key}"
        if headers:
            request_headers.update(headers)
        req = urllib.request.Request(url, data=data, headers=request_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                raw = response.read()
                if not raw:
                    return None
                return json.loads(raw.decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:700]
            raise CloudStoreError(f"Supabase mengembalikan HTTP {exc.code}: {detail}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise CloudStoreError(f"Tidak dapat menghubungi Supabase: {exc}") from exc

    def read_state(self, participant_id: str) -> dict[str, Any]:
        query = urllib.parse.urlencode({
            "participant_id": f"eq.{participant_id}",
            "select": "state",
            "limit": "1",
        })
        rows = self._request("GET", f"/rest/v1/nadi_participant_states?{query}") or []
        if rows and isinstance(rows[0].get("state"), dict):
            return store._merge_defaults(rows[0]["state"])
        return deepcopy(store.DEFAULT_STATE)

    def write_state(self, participant_id: str, state: dict[str, Any]) -> dict[str, Any]:
        payload = [{"participant_id": participant_id, "state": state, "updated_at": datetime.now(timezone.utc).isoformat()}]
        self._request(
            "POST",
            "/rest/v1/nadi_participant_states",
            payload,
            {"Prefer": "resolution=merge-duplicates,return=minimal"},
        )
        return state

    def update_state(self, participant_id: str, mutator) -> dict[str, Any]:
        state = self.read_state(participant_id)
        mutator(state)
        self.write_state(participant_id, state)
        return state

    def create_signed_upload(self, object_path: str) -> dict[str, str]:
        encoded = urllib.parse.quote(object_path, safe="/")
        data = self._request("POST", f"/storage/v1/object/upload/sign/{self.bucket}/{encoded}", {}) or {}
        signed_path = data.get("url") or data.get("signedURL") or data.get("signedUrl")
        token = data.get("token")
        if not signed_path or not token:
            raise CloudStoreError("Supabase tidak mengembalikan signed upload URL yang valid.")
        if signed_path.startswith("http"):
            upload_url = signed_path
        else:
            upload_url = f"{self.url}/storage/v1{signed_path}"
        separator = "&" if "?" in upload_url else "?"
        if "token=" not in upload_url:
            upload_url = f"{upload_url}{separator}token={urllib.parse.quote(token)}"
        return {"upload_url": upload_url, "token": token}

    def create_signed_download(self, object_path: str, expires_in: int = 3600) -> str:
        encoded = urllib.parse.quote(object_path, safe="/")
        data = self._request(
            "POST",
            f"/storage/v1/object/sign/{self.bucket}/{encoded}",
            {"expiresIn": expires_in},
        ) or {}
        signed_path = data.get("signedURL") or data.get("signedUrl")
        if not signed_path:
            raise CloudStoreError("Supabase tidak mengembalikan signed URL untuk video.")
        if signed_path.startswith("http"):
            return signed_path
        return f"{self.url}/storage/v1{signed_path}"

    def delete_object(self, object_path: str) -> None:
        self._request(
            "DELETE",
            f"/storage/v1/object/{self.bucket}",
            {"prefixes": [object_path]},
        )
