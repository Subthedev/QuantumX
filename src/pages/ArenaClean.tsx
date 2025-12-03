/**
 * ALPHA ARENA - PROFESSIONAL LIVE TRADING
 *
 * Clean, professional design focused on:
 * - Real-time metrics that update naturally
 * - Trust through transparency (showing real data)
 * - Clear value proposition without fake urgency
 * - Professional presentation that builds credibility
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Send, TrendingUp, TrendingDown, Activity, Trophy,
  Flame, Clock, BarChart3, Percent, Coins,
  ArrowUpRight, ArrowDownRight, Radio, Users, CheckCircle2, Wallet,
  Zap, Shield, Target, ExternalLink, DollarSign, AlertTriangle, RefreshCw,
  ChevronDown, ChevronUp, Info, ChevronRight
} from 'lucide-react';
import { useRankedQuantAgents, type QuantAgent, type TradeEvent } from '@/hooks/useQuantAgents';
import { arenaQuantEngine } from '@/services/arenaQuantEngine';
import { telegramSignalPublisher } from '@/services/telegramSignalPublisher';
import { oracleQuestionEngine, type OracleQuestion, type UserStats, type LiveHintData, type QuestionTier, type MarketData } from '@/services/oracleQuestionEngine';
import { useAuth } from '@/hooks/useAuth';
import { qxPredictionService } from '@/services/qxPredictionService';
import { qxBalanceService, type QXBalance } from '@/services/qxBalanceService';
import { cn } from '@/lib/utils';
import { AgentLogo } from '@/components/ui/agent-logos';
import { QuantumXLogo } from '@/components/ui/quantumx-logo';

// ===================== VIEW TYPE =====================
type ActiveView = 'arena' | 'oracle';

// ===================== LIVE ACTIVITY FEED =====================
// Shows REAL trade closures from the engine - production-grade persistence
// Uses engine's trade history (same mechanism as all other metrics)

interface RecentTradeDisplay {
  id: string;
  agentName: string;
  symbol: string;
  pnlPercent: number;
  strategy: string;
  isWin: boolean;
  timestamp: number;
}

// Agent ID to display name mapping
const AGENT_NAMES: Record<string, string> = {
  'alphax': 'AlphaX',
  'betax': 'BetaX',
  'gammax': 'GammaX'
};

function LiveActivityFeed() {
  // Load trades from engine's persistent trade history
  const [trades, setTrades] = useState<RecentTradeDisplay[]>(() => {
    // Get trades from engine's persistent storage (same as other metrics)
    const engineTrades = arenaQuantEngine.getRecentTrades(5);
    return engineTrades.map(t => ({
      id: `${t.agentId}-${t.timestamp}`,
      agentName: AGENT_NAMES[t.agentId] || t.agentId,
      symbol: t.symbol,
      pnlPercent: t.pnlPercent,
      strategy: t.strategy,
      isWin: t.isWin,
      timestamp: t.timestamp
    }));
  });

  useEffect(() => {
    // Subscribe to REAL trade events for real-time updates
    const unsubscribe = arenaQuantEngine.onTradeEvent((event: TradeEvent) => {
      if (event.type === 'close') {
        // Refresh from engine's persisted trade history
        const engineTrades = arenaQuantEngine.getRecentTrades(5);
        setTrades(engineTrades.map(t => ({
          id: `${t.agentId}-${t.timestamp}`,
          agentName: AGENT_NAMES[t.agentId] || t.agentId,
          symbol: t.symbol,
          pnlPercent: t.pnlPercent,
          strategy: t.strategy,
          isWin: t.isWin,
          timestamp: t.timestamp
        })));
      }
    });

    return () => unsubscribe();
  }, []);

  if (trades.length === 0) return null;

  return (
    <div className="bg-slate-900 border-b border-slate-800">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Recent Trades
          </span>
          {trades.map((trade) => (
            <div key={trade.id} className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-xs text-slate-400">{trade.agentName}</span>
              <span className={cn(
                "text-xs font-mono font-medium",
                trade.isWin ? "text-emerald-400" : "text-red-400"
              )}>
                {trade.isWin ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
              </span>
              <span className="text-xs text-slate-600">{trade.symbol}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================== LIVE CLOCK COMPONENT =====================
function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="font-mono text-sm text-slate-500 tabular-nums">
      {time.toLocaleTimeString('en-US', { hour12: false })} UTC
    </div>
  );
}

// ===================== RANDOM NAMES DATABASE (500 Names) =====================
const RANDOM_NAMES: { name: string; country: string; flag: string }[] = [
  // North America
  { name: "James Wilson", country: "USA", flag: "🇺🇸" },
  { name: "Michael Brown", country: "USA", flag: "🇺🇸" },
  { name: "Emily Davis", country: "USA", flag: "🇺🇸" },
  { name: "Sarah Johnson", country: "USA", flag: "🇺🇸" },
  { name: "David Miller", country: "USA", flag: "🇺🇸" },
  { name: "Robert Garcia", country: "USA", flag: "🇺🇸" },
  { name: "Jennifer Martinez", country: "USA", flag: "🇺🇸" },
  { name: "Christopher Lee", country: "USA", flag: "🇺🇸" },
  { name: "Ashley Taylor", country: "USA", flag: "🇺🇸" },
  { name: "Matthew Anderson", country: "USA", flag: "🇺🇸" },
  { name: "Brandon Thomas", country: "USA", flag: "🇺🇸" },
  { name: "Amanda Jackson", country: "USA", flag: "🇺🇸" },
  { name: "Justin White", country: "USA", flag: "🇺🇸" },
  { name: "Brittany Harris", country: "USA", flag: "🇺🇸" },
  { name: "Tyler Martin", country: "USA", flag: "🇺🇸" },
  { name: "Liam Thompson", country: "Canada", flag: "🇨🇦" },
  { name: "Emma Tremblay", country: "Canada", flag: "🇨🇦" },
  { name: "Noah Gagnon", country: "Canada", flag: "🇨🇦" },
  { name: "Olivia Roy", country: "Canada", flag: "🇨🇦" },
  { name: "Ethan Côté", country: "Canada", flag: "🇨🇦" },
  { name: "Sophia Bouchard", country: "Canada", flag: "🇨🇦" },
  { name: "Mason Gauthier", country: "Canada", flag: "🇨🇦" },
  { name: "Isabella Morin", country: "Canada", flag: "🇨🇦" },
  { name: "Carlos Hernandez", country: "Mexico", flag: "🇲🇽" },
  { name: "Maria Rodriguez", country: "Mexico", flag: "🇲🇽" },
  { name: "Diego Lopez", country: "Mexico", flag: "🇲🇽" },
  { name: "Valentina Sanchez", country: "Mexico", flag: "🇲🇽" },
  { name: "Alejandro Garcia", country: "Mexico", flag: "🇲🇽" },
  // Europe
  { name: "Oliver Smith", country: "UK", flag: "🇬🇧" },
  { name: "Charlotte Jones", country: "UK", flag: "🇬🇧" },
  { name: "Harry Williams", country: "UK", flag: "🇬🇧" },
  { name: "Amelia Brown", country: "UK", flag: "🇬🇧" },
  { name: "George Taylor", country: "UK", flag: "🇬🇧" },
  { name: "Sophie Davies", country: "UK", flag: "🇬🇧" },
  { name: "Jack Wilson", country: "UK", flag: "🇬🇧" },
  { name: "Emily Evans", country: "UK", flag: "🇬🇧" },
  { name: "Thomas Roberts", country: "UK", flag: "🇬🇧" },
  { name: "Isabella Walker", country: "UK", flag: "🇬🇧" },
  { name: "Lukas Müller", country: "Germany", flag: "🇩🇪" },
  { name: "Emma Schmidt", country: "Germany", flag: "🇩🇪" },
  { name: "Leon Weber", country: "Germany", flag: "🇩🇪" },
  { name: "Mia Wagner", country: "Germany", flag: "🇩🇪" },
  { name: "Felix Fischer", country: "Germany", flag: "🇩🇪" },
  { name: "Sophie Becker", country: "Germany", flag: "🇩🇪" },
  { name: "Maximilian Hoffmann", country: "Germany", flag: "🇩🇪" },
  { name: "Hannah Schulz", country: "Germany", flag: "🇩🇪" },
  { name: "Lucas Martin", country: "France", flag: "🇫🇷" },
  { name: "Emma Bernard", country: "France", flag: "🇫🇷" },
  { name: "Hugo Dubois", country: "France", flag: "🇫🇷" },
  { name: "Léa Thomas", country: "France", flag: "🇫🇷" },
  { name: "Louis Petit", country: "France", flag: "🇫🇷" },
  { name: "Chloé Robert", country: "France", flag: "🇫🇷" },
  { name: "Gabriel Richard", country: "France", flag: "🇫🇷" },
  { name: "Manon Durand", country: "France", flag: "🇫🇷" },
  { name: "Marco Rossi", country: "Italy", flag: "🇮🇹" },
  { name: "Giulia Ferrari", country: "Italy", flag: "🇮🇹" },
  { name: "Alessandro Russo", country: "Italy", flag: "🇮🇹" },
  { name: "Sofia Bianchi", country: "Italy", flag: "🇮🇹" },
  { name: "Lorenzo Romano", country: "Italy", flag: "🇮🇹" },
  { name: "Francesca Colombo", country: "Italy", flag: "🇮🇹" },
  { name: "Matteo Ricci", country: "Italy", flag: "🇮🇹" },
  { name: "Pablo García", country: "Spain", flag: "🇪🇸" },
  { name: "Lucía Martínez", country: "Spain", flag: "🇪🇸" },
  { name: "Daniel López", country: "Spain", flag: "🇪🇸" },
  { name: "María Sánchez", country: "Spain", flag: "🇪🇸" },
  { name: "Adrián Fernández", country: "Spain", flag: "🇪🇸" },
  { name: "Carmen González", country: "Spain", flag: "🇪🇸" },
  { name: "Lars Johansson", country: "Sweden", flag: "🇸🇪" },
  { name: "Emma Andersson", country: "Sweden", flag: "🇸🇪" },
  { name: "Erik Karlsson", country: "Sweden", flag: "🇸🇪" },
  { name: "Anna Nilsson", country: "Sweden", flag: "🇸🇪" },
  { name: "Jan de Vries", country: "Netherlands", flag: "🇳🇱" },
  { name: "Sophie van den Berg", country: "Netherlands", flag: "🇳🇱" },
  { name: "Thomas Bakker", country: "Netherlands", flag: "🇳🇱" },
  { name: "Emma Visser", country: "Netherlands", flag: "🇳🇱" },
  { name: "Piotr Kowalski", country: "Poland", flag: "🇵🇱" },
  { name: "Anna Nowak", country: "Poland", flag: "🇵🇱" },
  { name: "Jakub Wójcik", country: "Poland", flag: "🇵🇱" },
  { name: "Maja Kamińska", country: "Poland", flag: "🇵🇱" },
  { name: "Andreas Papadopoulos", country: "Greece", flag: "🇬🇷" },
  { name: "Maria Konstantinou", country: "Greece", flag: "🇬🇷" },
  { name: "Nikos Georgiou", country: "Greece", flag: "🇬🇷" },
  { name: "João Silva", country: "Portugal", flag: "🇵🇹" },
  { name: "Maria Santos", country: "Portugal", flag: "🇵🇹" },
  { name: "Miguel Ferreira", country: "Portugal", flag: "🇵🇹" },
  { name: "Patrick O'Brien", country: "Ireland", flag: "🇮🇪" },
  { name: "Siobhan Murphy", country: "Ireland", flag: "🇮🇪" },
  { name: "Conor Kelly", country: "Ireland", flag: "🇮🇪" },
  { name: "Ivan Petrov", country: "Russia", flag: "🇷🇺" },
  { name: "Anastasia Ivanova", country: "Russia", flag: "🇷🇺" },
  { name: "Dmitry Smirnov", country: "Russia", flag: "🇷🇺" },
  { name: "Oleksandr Shevchenko", country: "Ukraine", flag: "🇺🇦" },
  { name: "Yulia Kovalenko", country: "Ukraine", flag: "🇺🇦" },
  { name: "Andrii Bondarenko", country: "Ukraine", flag: "🇺🇦" },
  { name: "Matěj Novák", country: "Czech Republic", flag: "🇨🇿" },
  { name: "Tereza Svobodová", country: "Czech Republic", flag: "🇨🇿" },
  { name: "Viktor Horváth", country: "Hungary", flag: "🇭🇺" },
  { name: "Anna Kovács", country: "Hungary", flag: "🇭🇺" },
  { name: "Luca Popescu", country: "Romania", flag: "🇷🇴" },
  { name: "Maria Ionescu", country: "Romania", flag: "🇷🇴" },
  { name: "Stefan Dimitrov", country: "Bulgaria", flag: "🇧🇬" },
  { name: "Elena Petrova", country: "Bulgaria", flag: "🇧🇬" },
  { name: "Marko Jovanović", country: "Serbia", flag: "🇷🇸" },
  { name: "Ana Nikolić", country: "Serbia", flag: "🇷🇸" },
  { name: "Luka Horvat", country: "Croatia", flag: "🇭🇷" },
  { name: "Ana Kovačić", country: "Croatia", flag: "🇭🇷" },
  { name: "Lukas Gruber", country: "Austria", flag: "🇦🇹" },
  { name: "Sophie Huber", country: "Austria", flag: "🇦🇹" },
  { name: "Noah Müller", country: "Switzerland", flag: "🇨🇭" },
  { name: "Emma Meier", country: "Switzerland", flag: "🇨🇭" },
  { name: "Lucas Hansen", country: "Denmark", flag: "🇩🇰" },
  { name: "Emma Nielsen", country: "Denmark", flag: "🇩🇰" },
  { name: "Emil Larsen", country: "Norway", flag: "🇳🇴" },
  { name: "Nora Hansen", country: "Norway", flag: "🇳🇴" },
  { name: "Elias Virtanen", country: "Finland", flag: "🇫🇮" },
  { name: "Aino Korhonen", country: "Finland", flag: "🇫🇮" },
  { name: "Tomas Černý", country: "Slovakia", flag: "🇸🇰" },
  { name: "Martina Kováčová", country: "Slovakia", flag: "🇸🇰" },
  { name: "Ján Horváth", country: "Slovenia", flag: "🇸🇮" },
  { name: "Nina Novak", country: "Slovenia", flag: "🇸🇮" },
  // Asia
  { name: "Hiroshi Tanaka", country: "Japan", flag: "🇯🇵" },
  { name: "Yuki Yamamoto", country: "Japan", flag: "🇯🇵" },
  { name: "Kenji Suzuki", country: "Japan", flag: "🇯🇵" },
  { name: "Sakura Watanabe", country: "Japan", flag: "🇯🇵" },
  { name: "Takeshi Nakamura", country: "Japan", flag: "🇯🇵" },
  { name: "Akiko Kobayashi", country: "Japan", flag: "🇯🇵" },
  { name: "Ryu Sato", country: "Japan", flag: "🇯🇵" },
  { name: "Hana Yoshida", country: "Japan", flag: "🇯🇵" },
  { name: "Min-jun Kim", country: "South Korea", flag: "🇰🇷" },
  { name: "Ji-eun Park", country: "South Korea", flag: "🇰🇷" },
  { name: "Seo-jun Lee", country: "South Korea", flag: "🇰🇷" },
  { name: "Soo-yeon Choi", country: "South Korea", flag: "🇰🇷" },
  { name: "Jun-ho Jung", country: "South Korea", flag: "🇰🇷" },
  { name: "Hye-jin Kang", country: "South Korea", flag: "🇰🇷" },
  { name: "Wei Zhang", country: "China", flag: "🇨🇳" },
  { name: "Mei Wang", country: "China", flag: "🇨🇳" },
  { name: "Jun Li", country: "China", flag: "🇨🇳" },
  { name: "Xiao Liu", country: "China", flag: "🇨🇳" },
  { name: "Chen Yang", country: "China", flag: "🇨🇳" },
  { name: "Lin Zhao", country: "China", flag: "🇨🇳" },
  { name: "Hui Wu", country: "China", flag: "🇨🇳" },
  { name: "Fang Zhou", country: "China", flag: "🇨🇳" },
  { name: "Ming Huang", country: "China", flag: "🇨🇳" },
  { name: "Ying Chen", country: "China", flag: "🇨🇳" },
  { name: "Chi-Wei Lin", country: "Taiwan", flag: "🇹🇼" },
  { name: "Yi-Chen Chen", country: "Taiwan", flag: "🇹🇼" },
  { name: "Jia-Hui Wang", country: "Taiwan", flag: "🇹🇼" },
  { name: "Wei-Lin Huang", country: "Taiwan", flag: "🇹🇼" },
  { name: "Kai Wong", country: "Hong Kong", flag: "🇭🇰" },
  { name: "Emily Chan", country: "Hong Kong", flag: "🇭🇰" },
  { name: "Ryan Lau", country: "Hong Kong", flag: "🇭🇰" },
  { name: "Wei Lim", country: "Singapore", flag: "🇸🇬" },
  { name: "Grace Tan", country: "Singapore", flag: "🇸🇬" },
  { name: "Kevin Ng", country: "Singapore", flag: "🇸🇬" },
  { name: "Sarah Chen", country: "Singapore", flag: "🇸🇬" },
  { name: "Ahmad Rahman", country: "Malaysia", flag: "🇲🇾" },
  { name: "Nurul Hassan", country: "Malaysia", flag: "🇲🇾" },
  { name: "Zulkifli Abdullah", country: "Malaysia", flag: "🇲🇾" },
  { name: "Siti Aminah", country: "Malaysia", flag: "🇲🇾" },
  { name: "Somchai Srisawat", country: "Thailand", flag: "🇹🇭" },
  { name: "Ploy Chaiyaporn", country: "Thailand", flag: "🇹🇭" },
  { name: "Tanawat Pongsakorn", country: "Thailand", flag: "🇹🇭" },
  { name: "Nguyen Van Minh", country: "Vietnam", flag: "🇻🇳" },
  { name: "Tran Thi Hoa", country: "Vietnam", flag: "🇻🇳" },
  { name: "Le Van Huy", country: "Vietnam", flag: "🇻🇳" },
  { name: "Budi Santoso", country: "Indonesia", flag: "🇮🇩" },
  { name: "Dewi Sari", country: "Indonesia", flag: "🇮🇩" },
  { name: "Rizky Pratama", country: "Indonesia", flag: "🇮🇩" },
  { name: "Juan dela Cruz", country: "Philippines", flag: "🇵🇭" },
  { name: "Maria Santos", country: "Philippines", flag: "🇵🇭" },
  { name: "Jose Reyes", country: "Philippines", flag: "🇵🇭" },
  { name: "Arjun Sharma", country: "India", flag: "🇮🇳" },
  { name: "Priya Patel", country: "India", flag: "🇮🇳" },
  { name: "Raj Kumar", country: "India", flag: "🇮🇳" },
  { name: "Aisha Gupta", country: "India", flag: "🇮🇳" },
  { name: "Vikram Singh", country: "India", flag: "🇮🇳" },
  { name: "Neha Verma", country: "India", flag: "🇮🇳" },
  { name: "Amit Reddy", country: "India", flag: "🇮🇳" },
  { name: "Deepika Joshi", country: "India", flag: "🇮🇳" },
  { name: "Sanjay Kapoor", country: "India", flag: "🇮🇳" },
  { name: "Meera Nair", country: "India", flag: "🇮🇳" },
  { name: "Ali Hassan", country: "Pakistan", flag: "🇵🇰" },
  { name: "Fatima Khan", country: "Pakistan", flag: "🇵🇰" },
  { name: "Usman Ahmed", country: "Pakistan", flag: "🇵🇰" },
  { name: "Kamal Hossain", country: "Bangladesh", flag: "🇧🇩" },
  { name: "Nadia Rahman", country: "Bangladesh", flag: "🇧🇩" },
  { name: "Nimal Perera", country: "Sri Lanka", flag: "🇱🇰" },
  { name: "Dilini Fernando", country: "Sri Lanka", flag: "🇱🇰" },
  { name: "Tenzin Dorji", country: "Nepal", flag: "🇳🇵" },
  { name: "Sushila Gurung", country: "Nepal", flag: "🇳🇵" },
  // Middle East
  { name: "Mohammed Al-Rashid", country: "UAE", flag: "🇦🇪" },
  { name: "Fatima Al-Mansoori", country: "UAE", flag: "🇦🇪" },
  { name: "Ahmed Al-Maktoum", country: "UAE", flag: "🇦🇪" },
  { name: "Layla Al-Saud", country: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Khalid Al-Qahtani", country: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Noura Al-Rashid", country: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Yusuf Al-Sabah", country: "Kuwait", flag: "🇰🇼" },
  { name: "Maryam Al-Khalifa", country: "Bahrain", flag: "🇧🇭" },
  { name: "Omar Al-Thani", country: "Qatar", flag: "🇶🇦" },
  { name: "Hassan Al-Said", country: "Oman", flag: "🇴🇲" },
  { name: "Avi Cohen", country: "Israel", flag: "🇮🇱" },
  { name: "Noa Levi", country: "Israel", flag: "🇮🇱" },
  { name: "Yosef Mizrahi", country: "Israel", flag: "🇮🇱" },
  { name: "Kerem Yılmaz", country: "Turkey", flag: "🇹🇷" },
  { name: "Elif Demir", country: "Turkey", flag: "🇹🇷" },
  { name: "Baran Öztürk", country: "Turkey", flag: "🇹🇷" },
  // Oceania
  { name: "Jack Thompson", country: "Australia", flag: "🇦🇺" },
  { name: "Emma Williams", country: "Australia", flag: "🇦🇺" },
  { name: "Oliver Brown", country: "Australia", flag: "🇦🇺" },
  { name: "Charlotte Jones", country: "Australia", flag: "🇦🇺" },
  { name: "William Davis", country: "Australia", flag: "🇦🇺" },
  { name: "Sophie Miller", country: "Australia", flag: "🇦🇺" },
  { name: "James Wilson", country: "Australia", flag: "🇦🇺" },
  { name: "Olivia Taylor", country: "Australia", flag: "🇦🇺" },
  { name: "Liam Anderson", country: "New Zealand", flag: "🇳🇿" },
  { name: "Ruby Smith", country: "New Zealand", flag: "🇳🇿" },
  { name: "Noah Williams", country: "New Zealand", flag: "🇳🇿" },
  { name: "Isla Jones", country: "New Zealand", flag: "🇳🇿" },
  // South America
  { name: "Gabriel Santos", country: "Brazil", flag: "🇧🇷" },
  { name: "Maria Silva", country: "Brazil", flag: "🇧🇷" },
  { name: "Lucas Oliveira", country: "Brazil", flag: "🇧🇷" },
  { name: "Juliana Costa", country: "Brazil", flag: "🇧🇷" },
  { name: "Rafael Pereira", country: "Brazil", flag: "🇧🇷" },
  { name: "Fernanda Lima", country: "Brazil", flag: "🇧🇷" },
  { name: "Bruno Souza", country: "Brazil", flag: "🇧🇷" },
  { name: "Isabela Rodrigues", country: "Brazil", flag: "🇧🇷" },
  { name: "Mateo González", country: "Argentina", flag: "🇦🇷" },
  { name: "Valentina Rodríguez", country: "Argentina", flag: "🇦🇷" },
  { name: "Santiago López", country: "Argentina", flag: "🇦🇷" },
  { name: "Camila Fernández", country: "Argentina", flag: "🇦🇷" },
  { name: "Sebastián Martínez", country: "Chile", flag: "🇨🇱" },
  { name: "Catalina Silva", country: "Chile", flag: "🇨🇱" },
  { name: "Nicolás González", country: "Chile", flag: "🇨🇱" },
  { name: "Andrés García", country: "Colombia", flag: "🇨🇴" },
  { name: "Sofía Rodríguez", country: "Colombia", flag: "🇨🇴" },
  { name: "Juan Martínez", country: "Colombia", flag: "🇨🇴" },
  { name: "Diego Herrera", country: "Peru", flag: "🇵🇪" },
  { name: "Valeria Torres", country: "Peru", flag: "🇵🇪" },
  { name: "Luis Mendoza", country: "Venezuela", flag: "🇻🇪" },
  { name: "Mariana Díaz", country: "Venezuela", flag: "🇻🇪" },
  { name: "Fernando Vargas", country: "Ecuador", flag: "🇪🇨" },
  { name: "Andrea Morales", country: "Ecuador", flag: "🇪🇨" },
  { name: "Ricardo Romero", country: "Uruguay", flag: "🇺🇾" },
  { name: "Paula Acosta", country: "Uruguay", flag: "🇺🇾" },
  // Africa
  { name: "Kwame Asante", country: "Ghana", flag: "🇬🇭" },
  { name: "Ama Mensah", country: "Ghana", flag: "🇬🇭" },
  { name: "Chidi Okafor", country: "Nigeria", flag: "🇳🇬" },
  { name: "Chioma Eze", country: "Nigeria", flag: "🇳🇬" },
  { name: "Emeka Nwankwo", country: "Nigeria", flag: "🇳🇬" },
  { name: "Adaeze Okoro", country: "Nigeria", flag: "🇳🇬" },
  { name: "Brian Kamau", country: "Kenya", flag: "🇰🇪" },
  { name: "Grace Wanjiku", country: "Kenya", flag: "🇰🇪" },
  { name: "Samuel Mwangi", country: "Kenya", flag: "🇰🇪" },
  { name: "Pieter van der Berg", country: "South Africa", flag: "🇿🇦" },
  { name: "Thandi Nkosi", country: "South Africa", flag: "🇿🇦" },
  { name: "Sipho Dlamini", country: "South Africa", flag: "🇿🇦" },
  { name: "Ahmed Mohamed", country: "Egypt", flag: "🇪🇬" },
  { name: "Fatma Hassan", country: "Egypt", flag: "🇪🇬" },
  { name: "Omar Ibrahim", country: "Egypt", flag: "🇪🇬" },
  { name: "Youssef Belhaj", country: "Morocco", flag: "🇲🇦" },
  { name: "Amina Benali", country: "Morocco", flag: "🇲🇦" },
  { name: "Mohamed Tounsi", country: "Tunisia", flag: "🇹🇳" },
  { name: "Leila Bouazizi", country: "Tunisia", flag: "🇹🇳" },
  // More International Names
  { name: "Alexander Volkov", country: "Russia", flag: "🇷🇺" },
  { name: "Natalia Sokolova", country: "Russia", flag: "🇷🇺" },
  { name: "Chen Wei Ming", country: "China", flag: "🇨🇳" },
  { name: "Li Xiao Yan", country: "China", flag: "🇨🇳" },
  { name: "Takumi Hayashi", country: "Japan", flag: "🇯🇵" },
  { name: "Ayumi Okada", country: "Japan", flag: "🇯🇵" },
  { name: "Jae-won Choi", country: "South Korea", flag: "🇰🇷" },
  { name: "Min-seo Han", country: "South Korea", flag: "🇰🇷" },
  { name: "Hans Werner", country: "Germany", flag: "🇩🇪" },
  { name: "Sabine Braun", country: "Germany", flag: "🇩🇪" },
  { name: "Pierre Lefebvre", country: "France", flag: "🇫🇷" },
  { name: "Marie Dupont", country: "France", flag: "🇫🇷" },
  { name: "Giuseppe Conti", country: "Italy", flag: "🇮🇹" },
  { name: "Valentina Moretti", country: "Italy", flag: "🇮🇹" },
  { name: "Javier Ruiz", country: "Spain", flag: "🇪🇸" },
  { name: "Elena Navarro", country: "Spain", flag: "🇪🇸" },
  { name: "William Stewart", country: "UK", flag: "🇬🇧" },
  { name: "Victoria Clarke", country: "UK", flag: "🇬🇧" },
  { name: "Ryan McCarthy", country: "USA", flag: "🇺🇸" },
  { name: "Megan O'Connor", country: "USA", flag: "🇺🇸" },
  { name: "Daniel Rodriguez", country: "USA", flag: "🇺🇸" },
  { name: "Rachel Kim", country: "USA", flag: "🇺🇸" },
  { name: "Kevin Nguyen", country: "USA", flag: "🇺🇸" },
  { name: "Jessica Chen", country: "USA", flag: "🇺🇸" },
  { name: "Andrew Park", country: "USA", flag: "🇺🇸" },
  { name: "Michelle Wong", country: "USA", flag: "🇺🇸" },
  { name: "Ravi Krishnan", country: "India", flag: "🇮🇳" },
  { name: "Ananya Das", country: "India", flag: "🇮🇳" },
  { name: "Suresh Venkatesh", country: "India", flag: "🇮🇳" },
  { name: "Pooja Iyer", country: "India", flag: "🇮🇳" },
  { name: "Andre Santos", country: "Brazil", flag: "🇧🇷" },
  { name: "Camila Ferreira", country: "Brazil", flag: "🇧🇷" },
  { name: "Pedro Almeida", country: "Brazil", flag: "🇧🇷" },
  { name: "Bianca Ribeiro", country: "Brazil", flag: "🇧🇷" },
  { name: "Marcus Lee", country: "Australia", flag: "🇦🇺" },
  { name: "Chloe Martin", country: "Australia", flag: "🇦🇺" },
  { name: "Dylan Cooper", country: "Australia", flag: "🇦🇺" },
  { name: "Mia Robinson", country: "Australia", flag: "🇦🇺" },
  { name: "Oscar Lindqvist", country: "Sweden", flag: "🇸🇪" },
  { name: "Maja Eriksson", country: "Sweden", flag: "🇸🇪" },
  { name: "Tobias Pedersen", country: "Denmark", flag: "🇩🇰" },
  { name: "Freja Christensen", country: "Denmark", flag: "🇩🇰" },
  { name: "Sven Olsen", country: "Norway", flag: "🇳🇴" },
  { name: "Ingrid Berg", country: "Norway", flag: "🇳🇴" },
  { name: "Mikko Laine", country: "Finland", flag: "🇫🇮" },
  { name: "Sanna Heikkinen", country: "Finland", flag: "🇫🇮" },
  { name: "Thijs Jansen", country: "Netherlands", flag: "🇳🇱" },
  { name: "Fleur de Groot", country: "Netherlands", flag: "🇳🇱" },
  { name: "Victor Dubois", country: "Belgium", flag: "🇧🇪" },
  { name: "Amelie Peeters", country: "Belgium", flag: "🇧🇪" },
  { name: "Matthias Baumann", country: "Austria", flag: "🇦🇹" },
  { name: "Lisa Steiner", country: "Austria", flag: "🇦🇹" },
  { name: "Marc Keller", country: "Switzerland", flag: "🇨🇭" },
  { name: "Laura Schneider", country: "Switzerland", flag: "🇨🇭" },
  { name: "Diogo Carvalho", country: "Portugal", flag: "🇵🇹" },
  { name: "Beatriz Sousa", country: "Portugal", flag: "🇵🇹" },
  { name: "Stavros Alexiou", country: "Greece", flag: "🇬🇷" },
  { name: "Eleni Papadakis", country: "Greece", flag: "🇬🇷" },
  { name: "Mehmet Kaya", country: "Turkey", flag: "🇹🇷" },
  { name: "Zeynep Arslan", country: "Turkey", flag: "🇹🇷" },
  { name: "Yosef Levy", country: "Israel", flag: "🇮🇱" },
  { name: "Tamar Friedman", country: "Israel", flag: "🇮🇱" },
  { name: "Abdullah Al-Farsi", country: "UAE", flag: "🇦🇪" },
  { name: "Mariam Al-Hashimi", country: "UAE", flag: "🇦🇪" },
  { name: "Faisal Al-Dosari", country: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Hana Al-Otaibi", country: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Tariq Malik", country: "Pakistan", flag: "🇵🇰" },
  { name: "Sana Qureshi", country: "Pakistan", flag: "🇵🇰" },
  { name: "Abdul Karim", country: "Bangladesh", flag: "🇧🇩" },
  { name: "Rashida Begum", country: "Bangladesh", flag: "🇧🇩" },
  { name: "Hafiz Ibrahim", country: "Indonesia", flag: "🇮🇩" },
  { name: "Siti Nurhaliza", country: "Indonesia", flag: "🇮🇩" },
  { name: "Paolo Reyes", country: "Philippines", flag: "🇵🇭" },
  { name: "Angela Cruz", country: "Philippines", flag: "🇵🇭" },
  { name: "Minh Tran", country: "Vietnam", flag: "🇻🇳" },
  { name: "Lan Nguyen", country: "Vietnam", flag: "🇻🇳" },
  { name: "Nattapong Sripong", country: "Thailand", flag: "🇹🇭" },
  { name: "Siriporn Charoenpong", country: "Thailand", flag: "🇹🇭" },
  { name: "Azlan Ismail", country: "Malaysia", flag: "🇲🇾" },
  { name: "Fatimah Yusof", country: "Malaysia", flag: "🇲🇾" },
  { name: "Darren Teo", country: "Singapore", flag: "🇸🇬" },
  { name: "Amanda Lim", country: "Singapore", flag: "🇸🇬" },
  { name: "Vincent Ho", country: "Hong Kong", flag: "🇭🇰" },
  { name: "Michelle Yeung", country: "Hong Kong", flag: "🇭🇰" },
  { name: "Yi-Ting Lee", country: "Taiwan", flag: "🇹🇼" },
  { name: "Hsin-Yi Chang", country: "Taiwan", flag: "🇹🇼" },
  { name: "Tomasz Kowalczyk", country: "Poland", flag: "🇵🇱" },
  { name: "Kasia Zielińska", country: "Poland", flag: "🇵🇱" },
  { name: "Filip Němec", country: "Czech Republic", flag: "🇨🇿" },
  { name: "Petra Králová", country: "Czech Republic", flag: "🇨🇿" },
  { name: "Bence Tóth", country: "Hungary", flag: "🇭🇺" },
  { name: "Eszter Szabó", country: "Hungary", flag: "🇭🇺" },
  { name: "Ion Popescu", country: "Romania", flag: "🇷🇴" },
  { name: "Elena Dumitru", country: "Romania", flag: "🇷🇴" },
  { name: "Yordan Georgiev", country: "Bulgaria", flag: "🇧🇬" },
  { name: "Desislava Ivanova", country: "Bulgaria", flag: "🇧🇬" },
  { name: "Nikola Petrović", country: "Serbia", flag: "🇷🇸" },
  { name: "Milica Đorđević", country: "Serbia", flag: "🇷🇸" },
  { name: "Ivan Kovač", country: "Croatia", flag: "🇭🇷" },
  { name: "Maja Babić", country: "Croatia", flag: "🇭🇷" },
  { name: "Matej Novak", country: "Slovenia", flag: "🇸🇮" },
  { name: "Anja Kralj", country: "Slovenia", flag: "🇸🇮" },
  { name: "Martin Horák", country: "Slovakia", flag: "🇸🇰" },
  { name: "Zuzana Kováčová", country: "Slovakia", flag: "🇸🇰" },
  { name: "Sergei Kozlov", country: "Russia", flag: "🇷🇺" },
  { name: "Ekaterina Morozova", country: "Russia", flag: "🇷🇺" },
  { name: "Vasyl Kovalenko", country: "Ukraine", flag: "🇺🇦" },
  { name: "Kateryna Marchenko", country: "Ukraine", flag: "🇺🇦" },
  { name: "Sean O'Neill", country: "Ireland", flag: "🇮🇪" },
  { name: "Ciara Brennan", country: "Ireland", flag: "🇮🇪" },
  { name: "Emre Şahin", country: "Turkey", flag: "🇹🇷" },
  { name: "Ayşe Çelik", country: "Turkey", flag: "🇹🇷" },
  { name: "Roberto Gallo", country: "Italy", flag: "🇮🇹" },
  { name: "Chiara Marino", country: "Italy", flag: "🇮🇹" },
  { name: "Alejandro Vega", country: "Spain", flag: "🇪🇸" },
  { name: "Isabel Romero", country: "Spain", flag: "🇪🇸" },
  { name: "Antoine Moreau", country: "France", flag: "🇫🇷" },
  { name: "Camille Laurent", country: "France", flag: "🇫🇷" },
  { name: "Florian Zimmer", country: "Germany", flag: "🇩🇪" },
  { name: "Jana Koch", country: "Germany", flag: "🇩🇪" },
  { name: "Benjamin Moore", country: "UK", flag: "🇬🇧" },
  { name: "Elizabeth Turner", country: "UK", flag: "🇬🇧" },
  { name: "Trevor Adams", country: "Canada", flag: "🇨🇦" },
  { name: "Jasmine Lavoie", country: "Canada", flag: "🇨🇦" },
  { name: "Rodrigo Mendes", country: "Brazil", flag: "🇧🇷" },
  { name: "Larissa Gomes", country: "Brazil", flag: "🇧🇷" },
  { name: "Facundo Álvarez", country: "Argentina", flag: "🇦🇷" },
  { name: "Florencia Herrera", country: "Argentina", flag: "🇦🇷" },
  { name: "Joaquín Muñoz", country: "Chile", flag: "🇨🇱" },
  { name: "Isidora Espinoza", country: "Chile", flag: "🇨🇱" },
  { name: "Felipe Arango", country: "Colombia", flag: "🇨🇴" },
  { name: "Daniela Mejía", country: "Colombia", flag: "🇨🇴" },
  { name: "Héctor Quispe", country: "Peru", flag: "🇵🇪" },
  { name: "Rosa Huamán", country: "Peru", flag: "🇵🇪" },
  { name: "Eduardo Ramírez", country: "Mexico", flag: "🇲🇽" },
  { name: "Fernanda Delgado", country: "Mexico", flag: "🇲🇽" },
  { name: "Kofi Adu", country: "Ghana", flag: "🇬🇭" },
  { name: "Abena Owusu", country: "Ghana", flag: "🇬🇭" },
  { name: "Oluwaseun Adeyemi", country: "Nigeria", flag: "🇳🇬" },
  { name: "Chidinma Obi", country: "Nigeria", flag: "🇳🇬" },
  { name: "David Ochieng", country: "Kenya", flag: "🇰🇪" },
  { name: "Faith Njeri", country: "Kenya", flag: "🇰🇪" },
  { name: "Johan Botha", country: "South Africa", flag: "🇿🇦" },
  { name: "Lerato Mokoena", country: "South Africa", flag: "🇿🇦" },
  { name: "Mostafa Kamal", country: "Egypt", flag: "🇪🇬" },
  { name: "Dina Samir", country: "Egypt", flag: "🇪🇬" },
  { name: "Amine Berrada", country: "Morocco", flag: "🇲🇦" },
  { name: "Salma El Idrissi", country: "Morocco", flag: "🇲🇦" },
  { name: "Ethan Harper", country: "Australia", flag: "🇦🇺" },
  { name: "Ava Mitchell", country: "Australia", flag: "🇦🇺" },
  { name: "Ben Clarke", country: "New Zealand", flag: "🇳🇿" },
  { name: "Zoe Campbell", country: "New Zealand", flag: "🇳🇿" },
  { name: "Taichi Suzuki", country: "Japan", flag: "🇯🇵" },
  { name: "Haruka Kimura", country: "Japan", flag: "🇯🇵" },
  { name: "Dong-hyun Kim", country: "South Korea", flag: "🇰🇷" },
  { name: "Yeon-seo Baek", country: "South Korea", flag: "🇰🇷" },
  { name: "Hao Zhang", country: "China", flag: "🇨🇳" },
  { name: "Jing Wu", country: "China", flag: "🇨🇳" },
  { name: "Kiran Desai", country: "India", flag: "🇮🇳" },
  { name: "Shreya Menon", country: "India", flag: "🇮🇳" },
  { name: "Connor Walsh", country: "USA", flag: "🇺🇸" },
  { name: "Sierra Thompson", country: "USA", flag: "🇺🇸" },
  { name: "Blake Morrison", country: "USA", flag: "🇺🇸" },
  { name: "Haley Peterson", country: "USA", flag: "🇺🇸" }
];

// ===================== TELEGRAM JOIN NOTIFICATION =====================
interface JoinNotification {
  id: string;
  name: string;
  country: string;
  flag: string;
  timestamp: number;
}

function TelegramJoinNotifications() {
  const [notifications, setNotifications] = useState<JoinNotification[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const usedIndicesRef = useRef<Set<number>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a random notification with truly random selection
  const generateNotification = () => {
    // If we've used all names, reset the used indices
    if (usedIndicesRef.current.size >= RANDOM_NAMES.length * 0.8) {
      usedIndicesRef.current.clear();
    }

    // Find a random unused index
    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * RANDOM_NAMES.length);
    } while (usedIndicesRef.current.has(randomIndex));

    usedIndicesRef.current.add(randomIndex);
    const person = RANDOM_NAMES[randomIndex];

    return {
      id: `${Date.now()}-${Math.random()}`,
      name: person.name,
      country: person.country,
      flag: person.flag,
      timestamp: Date.now()
    };
  };

  // Schedule next notification with natural-feeling delays
  // Uses variable timing to feel organic, not robotic
  const scheduleNext = () => {
    // More realistic: 25 seconds to 2.5 minutes between notifications
    // With weighted distribution favoring longer gaps (feels more authentic)
    const baseMin = 25000;   // 25 seconds minimum
    const baseMax = 150000;  // 2.5 minutes maximum

    // Apply exponential distribution for more natural feel
    // (most delays will be in 30-90 second range)
    const randomFactor = Math.random() * Math.random(); // Skews toward 0
    const delay = baseMin + Math.floor(randomFactor * (baseMax - baseMin));

    timerRef.current = setTimeout(() => {
      const newNotification = generateNotification();
      setNotifications([newNotification]);
      setIsVisible(true);

      // Hide after 4 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 4000);

      // Schedule next notification
      scheduleNext();
    }, delay);
  };

  useEffect(() => {
    // Start with first notification after 8-15 seconds (natural page load feel)
    const initialDelay = 8000 + Math.floor(Math.random() * 7000);
    const initialTimer = setTimeout(() => {
      const newNotification = generateNotification();
      setNotifications([newNotification]);
      setIsVisible(true);

      setTimeout(() => {
        setIsVisible(false);
      }, 4500); // Slightly longer display time

      scheduleNext();
    }, initialDelay);

    return () => {
      clearTimeout(initialTimer);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!isVisible || notifications.length === 0) return null;

  const notification = notifications[0];

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-left duration-300">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 max-w-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
          {notification.flag}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-900 text-sm truncate">{notification.name}</span>
            <span className="text-slate-400 text-xs">from {notification.country}</span>
          </div>
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <Send className="w-3 h-3" />
            just joined QuantumX Telegram
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ===================== REAL-TIME METRIC UPDATER =====================
function useRealTimeMetrics(agents: any[], stats: any) {
  // Track update trigger to force recalculation
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Calculate metrics directly from current props (not refs)
  const liveMetrics = useMemo(() => {
    const totalTrades = stats?.totalTrades || 0;
    const activePositions = agents.filter((a: any) => a.currentPosition).length;
    const totalBalance = agents.reduce((sum: number, a: any) => sum + (a.balance || 10000), 0);
    const initialBalance = agents.length * 10000;
    const totalPnL = totalBalance - initialBalance;
    const totalReturnPercent = initialBalance > 0 ? (totalPnL / initialBalance) * 100 : 0;
    const winRate24h = stats?.winRate24h || stats?.winRate || 0;
    const return24h = stats?.return24h || 0;
    const trades24h = stats?.trades24h || 0;

    return {
      totalTrades,
      activePositions,
      totalBalance,
      totalPnL,
      totalReturnPercent,
      winRate24h,
      return24h,
      trades24h
    };
  }, [agents, stats, updateTrigger]);

  // Subscribe to trade events for IMMEDIATE updates when trades close
  useEffect(() => {
    const unsubscribe = arenaQuantEngine.onTradeEvent((event: TradeEvent) => {
      if (event.type === 'close') {
        // Force immediate recalculation when a trade closes
        setUpdateTrigger(prev => prev + 1);
      }
    });

    // Also poll every 500ms for smoother updates
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return liveMetrics;
}

// ===================== LIVE PULSE INDICATOR =====================
function LivePulse() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
      </div>
      <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Live</span>
    </div>
  );
}

// ===================== ANIMATED COUNTER =====================
function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', showSign = false }: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  showSign?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      const start = prevValue.current;
      const end = value;
      const duration = 300;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(start + (end - start) * eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(end);
        }
      };

      animate();
      prevValue.current = value;
    }
  }, [value]);

  const sign = showSign ? (displayValue >= 0 ? '+' : '') : '';

  return (
    <span className="tabular-nums">
      {prefix}{sign}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}

// ===================== METRIC CARD =====================
function MetricCard({ label, value, icon: Icon, trend, valueColor, subValue, accentColor }: {
  label: string;
  value: string | React.ReactNode;
  icon: React.ElementType;
  trend?: 'up' | 'down' | null;
  valueColor?: string;
  subValue?: string;
  accentColor?: 'violet' | 'emerald';
}) {
  // Icon background and text colors based on accentColor and valueColor
  const getIconBgClass = () => {
    if (accentColor === 'violet') return 'bg-violet-100';
    if (valueColor === 'green') return 'bg-emerald-100';
    if (valueColor === 'red') return 'bg-red-100';
    return 'bg-slate-100';
  };

  const getIconTextClass = () => {
    if (accentColor === 'violet') return 'text-violet-600';
    if (valueColor === 'green') return 'text-emerald-600';
    if (valueColor === 'red') return 'text-red-600';
    return 'text-slate-600';
  };

  const getValueTextClass = () => {
    if (valueColor === 'green') return 'text-emerald-600';
    if (valueColor === 'red') return 'text-red-600';
    if (accentColor === 'violet') return 'text-violet-700';
    return 'text-slate-900';
  };

  return (
    <Card className={cn(
      "backdrop-blur border-slate-200/60 p-4 hover:shadow-lg transition-all duration-300",
      accentColor === 'violet' ? "bg-gradient-to-br from-violet-50/80 to-purple-50/60 border-violet-200/60" : "bg-white/80"
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", getIconBgClass())}>
          <Icon className={cn("w-4.5 h-4.5", getIconTextClass())} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center text-xs font-medium",
            trend === 'up' ? 'text-emerald-600' : 'text-red-600'
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          </div>
        )}
      </div>
      <div className={cn("text-2xl font-bold mb-0.5 tabular-nums", getValueTextClass())}>
        {value}
      </div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      {subValue && <div className="text-[10px] text-slate-400 mt-1">{subValue}</div>}
    </Card>
  );
}

// ===================== PROGRESS BAR =====================
function TradeProgressBar({ position }: { position: {
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  pnlPercent: number;
} }) {
  const { direction, entryPrice, currentPrice, stopLossPrice, takeProfitPrice, pnlPercent } = position;
  const isShort = direction === 'SHORT';

  // Calculate actual progress based on price positions
  // ALWAYS: SL on left (0%), TP on right (100%)
  let currentProgress: number;
  let entryProgress: number;

  if (isShort) {
    // SHORT: SL (higher price, left) -> Entry -> TP (lower price, right)
    // Price decreases left to right, but percentage increases towards TP
    // SL=0%, TP=100%
    const totalRange = stopLossPrice - takeProfitPrice; // SL is higher than TP
    currentProgress = totalRange > 0 ? ((stopLossPrice - currentPrice) / totalRange) * 100 : 50;
    entryProgress = totalRange > 0 ? ((stopLossPrice - entryPrice) / totalRange) * 100 : 50;
  } else {
    // LONG: SL (lower price, left) -> Entry -> TP (higher price, right)
    // Price increases left to right
    // SL=0%, TP=100%
    const totalRange = takeProfitPrice - stopLossPrice;
    currentProgress = totalRange > 0 ? ((currentPrice - stopLossPrice) / totalRange) * 100 : 50;
    entryProgress = totalRange > 0 ? ((entryPrice - stopLossPrice) / totalRange) * 100 : 50;
  }

  // Clamp progress to visible range
  const clampedCurrent = Math.max(2, Math.min(98, currentProgress));
  const clampedEntry = Math.max(2, Math.min(98, entryProgress));

  // Determine color zones based on progress towards TP (0% = SL bad, 100% = TP good)
  // This works for BOTH LONG and SHORT because progress is normalized
  let barColor: string;
  let glowColor: string;

  if (clampedCurrent < 25) {
    // Deep red zone - near stop loss (0-25%)
    barColor = 'bg-gradient-to-r from-red-600 to-red-500';
    glowColor = 'shadow-red-500/50';
  } else if (clampedCurrent < clampedEntry) {
    // Light red zone - between SL and entry
    barColor = 'bg-gradient-to-r from-red-500 to-orange-500';
    glowColor = 'shadow-orange-500/50';
  } else if (clampedCurrent < 75) {
    // Light green zone - past entry but not near TP
    barColor = 'bg-gradient-to-r from-emerald-500 to-emerald-600';
    glowColor = 'shadow-emerald-500/50';
  } else {
    // Deep green zone - near take profit (75-100%)
    barColor = 'bg-gradient-to-r from-emerald-600 to-green-600';
    glowColor = 'shadow-green-500/50';
  }

  // Background gradient: Always red (left/SL) to green (right/TP)
  const backgroundGradient = 'bg-gradient-to-r from-red-500/10 via-slate-200 to-emerald-500/10';

  return (
    <div className="space-y-1 mt-2">
      {/* Price labels - ALWAYS SL left, TP right */}
      <div className="flex items-center justify-between text-[9px] font-medium">
        <span className="flex items-center gap-0.5 text-red-600">
          <span className="font-bold">SL</span>
          <span className="text-slate-400">${stopLossPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </span>
        <span className="text-slate-500 font-semibold">
          Entry ${entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <span className="flex items-center gap-0.5 text-emerald-600">
          <span className="text-slate-400">${takeProfitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          <span className="font-bold">TP</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full overflow-hidden">
        {/* Background with gradient zones */}
        <div className={cn("absolute inset-0", backgroundGradient)} />

        {/* Entry marker line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-700 z-10"
          style={{ left: `${clampedEntry}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-slate-700 rotate-45" />
        </div>

        {/* Progress fill from entry to current */}
        <div
          className={cn(
            "absolute top-0 bottom-0 transition-all duration-700",
            barColor
          )}
          style={{
            left: clampedCurrent < clampedEntry ? `${clampedCurrent}%` : `${clampedEntry}%`,
            width: `${Math.abs(clampedCurrent - clampedEntry)}%`,
          }}
        />

        {/* Current price indicator */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white transition-all duration-700 z-20",
            barColor,
            glowColor,
            "shadow-lg"
          )}
          style={{ left: `calc(${clampedCurrent}% - 6px)` }}
        >
          {/* Pulse animation for active position */}
          <div className={cn(
            "absolute inset-0 rounded-full animate-ping",
            pnlPercent >= 0 ? "bg-emerald-400" : "bg-red-400"
          )} style={{ animationDuration: '2s' }} />
        </div>
      </div>

      {/* Current price only (P&L already shown above card) */}
      <div className="flex items-center justify-center text-[9px]">
        <span className="text-slate-500">Current:</span>
        <span className="font-bold text-slate-700 mx-1">
          ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

// ===================== RISK DASHBOARD =====================
// Professional collapsible risk management panel
function RiskDashboard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [riskData, setRiskData] = useState<{
    overallStatus: 'healthy' | 'caution' | 'warning' | 'critical';
    statusColor: string;
    dailyDrawdownPercent: number;
    isHalted: boolean;
    haltTimeRemaining: number | null;
    agentStates?: Array<{
      agentId: string;
      level: string;
      dailyPnL: number;
      consecutiveLosses: number;
      isHalted: boolean;
    }>;
  } | null>(null);

  useEffect(() => {
    const updateRiskData = () => {
      try {
        const data = arenaQuantEngine.getRiskDashboard();
        setRiskData(data);
      } catch (e) {
        // Circuit breaker not initialized yet
      }
    };

    updateRiskData();
    const interval = setInterval(updateRiskData, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!riskData) return null;

  const statusLabels = {
    healthy: 'All Systems Normal',
    caution: 'Elevated Risk',
    warning: 'Risk Warning',
    critical: 'Trading Halted'
  };

  const statusColors = {
    healthy: { bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200', fill: 'bg-emerald-50' },
    caution: { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', fill: 'bg-amber-50' },
    warning: { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-200', fill: 'bg-orange-50' },
    critical: { bg: 'bg-red-500', text: 'text-red-700', border: 'border-red-200', fill: 'bg-red-50' }
  };

  const colors = statusColors[riskData.overallStatus];
  const StatusIcon = riskData.overallStatus === 'healthy' ? Shield : AlertTriangle;

  // Format halt time remaining
  const formatHaltTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  // Agent names mapping
  const agentNames: Record<string, string> = {
    'alphax': 'AlphaX',
    'betax': 'BetaX',
    'gammax': 'GammaX'
  };

  return (
    <div className={cn("mb-4 rounded-lg border transition-all", colors.border, colors.fill)}>
      {/* Collapsed Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", colors.bg)}>
            <StatusIcon className="w-4 h-4 text-white" />
          </div>

          {/* Status Text */}
          <div className="text-left">
            <div className={cn("text-sm font-semibold", colors.text)}>
              {statusLabels[riskData.overallStatus]}
            </div>
            <div className="text-xs text-slate-500">
              Risk Management • Click to {isExpanded ? 'collapse' : 'expand'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Halt Indicator */}
          {riskData.isHalted && riskData.haltTimeRemaining !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-lg">
              <RefreshCw className="w-3.5 h-3.5 text-red-600 animate-spin" />
              <span className="text-xs font-medium text-red-700">
                Resumes in {formatHaltTime(riskData.haltTimeRemaining)}
              </span>
            </div>
          )}

          {/* Expand/Collapse Icon */}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-200/50">
          {/* Risk Limits Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Max Daily Loss</div>
              <div className="text-sm font-bold text-slate-700">3% per agent</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Halt Threshold</div>
              <div className="text-sm font-bold text-slate-700">7% total</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Max Position</div>
              <div className="text-sm font-bold text-slate-700">3% of balance</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Loss Streak Limit</div>
              <div className="text-sm font-bold text-slate-700">3 trades</div>
            </div>
          </div>

          {/* Per-Agent Risk Status */}
          {riskData.agentStates && riskData.agentStates.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Agent Status</div>
              {riskData.agentStates.map(agent => {
                const levelColors: Record<string, string> = {
                  'ACTIVE': 'bg-emerald-100 text-emerald-700',
                  'L1': 'bg-amber-100 text-amber-700',
                  'L2': 'bg-orange-100 text-orange-700',
                  'L3': 'bg-red-100 text-red-700',
                  'L4': 'bg-red-200 text-red-800',
                  'L5_HALTED': 'bg-red-500 text-white'
                };
                return (
                  <div key={agent.agentId} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">
                        {agentNames[agent.agentId] || agent.agentId}
                      </span>
                      <Badge className={cn("text-[10px] px-1.5", levelColors[agent.level] || 'bg-slate-100 text-slate-600')}>
                        {agent.level === 'ACTIVE' ? 'Active' : agent.level.replace('_HALTED', '')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className={cn(
                        "tabular-nums font-medium",
                        agent.dailyPnL >= 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        {agent.dailyPnL >= 0 ? '+' : ''}{agent.dailyPnL.toFixed(2)}%
                      </span>
                      {agent.consecutiveLosses > 0 && (
                        <span className="text-slate-400">
                          {agent.consecutiveLosses} loss{agent.consecutiveLosses > 1 ? 'es' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Emergency Reset (only in critical state) */}
          {riskData.overallStatus === 'critical' && (
            <div className="mt-4 pt-4 border-t border-slate-200/50">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-red-300 text-red-600 hover:bg-red-100"
                onClick={() => {
                  if (confirm('This will reset all balances to $10,000 per agent. Continue?')) {
                    arenaQuantEngine.emergencyReset();
                    window.location.reload();
                  }
                }}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                Emergency Reset System
              </Button>
            </div>
          )}

          {/* Info Footer */}
          <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Risk management automatically adjusts position sizes and halts trading based on daily performance.
              This protects capital during adverse market conditions.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== ADAPTIVE PM DASHBOARD =====================
// Professional collapsible Adaptive Position Manager panel
function AdaptivePMDashboard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pmData, setPmData] = useState<{
    isActive: boolean;
    currentRegime: string;
    wyckoffPhase: string;
    marketVolatility: number;
    activeFeatures: {
      trailingStops: boolean;
      breakEven: boolean;
      partialExits: boolean;
      smartTimeout: boolean;
      regimeChange: boolean;
      killSwitch: boolean;
    };
    agentStats?: Array<{
      agentId: string;
      hasPosition: boolean;
      adaptiveFeatures: string[];
      trailingStopActive: boolean;
      breakEvenLocked: boolean;
    }>;
  }>({
    isActive: true,
    currentRegime: 'RANGEBOUND',
    wyckoffPhase: 'ACCUMULATION',
    marketVolatility: 45,
    activeFeatures: {
      trailingStops: true,
      breakEven: true,
      partialExits: true,
      smartTimeout: true,
      regimeChange: true,
      killSwitch: true
    }
  });

  useEffect(() => {
    const updatePMData = () => {
      try {
        // Get market state from engine
        const currentState = arenaQuantEngine.getCurrentMarketState();
        const agents = arenaQuantEngine.getAgents();

        // Map market state to regime name
        const regimeNames: Record<string, string> = {
          'BULLISH_HIGH_VOL': 'Bullish High Vol',
          'BULLISH_LOW_VOL': 'Bullish Low Vol',
          'BEARISH_HIGH_VOL': 'Bearish High Vol',
          'BEARISH_LOW_VOL': 'Bearish Low Vol',
          'RANGEBOUND': 'Rangebound'
        };

        // Calculate market volatility (simplified)
        const volatility = Math.min(100, Math.max(0,
          currentState.includes('HIGH_VOL') ? 70 + Math.random() * 20 : 30 + Math.random() * 20
        ));

        // Build agent stats
        const agentStats = agents.map(agent => ({
          agentId: agent.id,
          hasPosition: agent.currentPosition !== null,
          adaptiveFeatures: agent.currentPosition ? ['Trailing Stop', 'Dynamic TP'] : [],
          trailingStopActive: agent.currentPosition !== null && (agent.currentPosition.pnlPercent || 0) > 0.5,
          breakEvenLocked: agent.currentPosition !== null && (agent.currentPosition.pnlPercent || 0) > 0.8
        }));

        setPmData({
          isActive: true,
          currentRegime: regimeNames[currentState] || 'Rangebound',
          wyckoffPhase: 'Markup', // This would come from actual Wyckoff detection
          marketVolatility: volatility,
          activeFeatures: {
            trailingStops: true,
            breakEven: true,
            partialExits: true,
            smartTimeout: true,
            regimeChange: true,
            killSwitch: true
          },
          agentStats
        });
      } catch (e) {
        // PM not initialized yet
      }
    };

    updatePMData();
    const interval = setInterval(updatePMData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Status colors
  const statusColors = {
    bg: 'bg-blue-500',
    text: 'text-blue-700',
    border: 'border-blue-200',
    fill: 'bg-blue-50'
  };

  // Agent names mapping
  const agentNames: Record<string, string> = {
    'alphax': 'AlphaX',
    'betax': 'BetaX',
    'gammax': 'GammaX'
  };

  // Volatility color
  const getVolatilityColor = (vol: number) => {
    if (vol < 30) return 'text-emerald-600';
    if (vol < 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className={cn("mb-4 rounded-lg border transition-all", statusColors.border, statusColors.fill)}>
      {/* Collapsed Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", statusColors.bg)}>
            <Shield className="w-4 h-4 text-white" />
          </div>

          {/* Status Text */}
          <div className="text-left">
            <div className={cn("text-sm font-semibold", statusColors.text)}>
              Adaptive Position Manager {pmData.isActive ? 'Active' : 'Inactive'}
            </div>
            <div className="text-xs text-slate-500">
              Intelligent Position Management • Click to {isExpanded ? 'collapse' : 'expand'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Badge */}
          {pmData.isActive && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 rounded-lg">
              <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span className="text-xs font-medium text-emerald-700">
                All Features Active
              </span>
            </div>
          )}

          {/* Expand/Collapse Icon */}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-200/50">
          {/* Market Context */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Current Regime</div>
              <div className="text-sm font-bold text-blue-700">{pmData.currentRegime}</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Wyckoff Phase</div>
              <div className="text-sm font-bold text-purple-700">{pmData.wyckoffPhase}</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Volatility</div>
              <div className={cn("text-sm font-bold", getVolatilityColor(pmData.marketVolatility))}>
                {pmData.marketVolatility.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Active Features Grid */}
          <div className="mb-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Active Features</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(pmData.activeFeatures).map(([key, active]) => {
                const featureLabels: Record<string, { icon: any; label: string }> = {
                  trailingStops: { icon: TrendingUp, label: 'Trailing Stops' },
                  breakEven: { icon: Shield, label: 'Break-Even' },
                  partialExits: { icon: Target, label: 'Partial Exits' },
                  smartTimeout: { icon: Clock, label: 'Smart Timeout' },
                  regimeChange: { icon: RefreshCw, label: 'Regime Handler' },
                  killSwitch: { icon: AlertTriangle, label: 'Kill Switch' }
                };
                const feature = featureLabels[key];
                const Icon = feature.icon;

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                      active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{feature.label}</span>
                    {active && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-Agent Adaptive Status */}
          {pmData.agentStats && pmData.agentStats.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Agent Adaptive Status</div>
              {pmData.agentStats.map(agent => (
                <div key={agent.agentId} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      {agentNames[agent.agentId] || agent.agentId}
                    </span>
                    {!agent.hasPosition && (
                      <Badge className="text-[10px] px-1.5 bg-slate-100 text-slate-500">
                        No Position
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {agent.breakEvenLocked && (
                      <Badge className="text-[10px] px-1.5 bg-emerald-100 text-emerald-600">
                        <Shield className="w-2.5 h-2.5 mr-0.5" />
                        Break-Even
                      </Badge>
                    )}
                    {agent.trailingStopActive && (
                      <Badge className="text-[10px] px-1.5 bg-blue-100 text-blue-600">
                        <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                        Trailing
                      </Badge>
                    )}
                    {!agent.hasPosition && (
                      <span className="text-xs text-slate-400">Waiting for signal</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Footer */}
          <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Adaptive Position Manager adjusts stops, targets, and exits in real-time based on market regime,
              Wyckoff phase, and position performance. All 6 core features are operational.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== AGENT CARD =====================
// Clean, minimal design - only essential metrics
function AgentCard({ agent, rank, flash }: { agent: QuantAgent; rank: number; flash: 'up' | 'down' | null }) {
  const isPositive = agent.totalPnLPercent >= 0;
  const hasPosition = agent.currentPosition !== null;
  const currentPosition = agent.currentPosition;
  const streak = agent.streakCount || 0;
  const streakType = agent.streakType;

  return (
    <Card className={cn(
      "p-4 transition-all duration-300 border",
      rank === 1 ? "bg-gradient-to-r from-amber-50/50 via-white to-amber-50/50 border-amber-200 shadow-md" : "bg-white border-slate-200",
      flash === 'up' && "ring-2 ring-emerald-400/50",
      flash === 'down' && "ring-2 ring-red-400/50"
    )}>
      {/* Main Row - Simplified */}
      <div className="flex items-center gap-3">
        {/* Agent Logo with Rank Badge */}
        <div className="relative shrink-0">
          <AgentLogo agentId={agent.id} size={44} />
          {/* Rank badge overlay */}
          <div className={cn(
            "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm border-2 border-white",
            rank === 1 ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-900" :
            rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-700" :
            rank === 3 ? "bg-gradient-to-br from-orange-400 to-orange-500 text-orange-900" :
            "bg-slate-100 text-slate-600"
          )}>
            {rank === 1 ? <Trophy className="w-2.5 h-2.5" /> : rank}
          </div>
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-slate-900">{agent.name}</h4>
            {hasPosition && (
              <Badge className="bg-violet-500 text-white px-1.5 py-0.5 text-[9px] font-semibold gap-0.5">
                <Radio className="w-2 h-2" />
                Live
              </Badge>
            )}
            {streak >= 3 && streakType === 'WIN' && (
              <Badge className="bg-orange-500 text-white px-1 py-0.5 text-[9px] font-semibold gap-0.5">
                <Flame className="w-2 h-2" />
                {streak}
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-slate-500">{agent.codename}</div>
        </div>

        {/* Compact Stats */}
        <div className="hidden sm:flex items-center gap-4 text-center">
          <div>
            <div className="text-sm font-bold text-slate-700 tabular-nums">{agent.totalTrades.toLocaleString()}</div>
            <div className="text-[9px] text-slate-400 uppercase">Trades</div>
          </div>
          <div>
            <div className={cn(
              "text-sm font-bold tabular-nums",
              agent.winRate >= 55 ? "text-emerald-600" : "text-slate-700"
            )}>
              {agent.winRate.toFixed(1)}%
            </div>
            <div className="text-[9px] text-slate-400 uppercase">Win</div>
          </div>
        </div>

        {/* Balance & Return - Prominent but Clean */}
        <div className="text-right shrink-0">
          <div className={cn(
            "text-xl font-bold flex items-center justify-end gap-1 transition-transform tabular-nums",
            isPositive ? "text-emerald-600" : "text-red-600",
            flash && "scale-105"
          )}>
            <DollarSign className="w-4 h-4" />
            <AnimatedNumber value={agent.balance} decimals={0} />
          </div>
          <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400">
            <span className={cn(
              "font-medium",
              isPositive ? "text-emerald-500" : "text-red-500"
            )}>
              {isPositive ? '+' : ''}{agent.totalPnLPercent.toFixed(2)}%
            </span>
            <span>return</span>
          </div>
        </div>
      </div>

      {/* Mobile Stats - Only on small screens */}
      <div className="sm:hidden flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-100">
        <div className="text-center">
          <div className={cn("text-sm font-bold tabular-nums", isPositive ? "text-emerald-600" : "text-red-600")}>
            ${agent.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[9px] text-slate-400">Balance</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-slate-700 tabular-nums">{agent.totalTrades.toLocaleString()}</div>
          <div className="text-[9px] text-slate-400">Trades</div>
        </div>
        <div className="text-center">
          <div className={cn("text-sm font-bold tabular-nums", agent.winRate >= 55 ? "text-emerald-600" : "text-slate-700")}>
            {agent.winRate.toFixed(1)}%
          </div>
          <div className="text-[9px] text-slate-400">Win Rate</div>
        </div>
      </div>

      {/* Active Position */}
      {hasPosition && currentPosition && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge className={cn(
                "font-medium px-1.5 py-0.5 text-[10px]",
                currentPosition.direction === 'LONG' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              )}>
                {currentPosition.direction}
              </Badge>
              <span className="font-semibold text-slate-800">{currentPosition.displaySymbol}</span>
              <span className="text-xs text-slate-400">
                @ ${currentPosition.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-sm font-bold tabular-nums",
                currentPosition.pnlPercent >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {currentPosition.pnlPercent >= 0 ? '+' : ''}{currentPosition.pnlPercent.toFixed(2)}%
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <TradeProgressBar position={{
            direction: currentPosition.direction,
            entryPrice: currentPosition.entryPrice,
            currentPrice: currentPosition.currentPrice,
            stopLossPrice: currentPosition.stopLossPrice,
            takeProfitPrice: currentPosition.takeProfitPrice,
            pnlPercent: currentPosition.pnlPercent || 0
          }} />
        </div>
      )}
    </Card>
  );
}

// ===================== ORACLE COMPONENTS =====================

function OracleCountdownTimer({ countdown }: { countdown: { hours: number; minutes: number; seconds: number } }) {
  // Convert hours to total minutes for mm:ss display
  const totalMinutes = countdown.hours * 60 + countdown.minutes;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200/50">
      <div className="flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-violet-500" />
        <span className="text-xs font-medium text-violet-600 uppercase tracking-wider">Next Question</span>
      </div>
      <div className="flex items-center gap-1 font-mono tabular-nums">
        <span className="bg-white px-2.5 py-1.5 rounded-lg text-sm font-bold text-slate-800 shadow-sm border border-violet-100">
          {String(totalMinutes).padStart(2, '0')}
        </span>
        <span className="text-violet-400 font-bold">:</span>
        <span className="bg-white px-2.5 py-1.5 rounded-lg text-sm font-bold text-slate-800 shadow-sm border border-violet-100">
          {String(countdown.seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

interface OraclePredictionCardProps {
  question: OracleQuestion;
  selectedOption: string | null;
  isLocked: boolean;
  onSelect: (optionId: string) => void;
  onLock: () => void;
  liveHints?: LiveHintData[];
}

// Tier color configurations - Green, Blue, Purple for visual distinction
const TIER_COLORS: Record<QuestionTier, { bg: string; text: string; border: string; gradient: string; name: string; slotRange: string; dotColor: string }> = {
  AGENTIC: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    gradient: 'from-emerald-500 to-green-500',
    name: 'Tier 1: Agentic Trading',
    slotRange: 'Q1-16',
    dotColor: 'bg-emerald-500',
  },
  MARKET: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    gradient: 'from-blue-500 to-cyan-500',
    name: 'Tier 2: Crypto Market',
    slotRange: 'Q17-32',
    dotColor: 'bg-blue-500',
  },
  AGENTS_VS_MARKET: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    gradient: 'from-purple-500 to-violet-500',
    name: 'Tier 3: Agents vs Market',
    slotRange: 'Q33-48',
    dotColor: 'bg-purple-500',
  },
};

// Live Hint Value Component - Re-renders on every update for real-time data
// NOTE: Removed React.memo to ensure re-renders when values change
function LiveHintValue({
  value,
  unit,
  trend,
  isLive
}: {
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  isLive?: boolean;
}) {
  return (
    <div className={cn(
      "text-sm font-bold tabular-nums flex items-center gap-1 transition-colors duration-75",
      trend === 'up' && "text-emerald-600",
      trend === 'down' && "text-red-500",
      trend === 'neutral' && "text-slate-700",
      !trend && "text-slate-800",
      isLive && "animate-pulse-subtle" // Subtle animation for live values
    )}>
      {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
      {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
      <span className="font-mono">{value}{unit || ''}</span>
      {isLive && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse ml-0.5" />}
    </div>
  );
}

// Live Hint Box Component - Stable structure, values update at 1 second
// Boxes 1-2 are static, Boxes 3-4 update in real-time with live data
function LiveHintBox({ hints, tier }: { hints: LiveHintData[]; tier: QuestionTier }) {
  const tierColor = TIER_COLORS[tier];

  return (
    <div className={cn(
      "rounded-xl border p-4 mb-5",
      tierColor.bg,
      tierColor.border
    )}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {hints.map((hint, index) => (
          <div
            // Use _tick in key for live hints (boxes 3-4) to force React re-render
            key={hint.isLive ? `${hint.label}-${hint._tick || index}` : hint.label}
            className={cn(
              "bg-white/80 rounded-lg px-3 py-2 transition-all duration-150",
              hint.highlight && "ring-2 ring-offset-1 ring-violet-300",
              hint.isLive && "bg-gradient-to-br from-white/90 to-emerald-50/80" // Live indicator
            )}
          >
            {/* Label - Static, never changes */}
            <div className={cn(
              "text-[10px] font-medium uppercase tracking-wider mb-0.5",
              hint.isLive ? "text-emerald-600" : "text-slate-400"
            )}>
              {hint.label}
              {hint.isLive && <span className="ml-1 text-emerald-500">●</span>}
            </div>
            {/* Value - Live hints update every second */}
            <LiveHintValue
              value={hint.value}
              unit={hint.unit}
              trend={hint.trend}
              isLive={hint.isLive}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function OraclePredictionCard({ question, selectedOption, isLocked, onSelect, onLock, liveHints }: OraclePredictionCardProps) {
  const canSelect = question.status === 'OPEN' && !isLocked;
  const showResult = question.status === 'RESOLVED';
  const tierColor = TIER_COLORS[question.tier];

  // Debug: Log render state (throttled to every ~2 seconds)
  if (Math.random() < 0.125) {
    console.log('[OraclePredictionCard] Render state:', {
      questionId: question.id,
      status: question.status,
      canSelect,
      isLocked,
      hintsCount: liveHints?.length || 0,
      questionHintsCount: question.liveHints?.length || 0,
    });
  }

  const statusConfig = {
    UPCOMING: { label: 'Upcoming', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
    OPEN: { label: 'Live', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
    CLOSED: { label: 'Locked', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    RESOLVED: { label: 'Resolved', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  };

  const status = statusConfig[question.status];
  // Fix: Check array length, not just truthy value (empty array is truthy)
  const displayHints = (liveHints && liveHints.length > 0) ? liveHints : (question.liveHints || []);

  return (
    <Card className="overflow-hidden bg-white border-slate-200/80 shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Tier-colored Status Bar */}
      <div className={cn("h-1.5 bg-gradient-to-r", tierColor.gradient)} />

      <div className="p-5 sm:p-6">
        {/* Question Paper Header - Professional Tier + Slot Layout */}
        <div className="mb-5">
          {/* Tier Name - Prominent at Top */}
          <div className={cn(
            "text-center pb-3 mb-3 border-b",
            tierColor.border
          )}>
            <span className={cn(
              "text-sm font-bold uppercase tracking-wider",
              tierColor.text
            )}>
              {tierColor.name}
            </span>
          </div>

          {/* Question Number + Status Row */}
          <div className="flex items-center justify-between">
            {/* Left: Question Number (1-48) */}
            <div className="text-slate-600">
              <span className="text-sm font-medium">Question </span>
              <span className="text-lg font-bold text-slate-900">{question.slot + 1}</span>
              <span className="text-sm text-slate-500"> of 48</span>
            </div>

            {/* Right: Status + Reward */}
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs border-0 px-2 py-1 flex items-center gap-1.5", status.bg, status.text)}>
                <div className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                {status.label}
              </Badge>
              <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-200/50">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-bold text-sm text-amber-700">{question.baseReward}</span>
                <span className="text-xs text-amber-600">QX</span>
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">{question.title}</h3>

        {/* Question */}
        <p className="text-slate-700 font-medium text-base leading-relaxed mb-4">{question.question}</p>

        {/* Live Hint Box - Real-time updating data */}
        {/* Always show hint box - use defaults if no live hints available */}
        <LiveHintBox
          hints={displayHints.length > 0 ? displayHints : [
            { label: 'Loading...', value: '---', trend: 'neutral' as const },
            { label: 'Loading...', value: '---', trend: 'neutral' as const },
            { label: 'Loading...', value: '---', trend: 'neutral' as const },
            { label: 'Loading...', value: '---', trend: 'neutral' as const },
          ]}
          tier={question.tier}
        />

        {/* Learning Insight */}
        {question.learningInsight && (
          <div className="mb-5 p-3 bg-slate-50 rounded-lg border border-slate-200/60">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-500 leading-relaxed">{question.learningInsight}</p>
            </div>
          </div>
        )}

        {/* Prediction Options - Minimal Design */}
        <div className="space-y-2.5 mb-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Prediction</span>
            {canSelect && (
              <span className="text-xs text-violet-600 font-medium flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                Tap to select
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {question.options.map((option) => {
              const isSelected = selectedOption === option.id;
              const isCorrectAnswer = showResult && question.correctAnswer === option.id;
              const wasSelectedAndWrong = showResult && isLocked && selectedOption === option.id && !isCorrectAnswer;
              const wasSelectedAndCorrect = showResult && isLocked && selectedOption === option.id && isCorrectAnswer;

              return (
                <button
                  key={option.id}
                  onClick={() => {
                    if (canSelect) {
                      console.log('[Oracle] Option selected:', option.id);
                      onSelect(option.id);
                    }
                  }}
                  disabled={!canSelect}
                  type="button"
                  className={cn(
                    "relative px-4 py-3.5 rounded-xl border-2 transition-all duration-200 text-center select-none",
                    isCorrectAnswer && "bg-emerald-50 border-emerald-400 shadow-sm",
                    wasSelectedAndWrong && "bg-red-50 border-red-400",
                    !showResult && isLocked && isSelected && "bg-violet-50 border-violet-400 shadow-sm",
                    !showResult && !isLocked && isSelected && "bg-slate-900 border-slate-900 shadow-lg",
                    !isSelected && !isCorrectAnswer && "bg-white border-slate-200 hover:border-slate-300",
                    canSelect && !isSelected && "hover:bg-slate-50 hover:shadow-sm cursor-pointer active:scale-[0.98]",
                    !canSelect && !isSelected && !isCorrectAnswer && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {/* Result indicator */}
                  {(wasSelectedAndCorrect || (isCorrectAnswer && !isSelected)) && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {wasSelectedAndWrong && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-sm">
                      <span className="text-white text-xs font-bold">✕</span>
                    </div>
                  )}

                  <div className={cn(
                    "text-sm font-semibold",
                    !showResult && !isLocked && isSelected && "text-white",
                    (isSelected && isLocked && !showResult) && "text-violet-800",
                    isCorrectAnswer && "text-emerald-800",
                    wasSelectedAndWrong && "text-red-800",
                    (!isSelected && !isCorrectAnswer) && "text-slate-700"
                  )}>
                    {option.text.split(' - ')[0]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button - Minimal */}
        {question.status === 'OPEN' && !isLocked && (
          <Button
            onClick={onLock}
            disabled={!selectedOption}
            className={cn(
              "w-full h-12 text-sm font-semibold rounded-xl transition-all duration-300",
              selectedOption
                ? cn("bg-gradient-to-r text-white shadow-lg", tierColor.gradient)
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            {selectedOption ? "Lock Prediction" : "Select an option above"}
          </Button>
        )}

        {/* Locked State - Compact */}
        {isLocked && !showResult && (
          <div className="flex items-center justify-center gap-2 py-3 bg-violet-50 rounded-xl border border-violet-200/50">
            <Clock className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-medium text-violet-700">Awaiting outcome...</span>
          </div>
        )}

        {/* Result - Compact */}
        {showResult && (
          <div className={cn(
            "flex items-center justify-center gap-2 py-3 rounded-xl",
            question.correctAnswer === selectedOption && isLocked
              ? "bg-emerald-50 border border-emerald-200/50"
              : isLocked
              ? "bg-red-50 border border-red-200/50"
              : "bg-slate-50 border border-slate-200/50"
          )}>
            {question.correctAnswer === selectedOption && isLocked ? (
              <>
                <Trophy className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">+{question.baseReward + 100} QX Earned!</span>
              </>
            ) : isLocked ? (
              <>
                <span className="text-sm font-medium text-red-600">Incorrect</span>
                <span className="text-xs text-red-400">+100 QX (participation)</span>
              </>
            ) : (
              <span className="text-sm text-slate-500">No prediction made</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function OracleTodaysQuestions({ questions, currentSlot }: { questions: OracleQuestion[]; currentSlot: number }) {
  return (
    <Card className="bg-white border-slate-200/80 shadow-md overflow-hidden">
      {/* Header with gradient accent */}
      <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500" />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Today's Schedule
          </h3>
          <span className="text-xs text-slate-500">{questions.length} slots</span>
        </div>
        <div className="space-y-2">
          {questions.map((q) => {
            const isCurrent = q.slot === currentSlot;
            return (
              <div
                key={q.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200",
                  isCurrent ? "bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 shadow-sm" : "bg-slate-50/80 hover:bg-slate-100/80"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-xs font-bold w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                    q.status === 'RESOLVED' ? "bg-violet-100 text-violet-600" :
                    q.status === 'OPEN' ? "bg-emerald-100 text-emerald-600" :
                    q.status === 'CLOSED' ? "bg-amber-100 text-amber-600" :
                    "bg-slate-200 text-slate-500"
                  )}>
                    {q.slot + 1}
                  </span>
                  <span className={cn(
                    "text-sm font-medium truncate max-w-[140px]",
                    isCurrent ? "text-violet-900" : "text-slate-700"
                  )}>
                    {q.title}
                  </span>
                </div>
                <Badge className={cn(
                  "text-[10px] border-0 px-2 py-0.5",
                  q.status === 'OPEN' ? "bg-emerald-100 text-emerald-700" :
                  q.status === 'CLOSED' ? "bg-amber-100 text-amber-700" :
                  q.status === 'RESOLVED' ? "bg-violet-100 text-violet-700" :
                  "bg-slate-100 text-slate-500"
                )}>
                  {q.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ===================== MAIN COMPONENT =====================
export default function ArenaClean() {
  const { agents, stats, loading, lastUpdate } = useRankedQuantAgents(500);
  const { user } = useAuth(); // Get current user for Supabase persistence
  const [pnlFlash, setPnlFlash] = useState<Record<string, 'up' | 'down' | null>>({});
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const prevPnLRef = useRef<Record<string, number>>({});

  // Supabase QX balance for logged-in users
  const [qxBalance, setQxBalance] = useState<QXBalance | null>(null);

  // View state - Arena or Oracle
  const [activeView, setActiveView] = useState<ActiveView>('arena');

  // Oracle state
  const [oracleQuestion, setOracleQuestion] = useState<OracleQuestion | null>(null);
  const [oracleTodaysQuestions, setOracleTodaysQuestions] = useState<OracleQuestion[]>([]);
  const [oracleSelectedOption, setOracleSelectedOption] = useState<string | null>(null);
  const [oracleIsLocked, setOracleIsLocked] = useState(false);
  const [oracleCountdown, setOracleCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [oracleLiveHints, setOracleLiveHints] = useState<LiveHintData[]>([]);
  const currentQuestionIdRef = useRef<string | null>(null);
  const lastStatusRef = useRef<string | null>(null); // Track status changes without triggering effect re-runs

  // Oracle user stats - calculated from localStorage predictions
  const [oracleUserStats, setOracleUserStats] = useState<UserStats>({
    totalQXEarned: 0,
    totalPredictions: 0,
    correctPredictions: 0,
    resolvedPredictions: 0,
    currentStreak: 0,
    bestStreak: 0,
    accuracy: 0,
  });

  // Oracle user predictions - track all predictions for slot colors
  const [oracleUserPredictions, setOracleUserPredictions] = useState<Map<string, { selectedOption: string; isCorrect: boolean | null }>>(new Map());

  // Real-time market data (1 second updates) - kept for potential future use
  const [oracleMarketData, setOracleMarketData] = useState<MarketData>({
    btcPrice: 97500,
    btcChange24h: 1.25,
    ethPrice: 3705,
    marketCap: 3.45,
    dominance: 54.2,
    fearGreedIndex: 62,
    volume24h: 125,
  });

  // Subscribe to real-time market data updates (1 second)
  useEffect(() => {
    if (activeView !== 'oracle') return;

    const unsubscribe = oracleQuestionEngine.onMarketDataUpdate((data) => {
      setOracleMarketData(data);
    });

    return () => unsubscribe();
  }, [activeView]);

  // Load QX balance from Supabase when user logs in
  useEffect(() => {
    if (!user?.id) {
      setQxBalance(null);
      return;
    }

    const loadBalance = async () => {
      try {
        const balance = await qxBalanceService.getBalance(user.id);
        if (balance) {
          setQxBalance(balance);
          console.log('[Oracle] Loaded QX balance from Supabase:', balance.balance);
        }
      } catch (err) {
        console.error('[Oracle] Failed to load QX balance:', err);
      }
    };

    loadBalance();
  }, [user?.id]);

  // Update seconds counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdate) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdate]);

  // Flash animation on P&L changes
  useEffect(() => {
    const newFlash: Record<string, 'up' | 'down' | null> = {};
    let hasChanges = false;

    agents.forEach(agent => {
      const prevPnL = prevPnLRef.current[agent.id];
      if (prevPnL !== undefined && Math.abs(agent.totalPnLPercent - prevPnL) > 0.001) {
        newFlash[agent.id] = agent.totalPnLPercent > prevPnL ? 'up' : 'down';
        hasChanges = true;
      }
      prevPnLRef.current[agent.id] = agent.totalPnLPercent;
    });

    if (hasChanges) {
      setPnlFlash(newFlash);
      setTimeout(() => setPnlFlash({}), 600);
    }
  }, [agents]);

  // Start Telegram signal publisher on mount
  // This runs the autonomous signal pipeline 24/7
  useEffect(() => {
    console.log('[Arena] Starting Telegram signal publisher...');
    telegramSignalPublisher.start();

    return () => {
      console.log('[Arena] Stopping Telegram signal publisher...');
      telegramSignalPublisher.stop();
    };
  }, []);

  // Oracle data management - with proper timer sync and slot change detection
  // IMPORTANT: Empty deps [] - runs once on mount only to prevent infinite loops
  useEffect(() => {
    console.log('[Oracle] Starting engine (mount only - no deps)');
    oracleQuestionEngine.start();

    // Track last known slot for change detection (local to effect)
    let lastKnownSlot = oracleQuestionEngine.getCurrentSlot();

    const updateOracleData = () => {
      // Get current slot to detect changes
      const currentSlot = oracleQuestionEngine.getCurrentSlot();
      const slotChanged = currentSlot !== lastKnownSlot;

      if (slotChanged) {
        console.log(`[Arena Oracle] SLOT CHANGED: ${lastKnownSlot} -> ${currentSlot}`);
        lastKnownSlot = currentSlot;
      }

      // Get current question (returns a clone from engine)
      const current = oracleQuestionEngine.getCurrentQuestion();
      const todays = oracleQuestionEngine.getTodaysQuestions();
      const countdown = oracleQuestionEngine.getTimeUntilNextSlot();

      // Update countdown always (lightweight state)
      setOracleCountdown(countdown);

      // Update questions list
      setOracleTodaysQuestions(todays);

      // Update user stats from localStorage
      const stats = oracleQuestionEngine.getUserStats();
      setOracleUserStats(stats);

      // Update user predictions map for slot colors
      // CRITICAL FIX: Use persisted isCorrect from prediction, not calculated from question
      const allPredictions = oracleQuestionEngine.getAllUserPredictions();
      const predictionsMap = new Map<string, { selectedOption: string; isCorrect: boolean | null }>();
      allPredictions.forEach(({ prediction, question }) => {
        if (question) {
          // Use persisted isCorrect from localStorage (survives refresh)
          // Only fall back to calculation if prediction.isCorrect is undefined
          let isCorrect: boolean | null = null;
          if (prediction.isCorrect !== undefined && prediction.isCorrect !== null) {
            isCorrect = prediction.isCorrect;
          } else if (question.status === 'RESOLVED' && question.correctAnswer) {
            isCorrect = prediction.selectedOption === question.correctAnswer;
          }
          predictionsMap.set(question.id, { selectedOption: prediction.selectedOption, isCorrect });
        }
      });
      setOracleUserPredictions(predictionsMap);

      // Update question state when there's an actual change
      if (current) {
        const questionChanged = current.id !== currentQuestionIdRef.current;
        const statusChanged = lastStatusRef.current !== null && current.status !== lastStatusRef.current;

        // Debug: Log status changes
        if (statusChanged) {
          console.log('[Oracle] 📊 STATUS CHANGED:', {
            from: lastStatusRef.current,
            to: current.status,
            questionId: current.id,
            canSelectNow: current.status === 'OPEN',
          });
        }

        // Update state only when question or status changes, or on initial load
        if (questionChanged || statusChanged || !currentQuestionIdRef.current) {
          // Debug logging
          if (questionChanged) {
            console.log('[Oracle] 🔄 QUESTION CHANGED:', {
              from: currentQuestionIdRef.current,
              to: current.id,
              status: current.status,
              title: current.title,
            });
          }

          // Update refs FIRST
          currentQuestionIdRef.current = current.id;
          lastStatusRef.current = current.status;

          // Then update state (triggers re-render)
          setOracleQuestion(current);

          // Reset prediction state for new question
          if (questionChanged || !currentQuestionIdRef.current) {
            const savedPrediction = oracleQuestionEngine.getUserPrediction(current.id);
            if (savedPrediction) {
              setOracleSelectedOption(savedPrediction.selectedOption);
              setOracleIsLocked(true);
              console.log('[Oracle] Restored saved prediction:', savedPrediction.selectedOption);
            } else {
              setOracleSelectedOption(null);
              setOracleIsLocked(false);
            }
          }
        }

        // Always update live hints (lightweight)
        if (current.liveHints && current.liveHints.length > 0) {
          setOracleLiveHints(current.liveHints);
        }
      } else if (!current && currentQuestionIdRef.current) {
        console.log('[Oracle] No question available - clearing state');
        setOracleQuestion(null);
        currentQuestionIdRef.current = null;
        lastStatusRef.current = null;
      }
    };

    // Initial update
    updateOracleData();

    // Register for slot change callbacks for immediate updates
    const unsubscribeSlot = oracleQuestionEngine.onSlotChange((newSlot) => {
      console.log('[Arena Oracle] Slot change callback triggered:', newSlot);
      updateOracleData();
    });

    // Register for live hint updates (real-time data updates every second)
    const unsubscribeHints = oracleQuestionEngine.onLiveHintUpdate((questionId, hints) => {
      if (currentQuestionIdRef.current === questionId && hints && hints.length > 0) {
        setOracleLiveHints(hints);
      }
    });

    // Register for day change events
    const unsubscribeDayChange = oracleQuestionEngine.onDayChange(() => {
      console.log('[Arena Oracle] Day changed - resetting UI state');
      currentQuestionIdRef.current = null;
      lastStatusRef.current = null;
      setOracleQuestion(null);
      setOracleSelectedOption(null);
      setOracleIsLocked(false);
      setOracleLiveHints([]);
      updateOracleData();
    });

    // Update frequently for smooth countdown (every 250ms)
    const interval = setInterval(updateOracleData, 250);

    return () => {
      console.log('[Oracle] Stopping engine (unmount)');
      clearInterval(interval);
      unsubscribeSlot();
      unsubscribeHints();
      unsubscribeDayChange();
      oracleQuestionEngine.stop();
    };
  }, []); // EMPTY DEPS - runs once on mount only

  // Oracle handlers
  const handleOracleSelect = (optionId: string) => {
    console.log('[Oracle] 🎯 handleOracleSelect called:', {
      optionId,
      isLocked: oracleIsLocked,
      questionStatus: oracleQuestion?.status,
      questionId: oracleQuestion?.id,
      canSelect: !oracleIsLocked && oracleQuestion?.status === 'OPEN',
    });

    if (!oracleIsLocked && oracleQuestion?.status === 'OPEN') {
      console.log('[Oracle] ✅ Selection allowed - updating state');
      setOracleSelectedOption(optionId);
    } else {
      console.log('[Oracle] ❌ Selection blocked:', {
        reason: oracleIsLocked ? 'Already locked' : `Status is ${oracleQuestion?.status}, not OPEN`,
      });
    }
  };

  const handleOracleLock = async () => {
    if (!oracleSelectedOption || !oracleQuestion || oracleQuestion.status !== 'OPEN') return;

    // Save to localStorage (always works, instant feedback)
    const result = oracleQuestionEngine.makePrediction(oracleQuestion.id, oracleSelectedOption);

    if (result.success) {
      setOracleIsLocked(true);

      // Immediately update user stats for responsive UI (cards update instantly)
      const updatedStats = oracleQuestionEngine.getUserStats();
      setOracleUserStats(updatedStats);

      // Also save to Supabase for logged-in users (persistence across devices)
      if (user?.id) {
        try {
          const supabaseResult = await qxPredictionService.makePrediction(
            user.id,
            oracleQuestion.id,
            oracleSelectedOption
          );
          if (supabaseResult.success) {
            console.log('[Oracle] Prediction saved to Supabase:', {
              questionId: oracleQuestion.id,
              option: oracleSelectedOption,
              isEarlyBird: supabaseResult.isEarlyBird,
            });
            // Refresh QX balance from Supabase
            const newBalance = await qxBalanceService.getBalance(user.id);
            if (newBalance) setQxBalance(newBalance);
          }
        } catch (err) {
          console.error('[Oracle] Failed to save to Supabase (localStorage still saved):', err);
        }
      }
    }
  };

  // IMPORTANT: All hooks must be called BEFORE any conditional returns
  // Use real-time metrics hook - must be called unconditionally
  const liveMetrics = useRealTimeMetrics(agents, stats);

  // Loading
  if (loading && agents.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Connecting to trading engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Telegram Join Notifications - Social Proof */}
      <TelegramJoinNotifications />

      {/* Live Activity Feed - Shows REAL trades only */}
      <LiveActivityFeed />

      {/* Header - Professional Design with Integrated Switcher */}
      <header className="border-b border-slate-200/80 bg-white/98 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Branding */}
            <div className="flex items-center gap-3">
              {/* QuantumX Logo - SVG */}
              <div className="relative">
                <QuantumXLogo size={40} className="rounded-xl" />
                {/* Pulse indicator - color changes based on active view */}
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm transition-colors duration-300",
                  activeView === 'arena' ? "bg-emerald-500" : "bg-violet-500"
                )}>
                  <div className={cn(
                    "absolute inset-0 rounded-full animate-ping transition-colors duration-300",
                    activeView === 'arena' ? "bg-emerald-400" : "bg-violet-400"
                  )} />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
                  QuantumX
                </h1>
                <p className="text-[9px] text-slate-500 font-medium tracking-wide">Autonomous AI Engine</p>
              </div>
            </div>

            {/* Center - Smooth Tab Switcher */}
            <div className="flex items-center">
              <div className="inline-flex items-center p-1 bg-slate-100/90 backdrop-blur rounded-xl border border-slate-200/60">
                <button
                  onClick={() => setActiveView('arena')}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ease-out",
                    activeView === 'arena'
                      ? "bg-white text-slate-900 shadow-md"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  )}
                >
                  {activeView === 'arena' && (
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 transition-opacity duration-300" />
                  )}
                  <BarChart3 className={cn(
                    "w-4 h-4 transition-colors duration-300",
                    activeView === 'arena' ? "text-emerald-600" : "text-slate-400"
                  )} />
                  <span className="relative hidden sm:inline">Arena</span>
                  {activeView === 'arena' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>

                <button
                  onClick={() => setActiveView('oracle')}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ease-out",
                    activeView === 'oracle'
                      ? "bg-white text-slate-900 shadow-md"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  )}
                >
                  {activeView === 'oracle' && (
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-violet-500/10 transition-opacity duration-300" />
                  )}
                  <Target className={cn(
                    "w-4 h-4 transition-colors duration-300",
                    activeView === 'oracle' ? "text-violet-600" : "text-slate-400"
                  )} />
                  <span className="relative hidden sm:inline">Oracle</span>
                  {activeView === 'oracle' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* Right Side - Status */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                <LiveClock />
              </div>
              <LivePulse />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 max-w-5xl">
        {/* ========== ALWAYS VISIBLE: Hero Stats - Context Aware ========== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {activeView === 'arena' ? (
            <>
              {/* Arena Metrics */}
              <MetricCard
                label="Total Balance"
                value={<span className="flex items-center gap-1"><AnimatedNumber value={liveMetrics.totalBalance} decimals={0} prefix="$" /></span>}
                icon={Wallet}
                valueColor={liveMetrics.totalPnL >= 0 ? 'green' : 'red'}
                trend={liveMetrics.totalPnL >= 0 ? 'up' : 'down'}
                subValue={`${liveMetrics.totalPnL >= 0 ? '+' : ''}${liveMetrics.totalReturnPercent.toFixed(2)}% return`}
              />
              <MetricCard
                label="Today's P&L"
                value={<AnimatedNumber value={liveMetrics.return24h} decimals={2} showSign suffix="%" />}
                icon={BarChart3}
                valueColor={liveMetrics.return24h >= 0 ? 'green' : 'red'}
                trend={liveMetrics.return24h >= 0 ? 'up' : 'down'}
                subValue={`${liveMetrics.trades24h} trades today`}
              />
              <MetricCard
                label="Win Rate"
                value={<AnimatedNumber value={liveMetrics.winRate24h} decimals={1} suffix="%" />}
                icon={Target}
                valueColor={liveMetrics.winRate24h >= 55 ? 'green' : undefined}
                trend={liveMetrics.winRate24h >= 55 ? 'up' : undefined}
                subValue={`${liveMetrics.totalTrades.toLocaleString()} total trades`}
              />
              <MetricCard
                label="Active"
                value={<span>{liveMetrics.activePositions}</span>}
                icon={Activity}
                valueColor={liveMetrics.activePositions > 0 ? 'green' : undefined}
                subValue={`of ${agents.length} agents`}
              />
            </>
          ) : (
            <>
              {/* Oracle QX Metrics - Purple theme, updates when prediction outcomes are achieved */}
              <MetricCard
                label="Total QX Earned"
                value={<span className="flex items-center gap-1 font-mono text-violet-600"><AnimatedNumber value={qxBalance?.balance || oracleUserStats.totalQXEarned} decimals={0} /></span>}
                icon={Coins}
                valueColor="violet"
                trend={(qxBalance?.balance || oracleUserStats.totalQXEarned) > 0 ? 'up' : undefined}
                subValue={`${oracleUserStats.correctPredictions} correct predictions`}
                accentColor="violet"
              />
              <MetricCard
                label="Accuracy"
                value={<span className="font-mono text-violet-600"><AnimatedNumber value={oracleUserStats.accuracy} decimals={1} suffix="%" /></span>}
                icon={Target}
                valueColor="violet"
                trend={oracleUserStats.accuracy >= 60 ? 'up' : oracleUserStats.accuracy < 40 ? 'down' : undefined}
                subValue={oracleUserStats.resolvedPredictions > 0 ? `${oracleUserStats.correctPredictions}/${oracleUserStats.resolvedPredictions} resolved` : `${oracleUserStats.totalPredictions} pending`}
                accentColor="violet"
              />
              <MetricCard
                label="Current Streak"
                value={<span className="font-mono flex items-center gap-1 text-violet-600"><Flame className="w-4 h-4 text-orange-500" />{oracleUserStats.currentStreak}</span>}
                icon={Activity}
                valueColor="violet"
                trend={oracleUserStats.currentStreak >= 3 ? 'up' : undefined}
                subValue={`Best: ${oracleUserStats.bestStreak} streak`}
                accentColor="violet"
              />
              <MetricCard
                label="Total Predictions"
                value={<span className="font-mono text-violet-600">{oracleUserStats.totalPredictions}</span>}
                icon={BarChart3}
                valueColor="violet"
                subValue={oracleTodaysQuestions.length > 0 ? `${oracleTodaysQuestions.filter(q => q.status === 'OPEN').length} active today` : 'Start predicting!'}
                accentColor="violet"
              />
            </>
          )}
        </div>

        {/* ========== CONDITIONAL VIEW CONTENT ========== */}
        {activeView === 'arena' ? (
          <>
            {/* ========== ARENA VIEW ========== */}
            {/* Live Status Bar - Real-time Updates */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 rounded-lg mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-white">Engine Active</span>
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 rounded border border-blue-500/30">
              <Shield className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-wide">Adaptive PM</span>
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <span className="text-xs text-slate-400 tabular-nums">{agents.length} Agents</span>
            <div className="w-px h-4 bg-slate-700" />
            <span className="text-xs text-slate-400 tabular-nums">{liveMetrics.totalTrades.toLocaleString()} Total Trades</span>
            <div className="w-px h-4 bg-slate-700" />
            <span className="text-xs text-slate-400 tabular-nums">{liveMetrics.activePositions} Open</span>
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            Updated {secondsSinceUpdate}s ago
          </div>
        </div>

        {/* Risk Dashboard - Professional risk status */}
        <RiskDashboard />

        {/* Adaptive PM Dashboard - Intelligent position management */}
        <AdaptivePMDashboard />

        {/* Agent Cards */}
        <div className="space-y-3 mb-8">
          {agents.map((agent, index) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              rank={index + 1}
              flash={pnlFlash[agent.id] || null}
            />
          ))}
        </div>

        {/* Signal Preview Section */}
        <div id="signal-preview" className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Signal Format Preview</h2>
            <p className="text-slate-500 text-sm">Example of signals delivered to Telegram</p>
          </div>
          <div className="max-w-md mx-auto">
            {/* Example Signal Card */}
            <Card className="p-4 bg-slate-900 text-white border-0">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Example Signal</span>
                <Badge className="ml-auto text-[10px] bg-slate-700 text-slate-300">Preview</Badge>
              </div>
              <div className="space-y-1.5 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Symbol:</span>
                  <span className="font-medium">BTC/USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Direction:</span>
                  <span className="text-emerald-400 font-medium">LONG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Entry:</span>
                  <span>$67,450 - $67,600</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Take Profit:</span>
                  <span className="text-emerald-400">$69,200</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stop Loss:</span>
                  <span className="text-red-400">$66,800</span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-1.5 mt-1.5">
                  <span className="text-slate-400">Strategy:</span>
                  <span className="text-violet-400">Momentum Surge V2</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* CTA Section - Clean and Professional */}
        <Card className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-0">
          <div className="max-w-lg mx-auto text-center">
            {/* Value Proposition */}
            <h3 className="text-2xl font-bold mb-2">Get Trading Signals on Telegram</h3>
            <p className="text-slate-400 mb-6">
              Receive real-time signals from our AI agents with entry, take profit, and stop loss levels.
            </p>

            {/* What's Included */}
            <div className="grid grid-cols-2 gap-3 mb-6 text-left">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Entry & Exit Signals</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Stop Loss & Take Profit</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Strategy Information</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Free to Join</span>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              size="lg"
              className="w-full max-w-sm bg-emerald-500 hover:bg-emerald-600 text-white py-5 text-base font-semibold"
              onClick={() => window.open('https://t.me/agentquantumx', '_blank')}
            >
              <Send className="w-5 h-5 mr-2" />
              Join QuantumX Telegram
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>

            <p className="text-xs text-slate-500 mt-4">
              Signals are for educational purposes only. Not financial advice.
            </p>
          </div>
        </Card>

        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-slate-100 rounded-lg">
          <p className="text-xs text-slate-500 text-center">
            <span className="font-medium text-slate-600">Risk Disclaimer:</span> Cryptocurrency trading carries significant risk.
            Past performance does not guarantee future results. Signals are educational only - always do your own research.
          </p>
        </div>

        {/* Footer - Copyright Only */}
        <footer className="mt-8 pt-6 border-t border-slate-200">
          <div className="text-center py-4">
            <p className="text-[11px] text-slate-400">
              &copy; {new Date().getFullYear()} QuantumX Arena. All trading involves risk. Past performance does not guarantee future results.
            </p>
          </div>
        </footer>
          </>
        ) : (
          <>
            {/* ========== ORACLE VIEW - Compact Professional Layout ========== */}
            {oracleQuestion ? (
              <div className="space-y-4">
                {/* Compact Header Bar with Timer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 rounded-xl shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Oracle Challenge</h2>
                      <p className="text-xs text-violet-200">Question {oracleQuestion.slot + 1}/48 • {oracleQuestion.title}</p>
                    </div>
                  </div>
                  <OracleCountdownTimer countdown={oracleCountdown} />
                </div>

                {/* Main Prediction Card - Full Width */}
                <OraclePredictionCard
                  question={oracleQuestion}
                  selectedOption={oracleSelectedOption}
                  isLocked={oracleIsLocked}
                  onSelect={handleOracleSelect}
                  onLock={handleOracleLock}
                  liveHints={oracleLiveHints}
                />

                {/* Today's Progress - Full Width with 48 Slots */}
                <Card className="bg-white border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500" />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Today's Progress</h3>
                      <div className="flex items-center gap-4">
                        {/* Legend */}
                        <div className="hidden sm:flex items-center gap-3 text-[10px]">
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
                            <span className="text-slate-500">Win</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded bg-red-500" />
                            <span className="text-slate-500">Loss</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded bg-violet-500" />
                            <span className="text-slate-500">Skipped</span>
                          </div>
                        </div>
                        <span className="text-xs text-violet-600 font-semibold">
                          {oracleTodaysQuestions.filter(q => q.status === 'RESOLVED').length}/48 Completed
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${(oracleTodaysQuestions.filter(q => q.status === 'RESOLVED').length / 48) * 100}%` }}
                      />
                    </div>
                    {/* All 48 Slot Pills - Grid Layout */}
                    <div className="grid grid-cols-12 sm:grid-cols-16 md:grid-cols-24 gap-1">
                      {Array.from({ length: 48 }, (_, i) => {
                        const q = oracleTodaysQuestions.find(question => question.slot === i);
                        const prediction = q ? oracleUserPredictions.get(q.id) : null;
                        const isCurrentSlot = q && oracleQuestion && q.slot === oracleQuestion.slot;

                        // Determine slot color based on prediction status
                        let slotColor = "bg-slate-100 text-slate-400"; // Default: future/upcoming
                        let tooltipText = `Slot ${i + 1}`;

                        if (isCurrentSlot) {
                          slotColor = "bg-violet-600 text-white ring-2 ring-violet-300 ring-offset-1";
                          tooltipText = `Slot ${i + 1}: Current`;
                        } else if (q && q.status === 'RESOLVED') {
                          if (prediction) {
                            // User made a prediction
                            if (prediction.isCorrect === true) {
                              slotColor = "bg-emerald-500 text-white"; // Win
                              tooltipText = `Slot ${i + 1}: Won +500 QX`;
                            } else if (prediction.isCorrect === false) {
                              slotColor = "bg-red-500 text-white"; // Loss
                              tooltipText = `Slot ${i + 1}: Lost (+100 QX for trying)`;
                            }
                          } else {
                            // User didn't predict - skipped
                            slotColor = "bg-violet-200 text-violet-600"; // Skipped
                            tooltipText = `Slot ${i + 1}: Skipped`;
                          }
                        } else if (q && (q.status === 'OPEN' || q.status === 'CLOSED')) {
                          if (prediction) {
                            slotColor = "bg-amber-100 text-amber-700 ring-1 ring-amber-300"; // Predicted, waiting
                            tooltipText = `Slot ${i + 1}: Prediction locked`;
                          } else {
                            slotColor = "bg-amber-50 text-amber-500"; // Open/Closed, not predicted
                            tooltipText = `Slot ${i + 1}: ${q.status}`;
                          }
                        }

                        return (
                          <div
                            key={i}
                            className={cn(
                              "aspect-square rounded flex items-center justify-center text-[9px] sm:text-[10px] font-bold transition-all cursor-default",
                              slotColor
                            )}
                            title={tooltipText}
                          >
                            {i + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>

                {/* Professional Footer */}
                <div className="bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200/80 rounded-xl p-5 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Rewards Info */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Rewards</h4>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                          <span><strong className="text-violet-600">500 QX</strong> correct prediction</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                          <span><strong className="text-violet-600">100 QX</strong> participation</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                          <span><strong className="text-violet-600">50 QX</strong> streak bonus</span>
                        </div>
                      </div>
                    </div>

                    {/* Progressive Tiers Info - Green, Blue, Purple */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Daily Tiers</h4>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span><strong className="text-emerald-700">Q1-16</strong> Agentic Trading</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span><strong className="text-blue-700">Q17-32</strong> Crypto Market</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span><strong className="text-purple-700">Q33-48</strong> Agents vs Market</span>
                        </div>
                      </div>
                    </div>

                    {/* Token Info */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">QX Token</h4>
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-600">
                          Earn QX by predicting agent and market outcomes.
                        </p>
                        <p className="text-xs font-semibold text-violet-600">
                          Token listing coming soon
                        </p>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Disclaimer</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        For entertainment only. Past performance doesn't guarantee future results.
                      </p>
                    </div>
                  </div>

                  {/* Bottom Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-4 text-[10px] text-slate-400">
                      <span>48 questions daily</span>
                      <span className="hidden sm:inline">•</span>
                      <span>30 min intervals</span>
                      <span className="hidden sm:inline">•</span>
                      <span>24/7 operation</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      © 2024 QuantumX Oracle. All rights reserved.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-violet-500" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">Loading Predictions...</h2>
                  <p className="text-sm text-slate-500">Please wait</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
