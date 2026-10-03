# Architecture

## Local development

Docker Compose and FastAPI are for local development and integration testing only.

```text
Browser
  -> React / Vite (http://localhost:5173)
  -> FastAPI adapter (http://localhost:8000)
  -> local MongoDB (noticeboard_db)
```

`backend/local_app.py` calls the existing notice functions. It is not the production handler.

## AWS Tier 1

The frontend is an S3 static website. The page calls the API over HTTPS.

```text
Browser
  -> S3 static website
  -> API Gateway HTTP API (NoticeBoardAPI)
  -> AWS Lambda Python 3.12 (lambda_function.lambda_handler)
  -> MongoDB Atlas (noticeboard_db)
```

Tier 1 allows public `s3:GetObject` on the website bucket so the browser can load the files. That public-read website hosting is temporary. Tier 3 replaces it with CloudFront, Origin Access Control, and a private bucket.

The Lambda reads `MONGO_URI` and `MONGO_DB_NAME` from its environment. Those values are not stored in source control.

## CI/CD

GitHub Actions on `tier2-ci-deploy` ships the same runtime. It does not change the request path below.

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
     +--> sync S3
     |
     +--> API smoke test
```

## Final target

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

1. React validates title/content.
2. Browser sends JSON to API Gateway.
3. API Gateway invokes Lambda.
4. Lambda parses and validates the request.
5. Lambda inserts the notice into MongoDB Atlas.
6. MongoDB returns the inserted ObjectId.
7. Lambda serializes the resource and returns HTTP 201.
8. React reloads the notice list.

## Design decisions

- Lambda stays stateless; the MongoDB client is reusable across warm invocations.
- API Gateway is the public HTTP entry point.
- MongoDB Atlas persists data outside Lambda.
- S3 hosts the compiled React build.
- CloudFront + OAC is the final Tier 3 access path so S3 can remain private.
- Deployment-specific values are injected through environment variables/secrets.
