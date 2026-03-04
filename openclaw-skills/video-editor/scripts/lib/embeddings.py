"""Semantic embedding search for the video-editor footage catalog.

Uses Gemini text-embedding-004 via REST API for vector similarity search.
Embeddings are cached in _embeddings.json alongside the catalog index.

Usage:
    from lib.embeddings import EmbeddingStore
    store = EmbeddingStore(profile_root)
    store.build()                          # One-time: embed all segments
    results = store.search("product close-up tallow", top_k=20)
"""

import json
import math
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


# Gemini embedding model
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMS = 3072
BATCH_SIZE = 100  # Gemini batch limit


def _get_gemini_api_key() -> str:
    """Get Gemini API key from env, falling back to profile .env."""
    key = os.environ.get("GEMINI_API_KEY", "")
    if key:
        return key
    profile_root = os.environ.get("PROFILE_ROOT", "")
    if profile_root:
        env_file = Path(profile_root) / ".env"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("GEMINI_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def _embed_batch(texts: list[str], api_key: str) -> list[list[float]]:
    """Embed a batch of texts using Gemini batchEmbedContents API.

    Returns list of embedding vectors (same order as input texts).
    """
    import requests

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBEDDING_MODEL}:batchEmbedContents"

    requests_payload = []
    for text in texts:
        # Truncate very long texts to avoid API limits
        truncated = text[:2000] if len(text) > 2000 else text
        requests_payload.append({
            "model": f"models/{EMBEDDING_MODEL}",
            "content": {"parts": [{"text": truncated}]},
            "taskType": "RETRIEVAL_DOCUMENT",
        })

    body = {"requests": requests_payload}

    for attempt in range(3):
        try:
            resp = requests.post(
                url,
                params={"key": api_key},
                json=body,
                timeout=30,
            )
            if resp.status_code == 429:
                wait = 2 ** attempt
                print(f"  Embedding rate limited, waiting {wait}s...", file=sys.stderr)
                time.sleep(wait)
                continue
            if resp.status_code >= 500:
                wait = 2 ** attempt
                print(f"  Embedding server error ({resp.status_code}), retrying in {wait}s...",
                      file=sys.stderr)
                time.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()
            return [e["values"] for e in data["embeddings"]]
        except (requests.ConnectionError, requests.Timeout) as e:
            wait = 2 ** attempt
            print(f"  Embedding network error ({e}), retrying in {wait}s...", file=sys.stderr)
            time.sleep(wait)

    raise RuntimeError(f"Embedding API failed after 3 attempts for batch of {len(texts)}")


def _embed_query(text: str, api_key: str) -> list[float]:
    """Embed a single query text using Gemini embedContent API."""
    import requests

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBEDDING_MODEL}:embedContent"

    body = {
        "model": f"models/{EMBEDDING_MODEL}",
        "content": {"parts": [{"text": text[:2000]}]},
        "taskType": "RETRIEVAL_QUERY",
    }

    for attempt in range(3):
        try:
            resp = requests.post(
                url,
                params={"key": api_key},
                json=body,
                timeout=15,
            )
            if resp.status_code == 429:
                time.sleep(2 ** attempt)
                continue
            resp.raise_for_status()
            return resp.json()["embedding"]["values"]
        except (requests.ConnectionError, requests.Timeout):
            time.sleep(2 ** attempt)

    raise RuntimeError("Embedding query failed after 3 attempts")


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _segment_text(seg: dict, clip_filename: str = "") -> str:
    """Build the embedding text for a single segment.

    Combines all meaningful fields for rich semantic representation.
    """
    parts = []
    if clip_filename:
        # Strip extension and hyphens for readability
        clean_name = clip_filename.rsplit(".", 1)[0].replace("-", " ").replace("_", " ")
        parts.append(clean_name)
    if seg.get("subjects"):
        parts.append(f"subjects: {seg['subjects']}")
    if seg.get("description"):
        parts.append(seg["description"])
    if seg.get("mood"):
        parts.append(f"mood: {seg['mood']}")
    if seg.get("camera"):
        parts.append(f"camera: {seg['camera']}")
    return ". ".join(parts)


