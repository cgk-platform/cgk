# Basecamp 4 API Endpoints Quick Reference

Base URL: `https://3.basecampapi.com/{ACCOUNT_ID}`

## Projects

| Method | Endpoint              | Description       |
| ------ | --------------------- | ----------------- |
| GET    | `/projects.json`      | List all projects |
| GET    | `/projects/{id}.json` | Get a project     |
| POST   | `/projects.json`      | Create a project  |
| PUT    | `/projects/{id}.json` | Update a project  |
| DELETE | `/projects/{id}.json` | Trash a project   |

## Todos

| Method | Endpoint                                        | Description   |
| ------ | ----------------------------------------------- | ------------- |
| GET    | `/buckets/{project}/todolists/{id}/todos.json`  | List todos    |
| GET    | `/buckets/{project}/todos/{id}.json`            | Get a todo    |
| POST   | `/buckets/{project}/todolists/{id}/todos.json`  | Create a todo |
| PUT    | `/buckets/{project}/todos/{id}.json`            | Update a todo |
| POST   | `/buckets/{project}/todos/{id}/completion.json` | Complete      |
| DELETE | `/buckets/{project}/todos/{id}/completion.json` | Uncomplete    |

## Messages

| Method | Endpoint                                               | Description |
| ------ | ------------------------------------------------------ | ----------- |
| GET    | `/buckets/{project}/message_boards/{id}/messages.json` | List        |
| GET    | `/buckets/{project}/messages/{id}.json`                | Get         |
| POST   | `/buckets/{project}/message_boards/{id}/messages.json` | Create      |
| PUT    | `/buckets/{project}/messages/{id}.json`                | Update      |

## Campfire

| Method | Endpoint                                   | Description    |
| ------ | ------------------------------------------ | -------------- |
| GET    | `/buckets/{project}/chats.json`            | List campfires |
| GET    | `/buckets/{project}/chats/{id}.json`       | Get campfire   |
| POST   | `/buckets/{project}/chats/{id}/lines.json` | Post line      |
| DELETE | `/buckets/{project}/chats/lines/{id}.json` | Delete line    |

## Schedule

| Method | Endpoint                                         | Description  |
| ------ | ------------------------------------------------ | ------------ |
| GET    | `/buckets/{project}/schedules/{id}.json`         | Get schedule |
| GET    | `/buckets/{project}/schedules/{id}/entries.json` | List entries |
| POST   | `/buckets/{project}/schedules/{id}/entries.json` | Create entry |
| PUT    | `/buckets/{project}/schedule_entries/{id}.json`  | Update entry |

## Card Tables (Kanban)

| Method | Endpoint                                                 | Description   |
| ------ | -------------------------------------------------------- | ------------- |
| GET    | `/buckets/{project}/card_tables/{id}.json`               | Get board     |
| POST   | `/buckets/{project}/card_tables/{id}/columns.json`       | Create column |
| PUT    | `/buckets/{project}/card_tables/columns/{id}.json`       | Update column |
| PUT    | `/buckets/{project}/card_tables/columns/{id}/color.json` | Set color     |
| GET    | `/buckets/{project}/card_tables/lists/{id}/cards.json`   | List cards    |
| GET    | `/buckets/{project}/card_tables/cards/{id}.json`         | Get card      |
| POST   | `/buckets/{project}/card_tables/lists/{id}/cards.json`   | Create card   |
| PUT    | `/buckets/{project}/card_tables/cards/{id}.json`         | Update card   |
| POST   | `/buckets/{project}/card_tables/cards/{id}/moves.json`   | Move card     |

## Documents

| Method | Endpoint                                        | Description |
| ------ | ----------------------------------------------- | ----------- |
| GET    | `/buckets/{project}/vaults/{id}/documents.json` | List        |
| GET    | `/buckets/{project}/documents/{id}.json`        | Get         |
| POST   | `/buckets/{project}/vaults/{id}/documents.json` | Create      |
| PUT    | `/buckets/{project}/documents/{id}.json`        | Update      |

## People

| Method | Endpoint                           | Description     |
| ------ | ---------------------------------- | --------------- |
| GET    | `/people.json`                     | List all        |
| GET    | `/projects/{id}/people.json`       | List by project |
| GET    | `/people/{id}.json`                | Get person      |
| GET    | `/my/profile.json`                 | Get me          |
| PUT    | `/projects/{id}/people/users.json` | Update access   |

## Comments

| Method | Endpoint                                           | Description |
| ------ | -------------------------------------------------- | ----------- |
| GET    | `/buckets/{project}/recordings/{id}/comments.json` | List        |
| POST   | `/buckets/{project}/recordings/{id}/comments.json` | Create      |
| PUT    | `/buckets/{project}/comments/{id}.json`            | Update      |

## Webhooks

| Method | Endpoint                                | Description |
| ------ | --------------------------------------- | ----------- |
| GET    | `/buckets/{project}/webhooks.json`      | List        |
| GET    | `/buckets/{project}/webhooks/{id}.json` | Get         |
| POST   | `/buckets/{project}/webhooks.json`      | Create      |
| PUT    | `/buckets/{project}/webhooks/{id}.json` | Update      |
| DELETE | `/buckets/{project}/webhooks/{id}.json` | Destroy     |

## Check-ins

| Method | Endpoint                                                | Description       |
| ------ | ------------------------------------------------------- | ----------------- |
| GET    | `/buckets/{project}/questionnaires/{id}.json`           | Get questionnaire |
| GET    | `/buckets/{project}/questionnaires/{id}/questions.json` | List questions    |
| POST   | `/buckets/{project}/questionnaires/{id}/questions.json` | Create question   |
| GET    | `/buckets/{project}/questions/{id}/answers.json`        | List answers      |
| POST   | `/buckets/{project}/questions/{id}/answers.json`        | Create answer     |
| GET    | `/buckets/{project}/question_answers/{id}.json`         | Get answer        |

## Recordings

| Method | Endpoint                                                  | Description |
| ------ | --------------------------------------------------------- | ----------- |
| GET    | `/projects/recordings.json`                               | Search      |
| PUT    | `/buckets/{project}/recordings/{id}/status/archived.json` | Archive     |
| PUT    | `/buckets/{project}/recordings/{id}/status/trashed.json`  | Trash       |
| PUT    | `/buckets/{project}/recordings/{id}/status/active.json`   | Restore     |

## Subscriptions

| Method | Endpoint                                               | Description |
| ------ | ------------------------------------------------------ | ----------- |
| GET    | `/buckets/{project}/recordings/{id}/subscription.json` | Get         |
| POST   | `/buckets/{project}/recordings/{id}/subscription.json` | Subscribe   |
| DELETE | `/buckets/{project}/recordings/{id}/subscription.json` | Unsubscribe |
| PUT    | `/buckets/{project}/recordings/{id}/subscription.json` | Update      |

## Boosts

| Method | Endpoint                                         | Description |
| ------ | ------------------------------------------------ | ----------- |
| GET    | `/buckets/{project}/recordings/{id}/boosts.json` | List        |
| GET    | `/buckets/{project}/boosts/{id}.json`            | Get         |
| POST   | `/buckets/{project}/recordings/{id}/boosts.json` | Create      |
| DELETE | `/buckets/{project}/boosts/{id}.json`            | Destroy     |

## Auth & Headers

- `Authorization: Bearer {TOKEN}` (required)
- `User-Agent: AppName (email)` (required by Basecamp)
- Rate limit: 429 + `Retry-After` header
- Pagination: `Link` header with `rel="next"` (RFC 5988)
