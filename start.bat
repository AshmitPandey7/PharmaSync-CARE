@echo off
echo ========================================================
echo       Starting PharmaSync CARE Healthcare Platform
echo ========================================================
echo.
echo [*] Starting Flask Backend & Web Server on port 5000...
start cmd /k "python backend/run.py"
echo [*] Starting Frontend Server on port 8080...
start cmd /k "python -m http.server 8080 --directory frontend"
timeout /t 2 >nul
echo.
echo [*] Opening PharmaSync CARE in default browser...
start http://localhost:8080/#/dashboard
echo.
echo PharmaSync CARE is online:
echo - Frontend & API: http://localhost:5000
echo - Frontend Server: http://localhost:8080
echo.
pause
