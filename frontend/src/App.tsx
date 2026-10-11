import React, { useState, useEffect, useRef } from 'react';
import { 
  TranslationConfig, TranslationProvider, ToneStyle, 
  JobStatusResponse, JobPreviewResponse, AstGraphResponse 
} from './types';
import { 
  uploadDocument, startTranslation, getJobStatus, 
  getJobPreview, getJobAst, getJobsList, deleteJob,
  getStoredServerUrl, setStoredServerUrl, isCapacitorNative,
  pingBackend, autoDetectBackend, getSampleUrl, getApiBase
} from './api';
import { Server, WifiOff } from 'lucide-react';

import { Navbar } from './components/Navbar';
import { HeroUpload } from './components/HeroUpload';
import { TranslationConfigPanel } from './components/TranslationConfigPanel';
import { PipelineStepper } from './components/PipelineStepper';
import { DocumentViewer } from './components/DocumentViewer';
import { GraphifyAstInspector } from './components/GraphifyAstInspector';
import { ValidationReportModal } from './components/ValidationReportModal';
import { SettingsModal } from './components/SettingsModal';
import { FormatGuideModal } from './components/FormatGuideModal';
import { HistoryDashboard } from './components/HistoryDashboard';
import { InstallAppModal } from './components/InstallAppModal';

