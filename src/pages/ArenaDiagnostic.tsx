/**
 * ARENA DIAGNOSTIC - Load components one by one to find the issue
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Import all Arena components
import { DramaFeed } from '@/components/arena/DramaFeed';
import { PredictionPanel } from '@/components/arena/PredictionPanel';
import { StreakTracker } from '@/components/arena/StreakTracker';
import { ViralMoments } from '@/components/arena/ViralMoments';
import { ArenaHero } from '@/components/arena/ArenaHero';

export default function ArenaDiagnostic() {
  const [testDramaFeed, setTestDramaFeed] = useState(false);
  const [testPrediction, setTestPrediction] = useState(false);
  const [testStreak, setTestStreak] = useState(false);
  const [testViral, setTestViral] = useState(false);
  const [testArenaHero, setTestArenaHero] = useState(false);

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="border-b-2 border-orange-500 pb-6 mb-8">
          <h1 className="text-5xl font-black text-gray-900 mb-2">
            ARENA <span className="text-orange-500">DIAGNOSTIC</span>
          </h1>
          <p className="text-gray-600">Test each component individually to find the issue</p>
        </div>

        {/* Component Tests */}
        <div className="space-y-6">
          {/* Drama Feed Test */}
          <Card className="p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">1. Drama Feed</h3>
                <p className="text-sm text-gray-600">Real-time storytelling component</p>
              </div>
              <Button
                onClick={() => setTestDramaFeed(!testDramaFeed)}
                className={testDramaFeed ? 'bg-red-500' : 'bg-green-500'}
              >
                {testDramaFeed ? 'Hide' : 'Test'}
              </Button>
            </div>
            {testDramaFeed && (
              <ErrorBoundary componentName="DramaFeed">
                <DramaFeed />
              </ErrorBoundary>
            )}
          </Card>

          {/* Prediction Panel Test */}
          <Card className="p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">2. Prediction Panel</h3>
                <p className="text-sm text-gray-600">Core engagement mechanic</p>
              </div>
              <Button
                onClick={() => setTestPrediction(!testPrediction)}
                className={testPrediction ? 'bg-red-500' : 'bg-green-500'}
              >
                {testPrediction ? 'Hide' : 'Test'}
              </Button>
            </div>
            {testPrediction && (
              <ErrorBoundary componentName="PredictionPanel">
                <PredictionPanel />
              </ErrorBoundary>
            )}
          </Card>

          {/* Streak Tracker Test */}
          <Card className="p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">3. Streak Tracker</h3>
                <p className="text-sm text-gray-600">Daily rewards system</p>
              </div>
              <Button
                onClick={() => setTestStreak(!testStreak)}
                className={testStreak ? 'bg-red-500' : 'bg-green-500'}
              >
                {testStreak ? 'Hide' : 'Test'}
              </Button>
            </div>
            {testStreak && (
              <ErrorBoundary componentName="StreakTracker">
                <StreakTracker />
              </ErrorBoundary>
            )}
          </Card>

          {/* Viral Moments Test */}
          <Card className="p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">4. Viral Moments</h3>
                <p className="text-sm text-gray-600">Social sharing component</p>
              </div>
              <Button
                onClick={() => setTestViral(!testViral)}
                className={testViral ? 'bg-red-500' : 'bg-green-500'}
              >
                {testViral ? 'Hide' : 'Test'}
              </Button>
            </div>
            {testViral && (
              <ErrorBoundary componentName="ViralMoments">
                <ViralMoments />
              </ErrorBoundary>
            )}
          </Card>

          {/* Arena Hero Test */}
          <Card className="p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">5. Arena Hero (Agent Cards)</h3>
                <p className="text-sm text-gray-600">Main agent display</p>
              </div>
              <Button
                onClick={() => setTestArenaHero(!testArenaHero)}
                className={testArenaHero ? 'bg-red-500' : 'bg-green-500'}
              >
                {testArenaHero ? 'Hide' : 'Test'}
              </Button>
            </div>
            {testArenaHero && (
              <ErrorBoundary componentName="ArenaHero">
                <ArenaHero />
              </ErrorBoundary>
            )}
          </Card>
        </div>

        {/* Instructions */}
        <Card className="p-6 bg-orange-50 border-2 border-orange-300 mt-8">
          <h3 className="font-bold text-orange-900 mb-3">Instructions:</h3>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Click "Test" on each component one by one</li>
            <li>If a component shows an error, that's the culprit!</li>
            <li>Check the error message for details</li>
            <li>Fix that specific component and test again</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
