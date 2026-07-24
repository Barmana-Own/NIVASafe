$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "NIVASafe XAMPP development startup" -ForegroundColor Cyan
Write-Host "Docker is disabled for local development. XAMPP MySQL/MariaDB is used." -ForegroundColor DarkCyan
Write-Host "Frontend: 5043 | Backend: 5044 | MySQL: 3306" -ForegroundColor DarkCyan

if (-not (Test-Path "package.json") -or -not (Test-Path "apps/api/prisma/schema.prisma")) {
    throw "This script is not located inside the NIVASafe project root."
}

function Set-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Name,
        [AllowEmptyString()][string]$Value
    )

    $line = "$Name=$Value"
    $content = if (Test-Path $Path) { Get-Content $Path -Raw } else { "" }
    $pattern = "(?m)^" + [Regex]::Escape($Name) + "=.*$"

    if ([Regex]::IsMatch($content, $pattern)) {
        $content = [Regex]::Replace(
            $content,
            $pattern,
            [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $line }
        )
    } else {
        if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { $content += "`r`n" }
        $content += "$line`r`n"
    }

    $absolutePath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $Path))
    [System.IO.File]::WriteAllText($absolutePath, $content, [System.Text.UTF8Encoding]::new($false))
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example" -ForegroundColor Yellow
}

# Force the local XAMPP profile while preserving unrelated secrets and AI settings.
Set-DotEnvValue ".env" "NODE_ENV" "development"
Set-DotEnvValue ".env" "APP_URL" "http://localhost:5043"
Set-DotEnvValue ".env" "API_URL" "http://localhost:5044/api/v1"
Set-DotEnvValue ".env" "VITE_API_URL" "http://localhost:5044/api/v1"
Set-DotEnvValue ".env" "PORT" "5044"
Set-DotEnvValue ".env" "DATABASE_URL" "mysql://root@127.0.0.1:3306/nivasafe"
Set-DotEnvValue ".env" "XAMPP_MYSQL_HOST" "127.0.0.1"
Set-DotEnvValue ".env" "XAMPP_MYSQL_PORT" "3306"
Set-DotEnvValue ".env" "XAMPP_MYSQL_DATABASE" "nivasafe"
Set-DotEnvValue ".env" "XAMPP_MYSQL_USER" "root"
Set-DotEnvValue ".env" "XAMPP_MYSQL_PASSWORD" ""
Set-DotEnvValue ".env" "REDIS_URL" ""
Set-DotEnvValue ".env" "S3_ENDPOINT" ""
Set-DotEnvValue ".env" "LOCAL_UPLOAD_DIR" "uploads"

# Prisma CLI runs from apps/api in this pnpm workspace and does not reliably load
# the monorepo root .env. Keep a local copy beside the API package and also export
# the variables to the current process so Prisma, the API and Turbo inherit them.
Copy-Item ".env" "apps/api/.env" -Force
$env:NODE_ENV = "development"
$env:APP_URL = "http://localhost:5043"
$env:API_URL = "http://localhost:5044/api/v1"
$env:VITE_API_URL = "http://localhost:5044/api/v1"
$env:PORT = "5044"
$env:DATABASE_URL = "mysql://root@127.0.0.1:3306/nivasafe"
$env:REDIS_URL = ""
$env:S3_ENDPOINT = ""
$env:LOCAL_UPLOAD_DIR = "uploads"
Write-Host "Prisma environment prepared for XAMPP MySQL." -ForegroundColor Green

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    throw "Node.js 22 or newer is required."
}
if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
    throw "npx.cmd was not found. Reinstall Node.js and include npm."
}

$nodeVersionText = (& node.exe --version).Trim().TrimStart("v")
$nodeMajor = [int]($nodeVersionText.Split(".")[0])
if ($nodeMajor -lt 22) {
    throw "Node.js 22 or newer is required. Current version: $nodeVersionText"
}
Write-Host "Node.js $nodeVersionText detected." -ForegroundColor Green

