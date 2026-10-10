#!/usr/bin/env bash
# ==============================================================================
# LinguaDoc — Script Pemaketan Aplikasi Mobile (Android & iOS via Capacitor)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"

echo "=========================================================="
echo "  📱 Pemaketan LinguaDoc untuk Mobile (Android)"
echo "=========================================================="

cd "${FRONTEND_DIR}"

echo "[1/3] Membangun aset web produksi (Vite)..."
npm run build

echo "[2/3] Sinkronisasi aset ke platform Capacitor Android..."
npx cap sync android

echo "[3/3] Proyek Android siap di: ${FRONTEND_DIR}/android"
echo ""
echo "Untuk menghasilkan berkas APK:"
echo "1. Buka folder '${FRONTEND_DIR}/android' di Android Studio, ATAU"
echo "2. Jalankan perintah berikut jika Android SDK & JDK sudah terpasang:"
echo "   cd ${FRONTEND_DIR}/android && ./gradlew assembleDebug"
echo "   (File APK akan tersimpan di: android/app/build/outputs/apk/debug/app-debug.apk)"
echo ""
echo "Catatan untuk Pengguna Ponsel Langsung (Tanpa Kompilasi):"
echo "Anda juga dapat memasang LinguaDoc secara instan sebagai PWA lewat Chrome / Safari"
echo "dengan membuka LinguaDoc dan memilih 'Tambahkan ke Layar Utama' / 'Pasang Aplikasi'."
echo "=========================================================="
