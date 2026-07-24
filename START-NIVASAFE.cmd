@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Checking NIVASafe XAMPP patch...
findstr /C:"NIVASafe XAMPP development startup" "%~dp0scripts\start-dev.ps1" >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: The XAMPP patch is not installed in this project root.
  echo Extract the ZIP contents directly into: %CD%
  echo Do not copy the outer ZIP folder into the project.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-dev.ps1"
if errorlevel 1 (
  echo.
  echo NIVASafe could not start. Read the red error above.
)
pause
