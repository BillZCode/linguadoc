import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle2, AlertCircle, Shield, Server, RefreshCw, Wifi } from 'lucide-react';
import { 
  testProviderConnection, 
  getStoredServerUrl, 
  setStoredServerUrl, 
  pingBackend, 
  autoDetectBackend, 
  isCapacitorNative 
} from '../api';
import { TranslationProvider } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: Record<string, string>;
  onSaveKeys: (keys: Record<string, string>) => void;
  activeProvider: TranslationProvider;
  onSelectProvider: (prov: TranslationProvider) => void;
  onServerUrlChanged?: (url: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  onSaveKeys,
  activeProvider,
  onSelectProvider,
  onServerUrlChanged,
}) => {
  const [geminiKey, setGeminiKey] = useState(apiKeys.gemini || '');
  const [openaiKey, setOpenaiKey] = useState(apiKeys.openai || '');
  const [anthropicKey, setAnthropicKey] = useState(apiKeys.anthropic || '');
  const [ollamaUrl, setOllamaUrl] = useState(apiKeys.ollama_url || 'http://localhost:11434/v1');

  // Backend Server URL Configuration
  const [serverUrl, setServerUrl] = useState(() => {
    const stored = getStoredServerUrl();
    if (stored) return stored;
    if (isCapacitorNative()) return 'http://192.168.1.8:8000';
    return '';
  });
  const [serverStatus, setServerStatus] = useState<{ checked: boolean; ok: boolean; message: string }>({
    checked: false,
    ok: false,
    message: '',
  });
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Check server health on open
  useEffect(() => {
    if (isOpen) {
      handleTestServer(serverUrl || (isCapacitorNative() ? 'http://192.168.1.8:8000' : window.location.origin));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestServer = async (urlToTest: string) => {
    setIsCheckingServer(true);
    setServerStatus({ checked: false, ok: false, message: 'Menghubungi server...' });
    const target = urlToTest.trim() || window.location.origin;
    const res = await pingBackend(target);
    setIsCheckingServer(false);
    if (res.success) {
      setServerStatus({
        checked: true,
        ok: true,
        message: `Terhubung (LinguaDoc Backend v${res.data?.version || '1.0.0'})`,
      });
    } else {
      setServerStatus({
        checked: true,
        ok: false,
        message: `Gagal terhubung (${res.error || 'Server offline'}). Pastikan server aktif.`,
      });
    }
  };

  const handleAutoDetect = async () => {
    setIsCheckingServer(true);
    setServerStatus({ checked: false, ok: false, message: 'Memindai jaringan lokal (192.168.x.x)...' });
    const detected = await autoDetectBackend();
    setIsCheckingServer(false);
    if (detected) {
      setServerUrl(detected);
      setServerStatus({
        checked: true,
        ok: true,
        message: `Server ditemukan otomatis: ${detected}`,
      });
      if (onServerUrlChanged) onServerUrlChanged(detected);
    } else {
      setServerStatus({
        checked: true,
        ok: false,
        message: 'Tidak ada server terdeteksi di jaringan lokal. Masukkan IP host secara manual.',
      });
    }
  };

  const handleSave = () => {
    // Save server URL
    setStoredServerUrl(serverUrl.trim());
    if (onServerUrlChanged) {
      onServerUrlChanged(serverUrl.trim());
    }

    // Save AI Keys
    onSaveKeys({
      gemini: geminiKey.trim(),
      openai: openaiKey.trim(),
      anthropic: anthropicKey.trim(),
      ollama_url: ollamaUrl.trim(),
    });
    onClose();
  };

  const handleTest = async (provider: string) => {
    setIsTesting(true);
    setTestStatus('Testing connectivity...');
    try {
      const key = provider === 'gemini' ? geminiKey : provider === 'openai' ? openaiKey : anthropicKey;
      const res = await testProviderConnection(provider, key, ollamaUrl);
      setTestStatus(res.message);
    } catch (err: any) {
      setTestStatus(`Error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200 dark:border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-6 text-stone-900 dark:text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#C96442]/10 text-[#C96442] flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-editorial font-bold">
                Pengaturan Server & AI Engine
              </h2>
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                Konfigurasi backend lokal, mobile network, dan kredensial AI.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* BACKEND SERVER URL SECTION (Critical for Mobile & Remote)         */}
        {/* ------------------------------------------------------------------ */}
        <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-semibold text-indigo-900 dark:text-indigo-300">
              <Wifi className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>URL Server Backend (Ponsel & Desktop)</span>
            </div>
            {serverStatus.checked && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center space-x-1 ${
                serverStatus.ok 
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${serverStatus.ok ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                <span>{serverStatus.ok ? 'Online' : 'Offline'}</span>
              </span>
            )}
          </div>

          <p className="text-[11px] text-stone-600 dark:text-zinc-400 leading-relaxed">
            Aplikasi mobile (Android/iOS) membutuhkan alamat IP laptop/PC Anda di jaringan Wi-Fi yang sama (contoh: <code>http://192.168.1.8:8000</code>).
          </p>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="http://192.168.1.8:8000"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="flex-1 rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-indigo-500/40"
            />
            <button
              type="button"
              onClick={() => handleTestServer(serverUrl)}
              disabled={isCheckingServer}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center space-x-1 cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isCheckingServer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Tes</span>
            </button>
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={isCheckingServer}
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 font-medium flex items-center space-x-1 cursor-pointer shrink-0 disabled:opacity-50"
              title="Pindai IP otomatis"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Auto</span>
            </button>
          </div>

          {serverStatus.message && (
            <p className={`text-[11px] font-mono ${serverStatus.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {serverStatus.message}
            </p>
          )}
        </div>

        {/* Security Notice */}
        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-700 flex items-center space-x-3 text-xs">
          <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-stone-600 dark:text-zinc-300">
            <strong>Keamanan Kredensial:</strong> Kunci API disimpan terenkripsi di penyimpanan lokal peramban/ponsel Anda dan tidak pernah dikirim ke pihak ketiga selain penyedia model AI yang dipilih.
          </span>
        </div>

        {/* AI Key Fields */}
        <div className="space-y-4 text-xs">
          
          {/* Gemini */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-stone-800 dark:text-zinc-200">
                Google Gemini API Key
              </label>
              <button
                type="button"
                onClick={() => handleTest('gemini')}
                disabled={isTesting}
                className="text-[11px] text-[#C96442] hover:underline font-mono cursor-pointer"
              >
                Uji Koneksi
              </button>
            </div>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/60 px-3 py-2 font-mono text-stone-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#C96442]/30"
            />
          </div>

          {/* OpenAI / DeepSeek */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-stone-800 dark:text-zinc-200">
                OpenAI / DeepSeek API Key
              </label>
              <button
                type="button"
                onClick={() => handleTest('openai')}
                disabled={isTesting}
                className="text-[11px] text-[#C96442] hover:underline font-mono cursor-pointer"
              >
                Uji Koneksi
              </button>
            </div>
            <input
              type="password"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/60 px-3 py-2 font-mono text-stone-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#C96442]/30"
            />
          </div>

          {/* Anthropic Claude */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-stone-800 dark:text-zinc-200">
                Anthropic Claude API Key
              </label>
              <button
                type="button"
                onClick={() => handleTest('anthropic')}
                disabled={isTesting}
                className="text-[11px] text-[#C96442] hover:underline font-mono cursor-pointer"
              >
                Uji Koneksi
              </button>
            </div>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              className="w-full rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/60 px-3 py-2 font-mono text-stone-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#C96442]/30"
            />
          </div>

          {/* Local Ollama */}
          <div className="space-y-1.5">
            <label className="font-semibold text-stone-800 dark:text-zinc-200">
              Local Ollama Base URL
            </label>
            <input
              type="text"
              placeholder="http://localhost:11434/v1"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="w-full rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/60 px-3 py-2 font-mono text-stone-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#C96442]/30"
            />
          </div>

        </div>

        {/* Live Test Status Feedback */}
        {testStatus && (
          <div className="p-3 rounded-xl bg-stone-100 dark:bg-zinc-800 text-xs font-mono text-stone-700 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
            {testStatus}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-zinc-800">
          <button
            onClick={() => onSelectProvider('demo')}
            className="text-xs text-stone-500 dark:text-zinc-400 hover:text-[#C96442] underline cursor-pointer"
          >
            Reset ke Mode DEMO
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-zinc-700 text-xs font-semibold text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#C96442] hover:bg-[#b05335] text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
