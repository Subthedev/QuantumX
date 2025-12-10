/**
 * Simple IGX Test Runner - Diagnostic Version
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function IGXTestRunnerSimple() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <Card className="bg-gray-800/50 border-gray-700 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white text-2xl">IGX Test Runner</CardTitle>
        </CardHeader>
        <CardContent className="text-white">
          <p>Phase 1+2 Testing Suite is Loading...</p>
          <p className="mt-4 text-gray-400">If you see this message, the route is working!</p>
        </CardContent>
      </Card>
    </div>
  );
}
