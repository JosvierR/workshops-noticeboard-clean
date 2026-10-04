$ErrorActionPreference = "Stop"

$profileName = if ($env:AWS_PROFILE) { $env:AWS_PROFILE } else { "becloudready" }
$region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$expectedAccount = "279249498881"
$bucket = "noticeboard-josvier-279249498881-us-east-1"
$api = "https://ybemxlautd.execute-api.us-east-1.amazonaws.com"
$originDomain = "$bucket.s3.$region.amazonaws.com"

$account = aws sts get-caller-identity --profile $profileName --query Account --output text
if ($account -ne $expectedAccount) { throw "Unexpected AWS account." }
$configuredRegion = aws configure get region --profile $profileName
if ($configuredRegion -ne "us-east-1") { throw "Unexpected AWS region." }
Write-Output "account=$account"
Write-Output "region=$configuredRegion"

$distributionJson = aws cloudfront list-distributions --profile $profileName --output json
$distribution = $distributionJson | ConvertFrom-Json
$match = $distribution.DistributionList.Items | Where-Object { $_.Comment -eq "NoticeBoard Tier 3 - Josvier Rodriguez" }
if (-not $match) { throw "NoticeBoard CloudFront distribution was not found." }
if (@($match).Count -ne 1) { throw "Expected exactly one NoticeBoard CloudFront distribution." }
$distributionId = $match.Id
$domain = $match.DomainName
$cloudfrontUrl = "https://$domain"
Write-Output "distribution_id=$distributionId"
Write-Output "cloudfront_url=$cloudfrontUrl"

$state = aws cloudfront get-distribution --id $distributionId --profile $profileName --query "Distribution.{Status:Status,Enabled:DistributionConfig.Enabled,Origin:DistributionConfig.Origins.Items[0].DomainName,Oac:DistributionConfig.Origins.Items[0].OriginAccessControlId,Root:DistributionConfig.DefaultRootObject}" --output json | ConvertFrom-Json
if ($state.Status -ne "Deployed" -or $state.Enabled -ne $true) { throw "CloudFront is not deployed and enabled." }
if ($state.Origin -ne $originDomain) { throw "CloudFront origin is not the regional S3 REST endpoint." }
if ($state.Origin -like "*s3-website*") { throw "CloudFront is using the S3 website endpoint." }
if ($state.Root -ne "index.html") { throw "Default root object is not index.html." }
Write-Output "origin=$($state.Origin)"
Write-Output "oac=$($state.Oac)"

$oac = aws cloudfront get-origin-access-control --id $state.Oac --profile $profileName --query "OriginAccessControl.OriginAccessControlConfig.{Name:Name,Type:OriginAccessControlOriginType,Behavior:SigningBehavior,Protocol:SigningProtocol}" --output json | ConvertFrom-Json
if ($oac.Name -ne "noticeboard-josvier-oac" -or $oac.Type -ne "s3" -or $oac.Behavior -ne "always" -or $oac.Protocol -ne "sigv4") {
    throw "Origin Access Control settings are not the Tier 3 configuration."
}

$indexCode = curl.exe -sS -o "$env:TEMP\noticeboard-tier3-index.html" -w "%{http_code}" $cloudfrontUrl
if ($indexCode -ne "200") { throw "CloudFront root returned $indexCode." }
Write-Output "cloudfront_root=$indexCode"

$proof = Join-Path $env:TEMP "noticeboard-tier3-proof.py"
@'
import os, re, urllib.request
from pathlib import Path
base = os.environ["CLOUDFRONT_URL"].rstrip("/")
html = Path(os.environ["INDEX_FILE"]).read_text(encoding="utf-8", errors="ignore")
scripts = re.findall(r'src="([^"]+\.js)"', html)
styles = re.findall(r'href="([^"]+\.css)"', html)
icons = re.findall(r'href="([^"]+favicon[^"]*)"', html)
if not scripts or not styles or not icons:
    raise SystemExit("index.html is missing JS, CSS, or favicon")

def fetch(path):
    url = path if path.startswith("http") else base + "/" + path.lstrip("/")
    with urllib.request.urlopen(url) as response:
        body = response.read()
        if response.status != 200:
            raise SystemExit(f"{path} returned {response.status}")
        print(f"{path}={response.status}")
        return body

javascript = fetch(scripts[0])
fetch(styles[0])
fetch(icons[0])
if b"localhost:8000" in javascript:
    raise SystemExit("localhost:8000 found")
if os.environ["API_URL"].encode() not in javascript:
    raise SystemExit("API URL missing")
if b"Deployed with GitHub Actions" not in javascript:
    raise SystemExit("deployment proof missing")
print("frontend_scan=pass")
'@ | Set-Content -Path $proof -Encoding ascii
$env:CLOUDFRONT_URL = $cloudfrontUrl
$env:INDEX_FILE = Join-Path $env:TEMP "noticeboard-tier3-index.html"
$env:API_URL = $api
python $proof
if ($LASTEXITCODE -ne 0) { throw "CloudFront asset verification failed." }

$healthCode = curl.exe -sS -o "$env:TEMP\noticeboard-tier3-health.json" -w "%{http_code}" "$api/health"
if ($healthCode -ne "200") { throw "API health returned $healthCode." }
Write-Output "api_health=$healthCode"

$preflight = (curl.exe -sS -D - -o NUL -X OPTIONS "$api/notices" -H "Origin: $cloudfrontUrl" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type") -join "`n"
if ($preflight -notmatch "204" -or $preflight -notmatch [regex]::Escape("access-control-allow-origin: $cloudfrontUrl")) {
    throw "CloudFront CORS preflight failed."
}
Write-Output "cors_preflight=pass"

$directCode = curl.exe -sS -o NUL -w "%{http_code}" "https://$originDomain/index.html"
if ($directCode -ne "403") { throw "Anonymous S3 access returned $directCode." }
Write-Output "direct_s3=$directCode"

$block = aws s3api get-public-access-block --bucket $bucket --profile $profileName --output json | ConvertFrom-Json
$flags = $block.PublicAccessBlockConfiguration
foreach ($name in @("BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets")) {
    if ($flags.$name -ne $true) { throw "$name is not true." }
}
Write-Output "public_access_block=all-true"

$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
aws s3api get-bucket-website --bucket $bucket --profile $profileName 2>&1 | Out-Null
$websiteExit = $LASTEXITCODE
$ErrorActionPreference = $previousErrorAction
if ($websiteExit -eq 0) { throw "S3 website hosting is still enabled." }
Write-Output "website_hosting=disabled"

$policyText = aws s3api get-bucket-policy --bucket $bucket --profile $profileName --query Policy --output text
if ($policyText -match '"Principal"\s*:\s*"\*"') { throw "Bucket policy still grants anonymous access." }
if ($policyText -notmatch "cloudfront.amazonaws.com") { throw "Bucket policy does not grant CloudFront." }
if ($policyText -notmatch [regex]::Escape("distribution/$distributionId")) { throw "Bucket policy is not scoped to this distribution." }
Write-Output "bucket_policy=cloudfront-only"
Write-Output "tier3_verification=pass"
