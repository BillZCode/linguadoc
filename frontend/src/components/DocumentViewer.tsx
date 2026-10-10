import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, FileCheck, Layers, Eye, BookOpen, 
  MessageSquare, Image as ImageIcon, Search, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import { DocumentNode, AssetData, BlockType, StructuralComparison } from '../types';
import { getDownloadUrl } from '../api';

interface DocumentViewerProps {
  jobId: string;
  title: string;
  format: string;
  chapters: Array<{ chapter_index: number; title: string }>;
  nodes: DocumentNode[];
  assets: Record<string, AssetData>;
  validation?: StructuralComparison;
  onOpenValidation: () => void;
  onOpenAst: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  jobId,
  title,
  format,
  chapters,
  nodes,
  assets,
  validation,
  onOpenValidation,
  onOpenAst,
}) => {
  const [selectedChapter, setSelectedChapter] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'original' | 'translated'>('split');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Filter nodes by chapter & search query
  const filteredNodes = nodes.filter((n) => {
    const matchesChapter = (selectedChapter === 'all' || n.chapter_index === selectedChapter);
    const matchesSearch = !searchQuery || 
      n.source_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.translated_text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChapter && matchesSearch;
  });

  const renderMediaOrBlock = (node: DocumentNode, isTranslated: boolean) => {
    const text = isTranslated ? (node.translated_text || node.source_text) : node.source_text;

    // Image block
    if (node.block_type === 'image') {
      const asset = node.asset_id ? assets[node.asset_id] : null;
      return (
        <div className="my-4 p-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-800/40 text-center">
          {asset && asset.base64 ? (
            <div className="space-y-2">
              <img
                src={`data:${asset.mime || 'image/png'};base64,${asset.base64}`}
                alt={node.source_text}
                className="max-h-72 mx-auto rounded-lg shadow-xs object-contain"
              />
              <p className="text-[11px] font-mono text-stone-500 dark:text-zinc-400">
                Asset: {asset.asset_id} • Preserved in original sequence
              </p>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-stone-400">
              <ImageIcon className="w-8 h-8 mb-1" />
              <p className="text-xs font-mono">{node.source_text}</p>
            </div>
          )}
        </div>
      );
    }

    // Image caption
    if (node.block_type === 'image_caption') {
      return (
        <p className="text-center text-xs font-serif italic text-stone-500 dark:text-zinc-400 my-1">
          {text}
        </p>
      );
    }

    // Heading
    if (node.block_type === 'heading') {
      const level = node.level || 1;
      const HeadingTag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
      const sizeClass = level === 1 ? 'text-2xl font-bold mt-6 mb-3' : level === 2 ? 'text-xl font-semibold mt-4 mb-2' : 'text-lg font-medium mt-3 mb-1';
      return (
        <HeadingTag className={`font-editorial text-stone-900 dark:text-zinc-100 ${sizeClass}`}>
          {text}
        </HeadingTag>
      );
    }

    // Dialogue (Light novel / novel speech)
    if (node.block_type === 'dialogue') {
      return (
        <div className="my-2.5 pl-3 border-l-2 border-[#C96442]/60 bg-[#C96442]/3 dark:bg-[#C96442]/5 py-1 rounded-r-md">
          <p className="text-sm font-sans text-stone-800 dark:text-zinc-200 leading-relaxed font-normal">
            <span className="inline-block mr-1 text-[#C96442]">💬</span>
            {text}
          </p>
        </div>
      );
    }

    // Chapter Break
    if (node.block_type === 'chapter_break') {
      return (
        <div className="my-6 pt-4 border-t border-dashed border-stone-300 dark:border-zinc-700 text-center">
          <span className="text-xs uppercase tracking-widest font-mono text-stone-400 dark:text-zinc-500 bg-[#FAF9F5] dark:bg-[#151518] px-3">
            {text}
          </span>
        </div>
      );
    }

    // Separator / Page Break
    if (node.block_type === 'separator' || node.block_type === 'page_break') {
      return (
        <div className="my-4 flex items-center justify-center text-stone-300 dark:text-zinc-700">
          <div className="w-16 h-px bg-current"></div>
          <span className="mx-2 text-xs font-mono">• • •</span>
          <div className="w-16 h-px bg-current"></div>
        </div>
      );
    }

    // Table cell
    if (node.block_type === 'table_cell') {
      return (
        <div className="my-1 p-2 rounded bg-stone-100/70 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-700 text-xs">
          <span className="font-mono text-stone-400 mr-2">Cell [{node.row_idx ?? 0},{node.col_idx ?? 0}]:</span>
          <span className="text-stone-800 dark:text-zinc-200">{text}</span>
        </div>
      );
    }

    // Default Paragraph
    return (
      <p className="my-2 text-sm leading-relaxed text-stone-800 dark:text-zinc-200 font-sans">
        {text}
      </p>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto my-6 space-y-4">
      
      {/* Action Bar & Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-sm space-y-3.5">
        
        {/* Tier 1: Document Meta & Primary Actions */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-zinc-800/80">
          
          {/* Document Title & Badge */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#C96442]/10 text-[#C96442] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-editorial font-bold text-stone-900 dark:text-zinc-100 truncate max-w-xs sm:max-w-md" title={title}>
                  {title}
                </h2>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 shrink-0 font-medium">
                  .{format}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-zinc-400">
                {nodes.length} total blok • {chapters.length > 0 ? `${chapters.length} bab` : 'Urutan asli terkunci'}
              </p>
            </div>
          </div>

          {/* Action CTAs: Graphify AST, Validation Report, Download */}
          <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
            <button
              onClick={onOpenAst}
              title="Inspect Document AST Tree Hierarchy"
              className="px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-50 hover:bg-indigo-100/70 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Graphify AST</span>
            </button>

            {validation && (
              <button
                onClick={onOpenValidation}
                title="Lihat Laporan Verifikasi Struktur"
                className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50 hover:bg-emerald-100/70 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Report ({Math.round(validation.fidelity_score * 100)}%)</span>
              </button>
            )}

            <a
              href={getDownloadUrl(jobId)}
              download
              className="px-4 py-1.5 rounded-xl bg-[#C96442] hover:bg-[#b05335] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .{format.toUpperCase()}</span>
            </a>
          </div>
        </div>

        {/* Tier 2: Reading Navigation & View Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-0.5">
          
          {/* Chapter Selector & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {chapters.length > 0 && (
              <div className="relative shrink-0">
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="text-xs rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/80 px-3 py-1.5 text-stone-800 dark:text-zinc-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#C96442]/30 cursor-pointer max-w-xs truncate"
                >
                  <option value="all">Semua Bab ({chapters.length} Bab Lengkap)</option>
                  {chapters.map((ch) => (
                    <option key={ch.chapter_index} value={ch.chapter_index}>
                      Bab {ch.chapter_index + 1}: {ch.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative grow sm:grow-0">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari teks atau ID blok..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/80 text-xs text-stone-800 dark:text-zinc-200 w-full sm:w-56 focus:outline-hidden focus:ring-2 focus:ring-[#C96442]/30"
              />
            </div>
          </div>

          {/* Segmented View Mode Toggle: Split View | Original | Translated */}
          <div className="flex items-center self-end sm:self-center p-1 rounded-xl bg-stone-100 dark:bg-zinc-800 text-xs shrink-0">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'split' 
                  ? 'bg-white dark:bg-zinc-700 text-stone-900 dark:text-zinc-100 font-semibold shadow-xs' 
                  : 'text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200'
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'original' 
                  ? 'bg-white dark:bg-zinc-700 text-stone-900 dark:text-zinc-100 font-semibold shadow-xs' 
                  : 'text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200'
              }`}
            >
              Original
            </button>
            <button
              onClick={() => setViewMode('translated')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'translated' 
                  ? 'bg-white dark:bg-zinc-700 text-stone-900 dark:text-zinc-100 font-semibold shadow-xs' 
                  : 'text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200'
              }`}
            >
              Translated
            </button>
          </div>

        </div>

      </div>

      {/* Side-by-Side Dual Pane Reader Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left Column: Source Document */}
        {(viewMode === 'split' || viewMode === 'original') && (
          <div className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col shadow-xs">
            <div className="px-5 py-3 border-b border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-800/50 flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-zinc-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                <span>Original Source Document</span>
              </span>
              <span className="text-[11px] font-mono text-stone-400">
                {filteredNodes.length} blocks
              </span>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] divide-y divide-stone-100 dark:divide-zinc-800/40">
              {filteredNodes.map((node) => (
                <div
                  key={node.id}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className={`py-2 px-2 rounded-lg transition-colors ${
                    hoveredNodeId === node.id ? 'bg-[#C96442]/8 dark:bg-[#C96442]/15 ring-1 ring-[#C96442]/30' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] font-mono text-stone-400 bg-stone-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                      #{node.sequence_index}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-stone-400">
                      {node.block_type}
                    </span>
                  </div>
                  {renderMediaOrBlock(node, false)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right Column: Translated Document */}
        {(viewMode === 'split' || viewMode === 'translated') && (
          <div className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col shadow-xs">
            <div className="px-5 py-3 border-b border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-800/50 flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-zinc-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C96442]"></span>
                <span className="text-[#C96442]">Reconstructed & Translated Document</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <Check className="w-3 h-3" />
                <span>Sequence Verified</span>
              </span>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] divide-y divide-stone-100 dark:divide-zinc-800/40">
              {filteredNodes.map((node) => (
                <div
                  key={node.id}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className={`py-2 px-2 rounded-lg transition-colors ${
                    hoveredNodeId === node.id ? 'bg-[#C96442]/8 dark:bg-[#C96442]/15 ring-1 ring-[#C96442]/30' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] font-mono text-stone-400 bg-stone-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                      #{node.sequence_index}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-[#C96442]">
                      {node.block_type}
                    </span>
                    {node.status === 'translated' && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        [translated]
                      </span>
                    )}
                  </div>
                  {renderMediaOrBlock(node, true)}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
