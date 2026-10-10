@echo off
TITLE LinguaDoc - Universal Document Translator
echo ==========================================================
echo   Meluncurkan LinguaDoc Desktop (Windows)
echo ==========================================================

cd /d "%~dp0backend"

:: Cek Python Virtualenv
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

echo [+] Menjalankan server backend LinguaDoc di latar belakang...
start /B "" %PYTHON_EXE% -m uvicorn main:app --host 0.0.0.0 --port 8000

echo [+] Menunggu inisialisasi server (3 detik)...
timeout /t 3 /nobreak >nul

echo [+] Membuka aplikasi LinguaDoc dalam mode jendela mandiri...
:: Coba buka Microsoft Edge dalam mode App
where msedge >nul 2>nul
if %errorlevel% equ 0 (
    start msedge --app=http://127.0.0.1:8000
    goto DONE
)

:: Coba buka Google Chrome dalam mode App
where chrome >nul 2>nul
if %errorlevel% equ 0 (
    start chrome --app=http://127.0.0.1:8000
    goto DONE
)

:: Jika tidak ada, gunakan browser default
start http://127.0.0.1:8000

:DONE
echo [OK] LinguaDoc berhasil diluncurkan! Jendela ini dapat ditutup.
