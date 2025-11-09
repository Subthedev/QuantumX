/**
 * IGX Test Runner Page
 * Execute and view Phase 1+2 integration tests
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
// Lazy load monitoring dashboard to avoid auto-starting services on page load
// import { IGXMonitoringDashboard } from '@/components/IGXMonitoringDashboard';
// Lazy load tests to avoid auto-starting services on page load
// import { phase1and2IntegrationTest } from '@/services/igx/tests/Phase1-2IntegrationTest';
// import { phase3IntegrationTest } from '@/services/igx/tests/Phase3IntegrationTest';
import type { IntegrationTestReport } from '@/services/igx/tests/Phase1-2IntegrationTest';
import type { Phase3TestReport } from '@/services/igx/tests/Phase3IntegrationTest';
import type { Phase4ValidationReport } from '@/services/igx/tests/Phase4PerformanceValidation';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  AlertTriangle,
  Loader2,
  StopCircle,
  Timer
} from 'lucide-react';

// Lazy load monitoring dashboard component
const LazyIGXMonitoringDashboard = React.lazy(() => import('@/components/IGXMonitoringDashboard').then(module => ({ default: module.IGXMonitoringDashboard })));

type TestPhase = '1-2' | '3' | '4';
type Phase4Duration = 1 | 4 | 12 | 24; // Test durations in hours

export default function IGXTestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<IntegrationTestReport | Phase3TestReport | Phase4ValidationReport | null>(null);
  const [activeTab, setActiveTab] = useState('monitor');
  const [loadMonitor, setLoadMonitor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<TestPhase>('1-2');
  const [phase4Duration, setPhase4Duration] = useState<Phase4Duration>(1);
  const [phase4Running, setPhase4Running] = useState(false);
  const { toast } = useToast();

  const runTests = async () => {
    console.log(`🚀 runTests function called for Phase ${selectedPhase}`);
    setIsRunning(true);
    setReport(null);
    setError(null);

    try {
      if (selectedPhase === '1-2') {
        console.log('📦 Starting Phase 1+2 integration tests...');
        toast({
          title: "Starting Phase 1+2 Tests",
          description: "Initializing Event-Driven + Feature Engineering test suite...",
        });

        // Dynamically import test to avoid auto-starting services on page load
        console.log('📥 Dynamically importing Phase 1+2 test module...');
        const { phase1and2IntegrationTest } = await import('@/services/igx/tests/Phase1-2IntegrationTest');
        console.log('✅ Phase 1+2 test module imported successfully');

        console.log('🧪 Running all Phase 1+2 tests...');
        const testReport = await phase1and2IntegrationTest.runAllTests();
        console.log('✅ Phase 1+2 tests completed:', testReport);

        setReport(testReport);
        setActiveTab('results');

        toast({
          title: "Phase 1+2 Tests Complete",
          description: `${testReport.passed}/${testReport.totalTests} tests passed`,
        });
      } else if (selectedPhase === '3') {
        console.log('📦 Starting Phase 3 integration tests...');
        toast({
          title: "Starting Phase 3 Tests",
          description: "Initializing Opportunity Scoring integration test suite...",
        });

        // Dynamically import test to avoid auto-starting services on page load
        console.log('📥 Dynamically importing Phase 3 test module...');
        const { phase3IntegrationTest } = await import('@/services/igx/tests/Phase3IntegrationTest');
        console.log('✅ Phase 3 test module imported successfully');

        console.log('🧪 Running all Phase 3 tests...');
        const testReport = await phase3IntegrationTest.runAllTests();
        console.log('✅ Phase 3 tests completed:', testReport);

        setReport(testReport);
        setActiveTab('results');

        toast({
          title: "Phase 3 Tests Complete",
          description: `${testReport.passed}/${testReport.totalTests} tests passed`,
        });
      } else if (selectedPhase === '4') {
        console.log(`📦 Starting Phase 4 performance validation (${phase4Duration}h duration)...`);
        toast({
          title: "Starting Phase 4 Performance Test",
          description: `Running ${phase4Duration}-hour production validation...`,
        });

        // Dynamically import test to avoid auto-starting services on page load
        console.log('📥 Dynamically importing Phase 4 test module...');
        const { phase4PerformanceValidation } = await import('@/services/igx/tests/Phase4PerformanceValidation');
        console.log('✅ Phase 4 test module imported successfully');

        console.log(`🧪 Starting Phase 4 performance test (${phase4Duration} hours)...`);
        setPhase4Running(true);

        // Start the test (non-blocking)
        phase4PerformanceValidation.startTest(phase4Duration * 60); // Convert hours to minutes

        toast({
          title: "Phase 4 Test Running",
          description: `Performance test will run for ${phase4Duration} hours. Monitor progress in the dashboard.`,
          duration: 5000,
        });

        // Switch to monitor tab to watch progress
        setActiveTab('monitor');
        setLoadMonitor(true);
        setIsRunning(false); // Allow UI interaction
        return; // Don't set report yet, test is running in background
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Test execution failed:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      setError(errorMessage);

      toast({
        title: "Test Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      console.log('🏁 runTests function completed');
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-5 h-5 text-green-400" />
    ) : (
      <XCircle className="w-5 h-5 text-red-400" />
    );
  };

  const getComponentBadge = (status: 'PASS' | 'FAIL') => {
    return status === 'PASS' ? (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        PASS
      </Badge>
    ) : (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
        <XCircle className="w-3 h-3 mr-1" />
        FAIL
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              IGX Integration Test Suite
            </h1>
            <p className="text-gray-400">
              {selectedPhase === '1-2'
                ? 'Event-Driven Architecture + Feature Engineering'
                : selectedPhase === '3'
                ? 'Opportunity Scoring + Alpha→Gamma Integration'
                : 'Performance Validation + Production Readiness'}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
              <Button
                onClick={() => setSelectedPhase('1-2')}
                variant={selectedPhase === '1-2' ? 'default' : 'ghost'}
                className={selectedPhase === '1-2' ? 'bg-blue-600' : ''}
                disabled={isRunning || phase4Running}
              >
                Phase 1+2
              </Button>
              <Button
                onClick={() => setSelectedPhase('3')}
                variant={selectedPhase === '3' ? 'default' : 'ghost'}
                className={selectedPhase === '3' ? 'bg-blue-600' : ''}
                disabled={isRunning || phase4Running}
              >
                Phase 3
              </Button>
              <Button
                onClick={() => setSelectedPhase('4')}
                variant={selectedPhase === '4' ? 'default' : 'ghost'}
                className={selectedPhase === '4' ? 'bg-blue-600' : ''}
                disabled={isRunning || phase4Running}
              >
                Phase 4
              </Button>
            </div>
            {selectedPhase === '4' && (
              <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
                <Button
                  onClick={() => setPhase4Duration(1)}
                  variant={phase4Duration === 1 ? 'default' : 'ghost'}
                  className={phase4Duration === 1 ? 'bg-green-600' : ''}
                  disabled={isRunning || phase4Running}
                  size="sm"
                >
                  <Timer className="w-4 h-4 mr-1" />
                  1h
                </Button>
                <Button
                  onClick={() => setPhase4Duration(4)}
                  variant={phase4Duration === 4 ? 'default' : 'ghost'}
                  className={phase4Duration === 4 ? 'bg-green-600' : ''}
                  disabled={isRunning || phase4Running}
                  size="sm"
                >
                  <Timer className="w-4 h-4 mr-1" />
                  4h
                </Button>
                <Button
                  onClick={() => setPhase4Duration(12)}
                  variant={phase4Duration === 12 ? 'default' : 'ghost'}
                  className={phase4Duration === 12 ? 'bg-green-600' : ''}
                  disabled={isRunning || phase4Running}
                  size="sm"
                >
                  <Timer className="w-4 h-4 mr-1" />
                  12h
                </Button>
                <Button
                  onClick={() => setPhase4Duration(24)}
                  variant={phase4Duration === 24 ? 'default' : 'ghost'}
                  className={phase4Duration === 24 ? 'bg-green-600' : ''}
                  disabled={isRunning || phase4Running}
                  size="sm"
                >
                  <Timer className="w-4 h-4 mr-1" />
                  24h
                </Button>
              </div>
            )}
            {phase4Running ? (
              <Button
                onClick={async () => {
                  const { phase4PerformanceValidation } = await import('@/services/igx/tests/Phase4PerformanceValidation');
                  const report = phase4PerformanceValidation.stopTest();
                  if (report) {
                    setReport(report);
                    setActiveTab('results');
                  }
                  setPhase4Running(false);
                }}
                className="bg-red-600 hover:bg-red-700"
                size="lg"
              >
                <StopCircle className="w-5 h-5 mr-2" />
                Stop Test & Generate Report
              </Button>
            ) : (
              <Button
                onClick={runTests}
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    {selectedPhase === '4' ? `Run ${phase4Duration}h Test` : 'Run Tests'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
            <TabsTrigger value="monitor">
              <Activity className="w-4 h-4 mr-2" />
              System Monitor
            </TabsTrigger>
            <TabsTrigger value="results">
              <CheckCircle className="w-4 h-4 mr-2" />
              Test Results
            </TabsTrigger>
          </TabsList>

          {/* System Monitor Tab */}
          <TabsContent value="monitor">
            {loadMonitor ? (
              <React.Suspense fallback={
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
                      <p className="text-white">Loading System Monitor...</p>
                    </div>
                  </CardContent>
                </Card>
              }>
                <LazyIGXMonitoringDashboard />
              </React.Suspense>
            ) : (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      System Monitor
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Click below to load the real-time monitoring dashboard
                    </p>
                    <Button onClick={() => setLoadMonitor(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Activity className="w-4 h-4 mr-2" />
                      Load Monitor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Test Results Tab */}
          <TabsContent value="results">
            {error && (
              <Card className="bg-red-900/20 border-red-500/30 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-6 h-6" />
                    Test Execution Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white mb-4">{error}</p>
                  <Button onClick={runTests} className="bg-blue-600 hover:bg-blue-700">
                    <Play className="w-4 h-4 mr-2" />
                    Retry Tests
                  </Button>
                </CardContent>
              </Card>
            )}

            {!report && !isRunning && !error && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Play className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No Tests Run Yet
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Click "Run Integration Tests" to execute the Phase 1+2 test suite
                    </p>
                    <Button onClick={runTests} className="bg-blue-600 hover:bg-blue-700">
                      <Play className="w-4 h-4 mr-2" />
                      Start Tests
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isRunning && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Running Integration Tests...
                    </h3>
                    <p className="text-gray-400">
                      This may take 1-2 minutes to complete
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {report && 'productionReady' in report && (
              // Phase 4 Performance Validation Report
              <div className="space-y-6">
                {/* Summary Card */}
                <Card className={`border-2 ${
                  report.productionReady
                    ? 'bg-green-900/20 border-green-500/30'
                    : 'bg-red-900/20 border-red-500/30'
                }`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      {report.productionReady ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                      Phase 4 Performance Validation Report
                    </CardTitle>
                    <CardDescription>
                      {new Date(report.testStartTime).toLocaleString()} - {new Date(report.testEndTime).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-1">Duration</p>
                        <p className="text-3xl font-bold text-white">{report.durationHours.toFixed(1)}h</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-1">Signals Generated</p>
                        <p className="text-3xl font-bold text-blue-400">{report.totalSignalsGenerated}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-1">Win Rate</p>
                        <p className="text-3xl font-bold text-green-400">{report.overallWinRate.toFixed(1)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-1">Sharpe Ratio</p>
                        <p className="text-3xl font-bold text-purple-400">{report.finalSharpeRatio.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Production Readiness Banner */}
                    <div className={`p-4 rounded-lg mb-6 ${
                      report.productionReady
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-red-500/10 border border-red-500/30'
                    }`}>
                      <h3 className={`text-lg font-bold ${report.productionReady ? 'text-green-400' : 'text-red-400'}`}>
                        {report.productionReady ? '🎉 PRODUCTION READY' : '🔴 NOT PRODUCTION READY'}
                      </h3>
                      <p className="text-gray-300 mt-2">
                        {report.productionReady
                          ? 'All critical metrics passed. System is ready for deployment.'
                          : 'Critical issues found. Address the following before deployment:'}
                      </p>
                      {!report.productionReady && report.criticalIssues && report.criticalIssues.length > 0 && (
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {report.criticalIssues.map((issue, i) => (
                            <li key={i} className="text-red-300">{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Performance Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-400 mb-2">Cumulative Return</p>
                        <p className={`text-2xl font-bold ${report.finalCumulativeReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {report.finalCumulativeReturn >= 0 ? '+' : ''}{report.finalCumulativeReturn.toFixed(2)}%
                        </p>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-400 mb-2">Max Drawdown</p>
                        <p className="text-2xl font-bold text-red-400">-{report.maxDrawdownObserved.toFixed(2)}%</p>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-400 mb-2">Capture Rate</p>
                        <p className="text-2xl font-bold text-blue-400">{report.overallCaptureRate.toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Adaptive Behavior */}
                    <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Adaptive Behavior</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">Regime Changes</p>
                          <p className="text-xl font-bold text-white">{report.totalRegimeChanges}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Mode Changes</p>
                          <p className="text-xl font-bold text-white">{report.totalModeChanges}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Gamma Commands</p>
                          <p className="text-xl font-bold text-white">{report.totalGammaCommands}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Response Time</p>
                          <p className="text-xl font-bold text-white">{report.improvements.adaptiveResponseTime.toFixed(1)}s</p>
                        </div>
                      </div>
                    </div>

                    {/* Improvements vs Baseline */}
                    <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Improvements vs Baseline</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Sharpe Ratio</span>
                          <span className={`font-bold ${report.improvements.sharpeRatioImprovement >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {report.improvements.sharpeRatioImprovement >= 0 ? '+' : ''}{report.improvements.sharpeRatioImprovement.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Capture Rate</span>
                          <span className={`font-bold ${report.improvements.captureRateImprovement >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {report.improvements.captureRateImprovement >= 0 ? '+' : ''}{report.improvements.captureRateImprovement.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Signal Quality</span>
                          <span className={`font-bold ${report.improvements.signalQualityImprovement >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {report.improvements.signalQualityImprovement >= 0 ? '+' : ''}{report.improvements.signalQualityImprovement.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-white mb-3">Recommendations</h3>
                      <ul className="space-y-2">
                        {report.recommendations.map((rec, i) => (
                          <li key={i} className="text-gray-300 flex items-start gap-2">
                            <span className="mt-1">{rec.startsWith('✅') ? '✅' : rec.startsWith('⚠️') ? '⚠️' : rec.startsWith('🔴') ? '🔴' : rec.startsWith('🎉') ? '🎉' : '•'}</span>
                            <span>{rec.replace(/^[✅⚠️🔴🎉]\s*/, '')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {report && !('productionReady' in report) && (
              // Phase 1+2 or Phase 3 Test Report
              <div className="space-y-6">
                {/* Summary Card */}
                <Card className={`border-2 ${
                  report.passed === report.totalTests
                    ? 'bg-green-900/20 border-green-500/30'
                    : 'bg-red-900/20 border-red-500/30'
                }`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      {report.passed === report.totalTests ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                      Test Summary
                    </CardTitle>
                    <CardDescription>
                      Completed {new Date(report.timestamp).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-1">Total Tests</p>
                        <p className="text-3xl font-bold text-white">{report.totalTests}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-1">Passed</p>
                        <p className="text-3xl font-bold text-green-400">{report.passed}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-1">Failed</p>
                        <p className="text-3xl font-bold text-red-400">{report.failed}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400 mb-1">Duration</p>
                        <p className="text-3xl font-bold text-white">
                          {(report.duration / 1000).toFixed(1)}s
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Success Rate</span>
                        <span className="text-white font-mono">
                          {((report.passed / report.totalTests) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={(report.passed / report.totalTests) * 100}
                        className="h-3"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Component Status */}
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Component Status</CardTitle>
                    <CardDescription>
                      {'eventDrivenFlow' in report.summary ? 'Phase 1+2 system validation' : 'Phase 3 system validation'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {'eventDrivenFlow' in report.summary ? (
                        <>
                          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <span className="text-white">Event-Driven Flow</span>
                            {getComponentBadge(report.summary.eventDrivenFlow)}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <span className="text-white">Feature Cache Performance</span>
                            {getComponentBadge(report.summary.featureCachePerformance)}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <span className="text-white">Multi-Timeframe Analysis</span>
                            {getComponentBadge(report.summary.multiTimeframeAnalysis)}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <span className="text-white">Background Worker</span>
                            {getComponentBadge(report.summary.backgroundWorker)}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <span className="text-white">Opportunity Scoring</span>
                            {getComponentBadge(report.summary.opportunityScoring)}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <span className="text-white">Latency Improvements</span>
                            {getComponentBadge(report.summary.latencyImprovements)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <span className="text-white">Real Market Data Flow</span>
                            {getComponentBadge(report.summary.realMarketDataFlow)}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <span className="text-white">Opportunity Scoring Influence</span>
                            {getComponentBadge(report.summary.opportunityScoringInfluence)}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <span className="text-white">Alpha→Gamma Commands</span>
                            {getComponentBadge(report.summary.alphaGammaCommands)}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <span className="text-white">End-to-End Flow</span>
                            {getComponentBadge(report.summary.endToEndFlow)}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <span className="text-white">Multi-Regime Performance</span>
                            {getComponentBadge(report.summary.multiRegimePerformance)}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                            <span className="text-white">Risk Context Integration</span>
                            {getComponentBadge(report.summary.riskContextIntegration)}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Results */}
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Detailed Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {report.results.map((result, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${
                            result.passed
                              ? 'bg-green-900/10 border-green-500/30'
                              : 'bg-red-900/10 border-red-500/30'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result.passed)}
                              <h4 className="text-lg font-semibold text-white">
                                {result.test}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Clock className="w-4 h-4" />
                              {(result.duration / 1000).toFixed(1)}s
                            </div>
                          </div>

                          {result.errors && result.errors.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {result.errors.map((error, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-red-400">
                                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <span>{error}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {result.details && (
                            <details className="mt-3">
                              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                                View Details
                              </summary>
                              <pre className="mt-2 p-3 bg-gray-900/50 rounded text-xs text-gray-300 overflow-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                {report.recommendations.length > 0 && (
                  <Card className="bg-blue-900/20 border-blue-500/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {report.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-white">
                            <span className="text-gray-400">{index + 1}.</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
