import React from 'react';

export const NewsTicker: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-10 bg-slate-900 border-t border-slate-700 text-white overflow-hidden z-40 flex items-center">
      <div className="bg-slate-800 text-white font-bold px-4 h-full flex items-center z-50 shadow-lg text-sm uppercase tracking-wider">
        <span className="text-red-400 animate-pulse whitespace-nowrap">Live Now</span>
      </div>
      <div className="relative flex overflow-x-hidden w-full">
        <div className="animate-ticker whitespace-nowrap py-2 flex gap-12">
          <span className="text-sm text-slate-300"><strong className="text-blue-400">TIP:</strong> Cross-check headlines across at least 2 reputable outlets.</span>
          <span className="text-sm text-slate-300"><strong className="text-green-400">INFO:</strong> Models fuse signals from article text plus web corroboration.</span>
          <span className="text-sm text-slate-300"><strong className="text-amber-400">TIP:</strong> Watch for recycled images & reverse-search suspicious photos.</span>
          <span className="text-sm text-slate-300"><strong className="text-blue-400">INFO:</strong> Deep Analytic mode targets mutiple sources for tougher claims.</span>
          <span className="text-sm text-slate-300"><strong className="text-green-400">TIP:</strong> Check dates old stories reused for new rumors.</span>
        </div>
      </div>
    </div>
  );
};
