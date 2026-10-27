#Requires -Version 7.0
param([string]$BaseUrl = 'https://www.alphavipertrading.com', [Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
if (Test-Path -LiteralPath $OutputPath) { throw 'Choose a new evidence file.' }
$uri = [Uri]$BaseUrl
if ($uri.Scheme -ne 'https' -or $uri.Host -ne 'www.alphavipertrading.com') { throw 'Unexpected server destination.' }
$private = Join-Path $env:LOCALAPPDATA 'AVS_Research_Private/financial-operator.dpapi'
$token = [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($private), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser))
$body = @{corpCode='00126380';year='2025';report='11011';basis='CFS'} | ConvertTo-Json -Compress
$anonymous = Invoke-WebRequest "$BaseUrl/api/financial-research" -Method Post -ContentType 'application/json' -Body $body -SkipHttpErrorCheck
if ($anonymous.StatusCode -ne 401) { throw 'Anonymous financial access was not rejected.' }
$response = Invoke-WebRequest "$BaseUrl/api/financial-research" -Method Post -ContentType 'application/json' -Headers @{Authorization="Bearer $token"} -Body $body -SkipHttpErrorCheck
$operatorLeaked = $response.Content.Contains($token)
$token = $null
$data = $response.Content | ConvertFrom-Json
if ($response.StatusCode -notin @(200,503)) { throw "Unexpected authenticated response status: $($response.StatusCode)" }
if ($response.StatusCode -eq 503 -and $data.error -ne 'SERVER_NOT_CONFIGURED') { throw 'Unexpected unavailable state.' }
$metricCount = 0
if ($response.StatusCode -eq 200) {
    $allowed = @('schema','source','corpCode','businessYear','reportCode','statementBasis','currency','unit','duration','receiptId','collectedAt','usableFrom','originalFilingVerified','historicalBacktestAllowed','metrics','previous','missing','conflicts','note')
    if ($operatorLeaked -or @($data.PSObject.Properties.Name | Where-Object { $_ -notin $allowed }).Count) { throw 'Unexpected response field or exposed operator credential.' }
    if ($data.source -ne 'DART' -or $data.corpCode -ne '00126380' -or $data.receiptId -notmatch '^\d{14}$' -or $data.currency -ne 'KRW' -or $data.historicalBacktestAllowed -ne $false) { throw 'Financial response identity mismatch.' }
    $metricCount = @($data.metrics.PSObject.Properties | Where-Object { $null -ne $_.Value -and $_.Value -is [ValueType] }).Count
    if ($metricCount -lt 5) { throw 'Insufficient Samsung financial data.' }
}
$manifest = Invoke-RestMethod "$BaseUrl/mobile/update.json"
$download = Invoke-WebRequest "$BaseUrl/download"
$client = [Net.Http.HttpClient]::new()
try {
    $stream = $client.GetStreamAsync("$BaseUrl/downloads/mobile/AVS_Mobile_8.1.apk").GetAwaiter().GetResult()
    try { $apkHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)) }
    finally { $stream.Dispose() }
} finally { $client.Dispose() }
if ($apkHash -ne '94CCF144D78108E34D238062B57EC9115D0257ADC8C8E2EE479137163B626D80') { throw 'Published APK changed unexpectedly.' }
$result = [ordered]@{checked_at=[DateTimeOffset]::Now.ToString('o');base_url=$BaseUrl;anonymous_status=[int]$anonymous.StatusCode;
    authenticated_status=[int]$response.StatusCode;dart_connected=($response.StatusCode -eq 200);
    status=if($response.StatusCode -eq 200){'normalized_financial_response_verified'}else{'server_auth_verified_dart_key_missing'};
    response_field_allowlist_verified=($response.StatusCode -eq 200);operator_credential_returned=$operatorLeaked;
    normalized_metric_count=$metricCount;public_apk_sha256=$apkHash;download_status=[int]$download.StatusCode;mobile_version=$manifest.versionName;
    mobile_manifest=$manifest;device_installed=$false;play_submitted=$false}
$result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $OutputPath -Encoding utf8
$result | ConvertTo-Json -Depth 12
