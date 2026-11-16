$ErrorActionPreference = 'Stop'
$projectFolder = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$escapedFolder = $projectFolder.Replace("'", "''")
$profilePath = $PROFILE
$profileDir = Split-Path -Parent $profilePath
if (-not (Test-Path -LiteralPath $profileDir)) { New-Item -ItemType Directory -Path $profileDir -Force | Out-Null }
if (-not (Test-Path -LiteralPath $profilePath)) { New-Item -ItemType File -Path $profilePath -Force | Out-Null }
$current = Get-Content -LiteralPath $profilePath -Raw -ErrorAction SilentlyContinue
if ($null -eq $current) { $current = '' }
$current = [regex]::Replace($current, '(?ms)\r?\n?# NADI_BUDAYA_V10_BEGIN.*?# NADI_BUDAYA_V10_END\r?\n?', "`r`n")
$block = @"
# NADI_BUDAYA_V10_BEGIN
Remove-Item Alias:mulai -Force -ErrorAction SilentlyContinue
Remove-Item Function:mulai -Force -ErrorAction SilentlyContinue
function mulai {
    `$folder = '$escapedFolder'
    `$url = 'http://127.0.0.1:8010'
    `$launcher = Join-Path `$folder 'run_windows.bat'
    if (-not (Test-Path -LiteralPath `$launcher)) { Write-Host 'File run_windows.bat V10 tidak ditemukan.' -ForegroundColor Red; return }
    `$health = `$null
    try { `$health = Invoke-RestMethod -Uri (`$url + '/api/health') -TimeoutSec 2 } catch {}
    if (-not (`$health -and `$health.version -eq '10.0.0')) {
        Write-Host 'Menyalakan NADI BUDAYA V10...' -ForegroundColor Green
        Start-Process -FilePath `$env:ComSpec -ArgumentList @('/k', ('"' + `$launcher + '"')) -WorkingDirectory `$folder | Out-Null
        `$ready = `$false
        for (`$i = 0; `$i -lt 60; `$i++) {
            Start-Sleep -Seconds 1
            try { `$health = Invoke-RestMethod -Uri (`$url + '/api/health') -TimeoutSec 2; if (`$health.version -eq '10.0.0') { `$ready = `$true; break } } catch {}
        }
        if (-not `$ready) { Write-Host 'Server V10 belum siap. Periksa jendela server.' -ForegroundColor Red; return }
    }
    Write-Host 'NADI BUDAYA V10 siap. Membuka browser...' -ForegroundColor Green
    Start-Process `$url
}
# NADI_BUDAYA_V10_END
"@
Set-Content -LiteralPath $profilePath -Value ($current.TrimEnd() + "`r`n`r`n" + $block) -Encoding UTF8
Write-Host 'Perintah mulai khusus Nadi Budaya V10 berhasil dipasang.' -ForegroundColor Green
Write-Host 'Buka terminal PowerShell baru, lalu ketik: mulai' -ForegroundColor Cyan
