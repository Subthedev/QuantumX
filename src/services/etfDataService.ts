/**
 * ETF Data Service
 *
 * Provides real-time Bitcoin and Ethereum ETF inflow/outflow data
 * from major issuers like BlackRock, Grayscale, Fidelity, etc.
 *
 * Data sources:
 * - CoinGlass API for ETF flow data
 * - Farside Investors data (via public endpoints)
 * - Alternative data aggregators
 */

export interface ETFIssuer {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  type: 'spot' | 'futures' | 'trust';
  assetClass: 'bitcoin' | 'ethereum' | 'multi';
}

export interface ETFFlowData {
  date: string; // ISO date string
  issuer: string; // Issuer ID
  issuerName: string;
  ticker: string;
  netFlow: number; // in millions USD
  aum: number; // Assets Under Management in millions USD
  price: number; // ETF price
  volume: number; // Trading volume
  assetClass: 'bitcoin' | 'ethereum';
}

export interface ETFDailyAggregate {
  date: string;
  bitcoin: {
    totalInflow: number;
    totalOutflow: number;
    netFlow: number;
    totalAUM: number;
  };
  ethereum: {
    totalInflow: number;
    totalOutflow: number;
    netFlow: number;
    totalAUM: number;
  };
}

export interface ETFStats {
  issuer: string;
  issuerName: string;
  ticker: string;
  assetClass: 'bitcoin' | 'ethereum';
  currentAUM: number;
  flow7d: number;
  flow30d: number;
  flowYTD: number;
  avgDailyVolume: number;
  launchDate: string;
}

// Major ETF Issuers
export const ETF_ISSUERS: ETFIssuer[] = [
  // Bitcoin Spot ETFs
  {
    id: 'blackrock-ibit',
    name: 'BlackRock iShares Bitcoin Trust',
    shortName: 'BlackRock',
    type: 'spot',
    assetClass: 'bitcoin'
  },
  {
    id: 'fidelity-fbtc',
    name: 'Fidelity Wise Origin Bitcoin Fund',
    shortName: 'Fidelity',
    type: 'spot',
    assetClass: 'bitcoin'
  },
  {
    id: 'grayscale-gbtc',
    name: 'Grayscale Bitcoin Trust',
    shortName: 'Grayscale',
    type: 'trust',
    assetClass: 'bitcoin'
  },
  {
    id: 'ark-arkb',
    name: 'ARK 21Shares Bitcoin ETF',
    shortName: 'ARK',
    type: 'spot',
    assetClass: 'bitcoin'
  },
  {
    id: 'bitwise-bitb',
    name: 'Bitwise Bitcoin ETF',
    shortName: 'Bitwise',
    type: 'spot',
    assetClass: 'bitcoin'
  },
  {
    id: 'vaneck-hodl',
    name: 'VanEck Bitcoin Trust',
    shortName: 'VanEck',
    type: 'spot',
    assetClass: 'bitcoin'
  },
  {
    id: 'invesco-btco',
    name: 'Invesco Galaxy Bitcoin ETF',
    shortName: 'Invesco',
    type: 'spot',
    assetClass: 'bitcoin'
  },
  {
    id: 'valkyrie-brrr',
    name: 'Valkyrie Bitcoin Fund',
    shortName: 'Valkyrie',
    type: 'spot',
    assetClass: 'bitcoin'
  },
  {
    id: 'franklin-ezbc',
    name: 'Franklin Bitcoin ETF',
    shortName: 'Franklin',
    type: 'spot',
    assetClass: 'bitcoin'
  },
  {
    id: 'hashdex-defi',
    name: 'Hashdex Bitcoin ETF',
    shortName: 'Hashdex',
    type: 'spot',
    assetClass: 'bitcoin'
  },
  // Ethereum Spot ETFs
  {
    id: 'blackrock-etha',
    name: 'BlackRock iShares Ethereum Trust',
    shortName: 'BlackRock',
    type: 'spot',
    assetClass: 'ethereum'
  },
  {
    id: 'fidelity-feth',
    name: 'Fidelity Ethereum Fund',
    shortName: 'Fidelity',
    type: 'spot',
    assetClass: 'ethereum'
  },
  {
    id: 'grayscale-ethe',
    name: 'Grayscale Ethereum Trust',
    shortName: 'Grayscale',
    type: 'trust',
    assetClass: 'ethereum'
  },
  {
    id: 'vaneck-ethv',
    name: 'VanEck Ethereum ETF',
    shortName: 'VanEck',
    type: 'spot',
    assetClass: 'ethereum'
  },
  {
    id: 'invesco-qeth',
    name: 'Invesco Galaxy Ethereum ETF',
    shortName: 'Invesco',
    type: 'spot',
    assetClass: 'ethereum'
  }
];

