import React, { useState, useRef } from 'react';
import { AnalysisMode, InputType, ModelChoice } from '../types';

interface InputSectionProps {
  onAnalyze: (input: string | File, type: InputType, model: ModelChoice, mode: AnalysisMode) => void;
}

export const InputSection: React.FC<InputSectionProps> = ({ onAnalyze }) => {
  const [inputType, setInputType] = useState<InputType>(InputType.TEXT);
  const [textInput, setTextInput] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelChoice>('gemini-lite');
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>('fast');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileInput(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputType === InputType.TEXT && textInput.trim()) {
      onAnalyze(textInput, InputType.TEXT, selectedModel, selectedMode);
    } else if (inputType === InputType.IMAGE && fileInput) {
      onAnalyze(fileInput, InputType.IMAGE, selectedModel, selectedMode);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center">
        <h2 className="text-3xl font-extrabold text-white mb-2">Verify the Truth</h2>
        <p className="text-blue-100">AI models cross-check your link or image against the web in one shot.</p>
      </div>

      <div className="p-6">
        {/* Toggle Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setInputType(InputType.TEXT)}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
              inputType === InputType.TEXT 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🔗 Link / Text
          </button>
          <button
            onClick={() => setInputType(InputType.IMAGE)}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
              inputType === InputType.IMAGE 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Image Analysis (BETA)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {inputType === InputType.TEXT ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Paste Article URL or Claim</label>
              <textarea
                rows={4}
                className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-slate-50 text-lg"
                placeholder="e.g., https://news-site.com/article or 'The moon is made of cheese...'"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-2">Works with articles, X/Twitter posts, Reddit threads, and Facebook links.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 transition-colors hover:bg-slate-100">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative w-full max-h-64 flex justify-center">
                  <img src={previewUrl} alt="Preview" className="max-h-64 rounded-lg shadow-md object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setFileInput(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div 
                  className="text-center cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="mx-auto h-12 w-12 text-slate-400 mb-3">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" fill="none">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 17h16M12 7v10m-6 0h12M9 21l-3 3m0 0-3-3m3 3V3" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-600 font-medium">Click to upload text image or screenshot</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP supported</p>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={inputType === InputType.TEXT ? !textInput : !fileInput}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2
              ${(inputType === InputType.TEXT ? !textInput : !fileInput)
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
              }`}
          >
            <span>IDENTIFY FAKE</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="mt-2 w-full py-3 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h7.75M5.75 6H6m4.5 6h7.75M5.75 12H6m4.5 6h7.75M5.75 18H6" />
            </svg>
            Settings
          </button>
        </form>

        {showSettings && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="p-4 border border-slate-200 rounded-xl">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3">AI Model</p>
            <div className="space-y-2">
              {[
                { id: 'gemini-lite', label: 'Gemini-Lite (community)', desc: 'Stable generalist; good for mixed media.' },
                { id: 'grok-lite', label: 'Grok-Lite (community)', desc: 'Sharper tone/emotion reads; slower first load.' },
                { id: 'open-bart-clip', label: 'Open BART + CLIP', desc: 'Balanced text/image signal; no sign-up.' },
              ].map((m) => (
                <label key={m.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedModel === m.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    name="model-choice"
                    value={m.id}
                    checked={selectedModel === m.id}
                    onChange={() => setSelectedModel(m.id as ModelChoice)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-semibold text-slate-800">{m.label}</p>
                    <p className="text-sm text-slate-500">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-xl">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Analysis Mode</p>
            <div className="space-y-2">
              {[
                { id: 'fast', label: 'Fast Mode', detail: 'Targets 2 quick sources', eta: '' },
                { id: 'analyze', label: 'Analyze Mode', detail: 'Targets 4 sources', eta: '' },
                { id: 'deep-analytic', label: 'Deep Analytic Mode', detail: 'Targets 5+ sources, richer report', eta: '' },
              ].map((m) => (
                <label key={m.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedMode === m.id ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    name="mode-choice"
                    value={m.id}
                    checked={selectedMode === m.id}
                    onChange={() => setSelectedMode(m.id as AnalysisMode)}
                    className="mt-1 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">{m.label} <span className="text-xs text-slate-500">{m.eta}</span></p>
                    <p className="text-sm text-slate-500">{m.detail}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
