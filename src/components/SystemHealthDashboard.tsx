import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Wifi, TrendingUp, Zap, CheckCircle2, Signal } from 'lucide-react';

interface ConnectionHealth {
  source: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';
  latency: number;
  dataPoints: number;
  lastUpdate: number;
}

interface SystemStats {
  uptime: number;
  totalSignals: number;
  triggersDetected: number;
  averageLatency: number;
  dataQuality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const SystemHealthDashboard: React.FC = () => {
  const [binanceHealth, setBinanceHealth] = useState<ConnectionHealth>({
    source: 'Binance WebSocket',
    status: 'DISCONNECTED',
    latency: 0,
    dataPoints: 0,
    lastUpdate: Date.now()
  });

  const [okxHealth, setOkxHealth] = useState<ConnectionHealth>({
    source: 'OKX WebSocket',
    status: 'DISCONNECTED',
    latency: 0,
    dataPoints: 0,
    lastUpdate: Date.now()
  });

  const [httpHealth, setHttpHealth] = useState<ConnectionHealth>({
    source: 'HTTP Fallback',
    status: 'CONNECTED',
    latency: 0,
    dataPoints: 0,
    lastUpdate: Date.now()
  });

  const [systemStats, setSystemStats] = useState<SystemStats>({
    uptime: 0,
    totalSignals: 0,
    triggersDetected: 0,
    averageLatency: 0,
    dataQuality: 'HIGH'
  });

  const [heartbeatAlive, setHeartbeatAlive] = useState(true);
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());

  useEffect(() => {
    // Listen for data source health events
    const handleDataHealth = (event: CustomEvent) => {
      const { source, stats } = event.detail;

      if (source === 'binance') {
        setBinanceHealth({
          source: 'Binance WebSocket',
          status: stats.connected ? 'CONNECTED' : 'DISCONNECTED',
          latency: stats.latency || 0,
          dataPoints: stats.dataPoints || 0,
          lastUpdate: Date.now()
        });
      } else if (source === 'okx') {
        setOkxHealth({
          source: 'OKX WebSocket',
          status: stats.connected ? 'CONNECTED' : 'DISCONNECTED',
          latency: stats.latency || 0,
          dataPoints: stats.dataPoints || 0,
          lastUpdate: Date.now()
        });
      } else if (source === 'http') {
        setHttpHealth({
          source: 'HTTP Fallback',
          status: 'CONNECTED',
          latency: stats.latency || 0,
          dataPoints: stats.dataPoints || 0,
          lastUpdate: Date.now()
        });
      }
    };

    // Listen for system stats events
    const handleSystemStats = (event: CustomEvent) => {
      setSystemStats(event.detail);
    };

    // Listen for heartbeat events
    const handleHeartbeat = (event: CustomEvent) => {
      setHeartbeatAlive(true);
      setLastHeartbeat(Date.now());
    };

    // Listen for signal generation events
    const handleSignalGenerated = () => {
      setSystemStats(prev => ({
        ...prev,
        totalSignals: prev.totalSignals + 1
      }));
    };

    // Listen for trigger events
    const handleTriggerDetected = () => {
      setSystemStats(prev => ({
        ...prev,
        triggersDetected: prev.triggersDetected + 1
      }));
    };

    window.addEventListener('igx-data-health' as any, handleDataHealth);
    window.addEventListener('igx-system-stats' as any, handleSystemStats);
    window.addEventListener('igx-heartbeat' as any, handleHeartbeat);
    window.addEventListener('igx-signal-generated' as any, handleSignalGenerated);
    window.addEventListener('igx-trigger-detected' as any, handleTriggerDetected);

    // Heartbeat deadman check (15 second threshold)
    const heartbeatCheckInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
      if (timeSinceLastHeartbeat > 15000) {
        setHeartbeatAlive(false);
      }
    }, 5000);

    // Uptime counter
    const startTime = Date.now();
    const uptimeInterval = setInterval(() => {
      setSystemStats(prev => ({
        ...prev,
        uptime: Math.floor((Date.now() - startTime) / 1000)
      }));
    }, 1000);

    return () => {
      window.removeEventListener('igx-data-health' as any, handleDataHealth);
      window.removeEventListener('igx-system-stats' as any, handleSystemStats);
      window.removeEventListener('igx-heartbeat' as any, handleHeartbeat);
      window.removeEventListener('igx-signal-generated' as any, handleSignalGenerated);
      window.removeEventListener('igx-trigger-detected' as any, handleTriggerDetected);
      clearInterval(heartbeatCheckInterval);
      clearInterval(uptimeInterval);
    };
  }, [lastHeartbeat]);

  const getConnectionCount = () => {
    let connected = 0;
    if (binanceHealth.status === 'CONNECTED') connected++;
    if (okxHealth.status === 'CONNECTED') connected++;
    if (httpHealth.status === 'CONNECTED') connected++;
    return connected;
  };

  const getAverageLatency = () => {
    const latencies = [];
    if (binanceHealth.status === 'CONNECTED') latencies.push(binanceHealth.latency);
    if (okxHealth.status === 'CONNECTED') latencies.push(okxHealth.latency);
    if (httpHealth.status === 'CONNECTED') latencies.push(httpHealth.latency);
    return latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
  };

  const getTotalDataPoints = () => {
    return binanceHealth.dataPoints + okxHealth.dataPoints + httpHealth.dataPoints;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'HIGH': return 'text-green-500';
      case 'MEDIUM': return 'text-yellow-500';
      case 'LOW': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* System Health - Minimalistic Card */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" />
              System Health
            </CardTitle>
            {heartbeatAlive ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-500">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-500">OFFLINE</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Uptime</p>
              <p className="text-xl font-bold">{formatUptime(systemStats.uptime)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Signals</p>
              <p className="text-xl font-bold text-primary">{systemStats.totalSignals}</p>
            </div>
          </div>

          {/* Quality Indicator */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Data Quality</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <div
                    key={bar}
                    className={`w-1 h-3 rounded-sm ${
                      (systemStats.dataQuality === 'HIGH' && bar <= 5) ||
                      (systemStats.dataQuality === 'MEDIUM' && bar <= 3) ||
                      (systemStats.dataQuality === 'LOW' && bar <= 1)
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-xs font-medium ${getQualityColor(systemStats.dataQuality)}`}>
                {systemStats.dataQuality}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources - Minimalistic Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Signal className="w-4 h-4" />
              Data Pipeline
            </CardTitle>
            <Badge variant="outline" className="gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              {getConnectionCount()}/3 Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aggregated Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Data Points</p>
              <p className="text-xl font-bold">{getTotalDataPoints().toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg Latency</p>
              <p className="text-xl font-bold text-blue-500">{getAverageLatency()}ms</p>
            </div>
          </div>

          {/* Connection Status - Simplified */}
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${binanceHealth.status === 'CONNECTED' ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-xs">Binance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${okxHealth.status === 'CONNECTED' ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-xs">OKX</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${httpHealth.status === 'CONNECTED' ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-xs">Fallback</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
