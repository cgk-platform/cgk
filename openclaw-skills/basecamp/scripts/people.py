#!/usr/bin/env python3
"""Basecamp people -- list, list-project, get, me, update-access."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_list(args):
    result = bc.api_request("GET", "/people.json", paginate=getattr(args, "all", False))
    bc.output(result)


def cmd_list_project(args):
    result = bc.api_request(
        "GET", f"/projects/{args.project}/people.json",
        paginate=getattr(args, "all", False)
    )
    bc.output(result)


def cmd_get(args):
    result = bc.api_request("GET", f"/people/{args.person}.json")
    bc.output(result)


def cmd_me(args):
    result = bc.api_request("GET", "/my/profile.json")
    bc.output(result)


def cmd_update_access(args):
    data = {}
    if args.grant:
        data["grant"] = [int(x) for x in args.grant.split(",")]
    if args.revoke:
        data["revoke"] = [int(x) for x in args.revoke.split(",")]
    result = bc.api_request("PUT", f"/projects/{args.project}/people/users.json", data=data)
    bc.output(result)


def main():
    parser = argparse.ArgumentParser(description="Basecamp people")
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="List all people on the account")
    p_list.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_lp = sub.add_parser("list-project", help="List people on a project")
    p_lp.add_argument("--project", default=None, help="Project ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_lp.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_get = sub.add_parser("get", help="Get a person by ID")
    p_get.add_argument("--person", required=True, help="Person ID")

    sub.add_parser("me", help="Get the current user profile")

    p_ua = sub.add_parser("update-access", help="Grant or revoke project access")
    p_ua.add_argument("--project", default=None, help="Project ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_ua.add_argument("--grant", help="Comma-separated person IDs to grant access")
    p_ua.add_argument("--revoke", help="Comma-separated person IDs to revoke access")

    args = parser.parse_args()
    if hasattr(args, 'project') and args.project is None:
        args.project = bc.resolve_project(args.project)
    dispatch = {
        "list": cmd_list,
        "list-project": cmd_list_project,
        "get": cmd_get,
        "me": cmd_me,
        "update-access": cmd_update_access,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
