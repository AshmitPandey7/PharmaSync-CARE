@echo off
echo ========================================================
echo       Starting PharmaSync CARE Healthcare Platform
echo ========================================================
echo.
echo [*] Starting Unified Flask Server on http://localhost:5000 ...
echo [*] (Serving Frontend Web App, REST API, and Database)
echo.
start cmd /k "python backend/run.py"
timeout /t 2 >nul
echo.
echo [*] Opening PharmaSync CARE in default browser...
start http://localhost:5000/#/dashboard
echo.
echo ========================================================
echo PharmaSync CARE is online:
echo Unified Web Platform: http://localhost:5000
echo ========================================================
echo.
pause
