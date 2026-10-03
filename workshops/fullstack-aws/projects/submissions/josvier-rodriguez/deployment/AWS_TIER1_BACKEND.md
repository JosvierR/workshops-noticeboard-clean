# NoticeBoard AWS Tier 1 backend

Docker Compose and FastAPI remain local development tools. This document describes the deployed Tier 1 backend.

## MongoDB Atlas

| Item | Value |
| --- | --- |
| Organization | Josvier's Org - 2025-03-12 (`67d1f3c8d8d20442e1647c64`) |
| Project | NoticeBoard-AWS-Challenge |
| Project ID | `6ac18c58242d01f14013e7bc` |
| Cluster | NoticeBoardCluster |
| Provider | AWS |
| Region | US_EAST_1 |
| Tier | M0 |
| Database | `noticeboard_db` |
| Collection | `notices` |
| Database role | `readWrite` on `noticeboard_db` |
| Network access | `0.0.0.0/0` |

`0.0.0.0/0` is a workshop/demo choice because this Lambda is not in a VPC and has no stable outbound IP. It is not a production networking recommendation. Access still depends on a dedicated database user, a strong password, and the `readWrite` role scoped to `noticeboard_db`. The MongoDB URI is stored only as the Lambda environment variable `MONGO_URI`.

## AWS

| Item | Value |
| --- | --- |
| Account | `279249498881` |
| Region | `us-east-1` |
| Lambda | NoticeBoardBackend |
| Runtime | Python 3.12 |
| Architecture | x86_64 |
| Handler | `lambda_function.lambda_handler` |
| Memory | 256 MB |
| Timeout | 10 seconds |
| Role | `arn:aws:iam::279249498881:role/quicklabs-fullstack-aws-28sep-batch-a-lambda-exec` |
| API | NoticeBoardAPI |
| API ID | `ybemxlautd` |
| API type | HTTP API |
| Stage | `$default` (auto deploy) |
| Integration | AWS_PROXY, payload format 2.0 |
| Invoke URL | `https://ybemxlautd.execute-api.us-east-1.amazonaws.com` |

Routes, all using the same Lambda:

- `GET /health`
- `GET /notices`
- `GET /notices/{id}`
- `POST /notices`
- `PUT /notices/{id}`
- `DELETE /notices/{id}`

API Gateway CORS allows `http://localhost:5173` and `http://127.0.0.1:5173`, methods `GET`, `POST`, `PUT`, `DELETE`, and `OPTIONS`, and the `Content-Type` header. Credentials are not allowed. Tighten this list again when the CloudFront origin exists.

## Build the Lambda package

From the submission directory, on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File backend/scripts/build_lambda.ps1
```

The script installs `backend/requirements.txt` inside `python:3.12-slim` and writes `backend/_build/noticeboard-lambda.zip`. The zip root contains `lambda_function.py` and `app/`. FastAPI, uvicorn, httpx, and pytest are not included. `backend/_build/` is gitignored.

## Update the deployed function

```powershell
$env:AWS_PROFILE = "becloudready"
$env:AWS_REGION = "us-east-1"
powershell -ExecutionPolicy Bypass -File scripts/deploy_lambda.ps1
```

The deploy script rebuilds the zip and updates Lambda code. It does not contain credentials. If `MONGO_URI` is already set in the current process, it also updates the Lambda environment and deletes the temporary env file. Do not print that variable.

## Smoke test

```bash
API_BASE_URL=https://ybemxlautd.execute-api.us-east-1.amazonaws.com bash scripts/aws_backend_smoke_test.sh
```

## Point the local React app at AWS

Create ignored `frontend/.env`:

```text
VITE_API_URL=https://ybemxlautd.execute-api.us-east-1.amazonaws.com
```

Then run `npm run dev` in `frontend`. Do not commit `frontend/.env`.
