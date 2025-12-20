import React from 'react';
import logoOnly from '../assets/imgs/logo_only.png';

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme }) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-lg border-b border-slate-700">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo Icon */}
          <div className="h-10 w-10 overflow-hidden rounded-lg bg-white flex items-center justify-center shadow-sm">
            <img
              src={logoOnly}
              alt="ProbX Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ProbX News</h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Multi-model News Radar</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-blue-400 border border-slate-700">
            AI + WEB CROSS-CHECK
          </span>
          <button
            onClick={onToggleTheme}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 border border-slate-700 hover:bg-white/15 transition"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05 5.636 5.636M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