class EmbeddingStore:
    """Manages embeddings for catalog segments.

    Storage: <profile_root>/workspace/.video-catalogs/_embeddings.json
    Format: {
        "model": "text-embedding-004",
        "version": 1,
        "built_at": "ISO timestamp",
        "segment_count": N,
        "entries": [
            {
                "catalog_id": "master",
                "filename": "clip.mp4",
                "segment_index": 0,
                "clip_ref": "clip:clip.mp4@0.0-3.2",
                "text": "the text that was embedded",
                "embedding": [0.1, 0.2, ...]
            },
            ...
        ]
    }
    """

    def __init__(self, profile_root: str):
        self.profile_root = Path(profile_root)
        self.catalogs_dir = self.profile_root / "workspace" / ".video-catalogs"
        self.embeddings_path = self.catalogs_dir / "_embeddings.json"
        self._cache: dict | None = None

    def _load(self) -> dict:
        """Load embeddings from disk (cached in memory)."""
        if self._cache is not None:
            return self._cache
        if self.embeddings_path.exists():
            try:
                self._cache = json.loads(self.embeddings_path.read_text())
                return self._cache
            except (json.JSONDecodeError, OSError):
                pass
        self._cache = {"model": EMBEDDING_MODEL, "version": 1, "entries": []}
        return self._cache

    def _save(self, data: dict):
        """Atomically save embeddings to disk."""
        self.catalogs_dir.mkdir(parents=True, exist_ok=True)
        tmp = self.embeddings_path.with_suffix(".tmp")
        with open(tmp, "w") as f:
            json.dump(data, f)
        os.replace(str(tmp), str(self.embeddings_path))
        self._cache = data

    def has_embeddings(self) -> bool:
        """Check if embeddings exist and have entries."""
        data = self._load()
        return len(data.get("entries", [])) > 0

    def stats(self) -> dict:
        """Return embedding stats."""
        data = self._load()
        entries = data.get("entries", [])
        return {
            "count": len(entries),
            "model": data.get("model", ""),
            "built_at": data.get("built_at", ""),
            "size_mb": self.embeddings_path.stat().st_size / (1024 * 1024)
                       if self.embeddings_path.exists() else 0,
        }

    def build(self, catalog_id: str = "master", force: bool = False) -> int:
        """Build embeddings for all segments in a catalog.

        Args:
            catalog_id: Which catalog to embed (default: master).
            force: If True, re-embed everything. If False, only embed new segments.

        Returns:
            Number of segments embedded.
        """
        api_key = _get_gemini_api_key()
        if not api_key:
            print("ERROR: GEMINI_API_KEY not available. Cannot generate embeddings.",
                  file=sys.stderr)
            return 0

        # Load catalog
        sys.path.insert(0, str(Path(__file__).parent))
        from catalog_store import CatalogStore

        store = CatalogStore(str(self.profile_root))
        catalog = store.get_catalog(catalog_id)
        if not catalog:
            print(f"ERROR: Catalog '{catalog_id}' not found.", file=sys.stderr)
            return 0

        # Load existing embeddings
        data = self._load()
        existing_refs = set()
        if not force:
            existing_refs = {e["clip_ref"] for e in data.get("entries", [])}

        # Collect segments to embed
        to_embed = []
        for clip in catalog.get("clips", []):
            fname = clip.get("filename", "")
            for seg_idx, seg in enumerate(clip.get("segments", [])):
                clip_ref = f"clip:{fname}@{seg['start']}-{seg['end']}"
                if clip_ref in existing_refs:
                    continue
                text = _segment_text(seg, fname)
                if not text.strip():
                    continue
                to_embed.append({
                    "catalog_id": catalog_id,
                    "filename": fname,
                    "segment_index": seg_idx,
                    "clip_ref": clip_ref,
                    "text": text,
                    "segment_data": seg,  # kept for result building, stripped before save
                })

        if not to_embed:
            print(f"All {len(existing_refs)} segments already embedded.")
            return 0

        print(f"Embedding {len(to_embed)} segments ({len(existing_refs)} already cached)...")

        # Batch embed
        all_embeddings = []
        for i in range(0, len(to_embed), BATCH_SIZE):
            batch = to_embed[i:i + BATCH_SIZE]
            texts = [item["text"] for item in batch]
            print(f"  Batch {i // BATCH_SIZE + 1}/{(len(to_embed) + BATCH_SIZE - 1) // BATCH_SIZE}"
                  f" ({len(batch)} segments)...")
            embeddings = _embed_batch(texts, api_key)
            all_embeddings.extend(embeddings)

        # Build entries
        new_entries = []
        for item, embedding in zip(to_embed, all_embeddings):
            new_entries.append({
                "catalog_id": item["catalog_id"],
                "filename": item["filename"],
                "segment_index": item["segment_index"],
                "clip_ref": item["clip_ref"],
                "text": item["text"],
                "embedding": embedding,
            })

        # Merge with existing
        if force:
            data["entries"] = new_entries
        else:
            data["entries"].extend(new_entries)

        data["model"] = EMBEDDING_MODEL
        data["version"] = 1
        data["built_at"] = datetime.now(timezone.utc).isoformat()
        data["segment_count"] = len(data["entries"])

        self._save(data)
        print(f"Embedded {len(new_entries)} segments. Total: {len(data['entries'])}")
        return len(new_entries)

    def search(
        self,
        query: str,
        top_k: int = 20,
        min_score: float = 0.3,
        catalog_id: str | None = None,
    ) -> list[dict]:
        """Semantic search across embedded segments.

        Args:
            query: Natural language search query.
            top_k: Max results to return.
            min_score: Minimum cosine similarity threshold.
            catalog_id: Optional filter to specific catalog.

        Returns:
            List of dicts with clip_ref, score, text, filename, segment_index,
            catalog_id, catalog_name.
        """
        data = self._load()
        entries = data.get("entries", [])
        if not entries:
            return []

        api_key = _get_gemini_api_key()
        if not api_key:
            return []

        # Embed the query
        query_vec = _embed_query(query, api_key)

        # Score all entries
        scored = []
        for entry in entries:
            if catalog_id and entry.get("catalog_id") != catalog_id:
                continue
            embedding = entry.get("embedding")
            if not embedding:
                continue
            score = _cosine_similarity(query_vec, embedding)
            if score >= min_score:
                scored.append({
                    "clip_ref": entry["clip_ref"],
                    "score": round(score, 4),
                    "text": entry.get("text", ""),
                    "filename": entry["filename"],
                    "segment_index": entry["segment_index"],
                    "catalog_id": entry.get("catalog_id", ""),
                })

        # Sort by score descending
        scored.sort(key=lambda r: r["score"], reverse=True)
        return scored[:top_k]
