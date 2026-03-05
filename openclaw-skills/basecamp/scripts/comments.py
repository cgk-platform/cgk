#!/usr/bin/env python3
"""Basecamp comments -- list, create, update."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_list(args):
    path = f"/buckets/{args.project}/recordings/{args.recording}/comments.json"
    result = bc.api_request("GET", path, paginate=getattr(args, "all", False))
    bc.output(result)


def cmd_create(args):
    data = {"content": args.content}
    path = f"/buckets/{args.project}/recordings/{args.recording}/comments.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_update(args):
    data = {"content": args.content}
    path = f"/buckets/{args.project}/comments/{args.comment}.json"
    result = bc.api_request("PUT", path, data=data)
    bc.output(result)


def main():
    parser = argparse.ArgumentParser(description="Basecamp comments")
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="List comments on a recording")
    p_list.add_argument("--project", required=True, help="Project (bucket) ID")
    p_list.add_argument("--recording", required=True, help="Recording ID")
    p_list.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_create = sub.add_parser("create", help="Create a comment on a recording")
    p_create.add_argument("--project", required=True, help="Project (bucket) ID")
    p_create.add_argument("--recording", required=True, help="Recording ID")
    p_create.add_argument("--content", required=True, help="Comment content (HTML)")

    p_update = sub.add_parser("update", help="Update a comment")
    p_update.add_argument("--project", required=True, help="Project (bucket) ID")
    p_update.add_argument("--comment", required=True, help="Comment ID")
    p_update.add_argument("--content", required=True, help="New content (HTML)")

    args = parser.parse_args()
    dispatch = {
        "list": cmd_list,
        "create": cmd_create,
        "update": cmd_update,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
