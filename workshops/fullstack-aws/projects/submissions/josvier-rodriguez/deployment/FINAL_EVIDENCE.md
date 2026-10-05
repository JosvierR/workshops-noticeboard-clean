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
| `37245353234` | https://github.com/JosvierR/workshops-noticeboard-clean/actions/runs/37245353234 | success |

The workflow updates Lambda code only. It does not read or change the Lambda environment.

## Product UI / Training Pulse release

Release date: 2026-10-04

| Item | Evidence |
| --- | --- |
| Feature branch | `feature/training-pulse-ui` at `5a6de9c5e3fe873b76e23a3527af21b17e9cdde9` |
| Challenge branch | `challenge/notice-board` at `5a6de9c5e3fe873b76e23a3527af21b17e9cdde9` |
| Deployment branch | `tier2-ci-deploy` at `5c379cf3380006c4498c0af34f3500624977d570` |
| Deployment run | `37245353234` — success |
| Test and build job | success, 40 backend tests and production frontend build |
| Deploy and verify job | success, Lambda, private S3, CloudFront invalidation, API and access checks |

Training Pulse derives overdue, today, soon, upcoming, and no-deadline states
from local calendar dates. Pinned is the only new persisted field; it is an
optional strict boolean, defaults to `false`, and older MongoDB documents
serialize safely without a migration.

Production browser verification covered create, edit, pin, unpin, refresh
persistence, search, status filters, cohort filtering, combined filters,
command palette, custom delete confirmation, and final cleanup of the QA
record. Responsive checks passed at 1440, 1280, 1024, 768, 430, 390, and 375
pixels with no horizontal overflow. The final automated WCAG A/AA audit found
zero violations; the browser console and runtime error log were empty.

| Frontend assets | Before | After | Increase |
| --- | ---: | ---: | ---: |
| JavaScript | 229,395 bytes | 388,926 bytes | 159,531 bytes |
| CSS | 4,888 bytes | 24,034 bytes | 19,146 bytes |
| Combined | 234,283 bytes | 412,960 bytes | 178,677 bytes |

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

The production workflow verifies this after every deployment, without changing CloudWatch:

- log retention is 14 days
- `NoticeBoard-Lambda-Errors` is `OK`
- `NoticeBoard-API-5xx` is `OK`
- dashboard `NoticeBoard-Operations` exists

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
| Run ID | `37245353234` |
| Run URL | https://github.com/JosvierR/workshops-noticeboard-clean/actions/runs/37245353234 |
| Event | `push` |
| Conclusion | success |
| CI head | `5c379cf3380006c4498c0af34f3500624977d570` |
| Invalidation ID | `I6CJ5HXV49BRDM64RFVZBKPCJC` |
| CloudFront index | HTTP 200 |
| Direct S3 `/index.html` | HTTP 403 |
| API smoke | PASS |

This evidence commit stays on `challenge/notice-board` only.

## Observability gate run

| Item | Value |
| --- | --- |
| Run ID | `37247453880` |
| Run URL | https://github.com/JosvierR/workshops-noticeboard-clean/actions/runs/37247453880 |
| Event | `push` |
| Conclusion | success |
| Log retention | 14 days |
| Lambda alarm | `OK` |
| API alarm | `OK` |
| Dashboard | present |
| CloudFront index | HTTP 200 |
| Direct S3 `/index.html` | HTTP 403 |
| API health | HTTP 200 |

This run is recorded only on `challenge/notice-board`.
