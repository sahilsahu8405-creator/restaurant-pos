@echo off
setlocal
title RestoHub POS - Android APK Build

echo ========================================================
echo   Building RestoHub POS Android APK
echo ========================================================
echo.

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo 1. Building React web assets and syncing with Android project...
cd /d "%~dp0\.."
call npm run android:sync
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 2. Compiling Android APK with Gradle...
cd android
call gradlew.bat assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gradle build failed.
    pause
    exit /b %ERRORLEVEL%
)

cd ..
if not exist "public\downloads" mkdir "public\downloads"
if not exist "dist\downloads" mkdir "dist\downloads"
copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "public\downloads\RestoHub-POS.apk"
copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "dist\downloads\RestoHub-POS.apk"

echo.
echo ========================================================
echo   SUCCESS! RestoHub POS Android APK generated:
echo   - android\app\build\outputs\apk\debug\app-debug.apk
echo   - public\downloads\RestoHub-POS.apk (Ready on Website!)
echo ========================================================
echo.
pause
