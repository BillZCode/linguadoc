#!/usr/bin/env bash
# ==============================================================================
# LinguaDoc — Script Unggah ke GitHub & Pemicu Rilis Otomatis (APK & EXE)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo "=========================================================="
echo "  🚀 Unggah LinguaDoc ke GitHub & Build Otomatis (APK & EXE)"
echo "=========================================================="

REPO_URL="https://github.com/BillZCode/linguadoc.git"

# 1. Cek apakah token ada di environment atau ~/.env
TOKEN=""
if [ -f "${HOME}/.env" ]; then
    TOKEN=$(grep -E "^GITHUB_TOKEN=" "${HOME}/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "${TOKEN}" ]; then
    echo "Untuk mengunggah langsung ke GitHub, diperlukan GitHub Personal Access Token."
    echo "(Buka https://github.com/settings/tokens untuk membuat token dengan izin 'repo')"
    echo ""
    printf "Masukkan GitHub Token Anda (ketikan tidak akan terlihat): "
    read -s TOKEN
    echo ""
fi

if [ -z "${TOKEN}" ]; then
    echo "[!] Token tidak boleh kosong. Dibatalkan."
    exit 1
fi

echo "[+] Menyimpan kredensial ke Git credential store..."
git config --global credential.helper store
echo "https://${TOKEN}@github.com" > "${HOME}/.git-credentials"
chmod 600 "${HOME}/.git-credentials"

echo "[+] Mengunggah kode sumber ke GitHub (cabang main)..."
git push "https://${TOKEN}@github.com/BillZCode/linguadoc.git" main

echo "[+] Membuat dan mengunggah tag rilis v1.0.0..."
git tag -f v1.0.0
git push -f "https://${TOKEN}@github.com/BillZCode/linguadoc.git" v1.0.0

echo ""
echo "=========================================================="
echo "  🎉 BERHASIL DIUNGGAH KE GITHUB!"
echo "=========================================================="
echo "Repositori: https://github.com/BillZCode/linguadoc"
echo ""
echo "GitHub Actions CI/CD sekarang sedang otomatis mengompilasi:"
echo "  1. Berkas Android: LinguaDoc-v1.0.0.apk"
echo "  2. Berkas Windows: LinguaDoc-Setup.exe & LinguaDoc-Portable.exe"
echo "  3. Berkas Linux:   LinguaDoc-1.0.0.AppImage"
echo ""
echo "Pengguna dapat mengunduh langsung di halaman Releases:"
echo "👉 https://github.com/BillZCode/linguadoc/releases"
echo "=========================================================="
