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
$api = "https://ybemxlautd.execute-api.us-east-1.amazonaws.com"
$cloudfrontUrl = "https://d1s8syl3tltqh9.cloudfront.net"
$bucket = "noticeboard-josvier-279249498881-us-east-1"

$account = aws sts get-caller-identity --profile $profileName --query Account --output text
if ($account -ne $expectedAccount) { throw "Unexpected AWS account." }
$configuredRegion = aws configure get region --profile $profileName
if ($configuredRegion -ne "us-east-1") { throw "Unexpected AWS region." }
Write-Output "account=$account"
Write-Output "region=$configuredRegion"

$retention = aws logs describe-log-groups --log-group-name-prefix $logGroup --profile $profileName --region $region --query "logGroups[?logGroupName=='$logGroup'].retentionInDays | [0]" --output text
if ($retention -ne "14") { throw "Log retention is $retention." }
Write-Output "log_group=$logGroup"
Write-Output "retention=$retention"

$alarms = aws cloudwatch describe-alarms --alarm-names $lambdaAlarm $apiAlarm --profile $profileName --region $region --output json | ConvertFrom-Json
$lambda = @($alarms.MetricAlarms | Where-Object { $_.AlarmName -eq $lambdaAlarm })
$apiAlarmConfig = @($alarms.MetricAlarms | Where-Object { $_.AlarmName -eq $apiAlarm })
if ($lambda.Count -ne 1 -or $apiAlarmConfig.Count -ne 1) { throw "Expected both NoticeBoard alarms." }

function Assert-Alarm($alarm, $namespace, $metric, $dimensionName, $dimensionValue) {
    if ($alarm.Namespace -ne $namespace) { throw "$($alarm.AlarmName) namespace is $($alarm.Namespace)." }
    if ($alarm.MetricName -ne $metric) { throw "$($alarm.AlarmName) metric is $($alarm.MetricName)." }
    if ($alarm.Statistic -ne "Sum") { throw "$($alarm.AlarmName) statistic is $($alarm.Statistic)." }
    if ($alarm.Period -ne 60) { throw "$($alarm.AlarmName) period is $($alarm.Period)." }
    if ($alarm.EvaluationPeriods -ne 1) { throw "$($alarm.AlarmName) evaluation periods are $($alarm.EvaluationPeriods)." }
    if ($alarm.DatapointsToAlarm -ne 1) { throw "$($alarm.AlarmName) datapoints are $($alarm.DatapointsToAlarm)." }
    if ([double]$alarm.Threshold -ne 0) { throw "$($alarm.AlarmName) threshold is $($alarm.Threshold)." }
    if ($alarm.ComparisonOperator -ne "GreaterThanThreshold") { throw "$($alarm.AlarmName) comparison is $($alarm.ComparisonOperator)." }
    if ($alarm.TreatMissingData -ne "notBreaching") { throw "$($alarm.AlarmName) missing-data behavior is $($alarm.TreatMissingData)." }
    $dimension = @($alarm.Dimensions | Where-Object { $_.Name -eq $dimensionName -and $_.Value -eq $dimensionValue })
    if ($dimension.Count -ne 1) { throw "$($alarm.AlarmName) dimension is wrong." }
    if ($alarm.StateValue -eq "ALARM") { throw "$($alarm.AlarmName) is ALARM." }
    if (@($alarm.OKActions).Count -gt 0 -or @($alarm.AlarmActions).Count -gt 0 -or @($alarm.InsufficientDataActions).Count -gt 0) {
        throw "$($alarm.AlarmName) has alarm actions."
    }
    Write-Output "$($alarm.AlarmName)=$($alarm.StateValue)"
}

Assert-Alarm $lambda[0] "AWS/Lambda" "Errors" "FunctionName" $functionName
Assert-Alarm $apiAlarmConfig[0] "AWS/ApiGateway" "5xx" "ApiId" $apiId

$dashboardBody = aws cloudwatch get-dashboard --dashboard-name $dashboardName --profile $profileName --region $region --query "DashboardBody" --output text
$required = @(
    "Invocations",
    "Errors",
    "Duration",
    "Throttles",
    "Count",
    "4xx",
    "5xx",
    "Latency",
    "IntegrationLatency",
    "NoticeBoard-Lambda-Errors",
    "NoticeBoard-API-5xx",
    "/aws/lambda/NoticeBoardBackend",
    "@message"
)
foreach ($token in $required) {
    if ($dashboardBody -notlike "*$token*") { throw "Dashboard is missing $token." }
}
Write-Output "dashboard=$dashboardName"

$rootCode = curl.exe -sS -o NUL -w "%{http_code}" $cloudfrontUrl
if ($rootCode -ne "200") { throw "CloudFront returned $rootCode." }
Write-Output "cloudfront=$rootCode"

$directCode = curl.exe -sS -o NUL -w "%{http_code}" "https://$bucket.s3.$region.amazonaws.com/index.html"
if ($directCode -ne "403") { throw "Direct S3 returned $directCode." }
Write-Output "direct_s3=$directCode"

$healthCode = curl.exe -sS -o NUL -w "%{http_code}" "$api/health"
if ($healthCode -ne "200") { throw "API health returned $healthCode." }
Write-Output "api_health=$healthCode"
Write-Output "tier4_verification=pass"
