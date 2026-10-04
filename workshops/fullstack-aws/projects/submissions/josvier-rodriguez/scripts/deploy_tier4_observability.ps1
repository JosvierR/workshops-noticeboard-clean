$ErrorActionPreference = "Stop"

$profileName = if ($env:AWS_PROFILE) { $env:AWS_PROFILE } else { "becloudready" }
$region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$expectedAccount = "279249498881"
$functionName = "NoticeBoardBackend"
$apiId = "ybemxlautd"
$logGroup = "/aws/lambda/NoticeBoardBackend"
$lambdaAlarm = "NoticeBoard-Lambda-Errors"
$apiAlarm = "NoticeBoard-API-5xx"
$dashboardName = "NoticeBoard-Operations"

$account = aws sts get-caller-identity --profile $profileName --query Account --output text
if ($account -ne $expectedAccount) { throw "Unexpected AWS account." }
$configuredRegion = aws configure get region --profile $profileName
if ($configuredRegion -ne "us-east-1") { throw "Unexpected AWS region." }

$lambdaName = aws lambda get-function-configuration --function-name $functionName --profile $profileName --region $region --query "FunctionName" --output text
if ($lambdaName -ne $functionName) { throw "Lambda function was not found." }

$foundApi = aws apigatewayv2 get-api --api-id $apiId --profile $profileName --region $region --query "ApiId" --output text
if ($foundApi -ne $apiId) { throw "API Gateway API was not found." }

$existingGroup = aws logs describe-log-groups --log-group-name-prefix $logGroup --profile $profileName --region $region --query "logGroups[?logGroupName=='$logGroup'].logGroupName | [0]" --output text
if ($existingGroup -ne $logGroup) { throw "Lambda log group was not found." }

aws logs put-retention-policy --log-group-name $logGroup --retention-in-days 14 --profile $profileName --region $region
if ($LASTEXITCODE -ne 0) { throw "Could not set log retention." }

aws cloudwatch put-metric-alarm --profile $profileName --region $region --alarm-name $lambdaAlarm --alarm-description "NoticeBoard production Lambda emitted one or more function errors during a 60-second period." --namespace "AWS/Lambda" --metric-name "Errors" --dimensions "Name=FunctionName,Value=$functionName" --statistic Sum --period 60 --evaluation-periods 1 --datapoints-to-alarm 1 --threshold 0 --comparison-operator GreaterThanThreshold --treat-missing-data notBreaching
if ($LASTEXITCODE -ne 0) { throw "Could not create the Lambda error alarm." }

aws cloudwatch put-metric-alarm --profile $profileName --region $region --alarm-name $apiAlarm --alarm-description "NoticeBoard HTTP API emitted one or more server-side 5xx responses during a 60-second period." --namespace "AWS/ApiGateway" --metric-name "5xx" --dimensions "Name=ApiId,Value=$apiId" --statistic Sum --period 60 --evaluation-periods 1 --datapoints-to-alarm 1 --threshold 0 --comparison-operator GreaterThanThreshold --treat-missing-data notBreaching
if ($LASTEXITCODE -ne 0) { throw "Could not create the API 5xx alarm." }

$dashboardFile = Join-Path (Split-Path $PSScriptRoot -Parent) "observability\cloudwatch-dashboard.json"
if (-not (Test-Path $dashboardFile)) { throw "Dashboard definition was not found." }
$dashboardCopy = Join-Path $env:TEMP "noticeboard-operations-dashboard.json"
Copy-Item $dashboardFile $dashboardCopy -Force
$dashboardUri = "file://" + ((Resolve-Path $dashboardCopy).Path -replace "\\", "/")
aws cloudwatch put-dashboard --dashboard-name $dashboardName --dashboard-body $dashboardUri --profile $profileName --region $region --output json | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Could not create the operations dashboard." }

$retention = aws logs describe-log-groups --log-group-name-prefix $logGroup --profile $profileName --region $region --query "logGroups[?logGroupName=='$logGroup'].retentionInDays | [0]" --output text
$states = aws cloudwatch describe-alarms --alarm-names $lambdaAlarm $apiAlarm --profile $profileName --region $region --query "MetricAlarms[].{Name:AlarmName,State:StateValue}" --output json

Write-Output "account=$account"
Write-Output "region=$configuredRegion"
Write-Output "log_group=$logGroup"
Write-Output "retention=$retention"
Write-Output "alarms=$states"
Write-Output "dashboard=$dashboardName"
