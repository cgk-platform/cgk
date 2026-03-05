#!/usr/bin/env python3
"""Basecamp projects -- list, get, create, update, trash."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_list(args):
    paginate = getattr(args, "all", False)
    result = bc.api_request("GET", "/projects.json", paginate=paginate)
    bc.output(result)


def cmd_get(args):
    result = bc.api_request("GET", f"/projects/{args.id}.json")
    bc.output(result)


def cmd_create(args):
    data = {"name": args.name}
    if args.description:
        data["description"] = args.description
    result = bc.api_request("POST", "/projects.json", data=data)
    bc.output(result)


def cmd_update(args):
    data = {}
    if args.name:
        data["name"] = args.name
    if args.description:
        data["description"] = args.description
    result = bc.api_request("PUT", f"/projects/{args.id}.json", data=data)
    bc.output(result)


def cmd_trash(args):
    result = bc.api_request(
        "PUT", f"/projects/{args.id}.json", data={"status": "trashed"}
    )
    bc.output(result)


def main():
    parser = argparse.ArgumentParser(description="Basecamp projects")
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="List all projects")
    p_list.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_get = sub.add_parser("get", help="Get a project by ID")
    p_get.add_argument("id", help="Project ID")

    p_create = sub.add_parser("create", help="Create a project")
    p_create.add_argument("--name", required=True, help="Project name")
    p_create.add_argument("--description", help="Project description")

    p_update = sub.add_parser("update", help="Update a project")
    p_update.add_argument("id", help="Project ID")
    p_update.add_argument("--name", help="New project name")
    p_update.add_argument("--description", help="New project description")

    p_trash = sub.add_parser("trash", help="Trash a project")
    p_trash.add_argument("id", help="Project ID")

    args = parser.parse_args()
    dispatch = {
        "list": cmd_list,
        "get": cmd_get,
        "create": cmd_create,
        "update": cmd_update,
        "trash": cmd_trash,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
