$ErrorActionPreference = "Stop"
& (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "backend\scripts\build_lambda.ps1")
