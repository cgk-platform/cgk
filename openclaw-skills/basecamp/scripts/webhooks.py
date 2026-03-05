#!/usr/bin/env python3
"""Basecamp webhooks -- list, get, create, update, destroy."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_list(args):
    path = f"/buckets/{args.project}/webhooks.json"
    result = bc.api_request("GET", path, paginate=getattr(args, "all", False))
    bc.output(result)


def cmd_get(args):
    result = bc.api_request(
        "GET", f"/buckets/{args.project}/webhooks/{args.webhook}.json"
    )
    bc.output(result)


def cmd_create(args):
    data = {
        "payload_url": args.payload_url,
        "types": [t.strip() for t in args.types.split(",")],
    }
    path = f"/buckets/{args.project}/webhooks.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_update(args):
    data = {}
    if args.payload_url:
        data["payload_url"] = args.payload_url
    if args.types:
        data["types"] = [t.strip() for t in args.types.split(",")]
    if args.active is not None:
        data["active"] = args.active
    path = f"/buckets/{args.project}/webhooks/{args.webhook}.json"
    result = bc.api_request("PUT", path, data=data)
    bc.output(result)


def cmd_destroy(args):
    result = bc.api_request(
        "DELETE", f"/buckets/{args.project}/webhooks/{args.webhook}.json"
    )
    bc.output(result if result else {"status": "destroyed"})


def main():
    parser = argparse.ArgumentParser(description="Basecamp webhooks")
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="List webhooks in a project")
    p_list.add_argument("--project", required=True, help="Project (bucket) ID")
    p_list.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_get = sub.add_parser("get", help="Get a webhook by ID")
    p_get.add_argument("--project", required=True, help="Project (bucket) ID")
    p_get.add_argument("--webhook", required=True, help="Webhook ID")

    p_create = sub.add_parser("create", help="Create a webhook")
    p_create.add_argument("--project", required=True, help="Project (bucket) ID")
    p_create.add_argument("--payload-url", dest="payload_url", required=True, help="Endpoint URL to receive events")
    p_create.add_argument("--types", required=True, help="Comma-separated event types (e.g. Todo,Comment)")

    p_update = sub.add_parser("update", help="Update a webhook")
    p_update.add_argument("--project", required=True, help="Project (bucket) ID")
    p_update.add_argument("--webhook", required=True, help="Webhook ID")
    p_update.add_argument("--payload-url", dest="payload_url", help="New endpoint URL")
    p_update.add_argument("--types", help="New comma-separated event types")
    p_update.add_argument("--active", type=lambda x: x.lower() == "true", help="Active state (true/false)")

    p_destroy = sub.add_parser("destroy", help="Delete a webhook")
    p_destroy.add_argument("--project", required=True, help="Project (bucket) ID")
    p_destroy.add_argument("--webhook", required=True, help="Webhook ID")

    args = parser.parse_args()
    dispatch = {
        "list": cmd_list,
        "get": cmd_get,
        "create": cmd_create,
        "update": cmd_update,
        "destroy": cmd_destroy,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
