@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=node"
node -v >nul 2>nul
if errorlevel 1 (
  set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

  if not exist "%NODE_EXE%" (
    echo Node.js nao foi encontrado.
    echo Instale o Node.js ou execute este app pelo ambiente do Codex.
    pause
    exit /b 1
  )
)

start "" "http://127.0.0.1:4173"
"%NODE_EXE%" server.js
pause
