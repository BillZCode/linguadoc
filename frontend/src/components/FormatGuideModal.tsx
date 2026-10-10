import React from 'react';
import { X, CheckCircle2, AlertCircle, FileText, BookOpen, Layers, ShieldCheck } from 'lucide-react';

interface FormatGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FORMAT_DATA = [
  {
    ext: '.epub',
    name: 'EPUB 2 & 3 Digital Book',
    status: 'Full Support (100% Fidelity)',
    features: 'Preserves spine reading sequence, TOC navigation, embedded illustrations in exact positions, ruby text, styles, and bilingual dual-reading mode.',
    warning: 'Custom proprietary DRM-locked files must have DRM removed prior to upload.'
  },
  {
    ext: '.docx',
    name: 'Microsoft Word Document',
    status: 'High Support (98% Fidelity)',
    features: 'Preserves headings, paragraphs, run formatting (bold/italic/color), tables, cells, embedded images, and header/footer metadata.',
    warning: 'Complex legacy Word macros or active ActiveX controls are ignored.'
  },
  {
    ext: '.pdf',
    name: 'Portable Document Format',
    status: 'Layout-Preserving (95% Fidelity)',
    features: 'Extracts bounding boxes, replaces text in-place using auto-fitting font metrics, and preserves embedded images and page breaks.',
    warning: 'Heavily compressed scanned image PDFs require OCR. Layout reconstruction mode recommended for reflowable reading.'
  },
  {
    ext: '.md',
    name: 'Markdown / CommonMark',
    status: 'Full Support (100% Fidelity)',
    features: 'Preserves YAML frontmatter, tables, image links, and explicitly protects code blocks (```code```) from being translated.',
    warning: 'Raw inline HTML tags will have text translated while tag syntax is preserved.'
  },
  {
    ext: '.txt',
    name: 'Plain Text',
    status: 'Full Support (100% Fidelity)',
    features: 'Preserves double newlines, line breaks, paragraph indentations, and quotation brackets.',
    warning: 'No styling metadata exists in plain text.'
  },
  {
    ext: '.html',
    name: 'HTML & XHTML',
    status: 'Full Support (100% Fidelity)',
    features: 'Preserves DOM tree, styles, classes, IDs, hyperlinks, tables, and scripts untouched.',
    warning: 'Dynamic client-side JavaScript content loaded after page render is not extracted.'
  },
  {
    ext: '.pptx',
    name: 'PowerPoint Presentation',
    status: 'High Support (95% Fidelity)',
    features: 'Preserves slides, shapes, text frames, notes, and visual coordinates.',
    warning: 'Animated slide transition triggers remain untouched.'
  },
  {
    ext: '.xlsx',
    name: 'Excel Spreadsheet & CSV',
    status: 'Formula-Safe (98% Fidelity)',
    features: 'Translates only human text strings. Formulas (=SUM, =VLOOKUP), dates, numbers, and currency values are strictly untouched.',
    warning: 'Spreadsheet cell layout is not modified.'
  },
  {
    ext: '.srt / .vtt',
    name: 'Video Subtitles',
    status: 'Full Support (100% Fidelity)',
    features: 'Strictly preserves cue sequence numbers and timestamp ranges (00:01:23,456 --> 00:01:25,789). Translates only subtitle speech.',
    warning: 'Ensure subtitle encoding is UTF-8.'
  },
  {
    ext: '.json / .xml',
    name: 'Structured Data Formats',
    status: 'Syntax-Safe (100% Fidelity)',
    features: 'Preserves keys, tags, attributes, and data nesting. Only human string values are translated.',
    warning: 'Technical ID keys (e.g. "uuid", "id") should be listed in the glossary to keep verbatim.'
  }
];

export const FormatGuideModal: React.FC<FormatGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xl flex flex-col space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-zinc-800 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#C96442]/10 text-[#C96442] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-editorial font-bold text-stone-900 dark:text-zinc-100">
                Supported Formats & Preservation Guarantee
              </h2>
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                Detailed capability breakdown for each document and e-book type.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Format Cards */}
        <div className="overflow-y-auto space-y-3 pr-1 text-xs">
          {FORMAT_DATA.map((fmt) => (
            <div
              key={fmt.ext}
              className="p-4 rounded-2xl border border-stone-200/80 dark:border-zinc-800 bg-stone-50/40 dark:bg-zinc-800/40 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-stone-900 dark:text-zinc-100 text-sm">
                    {fmt.ext}
                  </span>
                  <span className="text-stone-600 dark:text-zinc-400">
                    {fmt.name}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {fmt.status}
                </span>
              </div>

              <p className="text-stone-700 dark:text-zinc-300 leading-relaxed font-sans">
                {fmt.features}
              </p>

              <div className="pt-1 flex items-start space-x-1.5 text-[11px] text-amber-700 dark:text-amber-400/90">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Notice: {fmt.warning}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-stone-500 dark:text-zinc-400 font-mono">
            Structure-Preserving Translation Pipeline
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#C96442] text-white text-xs font-semibold hover:bg-[#b05335]"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
};
