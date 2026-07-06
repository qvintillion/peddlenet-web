'use client';

import { useState, useEffect } from 'react';

interface MeshConnection {
  peerId: string;
  displayName: string;
  socketId: string;
  roomId: string;
  p2pPeers: string[];
  connectionQuality: 'excellent' | 'good' | 'poor' | 'none';
  lastSeen: number;
  isP2PActive: boolean;
}

interface MeshMetrics {
  totalP2PAttempts: number;
  successfulP2PConnections: number;
  failedP2PConnections: number;
  activeP2PConnections: number;
  averageConnectionTime: number;
  meshUpgradeRate: number;
  p2pMessageCount: number;
  fallbackCount: number;
}

interface MeshNetworkStatusProps {
  isLoading?: boolean;
  // Session credentials from the admin login — never hardcode credentials here
  // (the old literals were published in the public repo). Null until logged in.
  credentials: { username: string; password: string } | null;
}

export function MeshNetworkStatus({ isLoading = false, credentials }: MeshNetworkStatusProps) {
  const [meshData, setMeshData] = useState<{
    metrics: MeshMetrics;
    connections: MeshConnection[];
    topology: { [roomId: string]: MeshConnection[] };
  } | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Client-side only environment detection
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Use Next.js API route which proxies to the correct WebSocket server
  const getApiUrl = () => {
    if (!isClient) return '';
    
    // For ALL environments, use the Next.js API route
    // This route automatically detects environment and proxies to correct WebSocket server
    return '/api/admin/mesh-status';
  };

  useEffect(() => {
    if (!isClient) return;

    const fetchMeshData = async () => {
      try {
        setError(null);

        // No session credentials yet (not logged in) — nothing to fetch with.
        if (!credentials) return;

        const apiUrl = getApiUrl();
        console.log('🌐 [MeshStatus] Fetching from:', apiUrl);
        console.log('🌐 [MeshStatus] Current hostname:', window.location.hostname);
        console.log('🌐 [MeshStatus] Environment detection:', {
          hostname: window.location.hostname,
          isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
          isFirebaseStaging: window.location.hostname.includes('.web.app'),
          isVercelProduction: window.location.hostname.includes('.vercel.app'),
          apiUrl
        });
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('🌐 [MeshStatus] Response:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🌐 [MeshStatus] Data received:', data);
          
          // Validate data structure before setting state
          if (data && typeof data === 'object') {
            // Ensure metrics exists to prevent destructuring errors
            if (!data.metrics) {
              console.warn('🌐 [MeshStatus] No metrics in response, using defaults');
              data.metrics = {
                totalP2PAttempts: 0,
                successfulP2PConnections: 0,
                failedP2PConnections: 0,
                activeP2PConnections: 0,
                averageConnectionTime: 0,
                meshUpgradeRate: 0,
                p2pMessageCount: 0,
                fallbackCount: 0
              };
            }
            
            // Ensure other required fields exist
            if (!data.connections) data.connections = [];
            if (!data.topology) data.topology = {};
            
            setMeshData(data);
            setLastUpdate(Date.now());
            setError(null);
          } else {
            console.error('🌐 [MeshStatus] Invalid data structure:', data);
            setError('Invalid response format from server');
            setMeshData(null);
          }
        } else if (response.status === 404) {
          // Mesh endpoint not available yet - show graceful message
          console.log('🌐 [MeshStatus] Mesh endpoint not available (404)');
          setError('Mesh networking endpoint not available on server');
          setMeshData(null);
        } else if (response.status === 401) {
          console.log('🌐 [MeshStatus] Authentication error (401)');
          setError('Authentication failed - please check admin credentials');
          setMeshData(null);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('🌐 [MeshStatus] Failed to fetch mesh data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch mesh data');
        setMeshData(null);
      }
    };

    // Initial fetch
    fetchMeshData();

    // Refresh every 5 seconds for real-time monitoring (reduced frequency to avoid spam)
    const interval = setInterval(fetchMeshData, 5000);

    return () => clearInterval(interval);
  }, [isClient, credentials]);

  // Loading state
  if (isLoading || !isClient) {
    return (
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border-2 border-purple-500/30 p-6 mb-6 backdrop-blur-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-purple-400/30 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-purple-300/20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state - still show component but with error message
  if (error) {
    return (
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border-2 border-purple-500/30 p-6 mb-6 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              🌐 Mesh Network Status
              <span className="ml-2 text-sm font-normal text-gray-300">
                (Phase 1 - Initializing...)
              </span>
            </h2>
          </div>
        </div>

        {/* Error Message */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <span className="text-yellow-400 text-xl mr-2">⚠️</span>
            <div>
              <div className="text-yellow-200 font-medium">Mesh Endpoint Issue</div>
              <div className="text-yellow-300 text-sm mt-1">{error}</div>
              <div className="text-yellow-400 text-xs mt-2">
                The mesh networking system is trying to connect. Check the browser console for details.
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/50">
            <div className="text-2xl font-bold text-gray-400">--</div>
            <div className="text-sm text-gray-300">P2P Active Users</div>
            <div className="text-xs text-gray-500">Connecting...</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/50">
            <div className="text-2xl font-bold text-gray-400">--</div>
            <div className="text-sm text-gray-300">Active P2P Links</div>
            <div className="text-xs text-gray-500">Connecting...</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/50">
            <div className="text-2xl font-bold text-gray-400">--</div>
            <div className="text-sm text-gray-300">Upgrade Success</div>
            <div className="text-xs text-gray-500">Connecting...</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/50">
            <div className="text-2xl font-bold text-gray-400">--</div>
            <div className="text-sm text-gray-300">Avg Latency</div>
            <div className="text-xs text-gray-500">Connecting...</div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-200 mb-2">🔍 Debug Info</h3>
          <div className="text-blue-300 text-sm space-y-1">
            <div>• Environment: {typeof window !== 'undefined' ? window.location.hostname : 'unknown'}</div>
            <div>• API URL: {getApiUrl()}</div>
            <div>• Error: {error}</div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 text-xs text-gray-400">
          Phase 1: Hybrid Architecture • Attempting reconnection every 5s
        </div>
      </div>
    );
  }

  // Data is available - show normal mesh status
  const { metrics, connections, topology } = meshData || {
    metrics: {
      totalP2PAttempts: 0,
      successfulP2PConnections: 0,
      failedP2PConnections: 0,
      activeP2PConnections: 0,
      averageConnectionTime: 0,
      meshUpgradeRate: 0,
      p2pMessageCount: 0,
      fallbackCount: 0
    },
    connections: [],
    topology: {}
  };

  // Calculate real-time stats
  const totalActiveUsers = connections.length;
  const p2pActiveUsers = connections.filter(c => c.isP2PActive).length;
  const meshUpgradeRate = metrics.totalP2PAttempts > 0 
    ? Math.round((metrics.successfulP2PConnections / metrics.totalP2PAttempts) * 100)
    : 0;
  const averageLatency = connections.reduce((acc, c) => {
    const latency = c.connectionQuality === 'excellent' ? 25 : 
                   c.connectionQuality === 'good' ? 50 : 
                   c.connectionQuality === 'poor' ? 150 : 200;
    return acc + latency;
  }, 0) / Math.max(connections.length, 1);

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'good': return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      case 'poor': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getConnectionIcon = (isP2PActive: boolean) => {
    return isP2PActive ? '🌐' : '📡';
  };

  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border-2 border-purple-500/30 p-6 mb-6 backdrop-blur-sm shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            🌐 Mesh Network Status
            <span className="ml-2 text-sm font-normal text-gray-300">
              (Phase 1 - Hybrid Architecture)
            </span>
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            Last Updated: {new Date(lastUpdate).toLocaleTimeString()}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-purple-200 text-sm font-medium transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/30">
          <div className="text-2xl font-bold text-purple-400">{p2pActiveUsers}</div>
          <div className="text-sm text-gray-300">P2P Active Users</div>
          <div className="text-xs text-gray-500">
            {totalActiveUsers > 0 ? Math.round((p2pActiveUsers / totalActiveUsers) * 100) : 0}% of total
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/30">
          <div className="text-2xl font-bold text-blue-400">{metrics.activeP2PConnections}</div>
          <div className="text-sm text-gray-300">Active P2P Links</div>
          <div className="text-xs text-gray-500">
            {metrics.totalP2PAttempts} total attempts
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{meshUpgradeRate}%</div>
          <div className="text-sm text-gray-300">Upgrade Success</div>
          <div className="text-xs text-gray-500">
            {metrics.successfulP2PConnections}/{metrics.totalP2PAttempts} successful
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-orange-500/30">
          <div className="text-2xl font-bold text-orange-400">{Math.round(averageLatency)}ms</div>
          <div className="text-sm text-gray-300">Avg Latency</div>
          <div className="text-xs text-gray-500">
            P2P: ~25ms, WS: ~150ms
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/50 mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Performance Indicators</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-purple-400">{metrics.p2pMessageCount}</div>
            <div className="text-sm text-gray-300">P2P Messages</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">{metrics.fallbackCount}</div>
            <div className="text-sm text-gray-300">WebSocket Fallbacks</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">
              {metrics.p2pMessageCount + metrics.fallbackCount > 0 
                ? Math.round((metrics.p2pMessageCount / (metrics.p2pMessageCount + metrics.fallbackCount)) * 100)
                : 0}%
            </div>
            <div className="text-sm text-gray-300">P2P Efficiency</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-400">{metrics.averageConnectionTime}ms</div>
            <div className="text-sm text-gray-300">Avg Connect Time</div>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {isExpanded && (
        <>
          {/* Room Topology */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/50 mb-4">
            <h3 className="text-lg font-semibold text-white mb-3">Room Mesh Topology</h3>
            {Object.keys(topology).length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">🏠</div>
                <div>No active rooms with mesh connections</div>
                <div className="text-sm mt-1">Mesh activates automatically for small groups (≤5 users)</div>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(topology).map(([roomId, roomConnections]) => {
                  const p2pCount = roomConnections.filter(c => c.isP2PActive).length;
                  const roomCode = roomId.substring(0, 8);
                  
                  return (
                    <div key={roomId} className="border border-gray-600/50 rounded-lg p-3 bg-gray-900/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-white">
                          Room: {roomCode}... 
                          <span className="ml-2 text-sm text-gray-300">
                            ({roomConnections.length} users, {p2pCount} P2P active)
                          </span>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium border ${
                          p2pCount > 0 ? 'bg-green-500/20 text-green-300 border-green-500/50' : 'bg-gray-500/20 text-gray-300 border-gray-500/50'
                        }`}>
                          {p2pCount > 0 ? `🌐 Mesh Active` : '📡 WebSocket Only'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {roomConnections.map((connection) => (
                          <div key={connection.socketId} className="flex items-center space-x-2 text-sm">
                            <span className="text-lg">{getConnectionIcon(connection.isP2PActive)}</span>
                            <span className="font-medium text-gray-200">{connection.displayName}</span>
                            <span className={`px-2 py-1 rounded text-xs border ${getQualityColor(connection.connectionQuality)}`}>
                              {connection.connectionQuality}
                            </span>
                            {connection.p2pPeers.length > 0 && (
                              <span className="text-xs text-purple-400">
                                ↔ {connection.p2pPeers.length} peers
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detailed Connection List */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/50">
            <h3 className="text-lg font-semibold text-white mb-3">Connection Details</h3>
            {connections.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">👥</div>
                <div>No active connections</div>
                <div className="text-sm mt-1">Users will appear here when they join rooms</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left py-2 text-gray-300">User</th>
                      <th className="text-left py-2 text-gray-300">Connection</th>
                      <th className="text-left py-2 text-gray-300">Quality</th>
                      <th className="text-left py-2 text-gray-300">P2P Peers</th>
                      <th className="text-left py-2 text-gray-300">Room</th>
                      <th className="text-left py-2 text-gray-300">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connections.map((connection) => (
                      <tr key={connection.socketId} className="border-b border-gray-700/50">
                        <td className="py-2 font-medium text-gray-200">{connection.displayName}</td>
                        <td className="py-2">
                          <span className="flex items-center space-x-1">
                            <span className="text-lg">{getConnectionIcon(connection.isP2PActive)}</span>
                            <span className="text-gray-300">{connection.isP2PActive ? 'P2P Mesh' : 'WebSocket'}</span>
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs border ${getQualityColor(connection.connectionQuality)}`}>
                            {connection.connectionQuality}
                          </span>
                        </td>
                        <td className="py-2">
                          {connection.p2pPeers.length > 0 ? (
                            <span className="text-purple-400 font-medium">{connection.p2pPeers.length}</span>
                          ) : (
                            <span className="text-gray-500">0</span>
                          )}
                        </td>
                        <td className="py-2 font-mono text-xs text-gray-400">
                          {connection.roomId.substring(0, 8)}...
                        </td>
                        <td className="py-2 text-xs text-gray-500">
                          {Math.round((Date.now() - connection.lastSeen) / 1000)}s ago
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Status Indicators */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>🌐 = P2P Mesh Connection</span>
          <span>📡 = WebSocket Connection</span>
          <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded">excellent</span>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded">good</span>
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded">poor</span>
        </div>
        <div>
          Phase 1: Hybrid Architecture • Auto-refresh every 5s
        </div>
      </div>
    </div>
  );
}