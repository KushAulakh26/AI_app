param(
  [switch]$Public,
  [int]$Port = 8000,
  [int]$PbPort = 7000
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$PbBin = Join-Path $Root "bin\pocketbase.exe"
$PbDir = Join-Path $Root "pocketbase"
$PbLogs = Join-Path $PbDir "logs"
$EnvFile = Join-Path $Root ".env.local"
New-Item -ItemType Directory -Force -Path $PbDir, (Join-Path $PbDir "pb_data"), (Join-Path $PbDir "pb_hooks"), (Join-Path $PbDir "pb_migrations"), $PbLogs | Out-Null

function Import-DotEnv {
  if (-not (Test-Path $EnvFile)) { Write-Host "WARNING: .env.local not found."; return }
  Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if (!$line -or $line.StartsWith("#") -or !$line.Contains("=")) { return }
    $idx = $line.IndexOf("=")
    $name = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim().Trim('"')
    if ($name) { [Environment]::SetEnvironmentVariable($name, $value, "Process") }
  }
}

function Set-DotEnvValue([string]$Name, [string]$Value) {
  if (-not (Test-Path $EnvFile)) { return }
  $found = $false
  $out = foreach ($line in @(Get-Content $EnvFile)) {
    if ($line -match "^\s*$([regex]::Escape($Name))\s*=") { $found = $true; "$Name=$Value" } else { $line }
  }
  if (-not $found) { $out += "$Name=$Value" }
  $out | Set-Content -Path $EnvFile -Encoding UTF8
}

Import-DotEnv
if (!(Test-Path $PbBin)) { throw "PocketBase binary missing at $PbBin" }

$cf = $null
if ($Public) {
  $cfExe = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
  if (-not $cfExe -and (Test-Path "C:\Program Files (x86)\cloudflared\cloudflared.exe")) { $cfExe = "C:\Program Files (x86)\cloudflared\cloudflared.exe" }
  if (-not $cfExe) {
    Write-Host "WARNING: cloudflared not found. Public image/video generation will be unavailable."
  } else {
    $cfLog = Join-Path $PbLogs ("cloudflared-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")
    $cf = Start-Process -FilePath $cfExe -ArgumentList @("tunnel", "--url", "http://127.0.0.1:$PbPort", "--logfile", $cfLog) -WindowStyle Hidden -PassThru
    $publicUrl = $null
    for ($i = 0; $i -lt 40; $i++) {
      Start-Sleep -Seconds 1
      if (Test-Path $cfLog) {
        $match = Select-String -Path $cfLog -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($match) { $publicUrl = $match.Matches.Value; break }
      }
    }
    if ($publicUrl) {
      [Environment]::SetEnvironmentVariable("PUBLIC_ASSET_BASE_URL", $publicUrl, "Process")
      Set-DotEnvValue "PUBLIC_ASSET_BASE_URL" $publicUrl
      Write-Host "Public assets: $publicUrl"
    } else { Write-Host "WARNING: tunnel hostname was not found in $cfLog" }
  }
}

$PbArgs = @("serve", "--http=127.0.0.1:$PbPort", "--dir=$(Join-Path $PbDir 'pb_data')", "--hooksDir=$(Join-Path $PbDir 'pb_hooks')", "--migrationsDir=$(Join-Path $PbDir 'pb_migrations')")
$pb = Start-Process -FilePath $PbBin -ArgumentList $PbArgs -WorkingDirectory $PbDir -RedirectStandardOutput (Join-Path $PbLogs "stdout.log") -RedirectStandardError (Join-Path $PbLogs "stderr.log") -PassThru
try {
  for ($i = 0; $i -lt 30; $i++) {
    if ($pb.HasExited) { Get-Content (Join-Path $PbLogs "stderr.log") -Tail 40; throw "PocketBase failed to start. Is port $PbPort free?" }
    try { if ((Invoke-RestMethod "http://127.0.0.1:$PbPort/api/health" -TimeoutSec 1).code -eq 200) { break } } catch {}
    Start-Sleep -Seconds 1
  }
  Write-Host "App:        http://127.0.0.1:$Port"
  Write-Host "PocketBase: http://127.0.0.1:$PbPort"
  & pnpm install | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "pnpm install failed." }
  & pnpm exec vite --host 127.0.0.1 --port $Port
} finally {
  if ($pb -and !$pb.HasExited) { Stop-Process -Id $pb.Id -Force }
  if ($cf -and !$cf.HasExited) { Stop-Process -Id $cf.Id -Force }
}
