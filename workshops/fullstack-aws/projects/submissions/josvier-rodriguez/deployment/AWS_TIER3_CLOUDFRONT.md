# AWS Tier 3 — CloudFront, OAC, and private S3

Tier 3 is the current production frontend. The browser loads the React app over HTTPS from CloudFront. CloudFront reads the private bucket with Origin Access Control. API calls still go to API Gateway, Lambda, and MongoDB Atlas.

## Deployed resources

| Item | Value |
| --- | --- |
| AWS account | `279249498881` |
| Region | `us-east-1` |
| Bucket | `noticeboard-josvier-279249498881-us-east-1` |
| S3 origin domain | `noticeboard-josvier-279249498881-us-east-1.s3.us-east-1.amazonaws.com` |
| Distribution ID | `E3OKOFJWSNTBPB` |
| CloudFront domain | `d1s8syl3tltqh9.cloudfront.net` |
| CloudFront URL | `https://d1s8syl3tltqh9.cloudfront.net` |
| OAC name | `noticeboard-josvier-oac` |
| OAC ID | `E2TFIV7Z74SWHH` |
| Default root object | `index.html` |
| Viewer protocol | redirect HTTP to HTTPS |
| Certificate | CloudFront default certificate |
| Cache policy | AWS managed `Managed-CachingOptimized` (`658327ea-f89d-4fab-a63d-7e88639e58f6`) |
| Compression | enabled |
| Price class | `PriceClass_100` |

The origin is the regional S3 REST endpoint. It is not the S3 website endpoint.

## Privacy

S3 Block Public Access has all four settings enabled. The bucket policy allows `s3:GetObject` only for `cloudfront.amazonaws.com`, and only when `AWS:SourceArn` is `arn:aws:cloudfront::279249498881:distribution/E3OKOFJWSNTBPB`. There is no anonymous `Principal: "*"`.

Anonymous `GET` of the REST object `/index.html` returns HTTP 403. CloudFront `/` returns HTTP 200. S3 static website hosting is disabled. Object ownership remains `BucketOwnerEnforced`.

## API CORS

Allowed origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://d1s8syl3tltqh9.cloudfront.net`

The old S3 website origin was removed after the CloudFront cutover. Methods remain `GET`, `POST`, `PUT`, `DELETE`, and `OPTIONS`. The allowed header remains `content-type`.

## CI/CD

The deployment branch syncs `frontend/dist/` to the private bucket, creates a CloudFront invalidation for `/*`, waits until that invalidation completes, smoke-tests the API, checks the CloudFront site, and requires the anonymous S3 REST URL to return 403.

GitHub variables: `CLOUDFRONT_DISTRIBUTION_ID` and `CLOUDFRONT_URL`. `S3_WEBSITE_URL` is no longer an active CI variable.

## Verification before the Actions run

- CloudFront root, JavaScript, CSS, and favicon: HTTP 200
- JavaScript contains the API Gateway URL and `Deployed with GitHub Actions`
- JavaScript does not contain `localhost:8000`
- API smoke test: PASS
- CORS preflight from the CloudFront origin: HTTP 204
- Direct S3 REST `/index.html`: HTTP 403

The GitHub Actions run ID is recorded on this branch after that run succeeds.

Repeat the local checks with `scripts/verify_tier3.ps1`.
