# NoticeBoard security remediation (2026-10-11)

This branch is REVIEW-ONLY. Do not merge into the deployment branch before validating AWS settings, CI and regressions.

## Completed in this branch
- Replace published AWS account number in submission documents/diagrams with placeholders.
- Remove literal AWS account number from deployment script templates. PowerShell scripts now require environment variables EXPECTED_AWS_ACCOUNT and S3_BUCKET_NAME (deploy_frontend uses BUCKET_NAME).
- Update submission example GitHub Actions workflow to assume an AWS role via OIDC and use EXPECTED_AWS_ACCOUNT GitHub variable instead of a literal account number.
- Stop printing the account number in the reference CI job.

## Production remediation required
1. Protect POST, PUT and DELETE /notices with an API Gateway authorizer / proper user authentication and authorization; reject unauthenticated callers. Frontend tokens must NOT be embedded into public Vite bundles. Validate 401/403 and admin/user access rules.
2. Check MongoDB Atlas network access list. Remove 0.0.0.0/0 where feasible, restrict network, rotate database credentials if leaked, and use least-privilege database users.
3. Configure the IAM trust policy for GitHub OIDC (repository+branch scoped), least privilege permissions, and AWS_DEPLOY_ROLE_ARN/EXPECTED_AWS_ACCOUNT in GitHub variables. Disable/delete static AWS keys only after verified cutover and rollback plan.
4. Review history of all branches, pull requests, artifacts and Actions logs for credentials, personal details and account identifiers. Any real secret found in history must be revoked/rotated, not merely hidden in the latest commit. Consider history rewrite only after coordinated approval.
5. Inspect deployed API Gateway authorizers/CORS, S3 public access/OAC, Lambda environment, CloudTrail and IAM users/roles using an authenticated AWS session; repository content cannot prove current AWS state.
6. Add regression/security checks: secret scanning, dependency and code scanning, backend negative-auth tests, CORS tests, and enforce protected branches.

## Notes
- Original upstream PR #381 is closed without merge. This branch does not rewrite its prior commit history.
- No changes made to active tier2-ci-deploy branch or live AWS resources.
- Previous deploy scripts expected hard-coded bucket names; supply explicit environment configuration before testing.
- Never merge or deploy this branch without tests and deployment variable setup.
