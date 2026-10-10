#!/usr/bin/env bash
# ==============================================================================
# LinguaDoc — Script Pemaketan Aplikasi Desktop (Windows & Linux)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ELECTRON_DIR="${SCRIPT_DIR}/electron"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
DIST_PORTABLE="${SCRIPT_DIR}/dist-portable"

echo "=========================================================="
echo "  🖥️  Pemaketan LinguaDoc untuk Desktop (Windows & Linux)"
echo "=========================================================="

# 1. Pastikan frontend dist terbaru sudah dibangun
echo "[1/4] Membangun bundle produksi antarmuka web..."
cd "${FRONTEND_DIR}"
npm run build

# 2. Siapkan folder distribusi portabel yang ramping (tanpa .venv)
echo "[2/4] Menyiapkan paket mandiri portabel..."
rm -rf "${DIST_PORTABLE}"
mkdir -p "${DIST_PORTABLE}/backend"
mkdir -p "${DIST_PORTABLE}/frontend"

# Salin kode sumber backend (hanya file Python dan modul, tanpa venv/cache)
rsync -av --exclude='.venv' --exclude='__pycache__' --exclude='workspace' --exclude='storage' --exclude='tests' --exclude='.pytest_cache' "${SCRIPT_DIR}/backend/" "${DIST_PORTABLE}/backend/"

# Salin aset frontend yang telah dibuild
cp -r "${FRONTEND_DIR}/dist" "${DIST_PORTABLE}/frontend/dist"
cp -r "${FRONTEND_DIR}/public" "${DIST_PORTABLE}/frontend/public"

# Salin launcher 1-klik
cp "${SCRIPT_DIR}/run-linux.sh" "${DIST_PORTABLE}/"
cp "${SCRIPT_DIR}/run-windows.bat" "${DIST_PORTABLE}/"
chmod +x "${DIST_PORTABLE}/run-linux.sh"

echo "[3/4] Paket portabel siap di: ${DIST_PORTABLE}"
echo "      - Jalankan 'run-linux.sh' untuk Linux"
echo "      - Jalankan 'run-windows.bat' untuk Windows"

# 3. Info tentang kompilasi Electron Binary
echo ""
echo "[4/4] Opsi Kompilasi Standalone Binary (Electron Builder):"
echo "  Untuk Linux (.AppImage / .deb):"
echo "    cd ${ELECTRON_DIR} && npm run build:linux"
echo "  Untuk Windows (.exe installer / portable):"
echo "    cd ${ELECTRON_DIR} && npm run build:win"
echo "=========================================================="
