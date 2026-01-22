@echo off
echo Starting local server...
echo Please ensure you have Node.js installed.
call npx -y http-server . -o -c-1
if %errorlevel% neq 0 (
    echo.
    echo Error: Failed to start server. Please check if Node.js is installed.
    pause
)
