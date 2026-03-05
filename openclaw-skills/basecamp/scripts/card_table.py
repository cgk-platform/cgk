#!/usr/bin/env python3
"""Basecamp card table (kanban) -- board, columns, cards, moves."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc

VALID_COLORS = {"white", "red", "orange", "yellow", "green", "blue", "aqua", "purple", "gray", "pink", "brown"}


def cmd_get(args):
    result = bc.api_request(
        "GET", f"/buckets/{args.project}/card_tables/{args.card_table}.json"
    )
    bc.output(result)


def cmd_create_column(args):
    data = {"title": args.title}
    if args.color:
        data["color"] = args.color
    path = f"/buckets/{args.project}/card_tables/{args.card_table}/columns.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_update_column(args):
    data = {}
    if args.title:
        data["title"] = args.title
    path = f"/buckets/{args.project}/card_tables/columns/{args.column}.json"
    result = bc.api_request("PUT", path, data=data)
    bc.output(result)


def cmd_set_column_color(args):
    if args.color not in VALID_COLORS:
        bc.output({"error": f"Invalid color. Must be one of: {', '.join(sorted(VALID_COLORS))}"})
        return
    data = {"color": args.color}
    path = f"/buckets/{args.project}/card_tables/columns/{args.column}/color.json"
    result = bc.api_request("PUT", path, data=data)
    bc.output(result)


def cmd_list_cards(args):
    path = f"/buckets/{args.project}/card_tables/lists/{args.column}/cards.json"
    result = bc.api_request("GET", path, paginate=getattr(args, "all", False))
    bc.output(result)


def cmd_get_card(args):
    result = bc.api_request(
        "GET", f"/buckets/{args.project}/card_tables/cards/{args.card}.json"
    )
    bc.output(result)


def cmd_create_card(args):
    data = {"title": args.title}
    if args.content:
        data["content"] = args.content
    if args.due_on:
        data["due_on"] = args.due_on
    if args.assignee_ids:
        data["assignee_ids"] = [int(x) for x in args.assignee_ids.split(",")]
    if args.notify:
        data["notify"] = True
    path = f"/buckets/{args.project}/card_tables/lists/{args.column}/cards.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_update_card(args):
    data = {}
    if args.title:
        data["title"] = args.title
    if args.content:
        data["content"] = args.content
    if args.due_on:
        data["due_on"] = args.due_on
    if args.assignee_ids:
        data["assignee_ids"] = [int(x) for x in args.assignee_ids.split(",")]
    path = f"/buckets/{args.project}/card_tables/cards/{args.card}.json"
    result = bc.api_request("PUT", path, data=data)
    bc.output(result)


def cmd_move_card(args):
    data = {"column_id": int(args.column)}
    path = f"/buckets/{args.project}/card_tables/cards/{args.card}/moves.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result if result else {"status": "moved"})


def main():
    parser = argparse.ArgumentParser(description="Basecamp card table (kanban board)")
    sub = parser.add_subparsers(dest="command", required=True)

    p_get = sub.add_parser("get", help="Get a card table board")
    p_get.add_argument("--project", required=True, help="Project (bucket) ID")
    p_get.add_argument("--card-table", dest="card_table", required=True, help="Card table ID")

    p_cc = sub.add_parser("create-column", help="Create a column")
    p_cc.add_argument("--project", required=True, help="Project (bucket) ID")
    p_cc.add_argument("--card-table", dest="card_table", required=True, help="Card table ID")
    p_cc.add_argument("--title", required=True, help="Column title")
    p_cc.add_argument("--color", help="Column color (white, red, orange, yellow, green, blue, aqua, purple, gray, pink, brown)")

    p_uc = sub.add_parser("update-column", help="Update a column title")
    p_uc.add_argument("--project", required=True, help="Project (bucket) ID")
    p_uc.add_argument("--column", required=True, help="Column ID")
    p_uc.add_argument("--title", help="New column title")

    p_sc = sub.add_parser("set-column-color", help="Set a column color")
    p_sc.add_argument("--project", required=True, help="Project (bucket) ID")
    p_sc.add_argument("--column", required=True, help="Column ID")
    p_sc.add_argument("--color", required=True, help="Color name (white, red, orange, yellow, green, blue, aqua, purple, gray, pink, brown)")

    p_lc = sub.add_parser("list-cards", help="List cards in a column")
    p_lc.add_argument("--project", required=True, help="Project (bucket) ID")
    p_lc.add_argument("--column", required=True, help="Column (list) ID")
    p_lc.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_gc = sub.add_parser("get-card", help="Get a card by ID")
    p_gc.add_argument("--project", required=True, help="Project (bucket) ID")
    p_gc.add_argument("--card", required=True, help="Card ID")

    p_createcard = sub.add_parser("create-card", help="Create a card in a column")
    p_createcard.add_argument("--project", required=True, help="Project (bucket) ID")
    p_createcard.add_argument("--column", required=True, help="Column (list) ID")
    p_createcard.add_argument("--title", required=True, help="Card title")
    p_createcard.add_argument("--content", help="Card description (HTML)")
    p_createcard.add_argument("--due-on", dest="due_on", help="Due date (YYYY-MM-DD)")
    p_createcard.add_argument("--assignee-ids", dest="assignee_ids", help="Comma-separated person IDs")
    p_createcard.add_argument("--notify", action="store_true", help="Notify assignees")

    p_updatecard = sub.add_parser("update-card", help="Update a card")
    p_updatecard.add_argument("--project", required=True, help="Project (bucket) ID")
    p_updatecard.add_argument("--card", required=True, help="Card ID")
    p_updatecard.add_argument("--title", help="New card title")
    p_updatecard.add_argument("--content", help="New description (HTML)")
    p_updatecard.add_argument("--due-on", dest="due_on", help="New due date (YYYY-MM-DD)")
    p_updatecard.add_argument("--assignee-ids", dest="assignee_ids", help="Comma-separated person IDs")

    p_move = sub.add_parser("move-card", help="Move a card to a different column")
    p_move.add_argument("--project", required=True, help="Project (bucket) ID")
    p_move.add_argument("--card", required=True, help="Card ID")
    p_move.add_argument("--column", required=True, help="Destination column ID")

    args = parser.parse_args()
    dispatch = {
        "get": cmd_get,
        "create-column": cmd_create_column,
        "update-column": cmd_update_column,
        "set-column-color": cmd_set_column_color,
        "list-cards": cmd_list_cards,
        "get-card": cmd_get_card,
        "create-card": cmd_create_card,
        "update-card": cmd_update_card,
        "move-card": cmd_move_card,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
