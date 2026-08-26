'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export default function NetworkComparisonPage() {
  const router = useRouter();
  const [environment, setEnvironment] = useState<any>({});
  const [networkTests, setNetworkTests] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Gather comprehensive environment info
    const gatherEnvironment = async () => {
      const env = {
        // Basic info
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        
        // URL info
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port,
        pathname: window.location.pathname,
        
        // Browser detection
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isChrome: /Chrome/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        isFirefox: /Firefox/.test(navigator.userAgent),
        
        // Network connection info
        connection: (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection,
        
        // WebRTC support
        webrtc: {
          RTCPeerConnection: !!window.RTCPeerConnection,
          webkitRTCPeerConnection: !!window.webkitRTCPeerConnection,
          mozRTCPeerConnection: !!(window as any).mozRTCPeerConnection,
          getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
          webkitGetUserMedia: !!(navigator as any).webkitGetUserMedia,
          mozGetUserMedia: !!(navigator as any).mozGetUserMedia
        },
        
        // Security context
        isSecureContext: window.isSecureContext,
        
        // Screen info
        screen: {
          width: screen.width,
          height: screen.height,
          availWidth: screen.availWidth,
          availHeight: screen.availHeight,
          pixelRatio: window.devicePixelRatio
        },
        
        // Viewport info
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight
        }
      };

      setEnvironment(env);
    };

    gatherEnvironment();
  }, []);

  const runComprehensiveNetworkTests = async () => {
    setIsRunning(true);
    const tests: any = {};

    // Test 1: Basic connectivity
    try {
      const start = Date.now();
      const response = await fetch('https://httpbin.org/get');
      tests.basicHTTPS = {
        success: response.ok,
        duration: Date.now() - start,
        status: response.status
      };
    } catch (error: any) {
      tests.basicHTTPS = { success: false, error: error.message };
    }

    // Test 2: WebSocket connectivity
    try {
      const wsStart = Date.now();
      const ws = new WebSocket('wss://echo.websocket.org');
      tests.websocket = await new Promise<any>((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ success: false, error: 'timeout', duration: Date.now() - wsStart });
        }, 10000);

        ws.onopen = () => {
          clearTimeout(timeout);
          const duration = Date.now() - wsStart;
          ws.send('test');
          
          ws.onmessage = (event) => {
            ws.close();
            resolve({ 
              success: true, 
              duration, 
              echo: event.data === 'test',
              message: 'WebSocket echo successful'
            });
          };
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          resolve({ success: false, error: 'connection_failed', duration: Date.now() - wsStart });
        };
      });
    } catch (error: any) {
      tests.websocket = { success: false, error: error.message };
    }

    // Test 3: Multiple PeerJS servers
    const peerServers = [
      { name: 'Default Cloud', url: 'https://0.peerjs.com/peerjs/id' },
      { name: 'Alt Server 1', url: 'https://peerjs-server.herokuapp.com/peerjs/id' },
      { name: 'Alt Server 2', url: 'https://peer-js-server.herokuapp.com/id' }
    ];

    tests.peerServers = {};
    for (const server of peerServers) {
      try {
        const start = Date.now();
        const response = await fetch(server.url, {
          method: 'GET',
          mode: 'cors',
          headers: { 'Accept': 'text/plain' }
        });
        
        tests.peerServers[server.name] = {
          success: response.ok,
          status: response.status,
          duration: Date.now() - start,
          id: response.ok ? await response.text() : null
        };
      } catch (error: any) {
        tests.peerServers[server.name] = {
          success: false,
          error: error.message
        };
      }
    }

    // Test 4: WebRTC STUN server
    if (window.RTCPeerConnection) {
      try {
        const stunStart = Date.now();
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        const stunTest = await new Promise<any>((resolve) => {
          const timeout = setTimeout(() => {
            pc.close();
            resolve({ success: false, error: 'timeout', duration: Date.now() - stunStart });
          }, 10000);

          pc.onicecandidate = (event) => {
            if (event.candidate && event.candidate.candidate.includes('stun')) {
              clearTimeout(timeout);
              pc.close();
              resolve({ 
                success: true, 
                duration: Date.now() - stunStart,
                candidate: event.candidate.candidate,
                message: 'STUN server reachable'
              });
            }
          };

          // Create offer to trigger ICE gathering
          pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
          });
        });

        tests.stun = stunTest;
      } catch (error: any) {
        tests.stun = { success: false, error: error.message };
      }
    } else {
      tests.stun = { success: false, error: 'RTCPeerConnection not available' };
    }

    setNetworkTests(tests);
    setIsRunning(false);
  };

  const exportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      device: environment.isMobile ? 'Mobile' : 'Desktop',
      environment,
      networkTests
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-analysis-${environment.isMobile ? 'mobile' : 'desktop'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">🔬 Network Environment Analysis</h1>
          <button
            onClick={() => router.push('/app')}
            className="text-purple-400 hover:text-purple-300"
          >
            ← Back to Home
          </button>
        </div>

        {/* Environment Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📱 Device & Browser</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Device Type:</strong> {environment.isMobile ? '📱 Mobile' : '🖥️ Desktop'}</div>
              <div><strong>Platform:</strong> {environment.platform}</div>
              <div><strong>Browser:</strong> {
                environment.isChrome ? 'Chrome' :
                environment.isSafari ? 'Safari' :
                environment.isFirefox ? 'Firefox' : 'Other'
              }</div>
              <div><strong>Protocol:</strong> {environment.protocol} {environment.isSecureContext ? '🔒' : '⚠️'}</div>
              <div><strong>Host:</strong> {environment.hostname}:{environment.port || '80/443'}</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🌐 WebRTC Support</h2>
            <div className="space-y-2 text-sm">
              <div><strong>RTCPeerConnection:</strong> {environment.webrtc?.RTCPeerConnection ? '✅' : '❌'}</div>
              <div><strong>Webkit RTC:</strong> {environment.webrtc?.webkitRTCPeerConnection ? '✅' : '❌'}</div>
              <div><strong>getUserMedia:</strong> {environment.webrtc?.getUserMedia ? '✅' : '❌'}</div>
              <div><strong>Secure Context:</strong> {environment.isSecureContext ? '✅' : '❌'}</div>
              {environment.connection && (
                <div><strong>Connection:</strong> {environment.connection.effectiveType || 'unknown'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Network Tests */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🔗 Comprehensive Network Tests</h2>
            <div className="space-x-2">
              <button
                onClick={runComprehensiveNetworkTests}
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded"
              >
                {isRunning ? 'Running...' : 'Run All Tests'}
              </button>
              {Object.keys(networkTests).length > 0 && (
                <button
                  onClick={exportData}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                >
                  Export Data
                </button>
              )}
            </div>
          </div>

          {isRunning && (
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Running comprehensive network analysis...</span>
            </div>
          )}

          {Object.keys(networkTests).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Basic Tests */}
              <div className="space-y-3">
                <h3 className="font-semibold">Basic Connectivity</h3>
                
                <div className={`p-3 rounded text-sm ${networkTests.basicHTTPS?.success ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'}`}>
                  <strong>HTTPS Test:</strong> {networkTests.basicHTTPS?.success ? '✅' : '❌'}
                  {networkTests.basicHTTPS?.duration && ` (${networkTests.basicHTTPS.duration}ms)`}
                  {networkTests.basicHTTPS?.error && ` - ${networkTests.basicHTTPS.error}`}
                </div>

                <div className={`p-3 rounded text-sm ${networkTests.websocket?.success ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'}`}>
                  <strong>WebSocket:</strong> {networkTests.websocket?.success ? '✅' : '❌'}
                  {networkTests.websocket?.duration && ` (${networkTests.websocket.duration}ms)`}
                  {networkTests.websocket?.error && ` - ${networkTests.websocket.error}`}
                </div>

                <div className={`p-3 rounded text-sm ${networkTests.stun?.success ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'}`}>
                  <strong>STUN Server:</strong> {networkTests.stun?.success ? '✅' : '❌'}
                  {networkTests.stun?.duration && ` (${networkTests.stun.duration}ms)`}
                  {networkTests.stun?.error && ` - ${networkTests.stun.error}`}
                </div>
              </div>

              {/* PeerJS Servers */}
              <div className="space-y-3">
                <h3 className="font-semibold">PeerJS Servers</h3>
                {networkTests.peerServers && Object.entries(networkTests.peerServers).map(([name, result]: [string, any]) => (
                  <div key={name} className={`p-3 rounded text-sm ${result.success ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'}`}>
                    <strong>{name}:</strong> {result.success ? '✅' : '❌'}
                    {result.duration && ` (${result.duration}ms)`}
                    {result.id && <div className="text-xs mt-1 font-mono">ID: {result.id.substring(0, 20)}...</div>}
                    {result.error && ` - ${result.error}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📋 Instructions</h2>
          <div className="space-y-2 text-sm">
            <p><strong>1. Run tests on BOTH devices</strong> (desktop and mobile)</p>
            <p><strong>2. Export data from each device</strong> using the "Export Data" button</p>
            <p><strong>3. Compare results</strong> to identify differences</p>
            <p><strong>4. Look for patterns:</strong></p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Which tests pass on mobile but fail on desktop?</li>
              <li>Are there timing differences (duration)?</li>
              <li>Do different PeerJS servers work on different devices?</li>
            </ul>
          </div>
        </div>

        {/* User Agent */}
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">🔍 Full User Agent</h2>
          <div className="text-xs font-mono break-all bg-gray-700 p-3 rounded">
            {environment.userAgent}
          </div>
        </div>
      </div>
    </div>
  );
}
