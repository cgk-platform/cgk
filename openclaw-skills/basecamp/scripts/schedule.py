#!/usr/bin/env python3
"""Basecamp schedule -- get schedule, list/create/update entries."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_get(args):
    result = bc.api_request(
        "GET", f"/buckets/{args.project}/schedules/{args.schedule}.json"
    )
    bc.output(result)


def cmd_list_entries(args):
    path = f"/buckets/{args.project}/schedules/{args.schedule}/entries.json"
    result = bc.api_request("GET", path, paginate=getattr(args, "all", False))
    bc.output(result)


def cmd_create(args):
    data = {
        "summary": args.summary,
        "starts_at": args.starts_at,
        "ends_at": args.ends_at,
    }
    if args.description:
        data["description"] = args.description
    if args.all_day:
        data["all_day"] = True
    if args.notify:
        data["notify"] = True
    path = f"/buckets/{args.project}/schedules/{args.schedule}/entries.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_update(args):
    data = {}
    if args.summary:
        data["summary"] = args.summary
    if args.starts_at:
        data["starts_at"] = args.starts_at
    if args.ends_at:
        data["ends_at"] = args.ends_at
    if args.description:
        data["description"] = args.description
    path = f"/buckets/{args.project}/schedule_entries/{args.entry}.json"
    result = bc.api_request("PUT", path, data=data)
    bc.output(result)


def main():
    parser = argparse.ArgumentParser(description="Basecamp schedule")
    sub = parser.add_subparsers(dest="command", required=True)

    p_get = sub.add_parser("get", help="Get a schedule")
    p_get.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_get.add_argument("--schedule", required=True, help="Schedule ID")

    p_list = sub.add_parser("list-entries", help="List schedule entries")
    p_list.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_list.add_argument("--schedule", required=True, help="Schedule ID")
    p_list.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_create = sub.add_parser("create", help="Create a schedule entry")
    p_create.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_create.add_argument("--schedule", required=True, help="Schedule ID")
    p_create.add_argument("--summary", required=True, help="Entry title/summary")
    p_create.add_argument("--starts-at", dest="starts_at", required=True, help="Start time (ISO 8601)")
    p_create.add_argument("--ends-at", dest="ends_at", required=True, help="End time (ISO 8601)")
    p_create.add_argument("--description", help="Entry description (HTML)")
    p_create.add_argument("--all-day", dest="all_day", action="store_true", help="All-day event")
    p_create.add_argument("--notify", action="store_true", help="Notify participants")

    p_update = sub.add_parser("update", help="Update a schedule entry")
    p_update.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_update.add_argument("--entry", required=True, help="Schedule entry ID")
    p_update.add_argument("--summary", help="New title/summary")
    p_update.add_argument("--starts-at", dest="starts_at", help="New start time (ISO 8601)")
    p_update.add_argument("--ends-at", dest="ends_at", help="New end time (ISO 8601)")
    p_update.add_argument("--description", help="New description (HTML)")

    args = parser.parse_args()
    if hasattr(args, 'project') and args.project is None:
        args.project = bc.resolve_project(args.project)
    dispatch = {
        "get": cmd_get,
        "list-entries": cmd_list_entries,
        "create": cmd_create,
        "update": cmd_update,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
