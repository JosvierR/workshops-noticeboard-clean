# NoticeBoard Production Runbook

## Production URLs

CloudFront: `https://d1s8syl3tltqh9.cloudfront.net`

API: `https://ybemxlautd.execute-api.us-east-1.amazonaws.com`

## Primary AWS resources

| Resource | Identifier |
| --- | --- |
| CloudFront | `E3OKOFJWSNTBPB` |
| Origin Access Control | `noticeboard-josvier-oac` (`E2TFIV7Z74SWHH`) |
| S3 | `noticeboard-josvier-279249498881-us-east-1` |
| API Gateway | `NoticeBoardAPI` (`ybemxlautd`) |
| Lambda | `NoticeBoardBackend` |
| CloudWatch log group | `/aws/lambda/NoticeBoardBackend` |
| CloudWatch alarms | `NoticeBoard-Lambda-Errors`, `NoticeBoard-API-5xx` |
| CloudWatch dashboard | `NoticeBoard-Operations` |
| MongoDB Atlas | `noticeboard_db` |

## Healthy baseline

- CloudFront returns HTTP 200.
- Anonymous S3 `GET /index.html` returns HTTP 403.
- `GET /health` returns HTTP 200.
- Lambda `Errors` stays at 0.
- API `5xx` stays at 0.
- Both alarms are `OK` or briefly `INSUFFICIENT_DATA`. Neither should be `ALARM`.

## Lambda Errors alarm response

1. Confirm the alarm time in `NoticeBoard-Lambda-Errors`.
2. Open the latest stream in `/aws/lambda/NoticeBoardBackend`.
3. Classify the error from the log line. Do not copy credentials out of a log line.
4. Call `GET /health`.
5. Confirm the application can still read notices. That is the safe Atlas check.
6. Do not print `MONGO_URI`.
7. If a deployment caused the errors, roll back the application code with Git as described below.

## API 5xx alarm response

1. Check the API `5xx` widget on `NoticeBoard-Operations`.
2. Check whether `NoticeBoard-Lambda-Errors` fired at the same time.
3. Read the recent Lambda log stream.
4. Call `GET /health`.
5. Run `scripts/aws_backend_smoke_test.sh` with `API_BASE_URL` set to the production API.
6. Inspect the API integration only if health and the smoke test still fail.

## CloudFront incident

Check, in order:

1. Distribution `E3OKOFJWSNTBPB` is `Deployed` and enabled.
2. The latest CloudFront invalidation completed.
3. The origin is the regional S3 REST endpoint and OAC `E2TFIV7Z74SWHH` is attached.
4. Anonymous `GET` of the REST object `/index.html` is HTTP 403.
5. `https://d1s8syl3tltqh9.cloudfront.net` is HTTP 200.

## Deployment rollback

The active deployment branch is `tier2-ci-deploy`. To roll back application code, check out the last known-good commit on that branch and push it to `origin`. The workflow updates Lambda code, syncs the private bucket, and invalidates CloudFront.

Do not make the S3 bucket public to recover the website.

The final submission branch is `challenge/notice-board`. Do not put the root GitHub workflow on that branch.

## Security rules

- Do not put credentials in logs, commits, or this runbook.
- Do not make S3 public and do not turn website hosting back on.
- Do not add a wildcard CORS origin.
- Do not change IAM to debug an application error.

## Useful commands

```bash
aws sts get-caller-identity --profile becloudready --query Account --output text
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/NoticeBoardBackend --profile becloudready --region us-east-1
aws cloudwatch describe-alarms --alarm-names NoticeBoard-Lambda-Errors NoticeBoard-API-5xx --profile becloudready --region us-east-1
aws cloudwatch get-dashboard --dashboard-name NoticeBoard-Operations --profile becloudready --region us-east-1
```

```powershell
powershell -File scripts/verify_tier3.ps1
powershell -File scripts/verify_tier4.ps1
```

```bash
API_BASE_URL=https://ybemxlautd.execute-api.us-east-1.amazonaws.com bash scripts/aws_backend_smoke_test.sh
```
