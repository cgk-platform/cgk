#!/usr/bin/env python3
"""Basecamp recordings -- search, archive, trash, restore."""

import argparse
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc

VALID_TYPES = {
    "Comment", "Document", "Message", "Question::Answer", "Schedule::Entry",
    "Todo", "Todolist", "Upload", "Vault",
}


def cmd_search(args):
    params = {}
    if args.type:
        params["type"] = args.type
    if args.bucket:
        params["bucket"] = args.bucket
    if args.sort:
        params["sort"] = args.sort
    if args.direction:
        params["direction"] = args.direction
    if args.page:
        params["page"] = args.page

    base_path = "/projects/recordings.json"
    if params:
        query = urllib.parse.urlencode(params)
        path = f"{base_path}?{query}"
    else:
        path = base_path

    result = bc.api_request("GET", path, paginate=getattr(args, "all", False))
    bc.output(result)


def cmd_archive(args):
    path = f"/buckets/{args.project}/recordings/{args.recording}/status/archived.json"
    result = bc.api_request("PUT", path)
    bc.output(result if result else {"status": "archived"})


def cmd_trash(args):
    path = f"/buckets/{args.project}/recordings/{args.recording}/status/trashed.json"
    result = bc.api_request("PUT", path)
    bc.output(result if result else {"status": "trashed"})


def cmd_restore(args):
    path = f"/buckets/{args.project}/recordings/{args.recording}/status/active.json"
    result = bc.api_request("PUT", path)
    bc.output(result if result else {"status": "active"})


def main():
    parser = argparse.ArgumentParser(description="Basecamp recordings")
    sub = parser.add_subparsers(dest="command", required=True)

    p_search = sub.add_parser("search", help="Search/list recordings across projects")
    p_search.add_argument("--type", help="Recording type filter (Todo, Document, Message, etc.)")
    p_search.add_argument("--bucket", help="Filter by project (bucket) ID")
    p_search.add_argument("--sort", help="Sort field (created_at or updated_at)")
    p_search.add_argument("--direction", help="Sort direction (asc or desc)")
    p_search.add_argument("--page", help="Page number")
    p_search.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_archive = sub.add_parser("archive", help="Archive a recording")
    p_archive.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_archive.add_argument("--recording", required=True, help="Recording ID")

    p_trash = sub.add_parser("trash", help="Trash a recording")
    p_trash.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_trash.add_argument("--recording", required=True, help="Recording ID")

    p_restore = sub.add_parser("restore", help="Restore a recording to active")
    p_restore.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_restore.add_argument("--recording", required=True, help="Recording ID")

    args = parser.parse_args()
    if hasattr(args, 'project') and args.project is None:
        args.project = bc.resolve_project(args.project)
    dispatch = {
        "search": cmd_search,
        "archive": cmd_archive,
        "trash": cmd_trash,
        "restore": cmd_restore,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
