$ErrorActionPreference = "Stop"

if (-not $env:API_BASE_URL) {
    throw "API_BASE_URL is required. Example: https://<api-id>.execute-api.<region>.amazonaws.com"
}

$profileName = if ($env:AWS_PROFILE) { $env:AWS_PROFILE } else { "becloudready" }
$region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$bucket = if ($env:BUCKET_NAME) { $env:BUCKET_NAME } else { "noticeboard-josvier-279249498881-us-east-1" }
$submission = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$frontend = Join-Path $submission "frontend"

Push-Location $frontend
try {
    $env:VITE_API_URL = $env:API_BASE_URL
    npm ci
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}

$dist = Join-Path $frontend "dist"
if (-not (Test-Path (Join-Path $dist "index.html"))) {
    throw "frontend/dist/index.html was not created."
}

aws s3 sync $dist "s3://$bucket" --delete --region $region --profile $profileName
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output "Website URL: http://$bucket.s3-website-$region.amazonaws.com"
