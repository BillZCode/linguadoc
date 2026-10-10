import React, { useState } from 'react';
import { X, Key, CheckCircle2, AlertCircle, Cpu, Shield, ExternalLink } from 'lucide-react';
import { testProviderConnection } from '../api';
import { TranslationProvider } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: Record<string, string>;
  onSaveKeys: (keys: Record<string, string>) => void;
  activeProvider: TranslationProvider;
  onSelectProvider: (prov: TranslationProvider) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  onSaveKeys,
  activeProvider,
  onSelectProvider,
}) => {
  const [geminiKey, setGeminiKey] = useState(apiKeys.gemini || '');
  const [openaiKey, setOpenaiKey] = useState(apiKeys.openai || '');
  const [anthropicKey, setAnthropicKey] = useState(apiKeys.anthropic || '');
  const [ollamaUrl, setOllamaUrl] = useState(apiKeys.ollama_url || 'http://localhost:11434/v1');
  
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#C96442]/10 text-[#C96442] flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-editorial font-bold text-stone-900 dark:text-zinc-100">
                AI Engines & API Credentials
              </h2>
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                Encrypted in browser session. Never exposed in public bundles or logs.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-700 flex items-center space-x-3 text-xs">
          <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-stone-600 dark:text-zinc-300">
            <strong>Transparent Security:</strong> In DEMO mode, no API key is required. When using private keys, requests are routed directly to the official provider endpoint.
          </span>
        </div>

        {/* Key Fields */}
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
                className="text-[11px] text-[#C96442] hover:underline font-mono"
              >
                Test Connection
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
                className="text-[11px] text-[#C96442] hover:underline font-mono"
              >
                Test Connection
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
                className="text-[11px] text-[#C96442] hover:underline font-mono"
              >
                Test Connection
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
            className="text-xs text-stone-500 dark:text-zinc-400 hover:text-[#C96442] underline"
          >
            Reset to DEMO Mode
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 dark:border-zinc-700 text-xs font-semibold text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#C96442] hover:bg-[#b05335] text-white text-xs font-semibold shadow-xs"
            >
              Save Credentials
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
