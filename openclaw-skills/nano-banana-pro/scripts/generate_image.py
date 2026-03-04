#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "openai>=1.0.0",
#     "pillow>=10.0.0",
#     "requests>=2.31.0",
#     "google-genai>=1.0.0",
# ]
# ///
"""
Generate images using Nano Banana Pro (Gemini) or GPT Image 1.5 via litellm proxy.

Usage:
    uv run generate_image.py --prompt "your image description" --filename "output.png" [--resolution 1K|2K|4K] [--aspect-ratio 1:1|9:16|16:9|etc] [--backend gemini|gpt|vertex-gemini]
"""

import argparse
import base64
import json
import os
import signal
import sys
from io import BytesIO
from pathlib import Path

# Ignore SIGPIPE so broken exec pipes don't kill concurrent runs
try:
    signal.signal(signal.SIGPIPE, signal.SIG_IGN)
except (AttributeError, ValueError):
    pass  # Windows doesn't have SIGPIPE

# Wrap stdout/stderr so BrokenPipeError doesn't crash the process
class _PipeSafe:
    def __init__(self, stream):
        self._stream = stream
    def write(self, data):
        try:
            self._stream.write(data)
        except (BrokenPipeError, OSError):
            pass
    def flush(self):
        try:
            self._stream.flush()
        except (BrokenPipeError, OSError):
            pass
    def __getattr__(self, name):
        return getattr(self._stream, name)

sys.stdout = _PipeSafe(sys.stdout)
sys.stderr = _PipeSafe(sys.stderr)

LITELLM_BASE_URL = os.environ.get("LITELLM_BASE_URL", "http://localhost:4000/v1")
LITELLM_API_KEY = os.environ.get("LITELLM_API_KEY", "")


