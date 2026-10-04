# NoticeBoard final evidence

Reviewer index for the Josvier Rodriguez NoticeBoard submission. Secret values are not recorded here.

## Project identity

| Item | Value |
| --- | --- |
| Project | NoticeBoardTracker |
| Author | Josvier Rodriguez |
| Repository | `JosvierR/workshops-noticeboard-clean` |
| Final branch | `challenge/notice-board` |
| Deployment branch | `tier2-ci-deploy` |
| Upstream | `becloudready/workshops` |

## Production endpoints

CloudFront: `https://d1s8syl3tltqh9.cloudfront.net`

API health: `https://ybemxlautd.execute-api.us-east-1.amazonaws.com/health`

## Tier 1

Lambda `NoticeBoardBackend` is Python 3.12 with handler `lambda_function.lambda_handler`. API Gateway HTTP API `ybemxlautd` exposes health and notice CRUD. MongoDB Atlas stores `noticeboard_db`. The API smoke test covers create, read, update, invalid id, missing id, malformed JSON, and delete.

The historical frontend was an S3 static website. That website is disabled. See `AWS_TIER1_FRONTEND.md`.

## Tier 2

GitHub Actions workflow `NoticeBoard deploy` runs from `tier2-ci-deploy`. Historical successful runs:

| Run | URL | Conclusion |
| --- | --- | --- |
| `37219116701` | https://github.com/JosvierR/workshops-noticeboard-clean/actions/runs/37219116701 | success |
| `37221412583` | https://github.com/JosvierR/workshops-noticeboard-clean/actions/runs/37221412583 | success |

The workflow updates Lambda code only. It does not read or change the Lambda environment.

## Tier 3

| Item | Value |
| --- | --- |
| Distribution | `E3OKOFJWSNTBPB` |
| URL | `https://d1s8syl3tltqh9.cloudfront.net` |
| OAC | `noticeboard-josvier-oac` (`E2TFIV7Z74SWHH`) |
| Origin | regional S3 REST endpoint |
| Direct S3 `/index.html` | HTTP 403 |
| Invalidation on deploy | `/*`, then wait for completion |

Details: `AWS_TIER3_CLOUDFRONT.md`.

## Tier 4

| Item | Value |
| --- | --- |
| Log group | `/aws/lambda/NoticeBoardBackend` |
| Retention | 14 days |
| Lambda alarm | `NoticeBoard-Lambda-Errors` |
| API alarm | `NoticeBoard-API-5xx` |
| Dashboard | `NoticeBoard-Operations` |
| Alarm actions | none |

Recent Lambda log streams are visible in CloudWatch. Details: `AWS_TIER4_OBSERVABILITY.md`.

## Security

- No AWS keys, MongoDB URIs, or private keys are tracked.
- S3 is private. Block Public Access is enabled. Website hosting is off.
- CORS allows the CloudFront origin and the two local Vite origins. The old S3 website origin is removed.
- The deploy workflow refuses any account other than `279249498881`.
- CI does not modify the Lambda environment.

## Architecture

- [C4 diagrams](../docs/architecture/C4_ARCHITECTURE.md)
- [Architecture summary](../Architecture.md)
- [Operations runbook](OPERATIONS_RUNBOOK.md)

## Submission boundary

The pull request from `challenge/notice-board` contains only:

`workshops/fullstack-aws/projects/submissions/josvier-rodriguez/`

The root deploy workflow stays on `tier2-ci-deploy` and is not part of that pull request.

## Final regression run

| Item | Value |
| --- | --- |
| Run ID | `37226018552` |
| Run URL | https://github.com/JosvierR/workshops-noticeboard-clean/actions/runs/37226018552 |
| Event | `push` |
| Conclusion | success |
| Invalidation ID | `I220GLQVR0ODKIL08GH4MBHKHQ` |
| CloudFront index | HTTP 200 |
| Direct S3 `/index.html` | HTTP 403 |
| API smoke | PASS |

This evidence commit stays on `challenge/notice-board` only.