# Use npx-hosted pnpm. This avoids Corepack trying to write into C:\Program Files\nodejs,
# which caused the EPERM error on this Windows installation.
function Invoke-Pnpm {
    param([Parameter(Mandatory = $true)][string[]]$PnpmArguments)

    & npx.cmd --yes pnpm@10.13.1 @PnpmArguments
    if ($LASTEXITCODE -ne 0) {
        throw "pnpm command failed: pnpm $($PnpmArguments -join ' ')"
    }
}

Write-Host "Checking pnpm without modifying Program Files..." -ForegroundColor Cyan
Invoke-Pnpm -PnpmArguments @("--version")

$mysqlHost = "127.0.0.1"
$mysqlPort = 3306
$mysqlDatabase = "nivasafe"
$mysqlUser = "root"
$mysqlPassword = ""

$mysqlReady = Test-NetConnection -ComputerName $mysqlHost -Port $mysqlPort -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $mysqlReady) {
    throw "XAMPP MySQL is not running on port 3306. Open XAMPP Control Panel, click Start next to MySQL, then run START-NIVASAFE-XAMPP.cmd again."
}
Write-Host "XAMPP MySQL is available on 127.0.0.1:3306." -ForegroundColor Green

$mysqlCandidates = @()
if ($env:XAMPP_HOME) { $mysqlCandidates += (Join-Path $env:XAMPP_HOME "mysql\bin\mysql.exe") }
$mysqlCandidates += @(
    "C:\xampp\mysql\bin\mysql.exe",
    "D:\xampp\mysql\bin\mysql.exe",
    "E:\xampp\mysql\bin\mysql.exe",
    "F:\xampp\mysql\bin\mysql.exe"
)
$mysqlExe = $mysqlCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $mysqlExe) {
    throw "mysql.exe was not found. Set XAMPP_HOME or install XAMPP in C:\xampp, D:\xampp, E:\xampp or F:\xampp."
}
Write-Host "Using MySQL client: $mysqlExe" -ForegroundColor Green

$sql = "CREATE DATABASE IF NOT EXISTS ``$mysqlDatabase`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
$mysqlArgs = @(
    "--host=$mysqlHost",
    "--port=$mysqlPort",
    "--user=$mysqlUser",
    "--default-character-set=utf8mb4",
    "--execute=$sql"
)
if ($mysqlPassword) { $mysqlArgs += "--password=$mysqlPassword" }

& $mysqlExe @mysqlArgs
if ($LASTEXITCODE -ne 0) {
    throw "Could not create or access database '$mysqlDatabase' in XAMPP MySQL."
}
Write-Host "Database '$mysqlDatabase' is ready." -ForegroundColor Green

Write-Host "Installing workspace dependencies..." -ForegroundColor Cyan
Invoke-Pnpm -PnpmArguments @("install", "--frozen-lockfile")

Write-Host "Generating Prisma client and syncing the MySQL schema..." -ForegroundColor Cyan
Invoke-Pnpm -PnpmArguments @("--filter", "@nivasafe/domain", "build")
Invoke-Pnpm -PnpmArguments @("--filter", "@nivasafe/api", "prisma:generate")
Invoke-Pnpm -PnpmArguments @("--filter", "@nivasafe/api", "prisma:migrate")
Invoke-Pnpm -PnpmArguments @("--filter", "@nivasafe/api", "prisma:seed")

Write-Host ""
Write-Host "Frontend: http://localhost:5043" -ForegroundColor Green
Write-Host "Backend:  http://localhost:5044/api/v1" -ForegroundColor Green
Write-Host "Health:   http://localhost:5044/api/v1/health" -ForegroundColor Green
Write-Host "API docs: http://localhost:5044/docs" -ForegroundColor Green
Write-Host "Login:    admin@nivasafe.local / Demo123!" -ForegroundColor Green
Write-Host "Uploads:  apps\api\uploads" -ForegroundColor Green
Write-Host ""

Invoke-Pnpm -PnpmArguments @("exec", "turbo", "dev")
