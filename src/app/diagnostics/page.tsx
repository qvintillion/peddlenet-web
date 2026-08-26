'use client';

import { ConnectionTest } from '@/components/ConnectionTest';
import Link from 'next/link';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export default function DiagnosticsPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">🔧 Connection Diagnostics</h1>
            <Link 
              href="/app"
              className="text-purple-400 hover:text-purple-300 transition"
            >
              ← Home
            </Link>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              Test if mobile devices can connect to the chat server.
              Open this URL on your mobile device:
            </p>
            
            <div className="p-3 bg-gray-700 rounded-lg font-mono text-sm break-all text-gray-200 border border-gray-600">
              {typeof window !== 'undefined' && window.location.href}
            </div>
          </div>
          
          <ConnectionTest />
          
          <div className="mt-6 p-4 bg-green-900/30 rounded-lg border border-green-500/30">
            <h3 className="font-semibold text-green-200 mb-2">🎯 Success Indicators:</h3>
            <ul className="text-sm text-green-300 space-y-1">
              <li>• All diagnostic tests show ✅</li>
              <li>• QR codes display network IP (not localhost)</li>
              <li>• Mobile devices can scan and join chat rooms</li>
              <li>• Messages sync instantly between devices</li>
            </ul>
          </div>
          
          <div className="mt-6 text-center">
            <Link 
              href="/chat/mobile-test"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-lg"
            >
              🧪 Test Chat Room
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
