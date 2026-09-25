$ErrorActionPreference = "Stop"
$Api = "http://127.0.0.1:5044/api/v1"
$Web = "http://127.0.0.1:5043"

function Ok($message) { Write-Host "[OK] $message" -ForegroundColor Green }
function Fail($message) { Write-Host "[FAIL] $message" -ForegroundColor Red; exit 1 }

try {
  $front = Invoke-WebRequest -Uri $Web -UseBasicParsing -TimeoutSec 10
  if ($front.StatusCode -ne 200) { Fail "Frontend returned HTTP $($front.StatusCode)" }
  Ok "Frontend is available on port 5043"
} catch { Fail "Frontend is not available on port 5043: $($_.Exception.Message)" }

try {
  $health = Invoke-RestMethod -Uri "$Api/health" -TimeoutSec 10
  if ($health.data.status -ne "healthy" -or $health.data.database -ne "up") { Fail "Backend health or database is not ready" }
  Ok "Backend and MySQL are healthy on port 5044"
} catch { Fail "Backend health check failed: $($_.Exception.Message)" }

try {
  $loginBody = @{ email = "admin@nivasafe.local"; password = "Demo123!" } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri "$Api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 15
  $token = $login.data.accessToken
  $orgId = $login.data.organizations[0].id
  if (-not $token -or -not $orgId) { Fail "Login response does not contain token or organization" }
  Ok "Login endpoint and seeded admin account are working"
} catch { Fail "Login failed: $($_.Exception.Message)" }

$headers = @{ Authorization = "Bearer $token"; "x-organization-id" = $orgId }
$paths = @(
  "/dashboard", "/projects", "/processes", "/activities", "/fmea", "/rula",
  "/actions", "/files", "/knowledge", "/notifications", "/members", "/activity-log", "/audit",
  "/profile", "/ai/requests", "/chat/conversations"
)

foreach ($path in $paths) {
  try {
    $null = Invoke-RestMethod -Uri "$Api$path" -Headers $headers -TimeoutSec 15
    Ok "GET $path"
  } catch { Fail "GET $path failed: $($_.Exception.Message)" }
}

try {
  $fmeas = Invoke-RestMethod -Uri "$Api/fmea" -Headers $headers
  if ($fmeas.data.Count -gt 0) {
    $id = $fmeas.data[0].id
    $report = Invoke-WebRequest -Uri "$Api/reports/fmea/$id.pdf" -Headers $headers -UseBasicParsing -TimeoutSec 20
    if ($report.StatusCode -eq 200) { Ok "FMEA PDF report endpoint" }
  } else { Write-Host "[SKIP] FMEA report: no assessment exists" -ForegroundColor Yellow }
} catch { Fail "FMEA report endpoint failed: $($_.Exception.Message)" }

try {
  $rulas = Invoke-RestMethod -Uri "$Api/rula" -Headers $headers
  if ($rulas.data.Count -gt 0) {
    $id = $rulas.data[0].id
    $report = Invoke-WebRequest -Uri "$Api/reports/rula/$id.xlsx" -Headers $headers -UseBasicParsing -TimeoutSec 20
    if ($report.StatusCode -eq 200) { Ok "RULA Excel report endpoint" }
  } else { Write-Host "[SKIP] RULA report: no assessment exists" -ForegroundColor Yellow }
} catch { Fail "RULA report endpoint failed: $($_.Exception.Message)" }

Write-Host ""
Write-Host "NIVASafe runtime smoke test passed." -ForegroundColor Cyan
