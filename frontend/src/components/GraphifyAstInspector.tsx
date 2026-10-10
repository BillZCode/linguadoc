import React, { useState } from 'react';
import { 
  Layers, GitCommit, ArrowDown, CheckCircle2, ShieldCheck, 
  FileText, Image as ImageIcon, MessageSquare, Database, ExternalLink 
} from 'lucide-react';
import { AstGraphResponse, BlockType } from '../types';

interface GraphifyAstInspectorProps {
  astData: AstGraphResponse | null;
  onBackToViewer?: () => void;
}

export const GraphifyAstInspector: React.FC<GraphifyAstInspectorProps> = ({
  astData,
  onBackToViewer,
}) => {
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [activeChapterFilter, setActiveChapterFilter] = useState<number | 'all'>('all');

  if (!astData) {
    return (
      <div className="w-full max-w-4xl mx-auto my-12 p-8 text-center rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <Layers className="w-12 h-12 mx-auto text-stone-400 mb-3" />
        <h3 className="text-base font-semibold text-stone-800 dark:text-zinc-200">No Document Tree Loaded</h3>
        <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">Upload and process a document to inspect its AST hierarchy.</p>
      </div>
    );
  }

  const getBlockTypeColor = (type: BlockType) => {
    switch (type) {
      case 'heading':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'dialogue':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'image':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'image_caption':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'table':
      case 'table_cell':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'chapter_break':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'raw_code':
        return 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700';
      default:
        return 'bg-stone-100 text-stone-800 dark:bg-zinc-800 dark:text-zinc-300 border-stone-200 dark:border-zinc-700';
    }
  };

  const filteredChapters = activeChapterFilter === 'all'
    ? astData.chapters
    : astData.chapters.filter((c) => c.chapter_index === activeChapterFilter);

  return (
    <div className="w-full max-w-7xl mx-auto my-6 space-y-6 animate-in fade-in">
      
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Graphify AST Inspector</span>
          </div>
          <h2 className="text-xl font-editorial font-bold text-stone-900 dark:text-zinc-100">
            Document AST & Preservation Topology
          </h2>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
            Hierarchical representation of {astData.total_nodes} document nodes demonstrating sequence and relational preservation.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-xs text-stone-400 block font-mono">Structural Fidelity</span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {Math.round(astData.validation_fidelity * 100)}% Match
            </span>
          </div>

          {onBackToViewer && (
            <button
              onClick={onBackToViewer}
              className="px-3.5 py-2 rounded-xl text-xs font-medium border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 hover:border-[#C96442]"
            >
              Back to Reader
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Tree Graph (Left) & Node Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Hierarchical AST Tree */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Chapter Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-xs">
            <span className="text-stone-500 dark:text-zinc-400 font-medium">Filter Section:</span>
            <button
              onClick={() => setActiveChapterFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                activeChapterFilter === 'all'
                  ? 'bg-[#C96442] text-white font-semibold'
                  : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400'
              }`}
            >
              All Sections
            </button>
            {astData.chapters.map((ch) => (
              <button
                key={ch.chapter_index}
                onClick={() => setActiveChapterFilter(ch.chapter_index)}
                className={`px-2.5 py-1 rounded-lg transition-colors truncate max-w-xs ${
                  activeChapterFilter === ch.chapter_index
                    ? 'bg-[#C96442] text-white font-semibold'
                    : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400'
                }`}
              >
                {ch.title} ({ch.nodes.length})
              </button>
            ))}
          </div>

          {/* Chapters and Blocks Hierarchy */}
          <div className="space-y-6">
            {filteredChapters.map((chapter) => (
              <div
                key={chapter.chapter_index}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-xs space-y-4"
              >
                {/* Chapter Root Node */}
                <div className="flex items-center space-x-3 pb-3 border-b border-stone-100 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                    C{chapter.chapter_index + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                      {chapter.title}
                    </h3>
                    <p className="text-[11px] font-mono text-stone-400">
                      Spine Index #{chapter.chapter_index} • {chapter.nodes.length} structural elements
                    </p>
                  </div>
                </div>

                {/* Ordered Node List with Visual Connector Lines */}
                <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-zinc-800">
                  {chapter.nodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#C96442] bg-[#C96442]/8 dark:bg-[#C96442]/15 shadow-xs scale-[1.01]'
                            : 'border-stone-200/80 dark:border-zinc-800 bg-stone-50/40 dark:bg-zinc-800/40 hover:border-stone-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        {/* Node Connector Dot */}
                        <div
                          className={`absolute -left-[29px] top-4 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-zinc-900 transition-colors ${
                            isSelected
                              ? 'border-[#C96442] bg-[#C96442]'
                              : 'border-stone-300 dark:border-zinc-700'
                          }`}
                        ></div>

                        {/* Node Card Header */}
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] text-stone-400">
                              #{node.sequence_index}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold border ${getBlockTypeColor(
                                node.block_type
                              )}`}
                            >
                              {node.block_type}
                            </span>
                            {node.asset_id && (
                              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 flex items-center space-x-0.5">
                                <ImageIcon className="w-3 h-3" />
                                <span>Asset</span>
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] font-mono text-stone-400">
                            {node.status}
                          </span>
                        </div>

                        {/* Node Text Snippet */}
                        <p className="text-xs text-stone-700 dark:text-zinc-300 truncate font-sans">
                          {node.preview_source || node.preview_target || `[${node.block_type}]`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right 1 Col: Selected Node Detail Inspector */}
        <div className="space-y-4">
          <div className="sticky top-20 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100 flex items-center space-x-2 border-b border-stone-100 dark:border-zinc-800 pb-3">
              <Layers className="w-4 h-4 text-[#C96442]" />
              <span>Block Node Inspector</span>
            </h3>

            {selectedNode ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-stone-400 block font-mono">Stable Node ID</span>
                  <span className="font-mono font-semibold text-stone-800 dark:text-zinc-200 text-xs">
                    {selectedNode.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-stone-400 block">Sequence Index</span>
                    <span className="font-semibold text-stone-800 dark:text-zinc-200">
                      {selectedNode.sequence_index}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Element Classification</span>
                    <span className="font-semibold text-[#C96442]">
                      {selectedNode.block_type}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-stone-400 block font-mono">Source Content</span>
                  <div className="p-3 mt-1 rounded-lg bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-800 dark:text-zinc-200 max-h-36 overflow-y-auto">
                    {selectedNode.preview_source || `[Empty / Binary Asset]`}
                  </div>
                </div>

                <div>
                  <span className="text-stone-400 block font-mono">Translated Output</span>
                  <div className="p-3 mt-1 rounded-lg bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-stone-800 dark:text-zinc-200 max-h-36 overflow-y-auto">
                    {selectedNode.preview_target || `[Pending / Unchanged]`}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Integrity Guarantee</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This block has a locked sequence slot #{selectedNode.sequence_index}. No re-ordering or deletion can occur during reconstruction.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-stone-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Select any node in the AST graph to inspect its properties and preservation state.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
