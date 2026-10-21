@echo off
setlocal
title RestoHub POS - Android APK Build

echo ========================================================
echo   Building RestoHub POS Android APK
echo ========================================================
echo.

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"

rem Ensure large Windows zips are never in public/downloads during mobile build
if exist "public\downloads\*.zip" (
    if not exist "release" mkdir "release"
    move /y "public\downloads\*.zip" "release\" >nul 2>&1
)
if exist "dist\downloads\*.zip" del /f /q "dist\downloads\*.zip" >nul 2>&1

echo 1. Building React web assets and syncing with Android project...
cd /d "%~dp0\.."
call npm run android:sync
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web build failed.
    pause
    exit /b %ERRORLEVEL%
)

rem Remove nested downloads directory from android assets so APK doesn't bundle itself
if exist "android\app\src\main\assets\public\downloads" rmdir /s /q "android\app\src\main\assets\public\downloads" >nul 2>&1
rem Remove old APK file before packaging to avoid gradle appending
if exist "android\app\build\outputs\apk\debug\app-debug.apk" del /f /q "android\app\build\outputs\apk\debug\app-debug.apk" >nul 2>&1

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
