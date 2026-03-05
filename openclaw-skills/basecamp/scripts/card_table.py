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
    # Basecamp doesn't inline cards -- fetch them per column via cards_url
    if not getattr(args, "no_cards", False):
        for col in result.get("lists", []):
            cards_url = col.get("cards_url", "")
            if cards_url and col.get("cards_count", 0) > 0:
                col["cards"] = bc.api_request("GET", cards_url, paginate=True)
            else:
                col["cards"] = []
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
    if args.description:
        data["description"] = args.description
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
    if args.assignee_ids is not None:
        if args.assignee_ids == "" or args.assignee_ids == "none":
            data["assignee_ids"] = []
        else:
            data["assignee_ids"] = [int(x) for x in args.assignee_ids.split(",")]
    path = f"/buckets/{args.project}/card_tables/cards/{args.card}.json"
    result = bc.api_request("PUT", path, data=data)
    bc.output(result)


def cmd_move_card(args):
    data = {"column_id": int(args.column)}
    path = f"/buckets/{args.project}/card_tables/cards/{args.card}/moves.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result if result else {"status": "moved"})


def cmd_move_column(args):
    data = {"source_id": int(args.source), "target_id": int(args.target)}
    if args.position is not None:
        data["position"] = int(args.position)
    path = f"/buckets/{args.project}/card_tables/{args.card_table}/moves.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result if result else {"status": "column_moved"})


def cmd_add_step(args):
    data = {"title": args.title}
    if args.due_on:
        data["due_on"] = args.due_on
    if args.assignees:
        data["assignees"] = args.assignees
    path = f"/buckets/{args.project}/card_tables/cards/{args.card}/steps.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_update_step(args):
    data = {}
    if args.title:
        data["title"] = args.title
    if args.due_on:
        data["due_on"] = args.due_on
    if args.assignees:
        data["assignees"] = args.assignees
    path = f"/buckets/{args.project}/card_tables/steps/{args.step}.json"
    result = bc.api_request("PUT", path, data=data)
    bc.output(result)


def cmd_complete_step(args):
    completion = "on" if not args.undo else "off"
    data = {"completion": completion}
    path = f"/buckets/{args.project}/card_tables/steps/{args.step}/completions.json"
    result = bc.api_request("PUT", path, data=data)
    bc.output(result)


def cmd_reposition_step(args):
    data = {"source_id": int(args.step), "position": int(args.position)}
    path = f"/buckets/{args.project}/card_tables/cards/{args.card}/positions.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result if result else {"status": "step_repositioned"})


def cmd_on_hold(args):
    path = f"/buckets/{args.project}/card_tables/columns/{args.column}/on_hold.json"
    if args.remove:
        result = bc.api_request("DELETE", path)
        bc.output(result if result else {"status": "on_hold_removed"})
    else:
        result = bc.api_request("POST", path)
        bc.output(result if result else {"status": "on_hold_added"})


