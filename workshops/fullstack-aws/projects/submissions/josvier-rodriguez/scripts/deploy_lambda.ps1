$ErrorActionPreference = "Stop"

$profileName = if ($env:AWS_PROFILE) { $env:AWS_PROFILE } else { "becloudready" }
$region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$functionName = "NoticeBoardBackend"
$submission = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$zip = Join-Path $submission "backend\_build\noticeboard-lambda.zip"

& (Join-Path $submission "backend\scripts\build_lambda.ps1")
if (-not (Test-Path $zip)) {
    throw "Lambda zip was not created."
}

aws lambda update-function-code `
    --function-name $functionName `
    --zip-file "fileb://$zip" `
    --region $region `
    --profile $profileName `
    --query "{CodeSize:CodeSize,LastUpdateStatus:LastUpdateStatus}" `
    --output json
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

aws lambda wait function-updated-v2 `
    --function-name $functionName `
    --region $region `
    --profile $profileName
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($env:MONGO_URI) {
    $dbName = if ($env:MONGO_DB_NAME) { $env:MONGO_DB_NAME } else { "noticeboard_db" }
    $envFile = Join-Path $submission "backend\_build\lambda-env.json"
    python -c "import json,os,pathlib; pathlib.Path(r'$envFile').write_text(json.dumps({'Variables':{'MONGO_URI':os.environ['MONGO_URI'],'MONGO_DB_NAME':os.environ.get('MONGO_DB_NAME','noticeboard_db')}}), encoding='utf-8')"
    try {
        aws lambda update-function-configuration `
            --function-name $functionName `
            --environment "file://$envFile" `
            --region $region `
            --profile $profileName `
            --query "{LastUpdateStatus:LastUpdateStatus,EnvKeys:keys(Environment.Variables),DbName:Environment.Variables.MONGO_DB_NAME}" `
            --output json
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        aws lambda wait function-updated-v2 `
            --function-name $functionName `
            --region $region `
            --profile $profileName
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    } finally {
        if (Test-Path $envFile) { Remove-Item -Force $envFile }
    }
}

Write-Output "Lambda code update complete."
