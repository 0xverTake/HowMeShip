@echo off
echo Starting HowMeShip Bot and Web Panel...
echo.

REM Démarrer le serveur web en arrière-plan
echo Starting Web Panel...
start /B node web-panel.js

REM Attendre 2 secondes
timeout /t 2 /nobreak > nul

REM Démarrer le bot Discord
echo Starting Discord Bot...
node index.js

pause
