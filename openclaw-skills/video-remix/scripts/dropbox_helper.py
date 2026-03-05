#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Dropbox public link helper for video-remix skill.
Downloads files and folders from public Dropbox share links using ?dl=1 URL conversion.
No API token required — stdlib only (Phase 1: public links).

Commands:
  download-file <url> [--output <path>]
  download-folder <url> [--output-dir <dir>] [--filter video]
  list-folder <url>
"""
import argparse
import json
import os
import sys
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

# IMPORTANT: Do NOT use .resolve() — breaks profile isolation via symlinks
SCRIPT_DIR = Path(__file__).parent
PROFILE_ROOT = SCRIPT_DIR.parent.parent.parent
MEDIA_DIR = PROFILE_ROOT / "media"

VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v", ".wmv"}
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

FILE_TIMEOUT = 300   # 5 min for single files
FOLDER_TIMEOUT = 600  # 10 min for folder ZIPs
TINY_FILE_THRESHOLD = 10 * 1024  # 10KB — likely not a real video


def is_dropbox_url(url: str) -> bool:
    """Check if a URL is a Dropbox share link."""
    host = urlparse(url).hostname or ""
    return host in ("www.dropbox.com", "dropbox.com", "dl.dropboxusercontent.com")


def to_direct_url(url: str) -> str:
    """Convert a Dropbox share link to a direct download URL by setting dl=1."""
    parsed = urlparse(url)

    # dl.dropboxusercontent.com URLs are already direct
    if (parsed.hostname or "").endswith("dropboxusercontent.com"):
        return url

    # Parse existing query params, set dl=1
    params = parse_qs(parsed.query)
    params["dl"] = ["1"]
    new_query = urlencode(params, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


def _filename_from_url(url: str) -> str:
    """Extract a reasonable filename from a Dropbox URL path."""
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    # /scl/fi/<hash>/filename.mp4 → filename.mp4
    # /s/<hash>/filename.mp4 → filename.mp4
    name = path.rsplit("/", 1)[-1] if "/" in path else "download"
    # Strip query artifacts
    if "?" in name:
        name = name.split("?")[0]
    return name or "download"


def _download(url: str, dest: Path, timeout: int = FILE_TIMEOUT) -> None:
    """Download a URL to a local path with content-type validation."""
    req = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(req, timeout=timeout) as resp:
            content_type = resp.headers.get("Content-Type", "")
            # Reject HTML responses — indicates login redirect or broken link
            if "text/html" in content_type:
                print(
                    "ERROR: Received HTML instead of file data. "
                    "The link may be private or require authentication. "
                    "Ensure the Dropbox link has sharing enabled (\"Anyone with the link\").",
                    file=sys.stderr,
                )
                sys.exit(1)

            dest.parent.mkdir(parents=True, exist_ok=True)
            with open(dest, "wb") as f:
                while True:
                    chunk = resp.read(1024 * 1024)  # 1MB chunks
                    if not chunk:
                        break
                    f.write(chunk)
    except HTTPError as e:
        if e.code in (403, 404):
            print(
                f"ERROR: HTTP {e.code} — the link may be private or deleted. "
                "Ensure sharing is enabled on the Dropbox file/folder.",
                file=sys.stderr,
            )
        else:
            print(f"ERROR: HTTP {e.code} downloading {url}", file=sys.stderr)
        sys.exit(1)
    except URLError as e:
        print(f"ERROR: Network error downloading {url}: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except TimeoutError:
        print(f"ERROR: Download timed out after {timeout}s for {url}", file=sys.stderr)
        sys.exit(1)


def _is_video(name: str) -> bool:
    return Path(name).suffix.lower() in VIDEO_EXTENSIONS


def cmd_download_file(args):
    """Download a single file from a public Dropbox link."""
    url = args.url
    if not is_dropbox_url(url):
        print("ERROR: Not a Dropbox URL.", file=sys.stderr)
        sys.exit(1)

    direct = to_direct_url(url)
    name = _filename_from_url(url)

    if args.output:
        dest = Path(args.output)
    else:
        dest = MEDIA_DIR / "inbound" / name

    print(f"Downloading: {name}", file=sys.stderr)
    print(f"Direct URL: {direct}", file=sys.stderr)
    _download(direct, dest)

    size = dest.stat().st_size
    if size < TINY_FILE_THRESHOLD:
        print(
            f"WARNING: Downloaded file is only {size} bytes — may not be a real video.",
            file=sys.stderr,
        )

    result = {"path": str(dest), "size": size, "name": name}
    print(json.dumps(result))


def cmd_download_folder(args):
    """Download a folder from a public Dropbox link (ZIP), extract videos."""
    url = args.url
    if not is_dropbox_url(url):
        print("ERROR: Not a Dropbox URL.", file=sys.stderr)
        sys.exit(1)

    direct = to_direct_url(url)
    folder_name = _filename_from_url(url) or "dropbox-folder"

    output_dir = Path(args.output_dir) if args.output_dir else (MEDIA_DIR / "inbound" / "dropbox" / folder_name)
    output_dir.mkdir(parents=True, exist_ok=True)

    filter_video = args.filter == "video"

    # Download ZIP to temp
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        tmp_path = Path(tmp.name)

    try:
        print(f"Downloading folder ZIP: {folder_name}", file=sys.stderr)
        _download(direct, tmp_path, timeout=FOLDER_TIMEOUT)

        try:
            zf = zipfile.ZipFile(tmp_path)
        except zipfile.BadZipFile:
            print(
                "ERROR: Downloaded file is not a valid ZIP. "
                "The folder link may be private or the download was incomplete.",
                file=sys.stderr,
            )
            sys.exit(1)

        videos = []
        total = 0
        skipped = 0

        with zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                total += 1

                if filter_video and not _is_video(info.filename):
                    continue

                dest = output_dir / info.filename
                # Skip if already exists with same size
                if dest.exists() and dest.stat().st_size == info.file_size:
                    skipped += 1
                    videos.append({
                        "path": str(dest),
                        "size": info.file_size,
                        "name": Path(info.filename).name,
                    })
                    continue

                dest.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(info) as src, open(dest, "wb") as dst:
                    while True:
                        chunk = src.read(1024 * 1024)
                        if not chunk:
                            break
                        dst.write(chunk)

                videos.append({
                    "path": str(dest),
                    "size": info.file_size,
                    "name": Path(info.filename).name,
                })

        result = {
            "folder": folder_name,
            "total_files": total,
            "downloaded": len(videos) - skipped,
            "skipped": skipped,
            "videos": videos,
        }
        print(json.dumps(result))
    finally:
        tmp_path.unlink(missing_ok=True)


def cmd_list_folder(args):
    """List contents of a Dropbox folder link without extracting."""
    url = args.url
    if not is_dropbox_url(url):
        print("ERROR: Not a Dropbox URL.", file=sys.stderr)
        sys.exit(1)

    direct = to_direct_url(url)

    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        tmp_path = Path(tmp.name)

    try:
        print("Downloading folder ZIP for listing...", file=sys.stderr)
        _download(direct, tmp_path, timeout=FOLDER_TIMEOUT)

        try:
            zf = zipfile.ZipFile(tmp_path)
        except zipfile.BadZipFile:
            print(
                "ERROR: Downloaded file is not a valid ZIP. "
                "The folder link may be private or the download was incomplete.",
                file=sys.stderr,
            )
            sys.exit(1)

        files = []
        with zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                files.append({
                    "name": info.filename,
                    "size": info.file_size,
                    "is_video": _is_video(info.filename),
                })

        result = {"files": files, "total": len(files)}
        print(json.dumps(result))
    finally:
        tmp_path.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(
        description="Dropbox public link helper for video-remix"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # download-file
    dl_file = sub.add_parser("download-file", help="Download a single file")
    dl_file.add_argument("url", help="Dropbox share URL")
    dl_file.add_argument("--output", help="Output file path (default: <media>/inbound/<name>)")
    dl_file.set_defaults(func=cmd_download_file)

    # download-folder
    dl_folder = sub.add_parser("download-folder", help="Download a folder as ZIP and extract")
    dl_folder.add_argument("url", help="Dropbox folder share URL")
    dl_folder.add_argument("--output-dir", help="Output directory (default: <media>/inbound/dropbox/<name>)")
    dl_folder.add_argument("--filter", choices=["video"], help="Filter extracted files by type")
    dl_folder.set_defaults(func=cmd_download_folder)

    # list-folder
    ls_folder = sub.add_parser("list-folder", help="List folder contents without extracting")
    ls_folder.add_argument("url", help="Dropbox folder share URL")
    ls_folder.set_defaults(func=cmd_list_folder)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
