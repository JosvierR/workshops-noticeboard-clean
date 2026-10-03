# Architecture

## Target system

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
