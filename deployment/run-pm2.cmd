@echo off
setlocal
cd /d C:\NIVASafe
set PM2_HOME=C:\ProgramData\NIVASafe\pm2
set PATH=C:\Runtime\node;%PATH%
if not exist C:\NIVASafe\backend\dist\server.js exit /b 1
if not exist C:\NIVASafe\deployment\ecosystem.config.cjs exit /b 1
rem Keep the supervisor attached to the scheduled task so Windows does not
rem terminate the PM2 daemon and its API child when the task action exits.
C:\Runtime\node\node.exe C:\Runtime\node\node_modules\pm2\bin\pm2-runtime C:\NIVASafe\deployment\ecosystem.config.cjs --only nivasafe-api
endlocal
