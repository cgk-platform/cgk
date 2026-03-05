#!/usr/bin/env python3
"""Basecamp documents -- list, get, create, update."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_list(args):
    path = f"/buckets/{args.project}/vaults/{args.vault}/documents.json"
    result = bc.api_request("GET", path, paginate=getattr(args, "all", False))
    bc.output(result)


def cmd_get(args):
    result = bc.api_request(
        "GET", f"/buckets/{args.project}/documents/{args.document}.json"
    )
    bc.output(result)


def cmd_create(args):
    data = {"title": args.title, "content": args.content}
    path = f"/buckets/{args.project}/vaults/{args.vault}/documents.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_update(args):
    data = {}
    if args.title:
        data["title"] = args.title
    if args.content:
        data["content"] = args.content
    path = f"/buckets/{args.project}/documents/{args.document}.json"
    result = bc.api_request("PUT", path, data=data)
    bc.output(result)


def main():
    parser = argparse.ArgumentParser(description="Basecamp documents")
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="List documents in a vault")
    p_list.add_argument("--project", required=True, help="Project (bucket) ID")
    p_list.add_argument("--vault", required=True, help="Vault ID")
    p_list.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_get = sub.add_parser("get", help="Get a document by ID")
    p_get.add_argument("--project", required=True, help="Project (bucket) ID")
    p_get.add_argument("--document", required=True, help="Document ID")

    p_create = sub.add_parser("create", help="Create a document")
    p_create.add_argument("--project", required=True, help="Project (bucket) ID")
    p_create.add_argument("--vault", required=True, help="Vault ID")
    p_create.add_argument("--title", required=True, help="Document title")
    p_create.add_argument("--content", required=True, help="Document content (HTML)")

    p_update = sub.add_parser("update", help="Update a document")
    p_update.add_argument("--project", required=True, help="Project (bucket) ID")
    p_update.add_argument("--document", required=True, help="Document ID")
    p_update.add_argument("--title", help="New title")
    p_update.add_argument("--content", help="New content (HTML)")

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
