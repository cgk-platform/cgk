#!/usr/bin/env python3
"""Basecamp subscriptions -- get, subscribe, unsubscribe, update."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_get(args):
    path = f"/buckets/{args.project}/recordings/{args.recording}/subscription.json"
    result = bc.api_request("GET", path)
    bc.output(result)


def cmd_subscribe(args):
    path = f"/buckets/{args.project}/recordings/{args.recording}/subscription.json"
    result = bc.api_request("POST", path)
    bc.output(result if result else {"status": "subscribed"})


def cmd_unsubscribe(args):
    path = f"/buckets/{args.project}/recordings/{args.recording}/subscription.json"
    result = bc.api_request("DELETE", path)
    bc.output(result if result else {"status": "unsubscribed"})


def cmd_update(args):
    data = {"subscriber_ids": [int(x) for x in args.subscriber_ids.split(",")]}
    path = f"/buckets/{args.project}/recordings/{args.recording}/subscription.json"
    result = bc.api_request("PUT", path, data=data)
    bc.output(result)


def main():
    parser = argparse.ArgumentParser(description="Basecamp subscriptions")
    sub = parser.add_subparsers(dest="command", required=True)

    p_get = sub.add_parser("get", help="Get subscription info for a recording")
    p_get.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_get.add_argument("--recording", required=True, help="Recording ID")

    p_sub = sub.add_parser("subscribe", help="Subscribe current user to a recording")
    p_sub.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_sub.add_argument("--recording", required=True, help="Recording ID")

    p_unsub = sub.add_parser("unsubscribe", help="Unsubscribe current user from a recording")
    p_unsub.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_unsub.add_argument("--recording", required=True, help="Recording ID")

    p_update = sub.add_parser("update", help="Update subscriber list for a recording")
    p_update.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_update.add_argument("--recording", required=True, help="Recording ID")
    p_update.add_argument("--subscriber-ids", dest="subscriber_ids", required=True,
                          help="Comma-separated person IDs to set as subscribers")

    args = parser.parse_args()
    if hasattr(args, 'project') and args.project is None:
        args.project = bc.resolve_project(args.project)
    dispatch = {
        "get": cmd_get,
        "subscribe": cmd_subscribe,
        "unsubscribe": cmd_unsubscribe,
        "update": cmd_update,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
