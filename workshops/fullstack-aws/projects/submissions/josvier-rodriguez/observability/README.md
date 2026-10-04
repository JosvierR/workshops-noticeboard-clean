# NoticeBoard observability

Production observability is CloudWatch only. There is no SNS topic, email action, or automated remediation.

| Resource | Name |
| --- | --- |
| Log group | `/aws/lambda/NoticeBoardBackend` |
| Retention | 14 days |
| Lambda alarm | `NoticeBoard-Lambda-Errors` |
| API alarm | `NoticeBoard-API-5xx` |
| Dashboard | `NoticeBoard-Operations` |

The Lambda alarm watches `AWS/Lambda` `Errors` for `FunctionName=NoticeBoardBackend`. The API alarm watches `AWS/ApiGateway` `5xx` for `ApiId=ybemxlautd`. Both use a 60-second sum, a threshold of 0, `GreaterThanThreshold`, and `notBreaching` when data is missing. Neither alarm has an action.

The dashboard definition in `cloudwatch-dashboard.json` shows Lambda invocations, errors, duration, and throttles; API request count, 4xx, 5xx, latency, and integration latency; both alarm states; and the 50 most recent Lambda log lines.

Apply the same configuration again with `scripts/deploy_tier4_observability.ps1`. Check it without changing AWS with `scripts/verify_tier4.ps1`.
