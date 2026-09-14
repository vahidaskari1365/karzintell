@echo off
REM ============================================================================
REM  Karzintell CI Listener — Windows Launcher
REM
REM  این فایل را دابل‌کلیک کنید تا CI listener شروع شود.
REM  پنجره را باز نگه دارید تا webhook ها را دریافت کند.
REM
REM  برای exit: Ctrl+C بزنید یا پنجره را ببندید.
REM ============================================================================

title Karzintell CI Listener

echo.
echo ============================================
echo   Karzintell CI Listener
echo ============================================
echo.

REM Check if node is installed
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 20+ from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if .env.local exists
if not exist "%~dp0..\.env.local" (
    echo [ERROR] .env.local not found!
    echo.
    echo Please create .env.local in project root with:
    echo   SMEE_URL=https://smee.io/your-channel
    echo   WEBHOOK_SECRET=your-webhook-secret
    echo   SSH_HOST=linux25.centraldnserver.com
    echo   SSH_PORT=22
    echo   SSH_USER=karzinte
    echo   SSH_PRIVATE_KEY_PATH=C:\Users\YOUR_USER\.ssh\karzintell_github_actions
    echo.
    pause
    exit /b 1
)

REM Run the listener
node "%~dp0ci-listener.js"

REM If listener exits, pause to show error
echo.
echo Listener exited. Press any key to close...
pause >nul
