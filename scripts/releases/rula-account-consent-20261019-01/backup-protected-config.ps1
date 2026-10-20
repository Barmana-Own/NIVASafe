$ErrorActionPreference='Stop'
$releaseBackup='C:\ProgramData\NIVASafe\backups\release-rula-account-consent-20261019-01\config'
$releaseEvidence='C:\NIVASafe\reports\evidence\rula-account-consent-20261019-01'
$releaseSource='C:\NIVASafe\.env'
$releaseCopy=Join-Path $releaseBackup '.env'
$releaseState=Join-Path $releaseBackup 'runtime-state'
$releaseTarget=Join-Path $releaseState 'pm2-runtime.before.json'
if((Test-Path -LiteralPath $releaseCopy) -or (Test-Path -LiteralPath $releaseTarget)){throw 'Protected backup already exists; do not overwrite'}
New-Item -ItemType Directory -Path $releaseBackup -Force | Out-Null
& robocopy.exe 'C:\NIVASafe' $releaseBackup '.env' /COPY:DATS /DCOPY:T /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
if($LASTEXITCODE -gt 7){throw 'Protected environment backup failed'}
$releaseSourceAcl=Get-Acl -LiteralPath $releaseSource
$releaseCopyAcl=Get-Acl -LiteralPath $releaseCopy
if($releaseSourceAcl.GetSecurityDescriptorSddlForm('Access') -ne $releaseCopyAcl.GetSecurityDescriptorSddlForm('Access')){throw 'ACL preservation failed'}
if(@($releaseCopyAcl.Access|Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference.Value -notin @('NT AUTHORITY\SYSTEM','BUILTIN\Administrators') }).Count -gt 0){throw 'Unexpected protected backup principal'}
$releaseHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $releaseSource).Hash
if($releaseHash -ne (Get-FileHash -Algorithm SHA256 -LiteralPath $releaseCopy).Hash){throw 'Protected environment hash mismatch'}
New-Item -ItemType Directory -Path $releaseState -Force | Out-Null
& robocopy.exe 'C:\NIVASafe' $releaseState '.env' /COPY:DATS /DCOPY:T /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
if($LASTEXITCODE -gt 7){throw 'Protected runtime rollback template failed'}
Move-Item -LiteralPath (Join-Path $releaseState '.env') -Destination $releaseTarget
if((Get-Acl -LiteralPath $releaseTarget).GetSecurityDescriptorSddlForm('Access') -ne $releaseSourceAcl.GetSecurityDescriptorSddlForm('Access')){throw 'Protected runtime template ACL mismatch'}
[ordered]@{timestampUtc=[DateTime]::UtcNow.ToString('o');backup=$releaseCopy;runtimeSnapshot=$releaseTarget;accessAclMatches=$true;hashMatches=$true;readAccessRestrictedToSystemAdministrators=$true;sourceConfigurationChanged=$false;sha256=$releaseHash}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $releaseEvidence 'protected-config-backup.json') -Encoding utf8
Write-Output 'Protected backup and rollback template preserve original ACL and hashes; source settings unchanged.'
