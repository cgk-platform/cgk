#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "openai>=1.0.0",
#     "requests>=2.31.0",
# ]
# ///
"""Vertex AI image gen connectivity test via litellm proxy.

Calls the litellm proxy with nano-banana-vertex model to verify routing works.
"""
import os
import sys


LITELLM_BASE_URL = os.environ.get("LITELLM_BASE_URL", "http://localhost:4000/v1")
LITELLM_API_KEY = os.environ.get("LITELLM_API_KEY", "")


def main():
    print(f"Vertex AI Image Gen Connectivity Test")
    print(f"  Proxy: {LITELLM_BASE_URL}")
    print(f"  Model: nano-banana-vertex")
    print()

    try:
        from openai import OpenAI
    except ImportError:
        print("FAIL: openai not installed. Run: uv pip install openai", file=sys.stderr)
        sys.exit(1)

    client = OpenAI(base_url=LITELLM_BASE_URL, api_key=LITELLM_API_KEY)

    try:
        response = client.chat.completions.create(
            model="nano-banana-vertex",
            messages=[{"role": "user", "content": [
                {"type": "text", "text": "A simple red circle on white background, minimalist"}
            ]}],
            extra_body={
                "response_modalities": ["TEXT", "IMAGE"],
                "image_config": {
                    "image_size": "1K",
                    "aspect_ratio": "1:1"
                }
            }
        )
        # Check we got something back
        choice = response.choices[0]
        has_image = (
            (hasattr(choice.message, "images") and choice.message.images) or
            (hasattr(choice.message, "content") and choice.message.content)
        )
        if has_image:
            print(f"Vertex AI image gen OK")
            print(f"  Response ID: {response.id}")
        else:
            print(f"WARN: Response received but no image data found. Check litellm logs.")
            print(f"  This may mean the model is reachable but image parsing needs adjustment.")
    except Exception as e:
        msg = str(e)
        if "nano-banana-vertex" in msg or "model" in msg.lower():
            print(f"FAIL: Model routing error — is nano-banana-vertex in config.yaml? {e}", file=sys.stderr)
        elif "connection" in msg.lower() or "refused" in msg.lower():
            print(f"FAIL: Cannot connect to litellm proxy at {LITELLM_BASE_URL} — is it running?", file=sys.stderr)
        else:
            print(f"FAIL: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
