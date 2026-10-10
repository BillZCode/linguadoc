#!/usr/bin/env bash
# ==============================================================================
# LinguaDoc — Linux Native Desktop Launcher & Desktop Entry Generator
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
PORT=8000
APP_URL="http://127.0.0.1:${PORT}"

echo "=========================================================="
echo "  🚀 Meluncurkan LinguaDoc — Universal Document Translator"
echo "=========================================================="

# 1. Pastikan virtual environment Python tersedia
if [ ! -d "${BACKEND_DIR}/.venv" ]; then
    echo "[+] Menyiapkan virtual environment Python..."
    python3 -m venv "${BACKEND_DIR}/.venv"
    "${BACKEND_DIR}/.venv/bin/pip" install --upgrade pip
    "${BACKEND_DIR}/.venv/bin/pip" install -r "${BACKEND_DIR}/requirements.txt"
fi

# 2. Cek apakah backend sudah berjalan di port 8000
SERVER_RUNNING=0
if curl -s "${APP_URL}/api/health" > /dev/null 2>&1; then
    SERVER_RUNNING=1
    echo "[✔] Backend LinguaDoc sudah aktif di ${APP_URL}."
else
    echo "[+] Menjalankan server backend LinguaDoc di latar belakang..."
    cd "${BACKEND_DIR}"
    "${BACKEND_DIR}/.venv/bin/python" -m uvicorn main:app --host 127.0.0.1 --port ${PORT} > /dev/null 2>&1 &
    BACKEND_PID=$!
    
    # Tunggu sampai server siap
    for i in {1..30}; do
        if curl -s "${APP_URL}/api/health" > /dev/null 2>&1; then
            echo "[✔] Backend siap (PID: ${BACKEND_PID})."
            SERVER_RUNNING=1
            break
        fi
        sleep 0.5
    done
fi

if [ ${SERVER_RUNNING} -eq 0 ]; then
    echo "[!] Gagal menghubungkan ke backend. Silakan periksa log."
    exit 1
fi

# 3. Buat file .desktop agar muncul di menu aplikasi Linux (jika belum ada)
DESKTOP_DIR="${HOME}/.local/share/applications"
if [ -d "${DESKTOP_DIR}" ] && [ ! -f "${DESKTOP_DIR}/linguadoc.desktop" ]; then
    echo "[+] Mendaftarkan LinguaDoc ke Menu Aplikasi Linux..."
    cat <<EOF > "${DESKTOP_DIR}/linguadoc.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=LinguaDoc
Comment=Universal Structure-Preserving Document Translator
Exec=${SCRIPT_DIR}/run-linux.sh
Icon=${FRONTEND_DIR}/public/favicon.svg
Terminal=false
Categories=Office;Utility;
StartupWMClass=linguadoc
EOF
    chmod +x "${DESKTOP_DIR}/linguadoc.desktop"
fi

# 4. Buka LinguaDoc dalam mode Standalone App Window (Chrome/Brave/Edge) atau Browser Default
echo "[+] Membuka antarmuka aplikasi LinguaDoc..."

if command -v google-chrome > /dev/null 2>&1; then
    google-chrome --app="${APP_URL}" > /dev/null 2>&1 &
elif command -v chromium > /dev/null 2>&1; then
    chromium --app="${APP_URL}" > /dev/null 2>&1 &
elif command -v brave-browser > /dev/null 2>&1; then
    brave-browser --app="${APP_URL}" > /dev/null 2>&1 &
elif command -v microsoft-edge > /dev/null 2>&1; then
    microsoft-edge --app="${APP_URL}" > /dev/null 2>&1 &
elif command -v xdg-open > /dev/null 2>&1; then
    xdg-open "${APP_URL}" > /dev/null 2>&1 &
else
    echo "Buka peramban Anda di: ${APP_URL}"
fi

echo "[✔] LinguaDoc berjalan di ${APP_URL}"
echo "Tekan Ctrl+C untuk keluar jika skrip ini dijalankan di terminal aktif."
