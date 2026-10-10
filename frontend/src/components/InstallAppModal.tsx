import React, { useState } from 'react';
import { 
  X, Smartphone, Monitor, Terminal, Download, 
  CheckCircle, Apple, Layers, Globe, ArrowRight, ShieldCheck 
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallPrompt: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'mobile' | 'windows' | 'linux'>('mobile');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 dark:border-zinc-800/80 flex items-center justify-between bg-stone-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C96442] flex items-center justify-center text-white shadow-md shadow-[#C96442]/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-editorial text-stone-900 dark:text-zinc-100">
                Publikasi & Pasang LinguaDoc App
              </h2>
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                Gunakan sebagai aplikasi native di Windows, Linux, Android, dan iOS
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Install PWA Banner (if available) */}
        {deferredPrompt && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#C96442]/10 to-amber-500/10 border border-[#C96442]/20 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <p className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                  Perangkat Anda Mendukung Instalasi Instan (PWA)
                </p>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-zinc-400 mt-0.5">
                Pasang langsung ke layar utama tanpa perlu buka browser lagi.
              </p>
            </div>
            <button
              onClick={onInstallPrompt}
              className="px-4 py-2 rounded-xl bg-[#C96442] hover:bg-[#b05335] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pasang Sekarang</span>
            </button>
          </div>
        )}

        {/* Platform Selector Tabs */}
        <div className="px-6 pt-4 border-b border-stone-100 dark:border-zinc-800 flex space-x-2">
          <button
            onClick={() => setActiveTab('mobile')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'mobile'
                ? 'border-[#C96442] text-[#C96442]'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Mobile (Android & iOS)</span>
          </button>
          <button
            onClick={() => setActiveTab('windows')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'windows'
                ? 'border-[#C96442] text-[#C96442]'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-zinc-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Windows (PC / Laptop)</span>
          </button>
          <button
            onClick={() => setActiveTab('linux')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'linux'
                ? 'border-[#C96442] text-[#C96442]'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Linux (.sh & AppImage)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">

          {/* MOBILE TAB */}
          {activeTab === 'mobile' && (
            <div className="space-y-4">
              
              {/* Android Guide */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-800/50 space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    🤖
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900 dark:text-zinc-100">Android (Chrome / Brave / Samsung Internet)</h3>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400">Instalasi instan menjadi aplikasi mandiri di ponsel</p>
                  </div>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                  <li>Buka tautan LinguaDoc di browser Chrome ponsel Anda.</li>
                  <li>Tekan menu titik tiga (⋮) di pojok kanan atas browser.</li>
                  <li>Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Instal Aplikasi"</strong>.</li>
                  <li>Ikon <strong>LinguaDoc</strong> akan muncul di beranda ponsel Anda dan dapat dibuka secara fullscreen tanpa bilah URL browser.</li>
                </ol>
              </div>

              {/* iOS Guide */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-800/50 space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                    <Apple className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900 dark:text-zinc-100">iOS (iPhone & iPad Safari)</h3>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400">Jalankan seperti aplikasi App Store</p>
                  </div>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                  <li>Buka LinguaDoc di peramban <strong>Safari</strong>.</li>
                  <li>Tekan ikon <strong>Bagikan / Share</strong> (kotak dengan panah ke atas di bagian bawah).</li>
                  <li>Gulir ke bawah dan pilih <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.</li>
                  <li>Tekan <strong>Tambah</strong>. LinguaDoc siap dipakai dengan tampilan penuh layaknya aplikasi native iOS.</li>
                </ol>
              </div>

              {/* Native APK Option */}
              <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 font-semibold">
                  <Layers className="w-4 h-4" />
                  <span>Build Native Android APK (Capacitor)</span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-zinc-400 leading-relaxed">
                  Proyek ini telah dikonfigurasi dengan <code>Capacitor</code>. Untuk menghasilkan file <code>.apk</code> mandiri:
                </p>
                <div className="p-2.5 rounded-xl bg-stone-900 text-stone-200 font-mono text-[10px] space-y-1">
                  <p>cd scratch/linguadoc/frontend</p>
                  <p>npx cap add android</p>
                  <p>npx cap sync</p>
                  <p>npx cap open android # buka di Android Studio untuk Build APK</p>
                </div>
              </div>

            </div>
          )}

          {/* WINDOWS TAB */}
          {activeTab === 'windows' && (
            <div className="space-y-4">
              
              {/* Method 1: 1-Click Bat Launcher */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">1</span>
                    <h3 className="font-semibold text-stone-900 dark:text-zinc-100">One-Click Launcher (Windows Batch)</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono">
                    run-windows.bat
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-zinc-400 leading-relaxed">
                  Cukup klik dua kali berkas <code>run-windows.bat</code> di folder proyek. Skrip ini akan:
                </p>
                <ul className="list-disc list-inside space-y-1 text-stone-700 dark:text-zinc-300 text-[11px]">
                  <li>Mendeteksi & menjalankan server Python FastAPI di latar belakang.</li>
                  <li>Membuka LinguaDoc langsung dalam mode <strong>Standalone App Window</strong> (tanpa toolbar browser yang mengganggu).</li>
                  <li>Otomatis menutup server dengan rapi saat aplikasi selesai digunakan.</li>
                </ul>
              </div>

              {/* Method 2: PWA Edge/Chrome */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-800/50 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs">2</span>
                  <h3 className="font-semibold text-stone-900 dark:text-zinc-100">Instalasi PWA via Microsoft Edge / Chrome</h3>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-zinc-400 leading-relaxed">
                  Buka <code>http://localhost:8000</code> di Edge atau Chrome, klik ikon aplikasi (layar komputer dengan tanda panah ke bawah) di ujung kanan address bar, lalu pilih <strong>"Install LinguaDoc"</strong>. LinguaDoc akan muncul di Start Menu dan Desktop Windows Anda.
                </p>
              </div>

              {/* Method 3: Electron .exe */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-800/50 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">3</span>
                  <h3 className="font-semibold text-stone-900 dark:text-zinc-100">Bundle Installer Standalone (.exe)</h3>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-zinc-400 leading-relaxed">
                  Jalankan perintah berikut di terminal untuk menghasilkan installer Windows resmi:
                </p>
                <div className="p-2.5 rounded-xl bg-stone-900 text-stone-200 font-mono text-[10px]">
                  cd scratch/linguadoc/electron && npm run build:win
                </div>
              </div>

            </div>
          )}

          {/* LINUX TAB */}
          {activeTab === 'linux' && (
            <div className="space-y-4">
              
              {/* Method 1: 1-Click Linux Script */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-[#C96442]/10 text-[#C96442] flex items-center justify-center font-bold text-xs">1</span>
                    <h3 className="font-semibold text-stone-900 dark:text-zinc-100">Linux Native Launcher</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C96442]/10 text-[#C96442] font-mono">
                    ./run-linux.sh
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-zinc-400 leading-relaxed">
                  Jalankan skrip peluncur bawaan:
                </p>
                <div className="p-2.5 rounded-xl bg-stone-900 text-stone-200 font-mono text-[10px] space-y-1">
                  <p>chmod +x run-linux.sh</p>
                  <p>./run-linux.sh</p>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-zinc-400">
                  Skrip ini juga secara otomatis dapat mendaftarkan LinguaDoc ke menu aplikasi desktop Linux Anda (<code>.desktop</code> entry).
                </p>
              </div>

              {/* Method 2: AppImage & Deb */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-800/50 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">2</span>
                  <h3 className="font-semibold text-stone-900 dark:text-zinc-100">Paket Mandiri AppImage & .deb</h3>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-zinc-400 leading-relaxed">
                  Kompilasi paket Linux universal yang dapat berjalan di Ubuntu, Debian, Fedora, Arch, dll.:
                </p>
                <div className="p-2.5 rounded-xl bg-stone-900 text-stone-200 font-mono text-[10px]">
                  cd scratch/linguadoc/electron && npm run build:linux
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-zinc-800/80 bg-stone-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-stone-500 dark:text-zinc-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Semua pemrosesan struktur dokumen 100% aman & terenkripsi lokal</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-zinc-800 hover:bg-stone-300 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
