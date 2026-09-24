param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $ScriptArguments
)

$ErrorActionPreference = 'Stop'

$nginxRoot = 'C:\Runtime\nginx'
$nginx = Join-Path $nginxRoot 'nginx.exe'
$config = 'conf\nginx.conf'
$certificateDirectory = Join-Path $nginxRoot 'certs'
$certificateFile = Join-Path $certificateDirectory 'nivasafe-com-crt.pem'
$requiredFiles = @(
  'nivasafe-com-crt.pem',
  'nivasafe-com-key.pem',
  'nivasafe-com-chain.pem'
)

if (-not (Test-Path -LiteralPath $nginx -PathType Leaf)) {
  throw "Nginx executable was not found at $nginx."
}

foreach ($file in $requiredFiles) {
  $path = Join-Path $certificateDirectory $file
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Expected PEM file was not found at $path."
  }
}

$pem = [System.IO.File]::ReadAllText($certificateFile)
$match = [regex]::Match(
  $pem,
  '-----BEGIN CERTIFICATE-----(.*?)-----END CERTIFICATE-----',
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)
if (-not $match.Success) {
  throw 'The renewed certificate PEM is invalid.'
}

$der = [Convert]::FromBase64String(($match.Groups[1].Value -replace '\s', ''))
$certificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($der)
$names = @($certificate.DnsNameList | ForEach-Object { $_.Unicode })
if ($names -notcontains 'app.nivasafe.com') {
  throw 'The renewed certificate does not cover app.nivasafe.com.'
}
if ($certificate.NotAfter -le (Get-Date).AddDays(14)) {
  throw "The renewed certificate expires too soon: $($certificate.NotAfter.ToString('o'))."
}

& icacls.exe $certificateDirectory /inheritance:r /grant:r 'SYSTEM:(OI)(CI)(F)' 'Administrators:(OI)(CI)(F)' /T /C | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to restrict certificate file permissions.'
}

foreach ($file in Get-ChildItem -LiteralPath $certificateDirectory -File -Filter '*.pem') {
  & icacls.exe $file.FullName /grant:r 'SYSTEM:(F)' 'Administrators:(F)' /C | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to restrict permissions for $($file.Name)."
  }
}

function Invoke-NginxCommand {
  param(
    [string[]] $Arguments,
    [string] $FailureMessage
  )

  $token = [guid]::NewGuid().ToString('N')
  $stdoutPath = Join-Path $env:TEMP "NIVASafe-nginx-$token.out"
  $stderrPath = Join-Path $env:TEMP "NIVASafe-nginx-$token.err"
  try {
    $process = Start-Process -FilePath $nginx -ArgumentList $Arguments -WorkingDirectory $nginxRoot -Wait -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    if ($process.ExitCode -ne 0) {
      throw $FailureMessage
    }
  } finally {
    Remove-Item -LiteralPath $stdoutPath,$stderrPath -Force -ErrorAction SilentlyContinue
  }
}

Invoke-NginxCommand @('-p', $nginxRoot, '-c', $config, '-t') 'Nginx configuration validation failed.'
Invoke-NginxCommand @('-p', $nginxRoot, '-c', $config, '-s', 'reload') 'Nginx certificate reload failed.'
