@echo off
REM Sauvegarde rapide Windows / XAMPP
setlocal
cd /d "%~dp0\.."

if not exist backups mkdir backups

set STAMP=%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set STAMP=%STAMP: =0%
set OUT=backups\100plusshop_%STAMP%.sql

REM Adapte le chemin si XAMPP est ailleurs
set MYSQLDUMP=C:\xampp\mysql\bin\mysqldump.exe

if not exist "%MYSQLDUMP%" (
  echo mysqldump introuvable: %MYSQLDUMP%
  echo Modifie le chemin dans scripts\backup-db.bat
  exit /b 1
)

"%MYSQLDUMP%" -u root 100plusshop_db > "%OUT%"
if errorlevel 1 (
  echo Echec de la sauvegarde
  exit /b 1
)

echo OK: %OUT%
endlocal
