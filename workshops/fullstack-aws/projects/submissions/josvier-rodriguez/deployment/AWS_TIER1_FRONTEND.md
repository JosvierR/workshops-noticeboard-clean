# NoticeBoard AWS Tier 1 frontend

Tier 1 used S3 static website hosting. Tier 3 superseded it with CloudFront, Origin Access Control, and private S3. The old S3 website is intentionally disabled. This file records the historical Tier 1 checkpoint and does not describe the current production frontend.

## Resources

| Item | Value |
| --- | --- |
| AWS account | `279249498881` |
| AWS region | `us-east-1` |
| Bucket | `noticeboard-josvier-279249498881-us-east-1` |
| Index document | `index.html` |
| Error document | `index.html` |
| Website endpoint | `http://noticeboard-josvier-279249498881-us-east-1.s3-website-us-east-1.amazonaws.com` |
| API endpoint | `https://ybemxlautd.execute-api.us-east-1.amazonaws.com` |

Public access is read-only. The bucket policy allows `s3:GetObject` on `arn:aws:s3:::noticeboard-josvier-279249498881-us-east-1/*`. It does not allow public write or delete. Public ACLs stay blocked.

## CORS

API Gateway allows:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://noticeboard-josvier-279249498881-us-east-1.s3-website-us-east-1.amazonaws.com`

Methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`.

Header: `Content-Type`.

## Build

From `frontend`, with the API URL present only in the process environment:

```powershell
$env:VITE_API_URL = "https://ybemxlautd.execute-api.us-east-1.amazonaws.com"
npm ci
npm run build
```

`frontend/dist/` stays gitignored. The built JavaScript must reference the API Gateway host and must not reference `localhost:8000`.

## Deploy

```powershell
$env:API_BASE_URL = "https://ybemxlautd.execute-api.us-east-1.amazonaws.com"
$env:AWS_PROFILE = "becloudready"
$env:AWS_REGION = "us-east-1"
powershell -ExecutionPolicy Bypass -File scripts/deploy_frontend.ps1
```

The script runs `npm ci`, builds with `VITE_API_URL`, and syncs `frontend/dist/` to the bucket root.

Equivalent upload:

```powershell
aws s3 sync frontend/dist s3://noticeboard-josvier-279249498881-us-east-1 --delete --profile becloudready
```

The bucket root contains `index.html`, `favicon.ico`, and `assets/`. It does not contain a `dist/` prefix.

## Verify

1. Open the website endpoint. The HTML should load the hashed files under `/assets/`, not the Vite dev server.
2. Confirm `index.html` is `text/html`, JavaScript is `text/javascript`, CSS is `text/css`, and the favicon is an image type.
3. Create, refresh, edit, refresh, delete, and refresh a notice.
4. In the browser network log, API calls go to `https://ybemxlautd.execute-api.us-east-1.amazonaws.com`. None go to `localhost:8000`.
5. A preflight from the S3 origin returns `204` and `access-control-allow-origin` set to that origin.