export const App: React.FC = () => {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('linguadoc_theme') === 'dark' || 
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('linguadoc_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('linguadoc_theme', 'light');
    }
  }, [isDarkMode]);

  // Main UI Tabs
  const [currentTab, setCurrentTab] = useState<'translator' | 'graphify' | 'history'>('translator');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPrompt = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallOpen(false);
    }
  };

  // API Credentials
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('linguadoc_api_keys') || '{}');
    } catch {
      return {};
    }
  });

  const handleSaveApiKeys = (keys: Record<string, string>) => {
    setApiKeys(keys);
    localStorage.setItem('linguadoc_api_keys', JSON.stringify(keys));
  };

  // Server Connectivity State (Crucial for Mobile & Network Usage)
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);
  const [currentServerUrl, setCurrentServerUrl] = useState<string>(() => {
    return getStoredServerUrl() || (isCapacitorNative() ? 'http://192.168.1.8:8000' : '');
  });

  const verifyServerConnection = async (explicitUrl?: string) => {
    let target = explicitUrl !== undefined ? explicitUrl : getStoredServerUrl();
    if (!target && isCapacitorNative()) {
      target = 'http://192.168.1.8:8000';
      setStoredServerUrl(target);
    }
    const res = await pingBackend(target || window.location.origin);
    if (res.success) {
      setServerConnected(true);
      setCurrentServerUrl(target || window.location.origin);
    } else {
      // Attempt auto-detection in local network
      const detected = await autoDetectBackend();
      if (detected) {
        setServerConnected(true);
        setCurrentServerUrl(detected);
      } else {
        setServerConnected(false);
      }
    }
  };

  useEffect(() => {
    verifyServerConnection();
  }, []);

  // Translation Job Configuration
  const [config, setConfig] = useState<TranslationConfig>({
    source_language: 'auto',
    target_language: 'id',
    tone: 'natural',
    provider: 'demo',
    preserve_ruby: true,
    preserve_illustrations: true,
    preserve_footnotes: true,
    bilingual_mode: false,
    custom_glossary: [],
    do_not_translate: [],
    ocr_enabled: false,
    target_format: null,
    chapter_scope: null,
  });

  // Current File & Job States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [previewData, setPreviewData] = useState<JobPreviewResponse | null>(null);
  const [astData, setAstData] = useState<AstGraphResponse | null>(null);

  // Job History
  const [historyJobs, setHistoryJobs] = useState<any[]>([]);

  // Polling ref
  const pollTimerRef = useRef<any>(null);

  // Refresh history on mount or when tab opens
  const refreshHistory = async () => {
    try {
      const list = await getJobsList();
      setHistoryJobs(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, [currentTab]);

  // Handle File Upload
  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setIsUploading(true);
    setJobStatus(null);
    setPreviewData(null);
    setAstData(null);

    try {
      const info = await uploadDocument(file);
      setFileInfo(info);

      // Auto-populate detected source language if light novel or docx
      if (info.format === 'epub' && file.name.includes('ja')) {
        setConfig((prev) => ({ ...prev, source_language: 'ja' }));
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
      setSelectedFile(null);
      setFileInfo(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Quick Sample Loader from Backend Fixtures
  const handleLoadSample = async (sampleType: 'epub' | 'docx' | 'md' | 'srt') => {
    setIsUploading(true);
    try {
      let blob: Blob | null = null;
      const sampleNames: Record<string, string> = {
        epub: 'sample_light_novel.epub',
        docx: 'sample_spec.docx',
        md: 'sample_readme.md',
        srt: 'sample_subs.srt',
      };

      // Try fetching from backend first
      try {
        const sampleUrl = getSampleUrl(sampleType);
        const res = await fetch(sampleUrl);
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            blob = await res.blob();
          }
        }
      } catch (e) {
        console.warn('Network sample fetch failed, using fallback', e);
      }

      // Standalone client fallbacks if server offline
      if (!blob) {
        if (sampleType === 'md') {
          const mdText = `# LinguaDoc Document Translation Sample\n\n## Bab 1: Petualangan Baru\n\nIni adalah contoh dokumen Markdown berstruktur tinggi.\nLinguaDoc menjaga seluruh sintaks Markdown, diagram, dan tabel tetap utuh 100%.\n\n| Parameter | Deskripsi | Status |\n| :--- | :--- | :--- |\n| Struktur | Preserved | Sempurna |\n| Format | CommonMark | Valid |\n`;
          blob = new Blob([mdText], { type: 'text/markdown' });
        } else if (sampleType === 'srt') {
          const srtText = `1\n00:00:01,000 --> 00:00:04,500\nHello and welcome to LinguaDoc!\n\n2\n00:00:05,000 --> 00:00:09,000\nUniversal Structure-Preserving Document Translator.\n`;
          blob = new Blob([srtText], { type: 'text/plain' });
        } else {
          throw new Error(`Tidak dapat mengunduh fixture ${sampleType.toUpperCase()} karena server backend belum terhubung.`);
        }
      }

      const file = new File([blob], sampleNames[sampleType], { type: blob.type || 'application/octet-stream' });
      await handleFileSelected(file);
    } catch (err: any) {
      alert(`Sample loader error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Polling execution status
  const pollJobStatus = async (jobId: string) => {
    try {
      const status = await getJobStatus(jobId);
      setJobStatus(status);

      if (status.stage === 'ready') {
        setIsTranslating(false);
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        
        // Fetch preview and AST graph
        const [preview, ast] = await Promise.all([
          getJobPreview(jobId),
          getJobAst(jobId),
        ]);
        setPreviewData(preview);
        setAstData(ast);
        refreshHistory();
      } else if (status.stage === 'failed') {
        setIsTranslating(false);
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        alert(`Translation failed: ${status.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Start Translation Job
  const handleStartTranslate = async () => {
    if (!fileInfo?.job_id) return;
    setIsTranslating(true);

    const mergedConfig: TranslationConfig = {
      ...config,
      api_key: config.provider === 'gemini' 
        ? apiKeys.gemini 
        : config.provider === 'openai' 
        ? apiKeys.openai 
        : config.provider === 'anthropic'
        ? apiKeys.anthropic
        : undefined,
      api_base_url: (config.provider === 'ollama' || config.provider === 'sakura_id') ? (apiKeys.ollama_url || 'http://localhost:11434/v1') : undefined,
      model_name: (config.provider === 'ollama' || config.provider === 'sakura_id') ? (config.model_name || apiKeys.ollama_model || 'qwen2.5:7b') : config.model_name,
    };

    try {
      await startTranslation(fileInfo.job_id, mergedConfig);
      
      // Start polling
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(() => {
        pollJobStatus(fileInfo.job_id);
      }, 600);
    } catch (err: any) {
      setIsTranslating(false);
      alert(`Could not start translation: ${err.message}`);
    }
  };

  // Switch to an existing job from history
  const handleSelectHistoryJob = async (jobId: string) => {
    try {
      const [status, preview, ast] = await Promise.all([
        getJobStatus(jobId),
        getJobPreview(jobId),
        getJobAst(jobId),
      ]);
      setJobStatus(status);
      setPreviewData(preview);
      setAstData(ast);
      setFileInfo({
        job_id: status.job_id,
        filename: status.filename,
        format: status.format,
        total_blocks: status.total_blocks,
      });
      setCurrentTab('translator');
    } catch (err: any) {
      alert(`Failed to load job: ${err.message}`);
    }
  };

  const handleDeleteHistoryJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      await deleteJob(jobId);
      refreshHistory();
      if (fileInfo?.job_id === jobId) {
        setSelectedFile(null);
        setFileInfo(null);
        setJobStatus(null);
        setPreviewData(null);
        setAstData(null);
      }
    } catch (e: any) {
      alert(`Delete error: ${e.message}`);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#FAF9F5] text-[#28251E] dark:bg-[#151518] dark:text-[#E4E4E7] selection:bg-[#C96442]/20 selection:text-[#C96442]">
      
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeProvider={config.provider}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenValidation={() => setIsValidationOpen(true)}
        hasValidationReport={Boolean(previewData?.validation)}
        onOpenInstall={() => setIsInstallOpen(true)}
        serverConnected={serverConnected}
      />

      {/* Main Content Areas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Tab 1: Translator Page */}
        {currentTab === 'translator' && (
          <div className="space-y-6">
            
            {/* Backend Offline Warning Banner (especially helpful on Mobile & Local Network) */}
            {serverConnected === false && (
              <div className="w-full bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
                <div className="flex items-start space-x-3">
                  <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold">Backend Belum Terhubung ({currentServerUrl || 'Offline'})</h4>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                      Ponsel Anda belum dapat menjangkau server di laptop/komputer. Pastikan server aktif dan kedua perangkat berada di Wi-Fi yang sama.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => verifyServerConnection()}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
                  >
                    Pindai Ulang
                  </button>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-500/30 bg-white/60 dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Atur IP
                  </button>
                </div>
              </div>
            )}

            {/* Hero & Drag-drop upload (shown when no completed preview or user wants to upload) */}
            {(!previewData || !jobStatus || jobStatus.stage !== 'ready') && (
              <>
                <HeroUpload
                  onFileSelected={handleFileSelected}
                  isUploading={isUploading}
                  selectedFile={selectedFile}
                  fileInfo={fileInfo}
                  onLoadSample={handleLoadSample}
                />

                {/* Translation Configuration Settings */}
                {fileInfo && (
                  <TranslationConfigPanel
                    config={config}
                    onChange={setConfig}
                    onStartTranslate={handleStartTranslate}
                    isTranslating={isTranslating}
                    totalBlocks={fileInfo.total_blocks || 0}
                    estimatedTokens={fileInfo.estimated_tokens || 0}
                    estimatedCostUsd={fileInfo.estimated_cost_usd || 0}
                    hasFile={Boolean(fileInfo)}
                    chapterCount={fileInfo.chapter_count || 1}
                  />
                )}
              </>
            )}

            {/* Pipeline Stage Stepper */}
            {jobStatus && (
              <PipelineStepper
                currentStage={jobStatus.stage}
                stageIndex={jobStatus.stage_index}
                progressPercentage={jobStatus.progress_percentage}
                statusMessage={jobStatus.status_message}
                totalBlocks={jobStatus.total_blocks}
                translatedBlocks={jobStatus.translated_blocks}
                isDemo={jobStatus.is_demo}
                warnings={jobStatus.warnings || []}
              />
            )}

            {/* Document Side-by-Side Dual Pane Reader */}
            {previewData && jobStatus?.stage === 'ready' && (
              <DocumentViewer
                jobId={previewData.job_id}
                title={previewData.title}
                format={previewData.source_format}
                chapters={previewData.chapters || []}
                nodes={previewData.nodes || []}
                assets={previewData.assets || {}}
                validation={previewData.validation}
                onOpenValidation={() => setIsValidationOpen(true)}
                onOpenAst={() => setCurrentTab('graphify')}
              />
            )}
          </div>
        )}

        {/* Tab 2: Graphify AST Inspector Page */}
        {currentTab === 'graphify' && (
          <GraphifyAstInspector
            astData={astData}
            onBackToViewer={() => setCurrentTab('translator')}
          />
        )}

        {/* Tab 3: History & Saved Documents Page */}
        {currentTab === 'history' && (
          <HistoryDashboard
            jobs={historyJobs}
            onSelectJob={handleSelectHistoryJob}
            onDeleteJob={handleDeleteHistoryJob}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-200/80 dark:border-zinc-800/80 py-6 text-center text-xs text-stone-500 dark:text-zinc-500 font-mono">
        <p>
          LinguaDoc • Universal Structure-Preserving Document Translator • EPUB • DOCX • PDF • Markdown • Subtitles
        </p>
      </footer>

      {/* Modals */}
      <ValidationReportModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        report={previewData?.validation || null}
        filename={previewData?.title || 'Document'}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKeys={apiKeys}
        onSaveKeys={handleSaveApiKeys}
        activeProvider={config.provider}
        onSelectProvider={(p) => setConfig({ ...config, provider: p })}
        onServerUrlChanged={(url) => verifyServerConnection(url)}
      />

      <FormatGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <InstallAppModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallPrompt={handleInstallPrompt}
      />

    </div>
  );
};

export default App;
