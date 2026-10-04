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
pip install -r requirements-dev.txt
pytest
```

`requirements.txt` is the Lambda runtime package. `requirements-dev.txt` adds pytest, FastAPI, uvicorn, and httpx for local tests only.

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

For the local API adapter, set:

```text
VITE_API_URL=http://localhost:8000
```

For AWS, use the API Gateway invoke URL.

Production build:

```bash
npm run build
```

The `dist/` directory is the static artifact for S3. Do not commit `dist/`.

## Local Development with Docker

Docker Compose and FastAPI are used only for local development and integration testing.

The required production architecture remains:

```text
React/S3/CloudFront
  -> API Gateway
  -> AWS Lambda (lambda_function.lambda_handler)
  -> MongoDB Atlas
```

Local architecture:

```text
Browser
  -> React / Vite (http://localhost:5173)
  -> local FastAPI adapter (http://localhost:8000)
  -> MongoDB (mongo:27017, database noticeboard_db)
```

The FastAPI process is not a replacement for Lambda. `backend/local_app.py` calls the existing notice functions in `backend/app/`. The Lambda handler stays `lambda_function.lambda_handler`.

From a fresh clone:

```bash
git clone https://github.com/JosvierR/workshops-noticeboard-clean.git
cd workshops
git checkout challenge/notice-board
cd workshops/fullstack-aws/projects/submissions/josvier-rodriguez
docker compose up --build
```

Then open:

| Surface | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| Health | http://localhost:8000/health |
| Notices | http://localhost:8000/notices |

`VITE_API_URL` is `http://localhost:8000` because the React code runs in the browser. The Compose hostname `backend` is reachable only from other containers, so the browser uses the published localhost port.

Useful commands from this directory:

```bash
make install   # Python dev dependencies and frontend npm ci
make test      # backend pytest
make build     # frontend production build and docker compose build
make up        # docker compose up -d
make smoke     # HTTP API smoke test against localhost:8000
make verify    # tests, production build, compose, smoke, and Mongo persistence
make down      # stop containers; keeps the Mongo volume
make logs      # latest container logs
make ps        # docker compose ps
make clean     # stop containers and remove orphans; keeps noticeboard_mongo_data
```

`make down` and `make clean` do not delete the `noticeboard_mongo_data` volume.

MongoDB is not published on the host. The backend reaches it at `mongodb://mongo:27017`. Backend startup waits until Mongo's healthcheck passes.

## AWS Tier 1 Backend

Docker Compose and FastAPI stay local-only. The deployed backend is:

```text
Browser / HTTP client
  -> API Gateway HTTP API
  -> AWS Lambda Python 3.12
  -> MongoDB Atlas
```

| Item | Value |
| --- | --- |
| AWS account ID | `279249498881` |
| Region | `us-east-1` |
| Lambda | NoticeBoardBackend |
| Runtime | Python 3.12 |
| Handler | `lambda_function.lambda_handler` |
| API | NoticeBoardAPI |
| Stage | `$default` |
| Database | MongoDB Atlas / `noticeboard_db` / `notices` |
| Invoke URL | `https://ybemxlautd.execute-api.us-east-1.amazonaws.com` |

Routes:

- `GET /health`
- `GET /notices`
- `GET /notices/{id}`
- `POST /notices`
- `PUT /notices/{id}`
- `DELETE /notices/{id}`

Atlas network access for this workshop is `0.0.0.0/0` because the Lambda has no fixed outbound IP. That is a demo choice, not a production recommendation. The database user is limited to `readWrite` on `noticeboard_db`. The connection string lives only in the Lambda environment.

Build, deploy, and smoke-test steps are in `deployment/AWS_TIER1_BACKEND.md`.

To point the local React app at this API, set ignored `frontend/.env`:

```text
VITE_API_URL=https://ybemxlautd.execute-api.us-east-1.amazonaws.com
```

## AWS Tier 1 — historical

Tier 1 is a completed milestone. It is not the current production frontend. The verified Tier 1 system was:

```text
Browser
  -> Amazon S3 static website
  -> API Gateway HTTP API
  -> AWS Lambda Python 3.12
  -> MongoDB Atlas
```

| Item | Value |
| --- | --- |
| Frontend | Amazon S3 static website |
| Bucket | `noticeboard-josvier-279249498881-us-east-1` |
| S3 website URL | `http://noticeboard-josvier-279249498881-us-east-1.s3-website-us-east-1.amazonaws.com` |
| Backend | API Gateway, Lambda, MongoDB Atlas |
| API URL | `https://ybemxlautd.execute-api.us-east-1.amazonaws.com` |

Routes:

- `GET /health`
- `GET /notices`
- `GET /notices/{id}`
- `POST /notices`
- `PUT /notices/{id}`
- `DELETE /notices/{id}`

Tier 1 used S3 static website hosting and public-read objects. Tier 3 superseded that with CloudFront, Origin Access Control, and a private bucket. The old S3 website is disabled.

Frontend build and upload steps are in `deployment/AWS_TIER1_FRONTEND.md`.

## Tier 2 — GitHub Actions CI/CD

Tier 2 is complete. Pushes to the deployment branch run tests, build the React app, package Lambda, and update Lambda code. Tier 3 extended that pipeline to sync the private bucket, invalidate CloudFront, and verify both CloudFront and the direct S3 denial.

| Item | Value |
| --- | --- |
| Active deployment branch | `tier2-ci-deploy` |
| Reference workflow | `github-actions/deploy.yml` |
| Active fork workflow | `.github/workflows/noticeboard-deploy.yml` on `tier2-ci-deploy` only |

```text
push
  -> backend tests
  -> frontend production build
  -> Linux Lambda package
  -> Lambda code deploy
  -> S3 sync
  -> CloudFront invalidation
  -> API smoke verification
  -> CloudFront verification
  -> direct S3 denial check
```

GitHub Actions secrets, names only:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

GitHub Actions variables:

- `AWS_REGION`
- `LAMBDA_FUNCTION_NAME`
- `S3_BUCKET_NAME`
- `VITE_API_URL`
- `CLOUDFRONT_DISTRIBUTION_ID`
- `CLOUDFRONT_URL`

The active workflow is on `tier2-ci-deploy` because the assignment requires the final upstream pull request to contain only this personal submission folder. The root `.github` file is not part of `challenge/notice-board` and must not be merged back into that branch. The reference copy in `github-actions/deploy.yml` is the submission copy.

The pipeline updates Lambda code only. It does not change the Lambda environment, so the MongoDB connection string stays out of GitHub.

Details and the successful run record are in `deployment/AWS_TIER2_CICD.md`.

## Tier 3 — Complete

The production frontend is CloudFront over HTTPS:

`https://d1s8syl3tltqh9.cloudfront.net`

S3 objects are private. Anonymous direct S3 access is denied. CloudFront uses Origin Access Control to read the bucket. The API remains `https://ybemxlautd.execute-api.us-east-1.amazonaws.com`.

Details are in `deployment/AWS_TIER3_CLOUDFRONT.md`.

## Security

Never commit real .env files, AWS credentials, MongoDB credentials, PEM/private keys, credential CSV files, Terraform state/secrets, node_modules, dist, or backend build artifacts.

## Next checkpoints

1. Run `make verify` for the local Docker stack.
2. AWS Tier 1 is deployed: S3 static website, API Gateway, Lambda, and MongoDB Atlas.
3. Tier 2 GitHub Actions deploys from `tier2-ci-deploy`.
4. Tier 3 CloudFront + OAC + private S3 is deployed.
5. Finish evidence and upstream PR.
