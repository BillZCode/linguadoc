# 🌐 Panduan Publikasi & Distribusi Multi-Platform LinguaDoc
**Universal Structure-Preserving Document Translator**  
*Tersedia untuk: Windows (PC/Laptop), Linux (Desktop), Android (Mobile), dan iOS (iPhone/iPad)*

---

## 📋 Daftar Isi
1. [Ringkasan Perbaikan Antarmuka (Toolbar Fix)](#1-ringkasan-perbaikan-antarmuka-toolbar-fix)
2. [Arsitektur Distribusi Mandiri (Single-Port Serving)](#2-arsitektur-distribusi-mandiri-single-port-serving)
3. [Panduan Windows Desktop](#3-panduan-windows-desktop)
4. [Panduan Linux Desktop](#4-panduan-linux-desktop)
5. [Panduan Mobile (Android & iOS)](#5-panduan-mobile-android--ios)
6. [Kompilasi Standalone Binary (Electron & Capacitor)](#6-kompilasi-standalone-binary-electron--capacitor)
7. [Ringkasan Skrip Otomatisasi](#7-ringkasan-skrip-otomatisasi)

---

## 1. Ringkasan Perbaikan Antarmuka (Toolbar Fix)

Pada versi sebelumnya, seluruh kontrol dokumen (Judul, Badge Format, Dropdown Bab, Kolom Pencarian, Mode Tampilan Split/Original/Translated, Tombol Graphify AST, Laporan Validasi, dan Tombol Download) berada dalam 1 baris fleksibel tunggal. Pada layar laptop dan desktop beresolusi sedang, hal ini menyebabkan tombol bertumpuk, terhimpit, dan tombol `Download` terdorong keluar dari layar.

### Solusi Desain Konsol Kontrol 2-Tingkat (2-Tier Console):
1. **Tier 1 (Informasi Dokumen & Aksi Utama):**
   - **Kiri:** Ikon Dokumen + Judul Dokumen (dengan truncate cerdas) + Badge Ekstensi (misal: `.EPUB`, `.DOCX`) + Indikator Jumlah Blok & Bab.
   - **Kanan:** Tombol Aksi Utama yang mudah diakses:
     - 🔮 **Graphify AST** (Visualisasi pohon hierarki dokumen)
     - 🛡️ **Report (100%)** (Laporan audit integritas struktur)
     - 📥 **Download .[FORMAT]** (Unduh dokumen hasil terjemahan)
2. **Tier 2 (Navigasi Bacaan & Filter Konten):**
   - **Kiri:** Dropdown Pemilihan Bab (Navigasi cepat per bab novel) + Kolom Pencarian Teks & ID Blok real-time.
   - **Kanan:** Segmented View Toggle (`Split View` | `Original` | `Translated`).
3. **Responsivitas:** Pada layar smartphone/tablet, kontrol otomatis menyesuaikan ke mode vertikal tanpa horizontal overflow.

---

## 2. Arsitektur Distribusi Mandiri (Single-Port Serving)

LinguaDoc dirancang dengan sistem **Zero-Config Standalone Deployment**:
- Backend FastAPI (Python) secara otomatis melayani aset antarmuka produksi React (Vite) langsung dari folder `frontend/dist` pada port tunggal: `http://127.0.0.1:8000`.
- Pengguna akhir tidak perlu menjalankan Node.js atau server Vite saat menggunakan aplikasi dalam mode produksi.
- Dilengkapi **Progressive Web App (PWA)** dengan Service Worker (`sw.js`) dan App Manifest (`manifest.json`) untuk caching aset dan peluncuran instan di smartphone maupun desktop.

---

## 3. Panduan Windows Desktop

Ada 3 cara menggunakan LinguaDoc di PC / Laptop Windows:

### Cara 1: One-Click Launcher (`run-windows.bat`) — *Paling Mudah*
1. Masuk ke folder proyek `scratch/linguadoc/`.
2. Klik dua kali berkas **`run-windows.bat`**.
3. Skrip akan secara otomatis:
   - Menjalankan backend server LinguaDoc di latar belakang.
   - Membuka LinguaDoc langsung dalam mode **Jendela Aplikasi Mandiri** (Edge/Chrome App Mode) tanpa bilah alamat browser.

### Cara 2: Pasang via Microsoft Edge / Chrome (PWA)
1. Jalankan `run-windows.bat` atau buka `http://127.0.0.1:8000` di peramban Edge atau Chrome.
2. Di bilah alamat (address bar) sebelah kanan, klik ikon **"Pasang LinguaDoc" / "Install App"** (atau tekan tombol **"Pasang App"** di bilah navigasi atas).
3. Klik **Install**.
4. LinguaDoc akan otomatis terpasang di Start Menu, Taskbar, dan Desktop Windows Anda layaknya software `.exe` bawaan.

### Cara 3: Build Installer Mandiri (.exe) via Electron
Jika ingin mendistribusikan berkas `.exe` resmi:
```cmd
cd scratch/linguadoc/electron
npm run build:win
```
Hasil installer NSIS dan portable `.exe` akan tersimpan di folder `dist-desktop/`.

---

## 4. Panduan Linux Desktop

### Cara 1: Launcher Skrip Bawaan (`run-linux.sh`)
1. Buka terminal di folder proyek:
   ```bash
   chmod +x run-linux.sh
   ./run-linux.sh
   ```
2. Skrip akan:
   - Memeriksa & mengaktifkan virtual environment Python.
   - Menjalankan server uvicorn di latar belakang jika belum aktif.
   - **Mendaftarkan LinguaDoc ke Menu Aplikasi Linux** (`~/.local/share/applications/linguadoc.desktop`), sehingga LinguaDoc muncul di pencarian aplikasi Ubuntu/GNOME/KDE.
   - Meluncurkan antarmuka dalam mode aplikasi jendela desktop.

### Cara 2: Pasang PWA di Linux
- Buka `http://127.0.0.1:8000` di Google Chrome, Brave, atau Chromium.
- Klik tombol **"Pasang App"** di navbar atas > **"Pasang Sekarang"**.

### Cara 3: Build Paket .AppImage & .deb via Electron
```bash
cd scratch/linguadoc/electron
npm run build:linux
```
Hasil berkas `.AppImage` dan `.deb` yang dapat langsung diinstal di distro Linux (Ubuntu, Debian, Arch, Fedora) akan berada di `dist-desktop/`.

---

## 5. Panduan Mobile (Android & iOS)

### Opsi A: Instalasi Instan PWA (Sangat Direkomendasikan)
Tidak memerlukan unduhan berkas APK besar atau instalasi rumit dari Play Store:

#### Untuk Android (Chrome / Brave / Samsung Internet):
1. Buka alamat LinguaDoc (misalnya alamat IP laptop di jaringan WiFi yang sama: `http://192.168.x.x:8000`, atau tautan domain Anda).
2. Tekan menu titik tiga (⋮) di pojok kanan atas browser.
3. Pilih menu **"Pasang Aplikasi"** atau **"Tambahkan ke Layar Utama"**.
4. Ikon LinguaDoc akan muncul di app drawer & layar utama Android. Aplikasi berjalan secara fullscreen dengan performa native.

#### Untuk iOS (iPhone & iPad Safari):
1. Buka tautan LinguaDoc di peramban **Safari**.
2. Tekan tombol **Bagikan (Share)** (ikon kotak dengan panah ke atas di bagian bawah layar).
3. Gulir ke bawah lalu pilih **"Tambah ke Layar Utama" (Add to Home Screen)**.
4. Tekan **Tambah**. LinguaDoc siap digunakan dengan mode fullscreen tanpa URL bar.

---

### Opsi B: Build Native Android APK (Capacitor)
Proyek ini sudah terintegrasi penuh dengan **Capacitor Android**:
1. Jalankan skrip sinkronisasi mobile:
   ```bash
   ./package-mobile.sh
   ```
2. Buka folder `scratch/linguadoc/frontend/android` di **Android Studio**.
3. Pilih menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. Berkas `app-debug.apk` atau `app-release.apk` siap dipasang langsung di perangkat Android apapun.

---

## 6. Kompilasi Standalone Binary (Electron & Capacitor)

| Platform | Format Keluaran | Lokasi Perintah | Perintah Build |
| :--- | :--- | :--- | :--- |
| **Windows** | `LinguaDoc Setup.exe` (NSIS) | `scratch/linguadoc/electron` | `npm run build:win` |
| **Linux** | `LinguaDoc.AppImage` & `.deb` | `scratch/linguadoc/electron` | `npm run build:linux` |
| **Android** | `app-debug.apk` / `.aab` | `scratch/linguadoc/frontend` | `npx cap sync android` lalu build via Android Studio / Gradle |
| **Portable** | Folder paket mandiri siap pakai | `scratch/linguadoc` | `./package-desktop.sh` |

---

## 7. Ringkasan Skrip Otomatisasi

Semua skrip di bawah ini sudah tersedia dan siap dieksekusi:

| Berkas Skrip | Fungsi Utama |
| :--- | :--- |
| **`run-linux.sh`** | Menjalankan backend + mendaftarkan icon desktop Linux + membuka jendela app. |
| **`run-windows.bat`** | Menjalankan backend + membuka jendela app mandiri di Edge/Chrome Windows. |
| **`package-desktop.sh`** | Membangun frontend dan mengemas distribusi portabel `dist-portable/`. |
| **`package-mobile.sh`** | Sinkronisasi aset frontend ke proyek native Android Capacitor. |

---
*Dibuat oleh Tim LinguaDoc — Solusi Penerjemahan Dokumen Presisi Tinggi Lintas Platform.*
