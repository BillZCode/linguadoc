import React, { useState } from 'react';
import { 
  ArrowLeftRight, BookMarked, ShieldCheck, 
  Sparkles, Plus, Trash2, SlidersHorizontal, Key, Layers 
} from 'lucide-react';
import { TranslationConfig, ToneStyle, TranslationProvider, GlossaryEntry } from '../types';

interface TranslationConfigPanelProps {
  config: TranslationConfig;
  onChange: (newConfig: TranslationConfig) => void;
  onStartTranslate: () => void;
  isTranslating: boolean;
  totalBlocks: number;
  estimatedTokens: number;
  estimatedCostUsd: number;
  hasFile: boolean;
  chapterCount?: number;
}

const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'id', name: 'Indonesian (Bahasa Indonesia)' },
  { code: 'en', name: 'English (English)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'pt', name: 'Portuguese (Português)' },
];

export const TranslationConfigPanel: React.FC<TranslationConfigPanelProps> = ({
  config,
  onChange,
  onStartTranslate,
  isTranslating,
  totalBlocks,
  estimatedTokens,
  estimatedCostUsd,
  hasFile,
  chapterCount = 1,
}) => {
  const [showGlossary, setShowGlossary] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newTrans, setNewTrans] = useState('');
  const [newCategory, setNewCategory] = useState<'character' | 'place' | 'technical' | 'untranslatable'>('character');

  const handleSwapLanguages = () => {
    if (config.source_language === 'auto') return;
    onChange({
      ...config,
      source_language: config.target_language,
      target_language: config.source_language,
    });
  };

  const handleAddGlossary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newTrans.trim()) return;
    const entry: GlossaryEntry = {
      term: newTerm.trim(),
      translation: newTrans.trim(),
      category: newCategory,
    };
    onChange({
      ...config,
      custom_glossary: [...config.custom_glossary, entry],
    });
    setNewTerm('');
    setNewTrans('');
  };

  const handleRemoveGlossary = (index: number) => {
    const updated = [...config.custom_glossary];
    updated.splice(index, 1);
    onChange({ ...config, custom_glossary: updated });
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-zinc-800 p-6 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 dark:border-zinc-800/80 pb-4">
        <div className="flex items-center space-x-2.5">
          <SlidersHorizontal className="w-4 h-4 text-[#C96442]" />
          <h2 className="text-base font-semibold text-stone-900 dark:text-zinc-100">
            Pengaturan Penerjemahan Dokumen
          </h2>
        </div>
        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">
          Structure Preservation: 100% Locked
        </span>
      </div>

      {/* Language Pickers & Swap */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-3 items-center">
        {/* Source Language */}
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1.5">
            Bahasa Sumber (Source Language)
          </label>
          <select
            value={config.source_language}
            onChange={(e) => onChange({ ...config, source_language: e.target.value })}
            className="w-full rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#C96442]/30"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center pt-5 sm:pt-4">
          <button
            type="button"
            onClick={handleSwapLanguages}
            title="Tukar bahasa sumber dan tujuan"
            className="p-2 rounded-xl border border-stone-200 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-400 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Target Language */}
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1.5">
            Bahasa Tujuan (Target Language)
          </label>
          <select
            value={config.target_language}
            onChange={(e) => onChange({ ...config, target_language: e.target.value })}
            className="w-full rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#C96442]/30"
          >
            {LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Engine Provider & Translation Scope */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Translation Engine Provider */}
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1.5 flex items-center justify-between">
            <span>Mesin Penerjemah (Engine)</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {config.provider === 'demo' ? 'Aktif (Siap Pakai Tanpa Key)' : 'Memerlukan Key'}
            </span>
          </label>
          <select
            value={config.provider}
            onChange={(e) => onChange({ ...config, provider: e.target.value as TranslationProvider })}
            className="w-full rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#C96442]/30"
          >
            <option value="demo">Free Neural Engine (Tanpa API Key • Terjemah Otomatis)</option>
            <option value="gemini">Google Gemini / Gemma (Multi-Model Core)</option>
            <option value="anthropic">Anthropic Claude 3.5 (AI Sastra • Butuh Anthropic Key)</option>
            <option value="openai">OpenAI / DeepSeek (GPT-4o-mini / DeepSeek-V3)</option>
            <option value="ollama">Local Ollama (Self-Hosted Model)</option>
          </select>
        </div>

        {/* Translation Scope (All Chapters vs Specific Chapter) */}
        <div>
          <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1.5 flex items-center justify-between">
            <span>Cakupan Penerjemahan (Scope)</span>
            <span className="text-[10px] text-stone-400">{chapterCount} total bab terdeteksi</span>
          </label>
          <select
            value={config.chapter_scope === null || config.chapter_scope === undefined ? 'all' : String(config.chapter_scope)}
            onChange={(e) => {
              const val = e.target.value === 'all' ? null : Number(e.target.value);
              onChange({ ...config, chapter_scope: val });
            }}
            className="w-full rounded-xl border border-stone-300 dark:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#C96442]/30"
          >
            <option value="all">Semua Bab (Seluruh Dokumen Lengkap)</option>
            {Array.from({ length: Math.min(chapterCount, 50) }).map((_, idx) => (
              <option key={idx} value={idx}>
                Hanya Bab {idx + 1} (Proses Cepat)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gemini Specific Model Architecture Selector */}
      {config.provider === 'gemini' && (
        <div className="p-3.5 rounded-xl bg-stone-100/80 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 space-y-2 animate-in fade-in">
          <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-zinc-100">
              <Sparkles className="w-3.5 h-3.5 text-[#C96442]" />
              Pilihan Model Gemini & DeepMind
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-medium">Google Multi-Model Core</span>
          </label>
          <select
            value={config.model_name || 'gemini-flash-latest'}
            onChange={(e) => onChange({ ...config, model_name: e.target.value })}
            className="w-full rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-stone-900 dark:text-zinc-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#C96442]/30"
          >
            <optgroup label="Autonomous Server Execution & Agent">
              <option value="antigravity-preview-latest">🚀 Antigravity Autonomous Agent (Remote Server Execution)</option>
            </optgroup>
            <optgroup label="High Performance & Fast (Rekomendasi)">
              <option value="gemini-flash-latest">Gemini Flash Latest (Paling Cepat & Stabil)</option>
              <option value="gemini-flash-lite-latest">Flash Lite Latest (Paling Hemat Token)</option>
              <option value="gemini-3-flash-preview">Flash 3 Preview</option>
            </optgroup>
            <optgroup label="Agentic & Robotics Intelligence">
              <option value="gemini-robotics-er-2-preview">Embodied Agentic ER-2 (Robotics & Reasoning)</option>
            </optgroup>
            <optgroup label="Open Weights">
              <option value="gemma-4-26b-a4b-it">Gemma 4 26B (DeepMind Open Weights)</option>
            </optgroup>
          </select>
          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-zinc-400 pt-0.5">
            <span>Model aktif: <strong className="text-stone-800 dark:text-zinc-200">{config.model_name || 'gemini-flash-latest'}</strong></span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Siap Eksekusi Dokumen</span>
          </div>
        </div>
      )}

      {/* Inline API Key Input if AI Provider selected */}
      {config.provider !== 'demo' && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 animate-in fade-in">
          <div className="flex items-center space-x-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <Key className="w-3.5 h-3.5 text-amber-600" />
            <span>Kredensial API Key untuk {config.provider.toUpperCase()}</span>
          </div>
          <input
            type="password"
            placeholder={
              config.provider === 'gemini' 
                ? 'Masukkan Google Gemini API Key (atau kosongkan untuk menggunakan kunci server .env)' 
                : config.provider === 'anthropic' 
                ? 'Masukkan Anthropic API Key (sk-ant-...)' 
                : 'Masukkan OpenAI API Key (sk-...)'
            }
            value={config.api_key || ''}
            onChange={(e) => onChange({ ...config, api_key: e.target.value })}
            className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-mono text-stone-900 dark:text-zinc-100 focus:outline-hidden"
          />
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            {config.provider === 'gemini' ? (
              <span>⚡ Jika dikosongkan, LinguaDoc akan otomatis menggunakan kunci bawaan server dari <code>.env</code>. Anda juga dapat memasukkan kunci pribadi kapan saja.</span>
            ) : (
              <span>Kunci disimpan di sesi browser lokal Anda dan tidak dibagikan ke pihak ketiga.</span>
            )}
          </p>
        </div>
      )}

      {/* Row 3: Tone & Style */}
      <div>
        <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1.5">
          Gaya & Nada Bahasa (Tone)
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {[
            { id: 'natural', label: 'Natural / Alami' },
            { id: 'formal', label: 'Formal / Resmi' },
            { id: 'academic', label: 'Akademik' },
            { id: 'technical', label: 'Teknis' },
            { id: 'literal', label: 'Verbatim (Setia)' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ ...config, tone: t.id as ToneStyle })}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                config.tone === t.id
                  ? 'border-[#C96442] bg-[#C96442]/10 text-[#C96442] font-semibold'
                  : 'border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-400 hover:bg-stone-50 dark:hover:bg-zinc-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 4: Preservations & Bilingual Toggle */}
      <div className="p-4 rounded-xl bg-stone-50/70 dark:bg-zinc-800/50 border border-stone-200/80 dark:border-zinc-700/60 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200">
              Perlindungan Struktur Dokumen:
            </span>
            <span className="text-xs text-stone-500 dark:text-zinc-400">
              Urutan bab, ilustrasi gambar, dialog, ruby text, dan tabel terkunci 100%.
            </span>
          </div>

          {/* Bilingual EPUB / DOCX toggle */}
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.bilingual_mode}
              onChange={(e) => onChange({ ...config, bilingual_mode: e.target.checked })}
              className="rounded text-[#C96442] focus:ring-[#C96442] w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-medium text-stone-700 dark:text-zinc-300">
              Format Bilingual (Teks Asli + Teks Terjemahan Berdampingan)
            </span>
          </label>
        </div>

        {/* Glossary Collapsible Toggle */}
        <div className="pt-2 border-t border-stone-200/60 dark:border-zinc-700/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowGlossary(!showGlossary)}
            className="text-xs font-semibold text-[#C96442] hover:underline flex items-center space-x-1.5"
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>
              {showGlossary ? 'Sembunyikan Kamus Istilah' : `Kamus Istilah & Karakter (${config.custom_glossary.length} kata)`}
            </span>
          </button>
          <span className="text-[11px] text-stone-500 dark:text-zinc-400">
            Pertahankan nama karakter, lokasi, atau istilah khusus
          </span>
        </div>

        {/* Glossary Manager Form */}
        {showGlossary && (
          <div className="pt-3 space-y-3 animate-in fade-in">
            <form onSubmit={handleAddGlossary} className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto,auto] gap-2 items-center">
              <input
                type="text"
                placeholder="Kata asal (misal: 勇者 atau Tanaka)"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                className="rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-stone-900 dark:text-zinc-100"
              />
              <input
                type="text"
                placeholder="Terjemahan (misal: Pahlawan)"
                value={newTrans}
                onChange={(e) => setNewTrans(e.target.value)}
                className="rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-stone-900 dark:text-zinc-100"
              />
              <select
                value={newCategory}
                onChange={(e: any) => setNewCategory(e.target.value)}
                className="rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-stone-900 dark:text-zinc-100"
              >
                <option value="character">Karakter</option>
                <option value="place">Tempat</option>
                <option value="technical">Teknis</option>
                <option value="untranslatable">Jangan Terjemahkan</option>
              </select>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[#C96442] hover:bg-[#b05335] text-white text-xs font-medium flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </form>

            {/* Glossary Chips */}
            {config.custom_glossary.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {config.custom_glossary.map((entry, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-stone-800 dark:text-zinc-200"
                  >
                    <span className="font-medium text-[#C96442]">{entry.term}</span>
                    <span className="text-stone-400">→</span>
                    <span>{entry.translation}</span>
                    <span className="text-[10px] text-stone-400 uppercase font-mono px-1 bg-stone-100 dark:bg-zinc-800 rounded">
                      {entry.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGlossary(idx)}
                      className="text-stone-400 hover:text-red-500 pl-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer: Stats & Start Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center space-x-4 text-xs text-stone-500 dark:text-zinc-400">
          <span>{totalBlocks} blok struktur</span>
          <span>•</span>
          <span>~{estimatedTokens} token</span>
          <span>•</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            {config.provider === 'demo' ? '100% Free Engine' : `Est. $${estimatedCostUsd.toFixed(4)} USD`}
          </span>
        </div>

        <button
          type="button"
          disabled={!hasFile || isTranslating}
          onClick={onStartTranslate}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-medium text-sm text-white shadow-sm transition-all flex items-center justify-center space-x-2 ${
            !hasFile || isTranslating
              ? 'bg-stone-300 dark:bg-zinc-700 cursor-not-allowed opacity-60'
              : 'bg-[#C96442] hover:bg-[#b05335] shadow-[#C96442]/20 hover:scale-[1.01]'
          }`}
        >
          {isTranslating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Menerjemahkan Dokumen...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Mulai Terjemahkan Sekarang</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