def main():
    parser = argparse.ArgumentParser(description="Basecamp card table (kanban board)")
    sub = parser.add_subparsers(dest="command", required=True)

    p_get = sub.add_parser("get", help="Get a card table board")
    p_get.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_get.add_argument("--card-table", dest="card_table", required=True, help="Card table ID")
    p_get.add_argument("--no-cards", dest="no_cards", action="store_true", help="Only fetch board structure, skip card fetching")

    p_cc = sub.add_parser("create-column", help="Create a column")
    p_cc.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_cc.add_argument("--card-table", dest="card_table", required=True, help="Card table ID")
    p_cc.add_argument("--title", required=True, help="Column title")
    p_cc.add_argument("--color", help="Column color (white, red, orange, yellow, green, blue, aqua, purple, gray, pink, brown)")

    p_uc = sub.add_parser("update-column", help="Update a column title")
    p_uc.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_uc.add_argument("--column", required=True, help="Column ID")
    p_uc.add_argument("--title", help="New column title")
    p_uc.add_argument("--description", help="New column description")

    p_sc = sub.add_parser("set-column-color", help="Set a column color")
    p_sc.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_sc.add_argument("--column", required=True, help="Column ID")
    p_sc.add_argument("--color", required=True, help="Color name (white, red, orange, yellow, green, blue, aqua, purple, gray, pink, brown)")

    p_lc = sub.add_parser("list-cards", help="List cards in a column")
    p_lc.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_lc.add_argument("--column", required=True, help="Column (list) ID")
    p_lc.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_gc = sub.add_parser("get-card", help="Get a card by ID")
    p_gc.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_gc.add_argument("--card", required=True, help="Card ID")

    p_createcard = sub.add_parser("create-card", help="Create a card in a column")
    p_createcard.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_createcard.add_argument("--column", required=True, help="Column (list) ID")
    p_createcard.add_argument("--title", required=True, help="Card title")
    p_createcard.add_argument("--content", help="Card description (HTML)")
    p_createcard.add_argument("--due-on", dest="due_on", help="Due date (YYYY-MM-DD)")
    p_createcard.add_argument("--assignee-ids", dest="assignee_ids", help="Comma-separated person IDs")
    p_createcard.add_argument("--notify", action="store_true", help="Notify assignees")

    p_updatecard = sub.add_parser("update-card", help="Update a card")
    p_updatecard.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_updatecard.add_argument("--card", required=True, help="Card ID")
    p_updatecard.add_argument("--title", help="New card title")
    p_updatecard.add_argument("--content", help="New description (HTML)")
    p_updatecard.add_argument("--due-on", dest="due_on", help="New due date (YYYY-MM-DD)")
    p_updatecard.add_argument("--assignee-ids", dest="assignee_ids", help="Comma-separated person IDs")

    p_move = sub.add_parser("move-card", help="Move a card to a different column")
    p_move.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_move.add_argument("--card", required=True, help="Card ID")
    p_move.add_argument("--column", required=True, help="Destination column ID")

    p_mc = sub.add_parser("move-column", help="Reorder columns on the board")
    p_mc.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_mc.add_argument("--card-table", dest="card_table", required=True, help="Card table ID")
    p_mc.add_argument("--source", required=True, help="Column ID to move")
    p_mc.add_argument("--target", required=True, help="Column ID to place relative to")
    p_mc.add_argument("--position", type=int, default=None, help="Position (default: 1)")

    p_as = sub.add_parser("add-step", help="Add a checklist step to a card")
    p_as.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_as.add_argument("--card", required=True, help="Card ID")
    p_as.add_argument("--title", required=True, help="Step title")
    p_as.add_argument("--due-on", dest="due_on", help="Due date (YYYY-MM-DD)")
    p_as.add_argument("--assignees", help="Comma-separated person IDs")

    p_us = sub.add_parser("update-step", help="Update a checklist step")
    p_us.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_us.add_argument("--step", required=True, help="Step ID")
    p_us.add_argument("--title", help="New step title")
    p_us.add_argument("--due-on", dest="due_on", help="New due date (YYYY-MM-DD)")
    p_us.add_argument("--assignees", help="Comma-separated person IDs")

    p_cs = sub.add_parser("complete-step", help="Complete or uncomplete a step")
    p_cs.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_cs.add_argument("--step", required=True, help="Step ID")
    p_cs.add_argument("--undo", action="store_true", help="Uncomplete instead of complete")

    p_rs = sub.add_parser("reposition-step", help="Reorder a step within a card")
    p_rs.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_rs.add_argument("--card", required=True, help="Card ID")
    p_rs.add_argument("--step", required=True, help="Step ID to move")
    p_rs.add_argument("--position", required=True, type=int, help="New position (0-indexed)")

    p_oh = sub.add_parser("on-hold", help="Add or remove on-hold section from a column")
    p_oh.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_oh.add_argument("--column", required=True, help="Column ID")
    p_oh.add_argument("--remove", action="store_true", help="Remove on-hold section (default: add)")

    args = parser.parse_args()
    if hasattr(args, 'project') and args.project is None:
        args.project = bc.resolve_project(args.project)
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
        "move-column": cmd_move_column,
        "add-step": cmd_add_step,
        "update-step": cmd_update_step,
        "complete-step": cmd_complete_step,
        "reposition-step": cmd_reposition_step,
        "on-hold": cmd_on_hold,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
