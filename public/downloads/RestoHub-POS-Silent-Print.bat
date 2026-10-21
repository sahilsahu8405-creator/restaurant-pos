@echo off
title RestoHub POS - Direct Silent Printing Mode
echo Launching RestoHub POS in Zero-Preview Silent Printing Mode...
where chrome >nul 2>&1
if %errorlevel% equ 0 (
  start "" chrome.exe --kiosk-printing --app=https://restaurant-pos-gilt-seven.vercel.app/app
  exit
)

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=https://restaurant-pos-gilt-seven.vercel.app/app
  exit
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=https://restaurant-pos-gilt-seven.vercel.app/app
  exit
)

if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
  start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=https://restaurant-pos-gilt-seven.vercel.app/app
  exit
)

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app=https://restaurant-pos-gilt-seven.vercel.app/app
  exit
)

start "" https://restaurant-pos-gilt-seven.vercel.app/app
exit
