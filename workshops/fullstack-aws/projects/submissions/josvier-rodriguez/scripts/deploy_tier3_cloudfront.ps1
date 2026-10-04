$ErrorActionPreference = "Stop"

$profileName = if ($env:AWS_PROFILE) { $env:AWS_PROFILE } else { "becloudready" }
$region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$expectedAccount = "279249498881"
$bucket = "noticeboard-josvier-279249498881-us-east-1"
$apiId = "ybemxlautd"
$oacName = "noticeboard-josvier-oac"
$comment = "NoticeBoard Tier 3 - Josvier Rodriguez"
$originDomain = "$bucket.s3.$region.amazonaws.com"
$cachePolicyId = "658327ea-f89d-4fab-a63d-7e88639e58f6"

$account = aws sts get-caller-identity --profile $profileName --query Account --output text
if ($account -ne $expectedAccount) { throw "Unexpected AWS account." }
$configuredRegion = aws configure get region --profile $profileName
if ($configuredRegion -ne "us-east-1") { throw "Unexpected AWS region." }

$oacList = aws cloudfront list-origin-access-controls --profile $profileName --output json | ConvertFrom-Json
$oac = @($oacList.OriginAccessControlList.Items | Where-Object { $_.Name -eq $oacName })
if ($oac.Count -gt 1) { throw "More than one NoticeBoard OAC exists." }
if ($oac.Count -eq 0) {
    $oacFile = Join-Path $env:TEMP "noticeboard-oac-create.json"
    @{
        Name = $oacName
        Description = "NoticeBoard Tier 3 OAC for Josvier Rodriguez"
        SigningProtocol = "sigv4"
        SigningBehavior = "always"
        OriginAccessControlOriginType = "s3"
    } | ConvertTo-Json | Set-Content -Path $oacFile -Encoding ascii
    $created = aws cloudfront create-origin-access-control --profile $profileName --origin-access-control-config "file://$oacFile" --output json | ConvertFrom-Json
    $oacId = $created.OriginAccessControl.Id
} else {
    $oacId = $oac[0].Id
}

$distributions = aws cloudfront list-distributions --profile $profileName --output json | ConvertFrom-Json
$existing = @($distributions.DistributionList.Items | Where-Object { $_.Comment -eq $comment })
if ($existing.Count -gt 1) { throw "More than one NoticeBoard CloudFront distribution exists." }
if ($existing.Count -eq 1) {
    $distributionId = $existing[0].Id
    $domain = $existing[0].DomainName
} else {
    $configFile = Join-Path $env:TEMP "noticeboard-cf-create.json"
    @{
        CallerReference = "noticeboard-josvier-tier3-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
        Comment = $comment
        Enabled = $true
        DefaultRootObject = "index.html"
        PriceClass = "PriceClass_100"
        HttpVersion = "http2and3"
        IsIPV6Enabled = $true
        Origins = @{
            Quantity = 1
            Items = @(@{
                Id = "noticeboard-s3-rest"
                DomainName = $originDomain
                OriginAccessControlId = $oacId
                S3OriginConfig = @{ OriginAccessIdentity = "" }
                CustomHeaders = @{ Quantity = 0 }
                OriginPath = ""
            })
        }
        DefaultCacheBehavior = @{
            TargetOriginId = "noticeboard-s3-rest"
            ViewerProtocolPolicy = "redirect-to-https"
            AllowedMethods = @{
                Quantity = 2
                Items = @("GET", "HEAD")
                CachedMethods = @{ Quantity = 2; Items = @("GET", "HEAD") }
            }
            Compress = $true
            CachePolicyId = $cachePolicyId
        }
        ViewerCertificate = @{
            CloudFrontDefaultCertificate = $true
            MinimumProtocolVersion = "TLSv1"
            CertificateSource = "cloudfront"
        }
    } | ConvertTo-Json -Depth 8 | Set-Content -Path $configFile -Encoding ascii
    $createdDistribution = aws cloudfront create-distribution --profile $profileName --distribution-config "file://$configFile" --output json | ConvertFrom-Json
    $distributionId = $createdDistribution.Distribution.Id
    $domain = $createdDistribution.Distribution.DomainName
    aws cloudfront wait distribution-deployed --id $distributionId --profile $profileName
}

$cloudfrontUrl = "https://$domain"
$rootCode = curl.exe -sS -o NUL -w "%{http_code}" $cloudfrontUrl
if ($rootCode -ne "200") { throw "CloudFront did not return 200, so S3 was left unchanged." }

$policyFile = Join-Path $env:TEMP "noticeboard-tier3-policy.json"
@{
    Version = "2012-10-17"
    Statement = @(@{
        Sid = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = @{ Service = "cloudfront.amazonaws.com" }
        Action = "s3:GetObject"
        Resource = "arn:aws:s3:::$bucket/*"
        Condition = @{ StringEquals = @{ "AWS:SourceArn" = "arn:aws:cloudfront::${expectedAccount}:distribution/$distributionId" } }
    })
} | ConvertTo-Json -Depth 8 | Set-Content -Path $policyFile -Encoding ascii
aws s3api put-bucket-policy --bucket $bucket --profile $profileName --policy "file://$policyFile"
if ($LASTEXITCODE -ne 0) { throw "Bucket policy update failed." }

$blockFile = Join-Path $env:TEMP "noticeboard-tier3-block.json"
@{
    BlockPublicAcls = $true
    IgnorePublicAcls = $true
    BlockPublicPolicy = $true
    RestrictPublicBuckets = $true
} | ConvertTo-Json | Set-Content -Path $blockFile -Encoding ascii
aws s3api put-public-access-block --bucket $bucket --profile $profileName --public-access-block-configuration "file://$blockFile"
if ($LASTEXITCODE -ne 0) { throw "Public access block update failed." }

aws s3api delete-bucket-website --bucket $bucket --profile $profileName
if ($LASTEXITCODE -ne 0) { throw "Could not disable S3 website hosting." }

$corsFile = Join-Path $env:TEMP "noticeboard-tier3-cors.json"
@{
    ApiId = $apiId
    CorsConfiguration = @{
        AllowCredentials = $false
        AllowHeaders = @("content-type")
        AllowMethods = @("GET", "POST", "PUT", "DELETE", "OPTIONS")
        AllowOrigins = @(
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            $cloudfrontUrl
        )
        MaxAge = 600
    }
} | ConvertTo-Json -Depth 6 | Set-Content -Path $corsFile -Encoding ascii
aws apigatewayv2 update-api --profile $profileName --region $region --cli-input-json "file://$corsFile" --query "ApiId" --output text | Out-Null
if ($LASTEXITCODE -ne 0) { throw "API Gateway CORS update failed." }

Write-Output "distribution_id=$distributionId"
Write-Output "cloudfront_domain=$domain"
Write-Output "oac_id=$oacId"
Write-Output "status=reused-or-deployed"
