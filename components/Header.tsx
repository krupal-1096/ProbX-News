import React from 'react';
import logoOnly from '../assets/imgs/logo_only.png';

export const Header: React.FC = () => {
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
        <div className="hidden md:flex items-center gap-3">
          <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-blue-400 border border-slate-700">
            AI + WEB CROSS-CHECK
          </span>
        </div>
      </div>
    </header>
  );
};
