@echo off
REM Inicia el backend real en http://localhost:3000 y abre el juego
cd /d "%~dp0"
echo ============================================================
echo  HorseRace - API + Juego
echo ============================================================
echo.
echo Abriendo http://localhost:3000 en tu navegador...
echo (Deja esta ventana abierta mientras juegues; Ctrl+C para cerrar)
echo.

REM Abrir navegador en 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

if not exist node_modules (
    echo Instalando dependencias por primera vez...
    npm install
)

npm start
if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo  ERROR: Necesitas Node.js instalado
    echo  Descarga Node.js: https://nodejs.org/
    echo ============================================================
    pause
)
