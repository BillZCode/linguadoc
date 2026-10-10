import React from 'react';
import { 
  CheckCircle2, Clock, AlertCircle, FileCheck, 
  Workflow, ArrowRight, ShieldCheck, Database, Layers 
} from 'lucide-react';
import { PipelineStage } from '../types';

interface PipelineStepperProps {
  currentStage: PipelineStage;
  stageIndex: number;
  progressPercentage: number;
  statusMessage: string;
  totalBlocks: number;
  translatedBlocks: number;
  isDemo: boolean;
  warnings: string[];
}

const STAGES = [
  { index: 1, id: 'validating_file', label: '1. Validation & MIME', icon: ShieldCheck },
  { index: 2, id: 'extracting_structure', label: '2. DOM/AST Extraction', icon: Layers },
  { index: 3, id: 'building_ir_tree', label: '3. Ordered IR Tree', icon: Database },
  { index: 4, id: 'indexing_blocks', label: '4. Stable Block IDs', icon: Workflow },
  { index: 5, id: 'segmenting_chunks', label: '5. Semantic Chunks', icon: Workflow },
  { index: 6, id: 'translating_blocks', label: '6. AI Translation', icon: Clock },
  { index: 7, id: 'reinjecting_text', label: '7. Re-injection', icon: ArrowRight },
  { index: 8, id: 'reconstructing_doc', label: '8. Document Builder', icon: FileCheck },
  { index: 9, id: 'validating_output', label: '9. Structural Audit', icon: ShieldCheck },
  { index: 10, id: 'ready', label: '10. Verified Ready', icon: CheckCircle2 },
];

export const PipelineStepper: React.FC<PipelineStepperProps> = ({
  currentStage,
  stageIndex,
  progressPercentage,
  statusMessage,
  totalBlocks,
  translatedBlocks,
  isDemo,
  warnings,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-sm space-y-5 animate-in fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#C96442] animate-ping"></div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
            Structure-Preserving Translation Pipeline
          </h3>
          {isDemo && (
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 font-semibold border border-amber-300 dark:border-amber-700/50">
              DEMO MOCK Active
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="text-stone-500 dark:text-zinc-400">
            Blocks: <strong className="text-stone-800 dark:text-zinc-200">{translatedBlocks} / {totalBlocks}</strong>
          </span>
          <span className="text-[#C96442] font-semibold">{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      {/* Progress Bar with Shimmer */}
      <div className="relative w-full h-2.5 bg-stone-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#C96442] to-amber-600 transition-all duration-300 rounded-full relative"
          style={{ width: `${Math.max(5, progressPercentage)}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
        </div>
      </div>

      {/* 10-Stage Micro Flow Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {STAGES.map((s) => {
          const isDone = stageIndex > s.index || currentStage === 'ready';
          const isCurrent = stageIndex === s.index && currentStage !== 'ready';
          const Icon = s.icon;

          return (
            <div
              key={s.index}
              className={`p-2 rounded-xl border text-left transition-all ${
                isDone
                  ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                  : isCurrent
                  ? 'border-[#C96442] bg-[#C96442]/10 text-[#C96442] ring-1 ring-[#C96442]/40 font-semibold'
                  : 'border-stone-200/80 dark:border-zinc-800 text-stone-400 dark:text-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono">Stage {s.index}</span>
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : isCurrent ? (
                  <div className="w-2 h-2 rounded-full bg-[#C96442] animate-pulse"></div>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-zinc-700"></div>
                )}
              </div>
              <p className="text-xs truncate font-medium">
                {s.label.split('. ')[1]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Status Message Log & Warnings */}
      <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/60 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-stone-700 dark:text-zinc-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-[#C96442]" />
          <span>{statusMessage}</span>
        </div>
        {warnings.length > 0 && (
          <span className="text-amber-600 dark:text-amber-400 flex items-center space-x-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{warnings.length} warning(s)</span>
          </span>
        )}
      </div>

    </div>
  );
};
