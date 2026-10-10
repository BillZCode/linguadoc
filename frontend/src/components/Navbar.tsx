import { BookOpen, Sparkles, Sliders, Moon, Sun, Layers, HelpCircle, FileCheck, Smartphone } from 'lucide-react';
import { TranslationProvider } from '../types';

interface NavbarProps {
  currentTab: 'translator' | 'graphify' | 'history';
  setCurrentTab: (tab: 'translator' | 'graphify' | 'history') => void;
  activeProvider: TranslationProvider;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenValidation?: () => void;
  hasValidationReport?: boolean;
  onOpenInstall?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  activeProvider,
  isDarkMode,
  setIsDarkMode,
  onOpenSettings,
  onOpenGuide,
  onOpenValidation,
  hasValidationReport,
  onOpenInstall,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 dark:border-zinc-800/80 bg-[#FAF9F5]/90 dark:bg-[#151518]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('translator')}>
          <div className="w-9 h-9 rounded-xl bg-[#C96442] flex items-center justify-center text-white shadow-sm shadow-[#C96442]/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-editorial text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
                LinguaDoc
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400">
                v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 p-1 bg-stone-200/50 dark:bg-zinc-800/50 rounded-xl border border-stone-300/40 dark:border-zinc-700/40 text-xs font-medium">
          <button
            onClick={() => setCurrentTab('translator')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              currentTab === 'translator'
                ? 'bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 shadow-xs font-semibold'
                : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C96442]" />
            <span>Translator</span>
          </button>
          
          <button
            onClick={() => setCurrentTab('graphify')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              currentTab === 'graphify'
                ? 'bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 shadow-xs font-semibold'
                : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Graphify AST</span>
          </button>

          <button
            onClick={() => setCurrentTab('history')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
              currentTab === 'history'
                ? 'bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 shadow-xs font-semibold'
                : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-200'
            }`}
          >
            <span>History</span>
          </button>
        </nav>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-2.5">
          {/* Active Provider Pill */}
          <div 
            onClick={onOpenSettings}
            className="cursor-pointer hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-stone-200 dark:border-zinc-800 bg-stone-100/80 dark:bg-zinc-800/80 hover:border-[#C96442]/50 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-stone-700 dark:text-zinc-300">
              {activeProvider === 'demo' ? 'DEMO Mode' : activeProvider.toUpperCase()}
            </span>
          </div>

          {/* Validation Report Button (if available) */}
          {hasValidationReport && onOpenValidation && (
            <button
              onClick={onOpenValidation}
              title="View Structural Validation Report"
              className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center space-x-1.5 hover:bg-emerald-100/70 transition-colors"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">100% Fidelity</span>
            </button>
          )}

          {/* Install App Button */}
          {onOpenInstall && (
            <button
              onClick={onOpenInstall}
              title="Pasang Aplikasi (Windows, Linux, Android, iOS)"
              className="px-2.5 py-1.5 rounded-lg border border-[#C96442]/30 bg-[#C96442]/10 hover:bg-[#C96442]/20 text-[#C96442] dark:text-[#E07A5F] text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pasang App</span>
            </button>
          )}

          {/* Format Guide */}
          <button
            onClick={onOpenGuide}
            title="Supported Formats Guide"
            className="p-2 rounded-lg text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Settings Modal */}
          <button
            onClick={onOpenSettings}
            title="AI & API Settings"
            className="p-2 rounded-lg text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle theme"
            className="p-2 rounded-lg text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
          </button>
        </div>

      </div>
    </header>
  );
};
