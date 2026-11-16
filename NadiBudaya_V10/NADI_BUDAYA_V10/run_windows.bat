@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Dependensi belum dipasang.
  echo Jalankan setup_windows.bat satu kali terlebih dahulu.
  pause
  exit /b 1
)
if not defined NADI_GURU_PIN set "NADI_GURU_PIN=2468"
set "NADI_CAMERA_BACKEND=browser"
echo Membuka NADI BUDAYA V10 di http://127.0.0.1:8010
echo Kamera menggunakan webcam browser pada perangkat ini.
echo Tekan CTRL+C untuk menghentikan server.
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010
pause
