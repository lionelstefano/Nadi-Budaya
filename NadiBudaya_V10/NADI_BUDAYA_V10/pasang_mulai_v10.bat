@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo     PASANG PERINTAH MULAI - NADI BUDAYA V10
echo ============================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0pasang_mulai_v10.ps1"
if errorlevel 1 (
  echo Pemasangan perintah mulai gagal. Baca pesan di atas.
  pause
  exit /b 1
)
echo.
echo Selesai. Buka terminal PowerShell baru, lalu ketik: mulai
pause
