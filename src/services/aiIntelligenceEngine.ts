// Legacy service - temporarily stubbed
export interface IntelligenceSignal {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  confidence: number;
  timestamp: number;
}

export interface IntelligenceMetrics {
  totalSignals: number;
  activeSignals: number;
  winRate: number;
}

export interface IntelligenceReport {
  summary: string;
  signals: IntelligenceSignal[];
  timestamp: number;
}

class AIIntelligenceEngine {
  getMetrics(): IntelligenceMetrics {
    return { totalSignals: 0, activeSignals: 0, winRate: 0 };
  }
  
  getActiveSignals(): IntelligenceSignal[] {
    return [];
  }
  
  async generateIntelligenceReport(): Promise<IntelligenceReport> {
    return {
      summary: 'Legacy service disabled',
      signals: [],
      timestamp: Date.now()
    };
  }
}

export const aiIntelligenceEngine = new AIIntelligenceEngine();
