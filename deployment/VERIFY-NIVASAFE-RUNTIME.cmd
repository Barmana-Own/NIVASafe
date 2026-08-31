@echo off
setlocal
cd /d "%~dp0"
echo NIVASafe frontend/backend runtime verification
echo Frontend 5043 - Backend 5044 - XAMPP MySQL 3306
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\verify-runtime.ps1"
if errorlevel 1 (
  echo.
  echo Runtime verification failed.
  pause
  exit /b 1
)
echo.
pause
