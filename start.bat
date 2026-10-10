@echo off
cd /d "%~dp0"
title Server-Setup (lokale Vorschau)

if not exist "%~dp0server.ps1" (
  echo.
  echo  FEHLER: server.ps1 wurde nicht gefunden.
  echo  Bitte das ZIP vollstaendig entpacken und start.bat aus dem entpackten Ordner starten.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"

echo.
echo  Server beendet.
pause
