@echo off
title Push Drive-Elite to GitHub
color 0B
cls
echo ===================================================================
echo               PUSH DRIVE-ELITE TO GITHUB
echo ===================================================================
echo.
echo Make sure you have created the empty repository on GitHub:
echo https://github.com/new (Repository name: Drive-Elite)
echo.
set PATH=C:\Users\PC\AppData\Local\Programs\Git\cmd;%PATH%
cd /d "C:\Users\PC\Desktop\Drive-Elite"

echo Pushing main branch to https://github.com/Riinaaann/Drive-Elite.git ...
echo If prompted, enter your GitHub Username and Personal Access Token (or sign in via browser).
echo.
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ===================================================================
    echo SUCCESS: Repository successfully pushed to GitHub!
    echo View at: https://github.com/Riinaaann/Drive-Elite
    echo ===================================================================
) else (
    echo.
    echo If push failed because repository does not exist yet:
    echo 1. Go to https://github.com/new and create "Drive-Elite".
    echo 2. Re-run this script.
)
pause
