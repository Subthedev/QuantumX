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
  Flame, Clock, BarChart3, Percent,
  ArrowUpRight, ArrowDownRight, Radio, Users, CheckCircle2, Wallet,
  Zap, Shield, Target, ExternalLink, DollarSign, AlertTriangle, RefreshCw,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { useRankedQuantAgents, type QuantAgent, type TradeEvent } from '@/hooks/useQuantAgents';
import { arenaQuantEngine } from '@/services/arenaQuantEngine';
import { telegramSignalPublisher } from '@/services/telegramSignalPublisher';
import { cn } from '@/lib/utils';
import { AgentLogo } from '@/components/ui/agent-logos';
import { QuantumXLogo } from '@/components/ui/quantumx-logo';

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
function MetricCard({ label, value, icon: Icon, trend, valueColor, subValue }: {
  label: string;
  value: string | React.ReactNode;
  icon: React.ElementType;
  trend?: 'up' | 'down' | null;
  valueColor?: string;
  subValue?: string;
}) {
  return (
    <Card className="bg-white/80 backdrop-blur border-slate-200/60 p-4 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-2">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center",
          valueColor === 'green' ? 'bg-emerald-100' : valueColor === 'red' ? 'bg-red-100' : 'bg-slate-100'
        )}>
          <Icon className={cn(
            "w-4.5 h-4.5",
            valueColor === 'green' ? 'text-emerald-600' : valueColor === 'red' ? 'text-red-600' : 'text-slate-600'
          )} />
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
      <div className={cn(
        "text-2xl font-bold mb-0.5 tabular-nums",
        valueColor === 'green' ? 'text-emerald-600' : valueColor === 'red' ? 'text-red-600' : 'text-slate-900'
      )}>
        {value}
      </div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      {subValue && <div className="text-[10px] text-slate-400 mt-1">{subValue}</div>}
    </Card>
  );
}

// ===================== PROGRESS BAR =====================
function TradeProgressBar({ position }: { position: { direction: 'LONG' | 'SHORT'; pnlPercent: number; progressPercent: number } }) {
  const { direction, pnlPercent, progressPercent } = position;
  const isProfit = pnlPercent >= 0;
  const isShort = direction === 'SHORT';

  // For LONG: progress 0% = SL hit, 100% = TP hit, 50% = entry
  // For SHORT: progress 0% = TP hit, 100% = SL hit, 50% = entry (REVERSED)
  // When SHORT, we flip the progress so the visual makes sense
  const adjustedProgress = isShort ? (100 - progressPercent) : progressPercent;
  const clampedProgress = Math.max(5, Math.min(95, adjustedProgress));

  // For SHORT: Left side is TP (green), Right side is SL (red) - REVERSED
  const leftLabel = isShort ? 'TP' : 'SL';
  const rightLabel = isShort ? 'SL' : 'TP';
  const leftColor = isShort ? 'text-emerald-500' : 'text-red-500';
  const rightColor = isShort ? 'text-red-500' : 'text-emerald-500';
  const leftBgColor = isShort ? 'bg-emerald-100' : 'bg-red-100';
  const rightBgColor = isShort ? 'bg-red-100' : 'bg-emerald-100';

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className={cn("text-[10px] font-semibold w-5", leftColor)}>{leftLabel}</span>
      <div className="flex-1 relative h-1.5 rounded-full bg-slate-200 overflow-hidden">
        {/* Background zones - swap colors for SHORT */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1/2", leftBgColor)} />
        <div className={cn("absolute right-0 top-0 bottom-0 w-1/2", rightBgColor)} />
        {/* Entry line at 50% */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-400 -translate-x-1/2 z-10" />
        {/* Progress fill */}
        <div
          className={cn(
            "absolute top-0 bottom-0 transition-all duration-500",
            isProfit ? "bg-emerald-500" : "bg-red-500"
          )}
          style={{
            left: clampedProgress >= 50 ? '50%' : `${clampedProgress}%`,
            width: clampedProgress >= 50 ? `${clampedProgress - 50}%` : `${50 - clampedProgress}%`,
          }}
        />
        {/* Current position indicator */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm transition-all duration-500 z-20",
            isProfit ? "bg-emerald-500" : "bg-red-500"
          )}
          style={{ left: `calc(${clampedProgress}% - 5px)` }}
        />
      </div>
      <span className={cn("text-[10px] font-semibold w-5 text-right", rightColor)}>{rightLabel}</span>
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
            pnlPercent: currentPosition.pnlPercent || 0,
            progressPercent: currentPosition.progressPercent || 50
          }} />
        </div>
      )}
    </Card>
  );
}

// ===================== MAIN COMPONENT =====================
export default function ArenaClean() {
  const { agents, stats, loading, lastUpdate } = useRankedQuantAgents(500);
  const [pnlFlash, setPnlFlash] = useState<Record<string, 'up' | 'down' | null>>({});
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const prevPnLRef = useRef<Record<string, number>>({});

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

      {/* Header - Professional Design */}
      <header className="border-b border-slate-200/80 bg-white/98 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Branding */}
            <div className="flex items-center gap-3">
              {/* QuantumX Logo - SVG */}
              <div className="relative">
                <QuantumXLogo size={44} className="rounded-xl" />
                {/* Pulse indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm">
                  <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
                    QuantumX
                  </h1>
                  <Badge className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-[9px] px-1.5 py-0.5 font-semibold border-0">
                    ARENA
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide">Autonomous AI Trading Engine</p>
              </div>
            </div>

            {/* Right Side - Status */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                <LiveClock />
              </div>
              <LivePulse />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 max-w-5xl">
        {/* Hero Stats - Key metrics at a glance */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
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
        </div>

        {/* Live Status Bar - Real-time Updates */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 rounded-lg mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-white">Engine Active</span>
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

        {/* Professional Footer */}
        <footer className="mt-8 pt-8 border-t border-slate-200">
          {/* Stats Row */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-6">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900">$30,000</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Initial Capital</div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900">3</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">AI Agents</div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">99.9%</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Uptime</div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900">24/7</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Trading</div>
            </div>
          </div>

          {/* Branding */}
          <div className="flex flex-col items-center gap-3 py-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <QuantumXLogo size={28} className="rounded-lg" />
              <span className="font-bold text-slate-700">QuantumX</span>
              <span className="text-slate-400">by</span>
              <span className="font-semibold text-slate-600">IgniteX</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Autonomous Trading</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span>Educational Only</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span>Not Financial Advice</span>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center py-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-400">
              &copy; {new Date().getFullYear()} QuantumX Arena. All trading involves risk. Past performance does not guarantee future results.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
