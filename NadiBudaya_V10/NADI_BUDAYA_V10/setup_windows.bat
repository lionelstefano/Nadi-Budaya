@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo             SETUP NADI BUDAYA V10
echo ============================================
py -3.11 --version >nul 2>&1
if errorlevel 1 (
  echo Python 3.11 tidak ditemukan. Instal Python 3.11 64-bit dan centang Add Python to PATH.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo Membuat virtual environment...
  py -3.11 -m venv .venv
  if errorlevel 1 goto :error
)
echo Memperbarui pip...
.venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 goto :error
echo Memasang dependensi lokal, termasuk FastAPI dan MediaPipe untuk opsi kamera Python...
.venv\Scripts\python.exe -m pip install -r requirements-local.txt
if errorlevel 1 goto :error
echo.
echo Setup selesai. Jalankan run_windows.bat untuk membuka Nadi Budaya V10.
pause
exit /b 0
:error
echo.
echo Setup gagal. Periksa koneksi internet dan pesan error di atas.
pause
exit /b 1
