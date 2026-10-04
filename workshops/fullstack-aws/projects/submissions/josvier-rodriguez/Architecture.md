# Architecture

Production frontend: `https://d1s8syl3tltqh9.cloudfront.net`

The browser loads the React app from CloudFront. CloudFront reads the private bucket with Origin Access Control. API calls go from the browser to API Gateway, then Lambda and MongoDB Atlas. CloudWatch keeps 14 days of Lambda logs, two alarms, and the operations dashboard.

The React application presents the data as Training Pulse. `App` owns remote
and discovery state; `noticePriority.js` derives local-calendar priority without
persisting presentation fields; and the API continues to own ordinary notice
CRUD plus the backward-compatible `pinned` boolean. No AWS container or network
path changed for this product release.

## Documentation

- [C4 architecture](docs/architecture/C4_ARCHITECTURE.md)
- [Tier 1 backend](deployment/AWS_TIER1_BACKEND.md)
- [Tier 1 frontend, historical](deployment/AWS_TIER1_FRONTEND.md)
- [Tier 2 CI/CD](deployment/AWS_TIER2_CICD.md)
- [Tier 3 CloudFront](deployment/AWS_TIER3_CLOUDFRONT.md)
- [Tier 4 observability](deployment/AWS_TIER4_OBSERVABILITY.md)
- [Operations runbook](deployment/OPERATIONS_RUNBOOK.md)
- [Final evidence](deployment/FINAL_EVIDENCE.md)

## Local development

Docker Compose and FastAPI are for local development and integration testing only.

```text
Browser
  -> React / Vite (http://localhost:5173)
  -> FastAPI adapter (http://localhost:8000)
  -> local MongoDB (noticeboard_db)
```

`backend/local_app.py` calls the existing notice functions. It is not the production handler.

## AWS Tier 1 — historical

Tier 1 served the frontend from a public S3 static website. That path is retired.

```text
Browser
  -> S3 static website
  -> API Gateway HTTP API (NoticeBoardAPI)
  -> AWS Lambda Python 3.12 (lambda_function.lambda_handler)
  -> MongoDB Atlas (noticeboard_db)
```

That public-read website was only the Tier 1 checkpoint. Tier 3 replaced it with CloudFront, Origin Access Control, and a private bucket.

The Lambda reads `MONGO_URI` and `MONGO_DB_NAME` from its environment. Those values are not stored in source control.

## CI/CD

GitHub Actions on `tier2-ci-deploy` deploys Lambda code and the private frontend, then invalidates CloudFront.

```text
GitHub push
     |
     v
GitHub Actions
     |
     +--> pytest
     |
     +--> React build
     |
     +--> Lambda package
     |
     +--> update Lambda code
     |
     +--> sync private S3
     |
     +--> CloudFront invalidation
     |
     +--> API smoke test
```

## Tier 3 — current production

```text
Browser
   |
   | HTTPS
   v
CloudFront
   |
   | OAC / SigV4
   v
Private S3

Browser
   |
   | HTTPS API calls
   v
API Gateway
   |
   v
Lambda
   |
   v
MongoDB Atlas

GitHub Actions
   |
   +--> Lambda code
   |
   +--> private S3 objects
   |
   +--> CloudFront invalidation
```

## Current deployed architecture

```text
Browser
  -> CloudFront
  -> private S3 via Origin Access Control

REST calls:
Browser
  -> API Gateway HTTP API
  -> AWS Lambda Python 3.12
  -> MongoDB Atlas
```

```text
+-------------------+
|  Client Browser   |
+---------+---------+
          |
          | HTTPS
          v
+-------------------+
|    CloudFront     |
| CDN + TLS + OAC   |
+---------+---------+
          |
          v
+-------------------+
|    Private S3     |
| React static app  |
+-------------------+

Browser REST calls:
          |
          | HTTPS /notices
          v
+-------------------+
| API Gateway HTTP  |
|       API         |
+---------+---------+
          |
          v
+-------------------+
| AWS Lambda        |
| Python 3.12       |
+---------+---------+
          |
          | MONGO_URI
          v
+-------------------+
| MongoDB Atlas     |
| noticeboard_db    |
+-------------------+
```

## POST /notices flow

1. React validates title/content and sends the optional `pinned` boolean.
2. Browser sends JSON to API Gateway.
3. API Gateway invokes Lambda.
4. Lambda parses and validates the request.
5. Lambda inserts the notice into MongoDB Atlas.
6. MongoDB returns the inserted ObjectId.
7. Lambda serializes the resource and returns HTTP 201.
8. React inserts the successful response into its prioritized Training Pulse.

## Design decisions

- Lambda stays stateless; the MongoDB client is reusable across warm invocations.
- API Gateway is the public HTTP entry point.
- MongoDB Atlas persists data outside Lambda.
- S3 hosts the compiled React build.
- CloudFront + OAC is the final Tier 3 access path so S3 can remain private.
- Deployment-specific values are injected through environment variables/secrets.
