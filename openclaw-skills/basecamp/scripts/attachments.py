#!/usr/bin/env python3
"""Basecamp attachments -- upload files, get attachable_sgid for embedding."""

import argparse
import json
import mimetypes
import os
import sys
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_upload(args):
    """Upload a file and return its attachable_sgid."""
    file_path = Path(args.file)
    if not file_path.exists():
        bc.output({"error": f"File not found: {args.file}"})
        return

    content_type = args.content_type
    if not content_type:
        content_type, _ = mimetypes.guess_type(str(file_path))
        if not content_type:
            content_type = "application/octet-stream"

    filename = args.name or file_path.name
    file_data = file_path.read_bytes()

    bc._check_config()
    url = f"{bc.BASE_URL}/attachments.json?name={urllib.parse.quote(filename)}"
    headers = {
        "Authorization": f"Bearer {bc.ACCESS_TOKEN}",
        "Content-Type": content_type,
        "Content-Length": str(len(file_data)),
        "User-Agent": bc.USER_AGENT,
    }

    req = urllib.request.Request(url, data=file_data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode())
            bc.output(result)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        bc.output({"error": f"HTTP {e.code}", "detail": error_body})
    except urllib.error.URLError as e:
        bc.output({"error": f"Connection error: {e.reason}"})


def cmd_embed_html(args):
    """Generate bc-attachment HTML for embedding in card/comment content."""
    tag = f'<bc-attachment sgid="{args.sgid}"'
    if args.caption:
        tag += f' caption="{args.caption}"'
    tag += "></bc-attachment>"
    bc.output({"html": tag})


def main():
    parser = argparse.ArgumentParser(description="Basecamp attachments")
    sub = parser.add_subparsers(dest="command", required=True)

    p_upload = sub.add_parser("upload", help="Upload a file to Basecamp")
    p_upload.add_argument("--file", required=True, help="Path to the file to upload")
    p_upload.add_argument("--name", help="Filename override (default: original filename)")
    p_upload.add_argument("--content-type", dest="content_type", help="MIME type override (default: auto-detect)")

    p_embed = sub.add_parser("embed-html", help="Generate bc-attachment HTML tag")
    p_embed.add_argument("--sgid", required=True, help="attachable_sgid from upload response")
    p_embed.add_argument("--caption", help="Optional caption for images")

    args = parser.parse_args()
    dispatch = {
        "upload": cmd_upload,
        "embed-html": cmd_embed_html,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
