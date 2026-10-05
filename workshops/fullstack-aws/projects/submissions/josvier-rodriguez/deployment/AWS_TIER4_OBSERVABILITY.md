# AWS Tier 4 — Observability

Tier 4 is optional in the assignment and is complete. It adds logging retention, two alarms, and an operations dashboard. It does not change the application path.

| Item | Value |
| --- | --- |
| AWS account | `279249498881` |
| Region | `us-east-1` |
| Lambda | `NoticeBoardBackend` |
| API ID | `ybemxlautd` |
| Log group | `/aws/lambda/NoticeBoardBackend` |
| Retention | 14 days |
| Lambda alarm | `NoticeBoard-Lambda-Errors` |
| API alarm | `NoticeBoard-API-5xx` |
| Dashboard | `NoticeBoard-Operations` |

## Alarms

`NoticeBoard-Lambda-Errors` sums `AWS/Lambda` `Errors` for `FunctionName=NoticeBoardBackend` over 60 seconds. It enters `ALARM` when that sum is greater than 0.

`NoticeBoard-API-5xx` sums `AWS/ApiGateway` `5xx` for `ApiId=ybemxlautd` over 60 seconds. It enters `ALARM` when that sum is greater than 0.

Both alarms use one evaluation period, one datapoint, and `treatMissingData=notBreaching`. Neither alarm has an action. There is no SNS topic, email, or SMS notification.

A healthy alarm may read `OK` or, immediately after creation, `INSUFFICIENT_DATA`.

## Dashboard

`NoticeBoard-Operations` shows:

- a text header with the CloudFront URL, API ID, Lambda name, and region
- Lambda invocations, errors, duration (average and maximum), and throttles
- API count, 4xx, 5xx, latency (average and p95), and integration latency (average and p95)
- the status of both alarms
- the 50 most recent Lambda log events

The definition is `observability/cloudwatch-dashboard.json`.

## Verification

`scripts/verify_tier4.ps1` checks the account, retention, both alarm definitions, the dashboard contents, CloudFront HTTP 200, anonymous S3 HTTP 403, and API health HTTP 200.

The production GitHub Actions pipeline now performs a read-only observability gate after deployment. It checks that log retention is 14 days, that `NoticeBoard-Lambda-Errors` and `NoticeBoard-API-5xx` are both `OK` with their expected configuration, and that `NoticeBoard-Operations` exists and references the Lambda and API metrics plus the Lambda log group. The step does not create or change CloudWatch resources. `ALARM` and `INSUFFICIENT_DATA` both fail the deployment.

Provisioning this tier did not change Lambda code or configuration. The later GitHub Actions run `37226018552` updated Lambda code in the normal deploy path and moved `LastModified` to `2026-10-04T18:51:43.000+0000`. Runtime, handler, memory, and timeout stayed the same. That deploy is separate from the CloudWatch configuration.

Final regression: https://github.com/JosvierR/workshops-noticeboard-clean/actions/runs/37226018552 (`push`, success).

## Security

The dashboard and alarms contain resource names only. They do not contain database credentials or AWS keys. Log review must not copy environment values into documentation.
