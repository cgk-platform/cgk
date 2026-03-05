#!/usr/bin/env python3
"""Basecamp campfire -- list, get, post lines, delete lines."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_list(args):
    result = bc.api_request(
        "GET", f"/buckets/{args.project}/chats.json",
        paginate=getattr(args, "all", False)
    )
    bc.output(result)


def cmd_get(args):
    result = bc.api_request(
        "GET", f"/buckets/{args.project}/chats/{args.campfire}.json"
    )
    bc.output(result)


def cmd_post(args):
    data = {"content": args.content}
    path = f"/buckets/{args.project}/chats/{args.campfire}/lines.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_delete(args):
    path = f"/buckets/{args.project}/chats/lines/{args.line}.json"
    result = bc.api_request("DELETE", path)
    bc.output(result if result else {"status": "deleted"})


def main():
    parser = argparse.ArgumentParser(description="Basecamp campfire chat")
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="List campfires in a project")
    p_list.add_argument("--project", required=True, help="Project (bucket) ID")
    p_list.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_get = sub.add_parser("get", help="Get a campfire by ID")
    p_get.add_argument("--project", required=True, help="Project (bucket) ID")
    p_get.add_argument("--campfire", required=True, help="Campfire (chat) ID")

    p_post = sub.add_parser("post", help="Post a line to campfire")
    p_post.add_argument("--project", required=True, help="Project (bucket) ID")
    p_post.add_argument("--campfire", required=True, help="Campfire (chat) ID")
    p_post.add_argument("--content", required=True, help="Message content")

    p_delete = sub.add_parser("delete", help="Delete a campfire line")
    p_delete.add_argument("--project", required=True, help="Project (bucket) ID")
    p_delete.add_argument("--line", required=True, help="Campfire line ID")

    args = parser.parse_args()
    dispatch = {
        "list": cmd_list,
        "get": cmd_get,
        "post": cmd_post,
        "delete": cmd_delete,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
