#Requires -Version 7.0
param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$site = Split-Path -Parent $PSScriptRoot
$project = Get-Content (Join-Path $site '.vercel/project.json') -Raw | ConvertFrom-Json
if ($project.projectId -ne 'prj_MsYsgRbBSKNmjPhWp0kJwv58ETtT' -or $project.projectName -ne 'avs') { throw 'Unexpected Vercel project.' }
$private = Join-Path $env:LOCALAPPDATA 'AVS_Research_Private'
$path = Join-Path $private 'financial-operator.dpapi'
if ($CheckOnly) {
    [ordered]@{operator_credential_saved=(Test-Path -LiteralPath $path);credential_printed=$false} | ConvertTo-Json
    exit
}
if (Test-Path -LiteralPath $path) { throw 'Operator credential already exists. Do not silently rotate it.' }
New-Item -ItemType Directory -Path $private -Force | Out-Null
$token = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$encrypted = [Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($token), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
[IO.File]::WriteAllBytes($path, $encrypted)
# Pipe directly to stdin; the credential is never placed in CLI arguments or command history.
$start = [Diagnostics.ProcessStartInfo]::new()
$start.FileName = 'cmd.exe'
$start.Arguments = '/d /c npx --yes vercel@64.7.0 env add FINANCIAL_RESEARCH_TOKEN production --type secret --scope alphavipertrading'
$start.WorkingDirectory = $site
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardInput = $true
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
$process = [Diagnostics.Process]::Start($start)
$process.StandardInput.WriteLine($token)
$process.StandardInput.Close()
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$text = ($stdout.Result + $stderr.Result).Replace($token, '[REDACTED]')
$token = $null
Write-Output $text
if ($process.ExitCode -ne 0) { throw 'Vercel secret registration failed; encrypted local recovery copy retained.' }
Write-Output 'Operator secret registered. Local recovery is Windows-user encrypted; do not include it in handoff.'
