#!/usr/bin/env python3
"""Basecamp check-ins -- questionnaires, questions, answers."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import basecamp_api as bc


def cmd_get_questionnaire(args):
    path = f"/buckets/{args.project}/questionnaires/{args.questionnaire}.json"
    result = bc.api_request("GET", path)
    bc.output(result)


def cmd_list_questions(args):
    path = f"/buckets/{args.project}/questionnaires/{args.questionnaire}/questions.json"
    result = bc.api_request("GET", path, paginate=getattr(args, "all", False))
    bc.output(result)


def cmd_create_question(args):
    data = {
        "title": args.title,
        "schedule": {
            "day": args.schedule_day,
            "hour": int(args.schedule_hour),
        },
    }
    path = f"/buckets/{args.project}/questionnaires/{args.questionnaire}/questions.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_get_question(args):
    path = f"/buckets/{args.project}/questions/{args.question}.json"
    result = bc.api_request("GET", path)
    bc.output(result)


def cmd_list_answers(args):
    path = f"/buckets/{args.project}/questions/{args.question}/answers.json"
    result = bc.api_request("GET", path, paginate=getattr(args, "all", False))
    bc.output(result)


def cmd_create_answer(args):
    data = {"content": args.content}
    path = f"/buckets/{args.project}/questions/{args.question}/answers.json"
    result = bc.api_request("POST", path, data=data)
    bc.output(result)


def cmd_get_answer(args):
    path = f"/buckets/{args.project}/question_answers/{args.answer}.json"
    result = bc.api_request("GET", path)
    bc.output(result)


def main():
    parser = argparse.ArgumentParser(description="Basecamp check-ins")
    sub = parser.add_subparsers(dest="command", required=True)

    p_gq = sub.add_parser("get-questionnaire", help="Get a questionnaire")
    p_gq.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_gq.add_argument("--questionnaire", required=True, help="Questionnaire ID")

    p_lq = sub.add_parser("list-questions", help="List questions in a questionnaire")
    p_lq.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_lq.add_argument("--questionnaire", required=True, help="Questionnaire ID")
    p_lq.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_cq = sub.add_parser("create-question", help="Create a check-in question")
    p_cq.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_cq.add_argument("--questionnaire", required=True, help="Questionnaire ID")
    p_cq.add_argument("--title", required=True, help="Question text")
    p_cq.add_argument("--schedule-day", dest="schedule_day", required=True,
                      help="Day to ask (monday, tuesday, wednesday, thursday, friday, or every_day)")
    p_cq.add_argument("--schedule-hour", dest="schedule_hour", required=True,
                      help="Hour to ask (0-23)")

    p_getq = sub.add_parser("get-question", help="Get a question by ID")
    p_getq.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_getq.add_argument("--question", required=True, help="Question ID")

    p_la = sub.add_parser("list-answers", help="List answers to a question")
    p_la.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_la.add_argument("--question", required=True, help="Question ID")
    p_la.add_argument("--all", action="store_true", help="Auto-paginate all results")

    p_ca = sub.add_parser("create-answer", help="Submit an answer to a question")
    p_ca.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_ca.add_argument("--question", required=True, help="Question ID")
    p_ca.add_argument("--content", required=True, help="Answer content (HTML)")

    p_ga = sub.add_parser("get-answer", help="Get a specific answer by ID")
    p_ga.add_argument("--project", default=None, help="Project (bucket) ID (default: BASECAMP_DEFAULT_PROJECT)")
    p_ga.add_argument("--answer", required=True, help="Answer ID")

    args = parser.parse_args()
    if hasattr(args, 'project') and args.project is None:
        args.project = bc.resolve_project(args.project)
    dispatch = {
        "get-questionnaire": cmd_get_questionnaire,
        "list-questions": cmd_list_questions,
        "create-question": cmd_create_question,
        "get-question": cmd_get_question,
        "list-answers": cmd_list_answers,
        "create-answer": cmd_create_answer,
        "get-answer": cmd_get_answer,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
