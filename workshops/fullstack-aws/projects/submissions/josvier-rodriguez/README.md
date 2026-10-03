# NoticeBoardTracker — Josvier Rodriguez

Weekend challenge submission for the BeCloudReady Full-Stack AWS 28-Sep-2026 cohort.

## Goal

Build and deploy a small full-stack Notice Board application for an EdTech training workflow.

Target architecture:

```text
React (Vite)
  |
  v
Amazon S3 + CloudFront (OAC/private S3)
  |
  | HTTPS REST
  v
Amazon API Gateway (HTTP API)
  |
  v
AWS Lambda (Python 3.12)
  |
  v
MongoDB Atlas
```

## Repository boundary

All challenge work lives under:

```text
workshops/fullstack-aws/projects/submissions/josvier-rodriguez/
```

Do not place final challenge deliverables outside this directory.

## API contract

| Method | Route | Success |
| --- | --- | --- |
| GET | `/health` | 200 |
| GET | `/notices` | 200 |
| GET | `/notices/{id}` | 200 |
| POST | `/notices` | 201 |
| PUT | `/notices/{id}` | 200 |
| DELETE | `/notices/{id}` | 200 |

Validation behavior:

- malformed JSON -> 400
- invalid MongoDB ObjectId -> 400
- missing notice -> 404
- unsupported route -> 404
- unexpected/database failure -> sanitized 500

## Notice model

```json
{
  "_id": "MongoDB ObjectId serialized as string",
  "title": "string",
  "content": "string",
  "cohort": "optional string",
  "dueDate": "optional YYYY-MM-DD string",
  "createdAt": "UTC ISO-8601 timestamp",
  "updatedAt": "UTC ISO-8601 timestamp"
}
```

## Backend local setup

Requirements: Python 3.12 and a MongoDB Atlas connection string.

```bash
cd backend
python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest
```

Required environment:

```text
MONGO_URI=<mongodb connection string>
MONGO_DB_NAME=noticeboard_db
```

AWS Lambda handler:

```text
lambda_function.lambda_handler
```

## Frontend local setup

Requirements: Node.js 20+ and npm.

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Set:

```text
VITE_API_URL=http://localhost:3000
```

For AWS, use the API Gateway invoke URL.

Production build:

```bash
npm run build
```

The `dist/` directory is the static artifact for S3.

## Security

Never commit real .env files, AWS credentials, MongoDB credentials, PEM/private keys, credential CSV files, Terraform state/secrets, node_modules, dist, or backend build artifacts.

## Next checkpoints

1. Verify backend tests locally.
2. Verify frontend build locally.
3. Create MongoDB Atlas.
4. Deploy Lambda.
5. Configure API Gateway routes/CORS.
6. Connect React to deployed API.
7. Deploy frontend to S3.
8. Verify Tier 1 CRUD and persistence.
9. Add Tier 2 CI/CD.
10. Add Tier 3 CloudFront + OAC/private S3.
11. Finish evidence and upstream PR.
