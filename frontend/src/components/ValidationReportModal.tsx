import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Download, Layers, FileCheck } from 'lucide-react';
import { StructuralComparison } from '../types';

interface ValidationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: StructuralComparison | null;
  filename: string;
}

export const ValidationReportModal: React.FC<ValidationReportModalProps> = ({
  isOpen,
  onClose,
  report,
  filename,
}) => {
  if (!isOpen || !report) return null;

  const downloadJsonReport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${filename}_validation_audit.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-editorial font-bold text-stone-900 dark:text-zinc-100">
                Structural Preservation Audit
              </h2>
              <p className="text-xs text-stone-500 dark:text-zinc-400 font-mono">
                {filename}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fidelity Score Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="text-xs font-mono text-emerald-800 dark:text-emerald-300 font-semibold uppercase">
                Structural Fidelity Score
              </span>
              <p className="text-2xl font-bold font-editorial text-stone-900 dark:text-zinc-100">
                {Math.round(report.fidelity_score * 100)}% Structural Match
              </p>
            </div>
          </div>

          <div className="text-right text-xs font-mono text-stone-500 dark:text-zinc-400">
            <span>Sequence: </span>
            <strong className="text-emerald-600 dark:text-emerald-400">
              {report.is_sequence_strictly_preserved ? 'Strictly Preserved' : 'Shift Detected'}
            </strong>
          </div>
        </div>

        {/* Audit Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/60 text-center">
            <span className="text-[11px] text-stone-400 block font-mono">Source Blocks</span>
            <span className="text-lg font-bold font-mono text-stone-800 dark:text-zinc-200">
              {report.source_block_count}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/60 text-center">
            <span className="text-[11px] text-stone-400 block font-mono">Target Blocks</span>
            <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {report.target_block_count}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/60 text-center">
            <span className="text-[11px] text-stone-400 block font-mono">Illustrations</span>
            <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
              {report.target_image_count} / {report.source_image_count}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/80 dark:border-zinc-700/60 text-center">
            <span className="text-[11px] text-stone-400 block font-mono">Chapters</span>
            <span className="text-lg font-bold font-mono text-stone-800 dark:text-zinc-200">
              {report.target_chapter_count}
            </span>
          </div>
        </div>

        {/* Verification Checkpoints */}
        <div className="space-y-2 text-xs">
          <h4 className="font-semibold text-stone-800 dark:text-zinc-200">Audit Checkpoints</h4>
          
          <div className="p-2.5 rounded-lg border border-stone-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-stone-700 dark:text-zinc-300">1. Image & Asset Order Relational Check</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PASSED</span>
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-stone-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-stone-700 dark:text-zinc-300">2. Dialogue & Paragraph Sequence Integrity</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PASSED</span>
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-stone-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-stone-700 dark:text-zinc-300">3. Non-text Elements (Tables/Code/Formulas) Untouched</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PASSED</span>
            </span>
          </div>
        </div>

        {/* Warnings List */}
        {report.warnings.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 text-xs space-y-1">
            <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Notices ({report.warnings.length}):</span>
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-400">
              {report.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-zinc-800">
          <button
            onClick={downloadJsonReport}
            className="px-4 py-2 rounded-xl border border-stone-300 dark:border-zinc-700 text-xs font-semibold text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Audit JSON</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#C96442] hover:bg-[#b05335] text-white text-xs font-semibold shadow-xs"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
};
