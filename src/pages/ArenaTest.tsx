/**
 * ARENA TEST PAGE - Minimal version to debug issues
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ArenaTest() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="container mx-auto">
        {/* Header */}
        <div className="border-b-2 border-orange-500 pb-6 mb-8">
          <h1 className="text-5xl font-black text-gray-900 mb-2">
            IGNITEX <span className="text-orange-500">ARENA</span>
          </h1>
          <Badge className="bg-orange-500 text-white">TEST MODE</Badge>
        </div>

        {/* Simple Test Card */}
        <Card className="p-6 bg-white border-2 border-orange-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ✅ Arena Test Page Loading Successfully
          </h2>
          <p className="text-gray-600">
            If you can see this, React is working properly. The issue is with one of the Arena components.
          </p>

          <div className="mt-6 p-4 bg-orange-50 rounded-lg">
            <h3 className="font-bold text-orange-900 mb-2">Debug Info:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ React: Working</li>
              <li>✅ Routing: Working</li>
              <li>✅ UI Components: Working</li>
              <li>✅ Tailwind CSS: Working</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-bold text-red-900 mb-2">Next Steps:</h3>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>If you see this page, the issue is in ArenaEnhanced.tsx</li>
              <li>Check browser console for specific error messages</li>
              <li>Test each component individually</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}
