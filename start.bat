@echo off
setlocal

set "ROOT=%~dp0"

echo Starting InterviewForge backend on http://localhost:4000 ...
start "InterviewForge Backend" cmd /k "cd /d ""%ROOT%backend"" && npm run dev"

echo Starting InterviewForge frontend on http://localhost:3000 ...
start "InterviewForge Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm run dev"

echo.
echo Backend health: http://localhost:4000/health
echo Frontend:       http://localhost:3000
echo.
echo Two terminal windows should now be open. Close them to stop the servers.

endlocal
