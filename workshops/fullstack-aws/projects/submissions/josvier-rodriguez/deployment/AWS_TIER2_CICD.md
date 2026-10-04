# AWS Tier 2 — GitHub Actions CI/CD

Tier 2 deploys the existing NoticeBoard application. It does not create infrastructure, change API Gateway, change the Lambda environment, or change the S3 bucket policy.

## Branch strategy

| Branch | Role |
| --- | --- |
| `challenge/notice-board` | Final submission branch. Contains only `workshops/fullstack-aws/projects/submissions/josvier-rodriguez/`. |
| `tier2-ci-deploy` | Active CI/CD branch. Contains the same submission plus `.github/workflows/noticeboard-deploy.yml`. |

The root workflow is not merged back into `challenge/notice-board`. The assignment requires the upstream pull request to contain only the personal submission folder. The reference copy checked into that folder is `github-actions/deploy.yml`.

## Trigger

- Push to `tier2-ci-deploy` when the submission directory or the workflow file changes.
- Manual `workflow_dispatch`.

Permissions are `contents: read`. AWS access uses repository secrets because the QuickLabs role is not set up for GitHub OIDC.

## GitHub configuration

Repository: `JosvierR/workshops-noticeboard-clean`

Secrets, names only:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Variables:

- `AWS_REGION` = `us-east-1`
- `LAMBDA_FUNCTION_NAME` = `NoticeBoardBackend`
- `S3_BUCKET_NAME` = `noticeboard-josvier-279249498881-us-east-1`
- `VITE_API_URL` = `https://ybemxlautd.execute-api.us-east-1.amazonaws.com`
- `S3_WEBSITE_URL` = `http://noticeboard-josvier-279249498881-us-east-1.s3-website-us-east-1.amazonaws.com`

`MONGO_URI` is not a GitHub secret. The workflow never calls `update-function-configuration`.

## Pipeline

1. Install `backend/requirements-dev.txt` and run `python -m pytest -v`.
2. `npm ci` and `npm run build` with `VITE_API_URL`. Fail if `frontend/dist/index.html` is missing, if the build contains `localhost:8000`, or if the configured API URL is absent.
3. On the Ubuntu runner, install `backend/requirements.txt` into a temporary directory, copy `lambda_function.py` and `app/`, and zip those contents so the handler is at the zip root.
4. Authenticate with `aws-actions/configure-aws-credentials@v6`.
5. Stop unless `aws sts get-caller-identity` returns account `279249498881` and the region is `us-east-1`.
6. `aws lambda update-function-code`, then `aws lambda wait function-updated-v2`.
7. Read Lambda `State`, `LastUpdateStatus`, `Runtime`, `Handler`, and `LastModified` only. Do not print environment variables.
8. `aws s3 sync frontend/dist/ s3://$S3_BUCKET_NAME/ --delete`.
9. Run `scripts/aws_backend_smoke_test.sh` against `VITE_API_URL`.
10. Request the S3 website and require HTTP 200 for `index.html`, the referenced JavaScript, the referenced CSS, and the favicon. The deployed JavaScript must contain the API URL and must not contain `localhost:8000`.

## Commands used by the workflow

Lambda package is built in the runner, then:

```bash
aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --zip-file fileb:///tmp/noticeboard-lambda/noticeboard-lambda.zip
aws lambda wait function-updated-v2 --function-name "$LAMBDA_FUNCTION_NAME"
```

Frontend:

```bash
aws s3 sync frontend/dist/ "s3://${S3_BUCKET_NAME}/" --delete
```

## Verification runs

Both runs were push events on `tier2-ci-deploy`. GitHub reported `conclusion=success` for each.

| Run | ID | URL | Conclusion |
| --- | --- | --- | --- |
| First, workflow activation | `37163154135` | https://github.com/JosvierR/workshops/actions/runs/37163154135 | success |
| Second, footer proof | `37163237807` | https://github.com/JosvierR/workshops/actions/runs/37163237807 | success |

The second run rebuilt the frontend after the "Deployed with GitHub Actions" footer was pushed. The live S3 JavaScript contains that text. Lambda `LastModified` moved with each code update, and both runs passed the API smoke test.

Those two runs happened on the previous fork, `JosvierR/workshops`. That fork is quarantined. Current work uses `JosvierR/workshops-noticeboard-clean`.

## Clean fork recovery verification

Repository: `JosvierR/workshops-noticeboard-clean`

Reason: NoticeBoard was recovered into a clean fork after unrelated unauthorized repository activity was isolated from the submission.

The active workflow stays on `tier2-ci-deploy` only. GitHub does not accept `workflow_dispatch` for a workflow that has never run and is absent from the default branch, and `master` is left unchanged. The recovery deployment is therefore the push of this documentation to `tier2-ci-deploy`.

The run ID, URL, conclusion, and Lambda timestamp are recorded on `challenge/notice-board` after that run succeeds.

| Item | Value |
| --- | --- |
| Run ID | `37219116701` |
| Run URL | https://github.com/JosvierR/workshops-noticeboard-clean/actions/runs/37219116701 |
| Event | `push` |
| Conclusion | success |
| AWS account | `279249498881` |
| Region | `us-east-1` |
| Lambda LastModified | `2026-10-04T17:04:52.000+0000` |
| API smoke | PASS |
| S3 website verification | PASS |

Credentials: existing locally configured AWS credentials were reused after user verification. Secret values were not committed or printed. The upstream `Nightly Workshop Cleanup` workflow remains `disabled_fork` and was not enabled.

## Tier 3 evolution

The Tier 2 pipeline verified the public S3 website after `aws s3 sync`. Tier 3 keeps the tests, Lambda package, and code deploy, then continues with:

```text
S3 sync
  -> CloudFront invalidation
  -> CloudFront verification
  -> direct S3 denial verification
```

The historical Tier 2 run evidence above is unchanged.
