export enum InputType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
}

export enum Verdict {
  REAL = 'REAL',
  FAKE = 'FAKE',
  INCONCLUSIVE = 'INCONCLUSIVE',
  SATIRE = 'SATIRE'
}

export interface Source {
  title: string;
  uri: string;
  snippet?: string;
}

export interface AgentLogEntry {
  action: string;
  findings: string;
  source?: string;
}

export interface AnalysisResult {
  verdict: Verdict;
  confidenceScore: number; // 0 to 100
  summary: string;
  detailedMarkdown: string;
  sources: Source[];
  agentLogs: AgentLogEntry[];
  emotion: string;
  harmSignals: string;
  ethics: 'good' | 'moderate' | 'bad';
  modelUsed: ModelChoice;
  modeUsed: AnalysisMode;
  shouldShowDetail?: boolean;
}

export type ModelChoice = 'gemini-1.5-flash' | 'openrouter-llama';

export type AnalysisMode = 'fast' | 'analyze' | 'deep-analytic';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