def main():
    # Safe wrapper gate — must be called through generate_ads_safe.sh or clone_safe.sh
    # Direct calls by agents are blocked.
    if not os.environ.get("AD_GEN_SAFE") and not os.environ.get("CLONE_SAFE"):
        print("ERROR: Direct calls to generate_image.py are blocked.", file=sys.stderr)
        print("For ad generation: use generate_ads_safe.sh", file=sys.stderr)
        print("For clone generation: use clone_safe.sh plan + execute", file=sys.stderr)
        sys.exit(1)

    print("=" * 60)
    print("NANO BANANA PRO - Image Generation (via litellm)")
    print("=" * 60)

    parser = argparse.ArgumentParser(
        description="Generate images using Nano Banana Pro via litellm"
    )
    parser.add_argument("--prompt", "-p", required=True, help="Image description/prompt")
    parser.add_argument("--filename", "-f", required=True, help="Output filename")
    parser.add_argument(
        "--input-image", "-i", action="append",
        help="Input image path(s) for reference/editing. Can be used multiple times."
    )
    parser.add_argument(
        "--resolution", "-r", choices=["1K", "2K", "4K"], default="1K",
        help="Output resolution: 1K (default), 2K, or 4K"
    )
    parser.add_argument(
        "--aspect-ratio", "-a",
        choices=["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
        default="1:1", help="Aspect ratio (default: 1:1)"
    )
    parser.add_argument(
        "--backend", "-b", choices=["gemini", "gpt", "openai", "vertex-gemini"], default="vertex-gemini",
        help="Backend: vertex-gemini (default), gemini (alias for vertex-gemini), gpt/openai"
    )
    parser.add_argument("--api-key", "-k", help="litellm API key override")
    parser.add_argument("--base-url", help="litellm base URL override")

    args = parser.parse_args()

    if args.backend in ["gpt", "openai"]:
        args.backend = "openai"

    api_key = args.api_key or LITELLM_API_KEY
    base_url = args.base_url or LITELLM_BASE_URL

    print(f"\n📋 Configuration:")
    print(f"  Backend: {args.backend}")
    print(f"  Aspect Ratio: {args.aspect_ratio}")
    print(f"  Resolution: {args.resolution}")
    print(f"  Proxy: {base_url}")
    print(f"  Prompt: {args.prompt[:80]}...")

    from openai import OpenAI
    from PIL import Image as PILImage

    client = OpenAI(base_url=base_url, api_key=api_key)

    # Set up output path
    output_path = Path(args.filename).expanduser()
    if not output_path.is_absolute():
        media_dir = Path(__file__).resolve().parent.parent.parent.parent / "media"
        output_path = media_dir / output_path
        print(f"No directory specified, defaulting to: {output_path}")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Load input images as raw PNG bytes (same pattern as veo)
    input_images_raw = []
    output_resolution = args.resolution

    print(f"\n🖼️  Reference Images:")
    if args.input_image:
        print(f"  ✅ {len(args.input_image)} reference image(s) provided:")
        for img_path in args.input_image:
            print(f"     - {img_path}")
            try:
                img = PILImage.open(img_path)
                if img.format == 'WEBP':
                    img = img.convert('RGBA') if img.mode in ('RGBA', 'LA', 'P') else img.convert('RGB')

                # Auto-detect resolution from first image
                if len(input_images_raw) == 0 and args.resolution == "1K":
                    width, height = img.size
                    max_dim = max(width, height)
                    if max_dim >= 3000:
                        output_resolution = "4K"
                    elif max_dim >= 1500:
                        output_resolution = "2K"
                    print(f"     Auto-detected resolution: {output_resolution} (from {width}x{height})")

                # Save as PNG bytes directly (no base64 roundtrip)
                buf = BytesIO()
                img.save(buf, format='PNG')
                input_images_raw.append(buf.getvalue())
                print(f"  Loaded: {img_path} (format: {img.format}, size: {img.size})")
            except Exception as e:
                print(f"Error loading input image {img_path}: {e}", file=sys.stderr)
                sys.exit(1)
    else:
        print(f"  ❌ NO reference images provided")
        print(f"  💡 Use -i flag to include reference images")

    try:
        if args.backend == "openai":
            # GPT Image 1.5 via litellm
            print(f"Generating image with GPT Image 1.5 via litellm...")

            size_map = {
                "1K": "1024x1024",
                "2K": "1024x1792" if args.aspect_ratio == "9:16" else "1792x1024" if args.aspect_ratio == "16:9" else "1024x1024",
                "4K": "1024x1792" if args.aspect_ratio == "9:16" else "1792x1024" if args.aspect_ratio == "16:9" else "1024x1024"
            }
            quality_map = {"1K": "medium", "2K": "high", "4K": "high"}

            response = client.images.generate(
                model="gpt-image-1.5",
                prompt=args.prompt,
                size=size_map.get(output_resolution, "1024x1024"),
                quality=quality_map.get(output_resolution, "high"),
                n=1
            )

            import requests
            image_url = response.data[0].url
            if image_url.startswith("data:"):
                # Base64 response
                header, b64data = image_url.split(",", 1)
                image_data = base64.b64decode(b64data)
            else:
                image_data = requests.get(image_url).content

            image = PILImage.open(BytesIO(image_data))

        elif args.backend == "vertex-gemini":
            # Vertex AI via google-genai SDK directly — bypasses LiteLLM which strips
            # image_url content parts on the vertex_ai/ route. Uses inline_data instead.
            try:
                from google import genai as google_genai
                from google.genai import types as google_types
            except ImportError:
                print("google-genai not installed. Run: uv pip install google-genai", file=sys.stderr)
                sys.exit(1)

            project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
            location = "global"  # Gemini 3 image models only available at locations/global
            model = "gemini-3-pro-image-preview"

            print(f"Using Vertex AI SDK directly (project={project}, location={location})")
            print(f"Generating image with {model} via Vertex AI SDK (resolution {output_resolution}, aspect ratio {args.aspect_ratio})...")

            # Build content parts — raw bytes directly (same pattern as veo)
            parts = []
            for raw_bytes in input_images_raw:
                parts.append(google_types.Part(
                    inline_data=google_types.Blob(mime_type="image/png", data=raw_bytes)
                ))
            parts.append(google_types.Part(text=args.prompt))

            config = google_types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=google_types.ImageConfig(
                    aspect_ratio=args.aspect_ratio,
                    image_size=output_resolution,
                ),
            )

            vertex_client = google_genai.Client(vertexai=True, project=project, location=location)
            response = vertex_client.models.generate_content(
                model=model,
                contents=[google_types.Content(role="user", parts=parts)],
                config=config,
            )

            # Parse image from Vertex response (inline_data parts)
            image = None
            for candidate in response.candidates:
                for part in candidate.content.parts:
                    if hasattr(part, "inline_data") and part.inline_data and part.inline_data.data:
                        print("Found image in Vertex AI response (inline_data)")
                        image = PILImage.open(BytesIO(part.inline_data.data))
                        break
                if image is not None:
                    break

            if image is None:
                print("Warning: No image found in Vertex AI response.", file=sys.stderr)
                try:
                    print(f"Response text: {response.text}", file=sys.stderr)
                except Exception:
                    pass
                sys.exit(1)

        else:
            # Gemini via Vertex AI (google-genai SDK)
            try:
                from google import genai as google_genai
                from google.genai import types as google_types
            except ImportError:
                print("google-genai not installed. Run: uv pip install google-genai", file=sys.stderr)
                sys.exit(1)

            model = "gemini-3-pro-image-preview"
            project = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0013158607")
            print(f"Generating image with {model} via Vertex AI (project={project}, resolution {output_resolution}, aspect ratio {args.aspect_ratio})...")

            # Build content parts — raw bytes directly (same pattern as veo)
            parts = []
            for raw_bytes in input_images_raw:
                parts.append(google_types.Part(
                    inline_data=google_types.Blob(mime_type="image/png", data=raw_bytes)
                ))
            parts.append(google_types.Part(text=args.prompt))

            config = google_types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=google_types.ImageConfig(
                    aspect_ratio=args.aspect_ratio,
                    image_size=output_resolution,
                ),
            )

            vertex_client = google_genai.Client(vertexai=True, project=project, location="global")
            response = vertex_client.models.generate_content(
                model=model,
                contents=[google_types.Content(role="user", parts=parts)],
                config=config,
            )

            image = None
            for candidate in response.candidates:
                for part in candidate.content.parts:
                    if hasattr(part, "inline_data") and part.inline_data and part.inline_data.data:
                        image = PILImage.open(BytesIO(part.inline_data.data))
                        break
                if image is not None:
                    break

            if image is not None:
                print("Found image in Vertex AI response (inline_data)")
            else:
                print("Warning: No image found in Vertex AI response.", file=sys.stderr)
                try:
                    print(f"Response text: {response.text}", file=sys.stderr)
                except Exception:
                    pass
                sys.exit(1)

        # Save image
        if image.mode == 'RGBA':
            rgb_image = PILImage.new('RGB', image.size, (255, 255, 255))
            rgb_image.paste(image, mask=image.split()[3])
            rgb_image.save(str(output_path), 'PNG')
        elif image.mode == 'RGB':
            image.save(str(output_path), 'PNG')
        else:
            image.convert('RGB').save(str(output_path), 'PNG')

        full_path = output_path.resolve()
        print(f"\nImage saved: {full_path}")
        print(f"MEDIA:{full_path}")

    except Exception as e:
        print(f"Error generating image: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
