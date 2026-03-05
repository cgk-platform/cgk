#!/usr/bin/env python3
"""Basecamp boosts -- list, get, create, destroy boost reactions."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_list(args):
    path = f"/buckets/{args.project}/recordings/{args.recording}/boosts.json"
    result = bc.api_request("GET", path, paginate=getattr(args, "all", False))
    bc.output(result)


def cmd_get(args):
    result = bc.api_request("GET", f"/buckets/{args.project}/boosts/{args.boost}.json")
    bc.output(result)


def cmd_create(args):
    data = {"content": args.content}
    path = f"/buckets/{args.project}/recordings/{args.recording}/boosts.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_destroy(args):
    result = bc.api_request(
        "DELETE", f"/buckets/{args.project}/boosts/{args.boost}.json"
    )
    bc.output(result if result else {"status": "destroyed"})


def main():
    parser = argparse.ArgumentParser(description="Basecamp boosts (reactions)")
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="List boosts on a recording")
    p_list.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_list.add_argument("--recording", required=True, help="Recording ID")
    p_list.add_argument("--all", action="store_true", help="Auto-paginate")

    p_get = sub.add_parser("get", help="Get a specific boost")
    p_get.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_get.add_argument("--boost", required=True, help="Boost ID")

    p_create = sub.add_parser("create", help="Create a boost reaction")
    p_create.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_create.add_argument("--recording", required=True, help="Recording ID")
    p_create.add_argument("--content", required=True, help="Boost content (emoji)")

    p_destroy = sub.add_parser("destroy", help="Destroy a boost")
    p_destroy.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_destroy.add_argument("--boost", required=True, help="Boost ID")

    args = parser.parse_args()
    if hasattr(args, 'project') and args.project is None:
        args.project = bc.resolve_project(args.project)
    dispatch = {
        "list": cmd_list,
        "get": cmd_get,
        "create": cmd_create,
        "destroy": cmd_destroy,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
