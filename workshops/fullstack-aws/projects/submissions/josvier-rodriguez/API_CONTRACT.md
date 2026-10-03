# NoticeBoard API Contract

This contract is the integration boundary between the React frontend and the AWS Lambda backend.

Changes to this document should be intentional because future frontend/backend work will depend on it.

## Base URL

Local/development:

```text
VITE_API_URL=<base URL>
```

AWS:

```text
https://<api-id>.execute-api.<region>.amazonaws.com
```

No trailing slash is required.

## Content type

Requests with a body:

```http
Content-Type: application/json
```

Responses are JSON except HTTP 204 responses.

## Notice resource

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "AWS Workshop Update",
  "content": "Complete the Lambda exercise.",
  "cohort": "Full-Stack AWS 28-Sep-2026",
  "dueDate": "2026-10-05",
  "createdAt": "2026-10-03T17:00:00Z",
  "updatedAt": "2026-10-03T17:00:00Z"
}
```

Required on create:

- `title`
- `content`

Optional:

- `cohort`
- `dueDate`

Server-owned:

- `_id`
- `createdAt`
- `updatedAt`

## GET /health

Response: **200**

```json
{
  "status": "ok"
}
```

## GET /notices

Response: **200**

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "title": "AWS Workshop Update",
    "content": "Complete the Lambda exercise.",
    "cohort": "Full-Stack AWS 28-Sep-2026",
    "dueDate": "2026-10-05",
    "createdAt": "2026-10-03T17:00:00Z",
    "updatedAt": "2026-10-03T17:00:00Z"
  }
]
```

Empty board:

```json
[]
```

## GET /notices/{id}

Success: **200**

Missing valid ObjectId: **404**

```json
{
  "error": "Notice not found"
}
```

Malformed ObjectId: **400**

```json
{
  "error": "Invalid notice id"
}
```

## POST /notices

Request:

```json
{
  "title": "AWS Workshop Update",
  "content": "Complete the Lambda exercise.",
  "cohort": "Full-Stack AWS 28-Sep-2026",
  "dueDate": "2026-10-05"
}
```

Success: **201**

Returns the created Notice resource.

Validation failure: **400**

```json
{
  "error": "Validation failed",
  "details": {
    "title": "title is required"
  }
}
```

## PUT /notices/{id}

Partial updates are allowed.

Request:

```json
{
  "title": "Updated title"
}
```

Success: **200**

Returns the updated Notice resource.

Missing resource: **404**.

Malformed id or invalid payload: **400**.

## DELETE /notices/{id}

Success: **200**

```json
{
  "message": "Notice deleted successfully"
}
```

Missing resource: **404**.

Malformed id: **400**.

## Generic server/database failure

Response: **500**

Database failure:

```json
{
  "error": "Database operation failed"
}
```

Unexpected failure:

```json
{
  "error": "Internal server error"
}
```

Internal exception messages, stack traces, credentials, connection strings, and infrastructure details must never be returned to the client.

## Field validation

### title

- string
- trimmed
- required on POST
- non-empty
- maximum 120 characters

### content

- string
- trimmed
- required on POST
- non-empty
- maximum 5000 characters

### cohort

- optional string
- trimmed
- maximum 120 characters
- blank value is persisted as `null`

### dueDate

- optional
- `YYYY-MM-DD`
- blank value is persisted as `null`

Unknown request fields are rejected with HTTP 400.
