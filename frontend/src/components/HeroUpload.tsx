import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, BookOpen, Layers } from 'lucide-react';

interface HeroUploadProps {
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  selectedFile: File | null;
  fileInfo: any | null;
  onLoadSample: (sampleType: 'epub' | 'docx' | 'md' | 'srt') => void;
}

export const HeroUpload: React.FC<HeroUploadProps> = ({
  onFileSelected,
  isUploading,
  selectedFile,
  fileInfo,
  onLoadSample,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-4xl mx-auto text-center pt-8 pb-4">
      {/* Editorial Hero Header */}
      <div className="space-y-3 mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#C96442]/10 border border-[#C96442]/20 text-[#C96442] text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Structure-Preserving Translation Pipeline</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-editorial font-bold tracking-tight text-stone-900 dark:text-zinc-50 leading-[1.15]">
          Translate Documents.<br />
          <span className="italic text-[#C96442]">Preserve Every Detail.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-stone-600 dark:text-zinc-400 font-light leading-relaxed">
          Maintain exact chapter hierarchy, inline illustrations, dialogues, ruby text, formulas, and tables. 
          Zero element loss, zero misplaced illustrations.
        </p>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 transition-all duration-200 ${
          isDragOver
            ? 'border-[#C96442] bg-[#C96442]/5 scale-[1.01]'
            : 'border-stone-300 dark:border-zinc-700/80 bg-white/70 dark:bg-zinc-900/60 hover:border-stone-400 dark:hover:border-zinc-600 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInput}
          className="hidden"
          accept=".epub,.docx,.pdf,.md,.txt,.html,.pptx,.xlsx,.srt,.vtt,.json,.xml"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#C96442]/10 dark:bg-[#C96442]/20 text-[#C96442] flex items-center justify-center shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <p className="text-base font-semibold text-stone-800 dark:text-zinc-200">
              Drag & drop document here, or <span className="text-[#C96442] underline underline-offset-2">browse files</span>
            </p>
            <p className="text-xs text-stone-500 dark:text-zinc-400">
              Supports EPUB 2/3, DOCX, PDF, Markdown, Plain Text, HTML, PPTX, XLSX, Subtitles & Data files
            </p>
          </div>

          {/* Formats Badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 max-w-lg">
            {['EPUB', 'DOCX', 'PDF', 'MD', 'TXT', 'HTML', 'PPTX', 'XLSX', 'SRT', 'JSON'].map((fmt) => (
              <span
                key={fmt}
                className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-stone-100 dark:bg-zinc-800/80 text-stone-600 dark:text-zinc-400 border border-stone-200/80 dark:border-zinc-700/60"
              >
                .{fmt.toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        {isUploading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 border-3 border-[#C96442] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium text-stone-700 dark:text-zinc-300">Analyzing document structure...</p>
          </div>
        )}
      </div>

      {/* Selected File Card */}
      {selectedFile && fileInfo && (
        <div className="mt-4 p-4 rounded-xl bg-stone-100/90 dark:bg-zinc-800/90 border border-stone-300/60 dark:border-zinc-700/60 flex flex-col sm:flex-row items-center justify-between text-left gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100 flex items-center space-x-1.5">
                <span>{selectedFile.name}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-zinc-300">
                  {fileInfo.format}
                </span>
              </p>
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                {formatBytes(selectedFile.size)} • {fileInfo.total_blocks} structural blocks • ~{fileInfo.estimated_tokens} tokens
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Structure Verified Ready</span>
          </div>
        </div>
      )}

      {/* Instant Demo Samples */}
      <div className="mt-6 pt-4 border-t border-stone-200/60 dark:border-zinc-800/60 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-stone-500 dark:text-zinc-400 font-medium">Test instantly with sample:</span>
        <button
          onClick={() => onLoadSample('epub')}
          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-[#C96442] hover:text-[#C96442] transition-colors"
        >
          🗾 Japanese Light Novel (.epub)
        </button>
        <button
          onClick={() => onLoadSample('docx')}
          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-[#C96442] hover:text-[#C96442] transition-colors"
        >
          📄 Technical Specification (.docx)
        </button>
        <button
          onClick={() => onLoadSample('md')}
          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-[#C96442] hover:text-[#C96442] transition-colors"
        >
          📝 Markdown Guide (.md)
        </button>
        <button
          onClick={() => onLoadSample('srt')}
          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-[#C96442] hover:text-[#C96442] transition-colors"
        >
          🎬 Subtitle Timestamps (.srt)
        </button>
      </div>
    </div>
  );
};
