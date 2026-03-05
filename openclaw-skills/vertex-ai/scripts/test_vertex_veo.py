#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
#     "google-api-core>=2.0.0",
# ]
# ///
"""Vertex AI connectivity test — confirms auth + API access without spending video quota.

Uses genai.Client(vertexai=True) to call generateContent (text, not video).
"""
import os
import sys


def main():
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
    creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")

    print(f"Vertex AI Connectivity Test")
    print(f"  Project:  {project}")
    print(f"  Location: {location}")
    print(f"  Creds:    {creds or '(ADC / default)'}")
    print()

    try:
        from google import genai
    except ImportError:
        print("FAIL: google-genai not installed. Run: uv pip install google-genai", file=sys.stderr)
        sys.exit(1)

    try:
        client = genai.Client(vertexai=True, project=project, location=location)
    except Exception as e:
        print(f"FAIL: Could not create Vertex AI client: {e}", file=sys.stderr)
        sys.exit(1)

    # Use a text model — no video quota spent
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="Say exactly: VERTEX_OK",
        )
        text = response.text.strip() if hasattr(response, "text") else str(response)
        if "VERTEX_OK" in text or text:
            print(f"Vertex AI Veo access OK")
            print(f"  Model response: {text[:80]}")
        else:
            print(f"WARN: Unexpected response: {text}", file=sys.stderr)
    except Exception as e:
        print(f"FAIL: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
