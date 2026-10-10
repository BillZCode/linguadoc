import React from 'react';
import { History, FileText, Download, Trash2, Eye, Clock, CheckCircle2 } from 'lucide-react';
import { getDownloadUrl } from '../api';

interface JobSummary {
  job_id: string;
  filename: string;
  format: string;
  stage: string;
  progress_percentage: number;
  total_blocks: number;
  translated_blocks: number;
  created_at: number;
  is_ready: boolean;
}

interface HistoryDashboardProps {
  jobs: JobSummary[];
  onSelectJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
}

export const HistoryDashboard: React.FC<HistoryDashboardProps> = ({
  jobs,
  onSelectJob,
  onDeleteJob,
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-6 space-y-4 animate-in fade-in">
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#C96442]/10 text-[#C96442] flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-editorial font-bold text-stone-900 dark:text-zinc-100">
              Document Translation History
            </h2>
            <p className="text-xs text-stone-500 dark:text-zinc-400">
              Inspect, download, or review previous translation jobs and validation reports.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-stone-500 dark:text-zinc-400">
          {jobs.length} jobs stored
        </span>
      </div>

      {jobs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-stone-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60">
          <FileText className="w-12 h-12 mx-auto text-stone-300 dark:text-zinc-700 mb-3" />
          <h3 className="text-sm font-semibold text-stone-800 dark:text-zinc-200">No Documents Translated Yet</h3>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
            Upload an EPUB, DOCX, or PDF document to start your first translation job.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-zinc-800/60 border-b border-stone-200 dark:border-zinc-800 text-stone-500 dark:text-zinc-400 font-mono uppercase">
                <tr>
                  <th className="px-5 py-3.5">Document</th>
                  <th className="px-4 py-3.5">Format</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Blocks</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-zinc-800">
                {jobs.map((job) => (
                  <tr key={job.job_id} className="hover:bg-stone-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-stone-900 dark:text-zinc-100 truncate max-w-xs">
                      {job.filename}
                    </td>
                    <td className="px-4 py-3.5 font-mono uppercase">
                      <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 text-[10px]">
                        .{job.format}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {job.is_ready ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[#C96442] font-medium font-mono">
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>{job.stage} ({Math.round(job.progress_percentage)}%)</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-stone-600 dark:text-zinc-400">
                      {job.translated_blocks} / {job.total_blocks}
                    </td>
                    <td className="px-4 py-3.5 text-stone-500 dark:text-zinc-400 font-mono text-[11px]">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => onSelectJob(job.job_id)}
                        className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-zinc-700 hover:border-[#C96442] text-stone-700 dark:text-zinc-300 transition-colors inline-flex items-center space-x-1"
                        title="Inspect Document"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>

                      {job.is_ready && (
                        <a
                          href={getDownloadUrl(job.job_id)}
                          download
                          className="px-2.5 py-1 rounded-lg bg-[#C96442]/10 hover:bg-[#C96442]/20 text-[#C96442] font-semibold transition-colors inline-flex items-center space-x-1"
                          title="Download translated file"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      )}

                      <button
                        onClick={() => onDeleteJob(job.job_id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 transition-colors"
                        title="Delete from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