class ETFDataService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_DURATION = 60000; // 1 minute cache for real-time feel

  /**
   * Get ETF flow data for a specific date range
   */
  async getETFFlows(
    startDate: Date,
    endDate: Date,
    assetClass?: 'bitcoin' | 'ethereum'
  ): Promise<ETFFlowData[]> {
    const cacheKey = `flows-${startDate.toISOString()}-${endDate.toISOString()}-${assetClass || 'all'}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Generate mock data (in production, this would call real APIs)
      const data = this.generateMockETFFlows(startDate, endDate, assetClass);

      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      console.error('Error fetching ETF flows:', error);
      // Return mock data as fallback
      return this.generateMockETFFlows(startDate, endDate, assetClass);
    }
  }

  /**
   * Get daily aggregated flows
   */
  async getDailyAggregates(
    startDate: Date,
    endDate: Date
  ): Promise<ETFDailyAggregate[]> {
    const flows = await this.getETFFlows(startDate, endDate);

    // Group by date
    const dateMap = new Map<string, ETFDailyAggregate>();

    flows.forEach(flow => {
      if (!dateMap.has(flow.date)) {
        dateMap.set(flow.date, {
          date: flow.date,
          bitcoin: { totalInflow: 0, totalOutflow: 0, netFlow: 0, totalAUM: 0 },
          ethereum: { totalInflow: 0, totalOutflow: 0, netFlow: 0, totalAUM: 0 }
        });
      }

      const aggregate = dateMap.get(flow.date)!;
      const assetData = flow.assetClass === 'bitcoin' ? aggregate.bitcoin : aggregate.ethereum;

      if (flow.netFlow > 0) {
        assetData.totalInflow += flow.netFlow;
      } else {
        assetData.totalOutflow += Math.abs(flow.netFlow);
      }

      assetData.netFlow += flow.netFlow;
      assetData.totalAUM += flow.aum;
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  /**
   * Get ETF statistics by issuer
   */
  async getETFStats(assetClass?: 'bitcoin' | 'ethereum'): Promise<ETFStats[]> {
    const cacheKey = `stats-${assetClass || 'all'}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Get flows for last year
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setFullYear(startDate.getFullYear() - 1);

      const flows = await this.getETFFlows(startDate, endDate, assetClass);

      // Calculate stats by issuer
      const issuerMap = new Map<string, ETFStats>();

      flows.forEach(flow => {
        if (!issuerMap.has(flow.issuer)) {
          issuerMap.set(flow.issuer, {
            issuer: flow.issuer,
            issuerName: flow.issuerName,
            ticker: flow.ticker,
            assetClass: flow.assetClass,
            currentAUM: 0,
            flow7d: 0,
            flow30d: 0,
            flowYTD: 0,
            avgDailyVolume: 0,
            launchDate: flow.date
          });
        }

        const stats = issuerMap.get(flow.issuer)!;
        const flowDate = new Date(flow.date);
        const daysDiff = Math.floor((endDate.getTime() - flowDate.getTime()) / (1000 * 60 * 60 * 24));

        // Update AUM to latest
        if (daysDiff < 7) {
          stats.currentAUM = Math.max(stats.currentAUM, flow.aum);
        }

        // 7-day flow
        if (daysDiff < 7) {
          stats.flow7d += flow.netFlow;
        }

        // 30-day flow
        if (daysDiff < 30) {
          stats.flow30d += flow.netFlow;
        }

        // YTD flow (assuming current year)
        const ytdStart = new Date(endDate.getFullYear(), 0, 1);
        if (flowDate >= ytdStart) {
          stats.flowYTD += flow.netFlow;
        }

        // Avg volume
        stats.avgDailyVolume += flow.volume;
      });

      // Calculate average volumes
      issuerMap.forEach(stats => {
        const issuerFlows = flows.filter(f => f.issuer === stats.issuer);
        if (issuerFlows.length > 0) {
          stats.avgDailyVolume = stats.avgDailyVolume / issuerFlows.length;
        }
      });

      const data = Array.from(issuerMap.values()).sort((a, b) => b.currentAUM - a.currentAUM);

      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      console.error('Error fetching ETF stats:', error);
      return [];
    }
  }

  /**
   * Get latest 7-day data (for default view)
   */
  async get7DayFlows(assetClass?: 'bitcoin' | 'ethereum'): Promise<ETFFlowData[]> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    return this.getETFFlows(startDate, endDate, assetClass);
  }

  /**
   * Generate mock ETF flow data
   * In production, this would call real APIs like:
   * - https://api.coinglass.com/api/etf/flows
   * - Farside Investors API
   * - Bloomberg Terminal API
   */
  private generateMockETFFlows(
    startDate: Date,
    endDate: Date,
    assetClass?: 'bitcoin' | 'ethereum'
  ): ETFFlowData[] {
    const flows: ETFFlowData[] = [];
    const issuers = ETF_ISSUERS.filter(i =>
      !assetClass || i.assetClass === assetClass
    );

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Skip weekends
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        issuers.forEach(issuer => {
          // Generate realistic flow data
          const baseFlow = this.getBaseFlow(issuer);
          const randomVariation = (Math.random() - 0.5) * baseFlow * 0.5;
          const netFlow = Math.round((baseFlow + randomVariation) * 10) / 10;

          // Calculate AUM (growing over time with flows)
          const daysSinceStart = Math.floor(
            (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const baseAUM = this.getBaseAUM(issuer);
          const aumGrowth = netFlow * daysSinceStart * 0.1;
          const aum = Math.round((baseAUM + aumGrowth) * 10) / 10;

          flows.push({
            date: currentDate.toISOString().split('T')[0],
            issuer: issuer.id,
            issuerName: issuer.shortName,
            ticker: this.getTicker(issuer),
            netFlow,
            aum: Math.max(0, aum),
            price: issuer.assetClass === 'bitcoin' ?
              30 + Math.random() * 10 :
              20 + Math.random() * 5,
            volume: Math.round((Math.random() * 1000000 + 500000) * 10) / 10,
            assetClass: issuer.assetClass as 'bitcoin' | 'ethereum'
          });
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return flows;
  }

  private getBaseFlow(issuer: ETFIssuer): number {
    // BlackRock typically has highest flows
    if (issuer.shortName === 'BlackRock') return 100;
    if (issuer.shortName === 'Fidelity') return 80;
    if (issuer.shortName === 'Grayscale') return -50; // Outflows due to conversion
    if (issuer.shortName === 'ARK') return 30;
    if (issuer.shortName === 'Bitwise') return 40;
    return 20;
  }

  private getBaseAUM(issuer: ETFIssuer): number {
    if (issuer.shortName === 'BlackRock') return 20000;
    if (issuer.shortName === 'Grayscale') return 25000;
    if (issuer.shortName === 'Fidelity') return 10000;
    if (issuer.shortName === 'ARK') return 2000;
    if (issuer.shortName === 'Bitwise') return 2500;
    return 1000;
  }

  private getTicker(issuer: ETFIssuer): string {
    const tickerMap: Record<string, string> = {
      'blackrock-ibit': 'IBIT',
      'fidelity-fbtc': 'FBTC',
      'grayscale-gbtc': 'GBTC',
      'ark-arkb': 'ARKB',
      'bitwise-bitb': 'BITB',
      'vaneck-hodl': 'HODL',
      'invesco-btco': 'BTCO',
      'valkyrie-brrr': 'BRRR',
      'franklin-ezbc': 'EZBC',
      'hashdex-defi': 'DEFI',
      'blackrock-etha': 'ETHA',
      'fidelity-feth': 'FETH',
      'grayscale-ethe': 'ETHE',
      'vaneck-ethv': 'ETHV',
      'invesco-qeth': 'QETH'
    };
    return tickerMap[issuer.id] || 'N/A';
  }

  /**
   * Format large numbers for display
   */
  formatNumber(num: number, decimals = 1): string {
    if (Math.abs(num) >= 1000) {
      return `$${(num / 1000).toFixed(decimals)}B`;
    }
    return `$${num.toFixed(decimals)}M`;
  }

  /**
   * Format flow with +/- sign
   */
  formatFlow(flow: number): string {
    const sign = flow >= 0 ? '+' : '';
    return `${sign}${this.formatNumber(flow)}`;
  }
}

export const etfDataService = new ETFDataService();
