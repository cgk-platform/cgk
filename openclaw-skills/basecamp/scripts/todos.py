#!/usr/bin/env python3
"""Basecamp todos -- list, get, create, update, complete, uncomplete, reposition."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_list(args):
    path = f"/buckets/{args.project}/todolists/{args.todolist}/todos.json"
    result = bc.api_request("GET", path, paginate=getattr(args, "all", False))
    bc.output(result)


def cmd_get(args):
    result = bc.api_request("GET", f"/buckets/{args.project}/todos/{args.todo}.json")
    bc.output(result)


def cmd_create(args):
    data = {"content": args.content}
    if args.description:
        data["description"] = args.description
    if args.due_on:
        data["due_on"] = args.due_on
    if args.assignee_ids:
        data["assignee_ids"] = [int(x) for x in args.assignee_ids.split(",")]
    if args.notify:
        data["notify"] = True
    path = f"/buckets/{args.project}/todolists/{args.todolist}/todos.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_update(args):
    data = {}
    if args.content:
        data["content"] = args.content
    if args.description:
        data["description"] = args.description
    if args.due_on:
        data["due_on"] = args.due_on
    if args.assignee_ids:
        data["assignee_ids"] = [int(x) for x in args.assignee_ids.split(",")]
    result = bc.api_request(
        "PUT", f"/buckets/{args.project}/todos/{args.todo}.json", data=data
    )
    bc.output(result)


def cmd_complete(args):
    path = f"/buckets/{args.project}/todos/{args.todo}/completion.json"
    result = bc.api_request("POST", path)
    bc.output(result if result else {"status": "completed"})


def cmd_uncomplete(args):
    path = f"/buckets/{args.project}/todos/{args.todo}/completion.json"
    result = bc.api_request("DELETE", path)
    bc.output(result if result else {"status": "uncompleted"})


def cmd_reposition(args):
    data = {"position": args.position}
    path = f"/buckets/{args.project}/todos/{args.todo}.json"
    result = bc.api_request("PUT", path, data=data)
    bc.output(result)


def main():
    parser = argparse.ArgumentParser(description="Basecamp todos")
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="List todos in a todolist")
    p_list.add_argument("--project", required=True, help="Project (bucket) ID")
    p_list.add_argument("--todolist", required=True, help="Todolist ID")
    p_list.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_get = sub.add_parser("get", help="Get a todo by ID")
    p_get.add_argument("--project", required=True, help="Project (bucket) ID")
    p_get.add_argument("--todo", required=True, help="Todo ID")

    p_create = sub.add_parser("create", help="Create a todo")
    p_create.add_argument("--project", required=True, help="Project (bucket) ID")
    p_create.add_argument("--todolist", required=True, help="Todolist ID")
    p_create.add_argument("--content", required=True, help="Todo content/title")
    p_create.add_argument("--description", help="Longer description (HTML)")
    p_create.add_argument("--due-on", dest="due_on", help="Due date (YYYY-MM-DD)")
    p_create.add_argument(
        "--assignee-ids", dest="assignee_ids", help="Comma-separated person IDs"
    )
    p_create.add_argument(
        "--notify", action="store_true", help="Notify assignees by email"
    )

    p_update = sub.add_parser("update", help="Update a todo")
    p_update.add_argument("--project", required=True, help="Project (bucket) ID")
    p_update.add_argument("--todo", required=True, help="Todo ID")
    p_update.add_argument("--content", help="New content/title")
    p_update.add_argument("--description", help="New description (HTML)")
    p_update.add_argument("--due-on", dest="due_on", help="New due date (YYYY-MM-DD)")
    p_update.add_argument(
        "--assignee-ids", dest="assignee_ids", help="Comma-separated person IDs"
    )

    p_complete = sub.add_parser("complete", help="Mark a todo as complete")
    p_complete.add_argument("--project", required=True, help="Project (bucket) ID")
    p_complete.add_argument("--todo", required=True, help="Todo ID")

    p_uncomplete = sub.add_parser("uncomplete", help="Mark a todo as incomplete")
    p_uncomplete.add_argument("--project", required=True, help="Project (bucket) ID")
    p_uncomplete.add_argument("--todo", required=True, help="Todo ID")

    p_reposition = sub.add_parser("reposition", help="Reposition a todo in its list")
    p_reposition.add_argument("--project", required=True, help="Project (bucket) ID")
    p_reposition.add_argument("--todo", required=True, help="Todo ID")
    p_reposition.add_argument(
        "--position", required=True, type=int, help="1-based position"
    )

    args = parser.parse_args()
    dispatch = {
        "list": cmd_list,
        "get": cmd_get,
        "create": cmd_create,
        "update": cmd_update,
        "complete": cmd_complete,
        "uncomplete": cmd_uncomplete,
        "reposition": cmd_reposition,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
