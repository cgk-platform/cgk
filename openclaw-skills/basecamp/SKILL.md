---
name: basecamp
description: >
  Complete Basecamp 4 REST API integration for project management, task tracking,
  kanban boards, messaging, scheduling, documents, and team coordination.
  Read for ANY Basecamp or project management work.
complexity: complex
allowed-tools:
  - exec
  - message
  - read
  - write
triggers:
  - basecamp
  - project management
  - todo list
  - task tracking
  - schedule entry
  - campfire
  - card table
  - kanban board
  - check-in
  - project status
  - message board
metadata:
  openclaw:
    emoji: 'anchor'
    requires:
      env:
        - BASECAMP_ACCOUNT_ID
        - BASECAMP_ACCESS_TOKEN
        - BASECAMP_USER_AGENT
---

# Basecamp Skill

Complete Basecamp 4 API integration. Covers projects, todos, messages, campfire, schedules, card tables (kanban), documents, people, comments, webhooks, check-ins, recordings, subscriptions, and boosts.

## Quick Start

All scripts are in `scripts/` and output JSON. Each module is standalone -- import `basecamp_api` for the shared client.

### Environment Variables (per-profile .env)

- `BASECAMP_ACCOUNT_ID` -- Numeric account ID from Basecamp URL
- `BASECAMP_ACCESS_TOKEN` -- OAuth 2.0 Bearer token (auto-refreshed via cron)
- `BASECAMP_USER_AGENT` -- Required by API (e.g., "openCLAW (admin@example.com)")
- `BASECAMP_REFRESH_TOKEN` -- OAuth refresh token (10-year expiry)
- `BASECAMP_CLIENT_ID` -- OAuth app client ID
- `BASECAMP_CLIENT_SECRET` -- OAuth app client secret
- `BASECAMP_DEFAULT_PROJECT` -- Default project ID (used when `--project` is omitted)
- `BASECAMP_DEFAULT_CARD_TABLE` -- Default card table ID for quick board access

### Usage Examples

```bash
# List all projects
python3 scripts/projects.py list

# Get a specific project
python3 scripts/projects.py get 12345

# Create a project
python3 scripts/projects.py create --name "Q1 Launch" --description "Launch campaign"

# List todos in a project
python3 scripts/todos.py list --project 12345 --todolist 67890

# Create a todo
python3 scripts/todos.py create --project 12345 --todolist 67890 --content "Design landing page" --due-on 2026-03-15

# Complete a todo
python3 scripts/todos.py complete --project 12345 --todo 11111

# Get card table (kanban board)
python3 scripts/card_table.py get --project 12345 --card-table 99999

# Create a card
python3 scripts/card_table.py create-card --project 12345 --column 88888 --title "New feature" --due-on 2026-04-01

# Move a card to a different column
python3 scripts/card_table.py move-card --project 12345 --card 77777 --column 66666

# Reorder columns on the board
python3 scripts/card_table.py move-column --project 12345 --card-table 99999 --source 11111 --target 22222 --position 1

# Add a checklist step to a card
python3 scripts/card_table.py add-step --project 12345 --card 77777 --title "Review copy" --due-on 2026-04-01

# Complete a step
python3 scripts/card_table.py complete-step --project 12345 --step 55555

# Add/remove on-hold section from a column
python3 scripts/card_table.py on-hold --project 12345 --column 88888
python3 scripts/card_table.py on-hold --project 12345 --column 88888 --remove

# Post a campfire message
python3 scripts/campfire.py post --project 12345 --campfire 12345 --content "Team standup starting!"

# Create a schedule entry
python3 scripts/schedule.py create --project 12345 --schedule 12345 --summary "Sprint Review" --starts-at 2026-03-10T14:00:00Z --ends-at 2026-03-10T15:00:00Z

# Search recordings
python3 scripts/recordings.py search --query "launch" --type Todo

# Add a comment
python3 scripts/comments.py create --project 12345 --recording 44444 --content "Looks good, ship it!"
```

## API Coverage

| Module        | Operations                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| projects      | list, get, create, update, trash                                                                                                                                                            |
| todos         | list, get, create, update, complete, uncomplete, reposition                                                                                                                                 |
| messages      | list, get, create, update                                                                                                                                                                   |
| campfire      | list, get, post, delete                                                                                                                                                                     |
| schedule      | get, list-entries, create, update                                                                                                                                                           |
| card_table    | get, create-column, update-column, set-column-color, list-cards, get-card, create-card, update-card, move-card, move-column, add-step, update-step, complete-step, reposition-step, on-hold |
| documents     | list, get, create, update                                                                                                                                                                   |
| people        | list, list-project, get, me, update-access                                                                                                                                                  |
| comments      | list, create, update                                                                                                                                                                        |
| webhooks      | list, get, create, update, destroy                                                                                                                                                          |
| checkins      | get-questionnaire, list-questions, create-question, list-answers, create-answer, get-answer                                                                                                 |
| recordings    | search, archive, trash, restore                                                                                                                                                             |
| subscriptions | get, subscribe, unsubscribe, update                                                                                                                                                         |
| boosts        | list, get, create, destroy                                                                                                                                                                  |

## Rate Limiting

Basecamp returns 429 with `Retry-After` header. The client auto-retries with exponential backoff (max 3 retries).

## Pagination

All list endpoints support pagination via Link header (RFC 5988). Pass `--all` to auto-paginate.
