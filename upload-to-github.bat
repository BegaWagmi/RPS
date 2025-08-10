@echo off
echo ========================================
echo    KalKal Game - GitHub Upload Script
echo ========================================
echo.

echo Please enter your GitHub repository URL:
echo (Example: https://github.com/username/repository-name.git)
echo.
set /p repo_url="Repository URL: "

if "%repo_url%"=="" (
    echo Error: No repository URL provided!
    pause
    exit /b 1
)

echo.
echo Adding remote origin...
git remote add origin %repo_url%

echo.
echo Renaming branch to main...
git branch -M main

echo.
echo Pushing to GitHub...
git push -u origin main

echo.
echo ========================================
echo Upload complete! Check your GitHub page.
echo ========================================
pause
