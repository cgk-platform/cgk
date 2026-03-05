#!/usr/bin/env python3
"""Basecamp messages -- list, get, create, update."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_list(args):
    path = f"/buckets/{args.project}/message_boards/{args.message_board}/messages.json"
    result = bc.api_request("GET", path, paginate=getattr(args, "all", False))
    bc.output(result)


def cmd_get(args):
    result = bc.api_request("GET", f"/buckets/{args.project}/messages/{args.message}.json")
    bc.output(result)


def cmd_create(args):
    data = {"subject": args.subject, "content": args.content}
    if args.category_id:
        data["category_id"] = int(args.category_id)
    path = f"/buckets/{args.project}/message_boards/{args.message_board}/messages.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_update(args):
    data = {}
    if args.subject:
        data["subject"] = args.subject
    if args.content:
        data["content"] = args.content
    if args.category_id:
        data["category_id"] = int(args.category_id)
    result = bc.api_request(
        "PUT", f"/buckets/{args.project}/messages/{args.message}.json", data=data
    )
    bc.output(result)


def main():
    parser = argparse.ArgumentParser(description="Basecamp messages")
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="List messages on a message board")
    p_list.add_argument("--project", required=True, help="Project (bucket) ID")
    p_list.add_argument("--message-board", dest="message_board", required=True, help="Message board ID")
    p_list.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_get = sub.add_parser("get", help="Get a message by ID")
    p_get.add_argument("--project", required=True, help="Project (bucket) ID")
    p_get.add_argument("--message", required=True, help="Message ID")

    p_create = sub.add_parser("create", help="Create a message")
    p_create.add_argument("--project", required=True, help="Project (bucket) ID")
    p_create.add_argument("--message-board", dest="message_board", required=True, help="Message board ID")
    p_create.add_argument("--subject", required=True, help="Message subject/title")
    p_create.add_argument("--content", required=True, help="Message body (HTML)")
    p_create.add_argument("--category-id", dest="category_id", help="Message category ID")

    p_update = sub.add_parser("update", help="Update a message")
    p_update.add_argument("--project", required=True, help="Project (bucket) ID")
    p_update.add_argument("--message", required=True, help="Message ID")
    p_update.add_argument("--subject", help="New subject/title")
    p_update.add_argument("--content", help="New body (HTML)")
    p_update.add_argument("--category-id", dest="category_id", help="New category ID")

    args = parser.parse_args()
    dispatch = {
        "list": cmd_list,
        "get": cmd_get,
        "create": cmd_create,
        "update": cmd_update,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
