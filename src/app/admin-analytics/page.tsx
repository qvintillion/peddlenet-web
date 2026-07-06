'use client';

import { useState, useEffect } from 'react';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { AdminControls } from '@/components/admin/AdminControls';
import { DetailedUserView } from '@/components/admin/DetailedUserView';
import { DetailedRoomView } from '@/components/admin/DetailedRoomView';
import { MeshNetworkStatus } from '@/components/admin/MeshNetworkStatus';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

interface RealTimeStats {
  activeUsers: number;
  totalUsers: number;
  activeRooms: number;
  totalRooms: number;
  peakUsers: number;
  peakRooms: number;
  messagesPerMinute: number;
  totalMessages: number;
  storageUsed: number;
  userTrend: string;
  roomTrend: string;
  environment: string;
}

interface ServerHealth {
  status: string;
  uptime: string;
  memoryUsed: number;
  memoryTotal: number;
  cpuUsage: string;
  coldStarts: number;
}

interface NetworkStatus {
  quality: number;
  avgLatency: number;
  deliveryRate: number;
}

interface Activity {
  id: number;
  type: string;
  data: any;
  timestamp: number;
  icon: string;
}

interface DashboardData {
  realTimeStats: RealTimeStats;
  serverHealth: ServerHealth;
  networkStatus: NetworkStatus;
  messageFlow: {
    messagesPerMinute: number;
    trend: string;
    history: Array<{ minute: number; count: number }>;
  };
  dbStats: {
    totalMessages: number;
    totalRooms: number;
    totalSessions: number;
    recentActivity: number;
    dbSize: string;
    oldestMessage: number;
  };
  // 🔧 SIMPLIFIED: Basic admin only
  admin?: {
    requestedBy: string;
    adminLevel: 'basic';
    availableFeatures: string[];
  };
  timestamp: number;
  databaseReady: boolean;
}

// 🔧 HYDRATION FIX: Static default data structure without Date.now()
const defaultDashboardData: DashboardData = {
  timestamp: 0, // Will be set client-side only
  realTimeStats: {
    activeUsers: 0,
    totalUsers: 0,
    activeRooms: 0,
    totalRooms: 0,
    peakUsers: 0,
    peakRooms: 0,
    messagesPerMinute: 0,
    totalMessages: 0,
    storageUsed: 0,
    userTrend: '',
    roomTrend: '',
    environment: 'development'
  },
  serverHealth: {
    status: 'healthy',
    uptime: '0m 0s',
    memoryUsed: 0,
    memoryTotal: 0,
    cpuUsage: '0%',
    coldStarts: 0
  },
  networkStatus: {
    quality: 100,
    avgLatency: 0,
    deliveryRate: 100
  },
  messageFlow: {
    messagesPerMinute: 0,
    trend: '',
    history: []
  },
  dbStats: {
    totalMessages: 0,
    totalRooms: 0,
    totalSessions: 0,
    recentActivity: 0,
    dbSize: '0 KB',
    oldestMessage: 0 // Will be set client-side only
  },
  databaseReady: false
};

// Session storage keys
const ADMIN_SESSION_KEY = 'peddlenet_admin_session';
const ADMIN_ACTIVITY_KEY = 'peddlenet_admin_activity';

// Session interface
interface AdminSession {
  username: string;
  password: string;
  loginTime: number;
  expiresAt: number;
}

// Clickable metric card component
interface MetricCardProps {
  title: string;
  value: string;
  subvalue?: string;
  icon: string;
  color: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple';
  onClick?: () => void;
  isClickable?: boolean;
}

function MetricCard({ title, value, subvalue, icon, color, onClick, isClickable }: MetricCardProps) {
  const colorClasses = {
    green: 'border-green-500/50 bg-green-500/10 shadow-green-500/20',
    yellow: 'border-yellow-500/50 bg-yellow-500/10 shadow-yellow-500/20',
    red: 'border-red-500/50 bg-red-500/10 shadow-red-500/20',
    gray: 'border-gray-500/50 bg-gray-500/10 shadow-gray-500/20',
    blue: 'border-blue-500/50 bg-blue-500/10 shadow-blue-500/20',
    purple: 'border-purple-500/50 bg-purple-500/10 shadow-purple-500/20'
  };

  const gradientClasses = {
    green: 'from-green-500/20 to-green-600/10',
    yellow: 'from-yellow-500/20 to-yellow-600/10',
    red: 'from-red-500/20 to-red-600/10',
    gray: 'from-gray-500/20 to-gray-600/10',
    blue: 'from-blue-500/20 to-blue-600/10',
    purple: 'from-purple-500/20 to-purple-600/10'
  };

  const pillColors = {
    green: {
      active: 'bg-green-500/30 text-green-100 border-green-400/50',
      total: 'bg-green-500/10 text-green-300 border-green-500/30'
    },
    yellow: {
      active: 'bg-yellow-500/30 text-yellow-100 border-yellow-400/50',
      total: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
    },
    red: {
      active: 'bg-red-500/30 text-red-100 border-red-400/50',
      total: 'bg-red-500/10 text-red-300 border-red-500/30'
    },
    gray: {
      active: 'bg-gray-500/30 text-gray-100 border-gray-400/50',
      total: 'bg-gray-500/10 text-gray-300 border-gray-500/30'
    },
    blue: {
      active: 'bg-blue-500/30 text-blue-100 border-blue-400/50',
      total: 'bg-blue-500/10 text-blue-300 border-blue-500/30'
    },
    purple: {
      active: 'bg-purple-500/30 text-purple-100 border-purple-400/50',
      total: 'bg-purple-500/10 text-purple-300 border-purple-500/30'
    }
  };

  // Parse the value if it contains active/total format
  const parseActiveTotal = (value: string) => {
    const match = value.match(/^(\d+)\/(\d+)$/);
    if (match) {
      return {
        active: parseInt(match[1]),
        total: parseInt(match[2]),
        isActiveTotal: true
      };
    }
    return {
      value,
      isActiveTotal: false
    };
  };

  const parsedValue = parseActiveTotal(value);

  return (
    <div 
      className={`bg-gradient-to-br ${gradientClasses[color]} backdrop-blur-sm border ${colorClasses[color]} rounded-xl p-6 shadow-lg ${
        isClickable ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-opacity-80' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-3">
            <div className="text-2xl mr-2">{icon}</div>
            <p className="text-gray-300 text-sm font-medium">{title}</p>
          </div>
          
          {parsedValue.isActiveTotal ? (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`px-3 py-1 rounded-full border text-sm font-bold ${pillColors[color].active}`}>
                  {parsedValue.active} Active
                </div>
                <div className={`px-3 py-1 rounded-full border text-sm ${pillColors[color].total}`}>
                  {parsedValue.total} Total
                </div>
              </div>
              
              {/* Percentage indicator */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-700/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      color === 'green' ? 'bg-green-400' :
                      color === 'yellow' ? 'bg-yellow-400' :
                      color === 'blue' ? 'bg-blue-400' :
                      color === 'purple' ? 'bg-purple-400' :
                      color === 'red' ? 'bg-red-400' : 'bg-gray-400'
                    }`}
                    style={{ width: `${parsedValue.total > 0 ? (parsedValue.active / parsedValue.total * 100) : 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-400 min-w-[3rem]" title="Percentage of total that are currently active">
                  {parsedValue.total > 0 ? Math.round((parsedValue.active / parsedValue.total) * 100) : 0}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-3xl font-bold text-white mb-3 leading-tight">{value}</p>
          )}
          
          {subvalue && (
            <p className="text-gray-400 text-xs leading-relaxed">{subvalue}</p>
          )}
        </div>
      </div>
      {isClickable && (
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center text-xs text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">
            <span className="mr-1">✨</span>
            <span>Click for details</span>
          </div>
        </div>
      )}
    </div>
  );
}

// 🔧 ENHANCED: Login Form Component with dual admin levels
function LoginForm({ onLogin, error, isLoading }: {
  onLogin: (username: string, password: string) => Promise<void>;
  error: string;
  isLoading: boolean;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});

  // 🔧 HYDRATION FIX: Only run client-side
  useEffect(() => {
    setIsClient(true);
    
    // 🔧 DEBUG: Collect comprehensive environment info
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const port = window.location.port;
      const origin = window.location.origin;
      const href = window.location.href;
      
      const debugData = {
        hostname,
        protocol,
        port,
        origin,
        href,
        isLocal: hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.'),
        userAgent: navigator.userAgent,
        windowEnv: (window as any).__NEXT_DATA__?.env || {},
        processEnv: {
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PUBLIC_SIGNALING_SERVER: process.env.NEXT_PUBLIC_SIGNALING_SERVER,
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('🔧 DEBUG Environment Info:', debugData);
      setDebugInfo(debugData);
    }
  }, []);

  // 🔧 HYDRATION FIX: Client-side only environment detection
  const isProduction = () => {
    if (!isClient) return false;
    
    const hostname = window.location.hostname;
    return hostname.includes('peddlenet.app') || hostname.includes('.vercel.app');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 LOGIN ATTEMPT:', { username, timestamp: new Date().toISOString() });
    await onLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 text-white flex items-center justify-center p-4">
      <div className="bg-gray-800/80 rounded-lg p-8 backdrop-blur-sm border border-gray-700/50 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎵</div>
          <h1 className="text-3xl font-bold mb-2">PeddleNet Admin</h1>
          <p className="text-gray-300">Festival Chat Administration</p>
          
          {/* 🔧 DEBUG: Show environment info */}
          {isClient && (
            <div className="mt-4 text-xs text-gray-500 bg-gray-900/50 p-2 rounded border">
              <div>ENV: {debugInfo.hostname} | {debugInfo.isLocal ? 'LOCAL' : 'REMOTE'}</div>
              <div>WS: {process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'undefined'}</div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* 🔧 SIMPLIFIED: Show single admin level */}
        {isClient && !isProduction() && (
          <div className="mt-6 text-center text-sm text-gray-400">
            <div className="bg-gray-900/50 p-3 rounded border">
              <p className="font-medium text-gray-300 mb-2">Admin Access:</p>
              <p className="text-xs text-gray-500 mt-2">
                Full admin access with all features
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData>(defaultDashboardData);
  const [isConnected, setIsConnected] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showRoomDetails, setShowRoomDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🔧 HYDRATION FIX: Client-side state tracking
  const [isClient, setIsClient] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // 🔧 HYDRATION FIX: Set client-side flag after hydration
  useEffect(() => {
    setIsClient(true);
    
    // 🔧 HYDRATION FIX: Set timestamp only after client-side hydration
    setDashboardData(prev => ({
      ...prev,
      timestamp: Date.now(),
      dbStats: {
        ...prev.dbStats,
        oldestMessage: Date.now()
      }
    }));
  }, []);

  // 🔧 HYDRATION FIX: Client-side only server URL
  const getServerUrl = () => {
    if (!isClient) return '';
    
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
    
    if (isLocal) {
      return `http://${hostname}:3001`;
    } else {
      return `https://${hostname}`;
    }
  };

  const serverUrl = getServerUrl();

  // 🔧 HYDRATION FIX: Safe session management functions
  const saveSession = (username: string, password: string) => {
    if (!isClient) return;
    
    const session: AdminSession = {
      username,
      password,
      loginTime: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    try {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
      console.log('🔒 Admin session saved with 24-hour expiry');
    } catch (error) {
      console.warn('Failed to save admin session:', error);
    }
  };

  const loadSession = (): AdminSession | null => {
    if (!isClient) return null;
    
    try {
      const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionData) return null;

      const session: AdminSession = JSON.parse(sessionData);
      
      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        console.log('🔒 Admin session expired, clearing...');
        localStorage.removeItem(ADMIN_SESSION_KEY);
        return null;
      }

      console.log('🔒 Admin session loaded, expires in:', Math.round((session.expiresAt - Date.now()) / (60 * 60 * 1000)), 'hours');
      return session;
    } catch (error) {
      console.warn('Failed to load admin session:', error);
      if (isClient) {
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
      return null;
    }
  };

  const clearSession = () => {
    if (!isClient) return;
    
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_ACTIVITY_KEY);
      console.log('🔒 Admin session cleared');
    } catch (error) {
      console.warn('Failed to clear admin session:', error);
    }
  };

  const saveActivities = (activities: Activity[]) => {
    if (!isClient) return;
    
    try {
      // Keep last 100 activities
      const activitiesToSave = activities.slice(0, 100);
      localStorage.setItem(ADMIN_ACTIVITY_KEY, JSON.stringify({
        activities: activitiesToSave,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save activities:', error);
    }
  };

  const loadActivities = (): Activity[] => {
    if (!isClient) return [];
    
    try {
      const activityData = localStorage.getItem(ADMIN_ACTIVITY_KEY);
      if (!activityData) return [];

      const parsed = JSON.parse(activityData);
      return parsed.activities || [];
    } catch (error) {
      console.warn('Failed to load activities:', error);
      return [];
    }
  };

  // 🔧 HYDRATION FIX: Load session and activities only after client-side hydration
  useEffect(() => {
    if (!isClient || hasInitialized) return;
    
    const savedSession = loadSession();
    if (savedSession) {
      setCredentials({
        username: savedSession.username,
        password: savedSession.password
      });
      console.log('🔒 Restored admin session for:', savedSession.username);
    }

    const savedActivities = loadActivities();
    if (savedActivities.length > 0) {
      setActivities(savedActivities);
      console.log('📊 Restored', savedActivities.length, 'activities from localStorage');
    }
    
    setHasInitialized(true);
  }, [isClient, hasInitialized]);

  // Save activities when they change
  useEffect(() => {
    if (activities.length > 0 && isClient) {
      saveActivities(activities);
    }
  }, [activities, isClient]);

  // 🔧 ENHANCED DEBUG: Comprehensive API call function with detailed logging
  const makeAPICall = async (endpoint: string, options: RequestInit = {}) => {
    console.log('\n🔧 [DEBUG] === API CALL START ===');
    console.log('[DEBUG] Endpoint:', endpoint);
    console.log('[DEBUG] Options:', options);
    console.log('[DEBUG] Credentials available:', !!credentials);
    console.log('[DEBUG] Is client:', isClient);

    if (!credentials || !isClient) {
      const errorMsg = 'Not authenticated or not client-side';
      console.error('[DEBUG] Error:', errorMsg);
      throw new Error(errorMsg);
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
      ...options.headers
    };

    console.log('[DEBUG] Headers:', headers);

    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('10.');
    
    // 🔧 ENHANCED DEBUG: More comprehensive environment detection
    const wsServer = (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SIGNALING_SERVER) 
      || process.env.NEXT_PUBLIC_SIGNALING_SERVER
      || 'wss://peddlenet-websocket-server-staging-hfttiarlja-uc.a.run.app'; // fallback
    
    console.log('[DEBUG] Environment detection:', {
      hostname,
      isLocal,
      wsServer,
      processEnv: process.env.NEXT_PUBLIC_SIGNALING_SERVER,
      windowEnv: typeof window !== 'undefined' ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SIGNALING_SERVER : 'unavailable',
      nodeEnv: process.env.NODE_ENV,
      userAgent: navigator.userAgent,
      origin: window.location.origin,
      href: window.location.href
    });
    
    // For staging/production, always use the WebSocket server directly
    if (!isLocal && wsServer) {
      // Convert WSS to HTTPS for API calls
      const apiServerUrl = wsServer.replace('wss://', 'https://');
      const fullUrl = `${apiServerUrl}/admin${endpoint}`;
      console.log('[DEBUG] Using WebSocket server for admin API:', fullUrl);
      
      try {
        console.log('[DEBUG] Making fetch request...');
        const response = await fetch(fullUrl, {
          ...options,
          headers
        });
        
        console.log('[DEBUG] Response status:', response.status);
        console.log('[DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));
        console.log('[DEBUG] Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[DEBUG] Response error text:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        console.log('[DEBUG] === API CALL SUCCESS ===\n');
        return response;
      } catch (error) {
        console.error('[DEBUG] WebSocket server API call failed:', error);
        console.error('[DEBUG] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        throw error;
      }
    }
    
    // For local development, try both approaches
    if (isLocal) {
      console.log('[DEBUG] Local development detected, trying multiple endpoints...');
      
      try {
        const localUrl = `${serverUrl}/admin${endpoint}`;
        console.log('[DEBUG] Trying local WebSocket server:', localUrl);
        const response = await fetch(localUrl, {
          ...options,
          headers
        });
        
        console.log('[DEBUG] Local WS response status:', response.status);
        console.log('[DEBUG] Local WS response ok:', response.ok);
        
        if (response.ok) {
          console.log('[DEBUG] Local WebSocket server success!');
          console.log('[DEBUG] === API CALL SUCCESS ===\n');
          return response;
        }
        
        console.log('[DEBUG] Local WebSocket server failed, trying API routes...');
      } catch (error) {
        console.log('[DEBUG] Local WebSocket server unavailable:', error.message);
        console.log('[DEBUG] Trying API routes...');
      }
      
      // Try API routes as fallback for local
      const apiUrl = `/api/admin${endpoint}`;
      console.log('[DEBUG] Trying API routes:', apiUrl);
      
      try {
        const response = await fetch(apiUrl, {
          ...options,
          headers
        });
        
        console.log('[DEBUG] API routes response status:', response.status);
        console.log('[DEBUG] API routes response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[DEBUG] API routes error text:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        console.log('[DEBUG] API routes success!');
        console.log('[DEBUG] === API CALL SUCCESS ===\n');
        return response;
      } catch (error) {
        console.error('[DEBUG] API routes failed:', error);
        throw error;
      }
    }
    
    const finalError = 'Unable to connect to admin API - no available endpoints';
    console.error('[DEBUG] Final error:', finalError);
    console.log('[DEBUG] === API CALL FAILED ===\n');
    throw new Error(finalError);
  };

  // 🔧 FIXED: Functions for detailed modals  
  const fetchDetailedUsers = async () => {
    try {
      const response = await makeAPICall('/users/detailed');
      const data = await response.json();
      console.log('👥 Fetched detailed users:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch detailed users:', error);
      throw error;
    }
  };

  const fetchDetailedRooms = async () => {
    try {
      const response = await makeAPICall('/rooms/detailed');
      const data = await response.json();
      console.log('🏠 Fetched detailed rooms:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch detailed rooms:', error);
      throw error;
    }
  };

  const removeUser = async (peerId: string, roomId: string, reason?: string) => {
    try {
      const response = await makeAPICall('/users/remove', {
        method: 'POST',
        body: JSON.stringify({ peerId, roomId, reason: reason || 'Removed by admin' })
      });
      const result = await response.json();
      console.log('🗑️ User removal result:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to remove user:', error);
      throw error;
    }
  };

  const deleteRoom = async (roomId: string, roomCode: string) => {
    try {
      const response = await makeAPICall('/room/delete', {
        method: 'POST',
        body: JSON.stringify({ roomId, roomCode })
      });
      const result = await response.json();
      console.log('🗑️ Room deletion result:', result);
      
      // Refresh dashboard data immediately
      await Promise.all([
        fetchDashboardData(),
        fetchActivityData()
      ]);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to delete room:', error);
      throw error;
    }
  };

  // 🔧 CRITICAL FIX: Authentication with direct API call (not using state)
  const handleLogin = async (username: string, password: string) => {
    console.log('\n🔐 [LOGIN DEBUG] === LOGIN ATTEMPT START ===');
    console.log('[LOGIN DEBUG] Username:', username);
    console.log('[LOGIN DEBUG] Password length:', password.length);
    console.log('[LOGIN DEBUG] Timestamp:', new Date().toISOString());
    console.log('[LOGIN DEBUG] isClient:', isClient);
    
    setIsLoading(true);
    setLoginError('');

    try {
      // 🔧 CRITICAL FIX: Make direct API call with explicit credentials instead of relying on state
      const makeDirectAPICall = async (endpoint: string, options: RequestInit = {}) => {
        console.log('\n🔧 [DIRECT API DEBUG] === API CALL START ===');
        console.log('[DIRECT API DEBUG] Endpoint:', endpoint);
        console.log('[DIRECT API DEBUG] Username:', username);
        console.log('[DIRECT API DEBUG] isClient:', isClient);

        if (!isClient) {
          const errorMsg = 'Not client-side';
          console.error('[DIRECT API DEBUG] Error:', errorMsg);
          throw new Error(errorMsg);
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          ...options.headers
        };

        console.log('[DIRECT API DEBUG] Auth header:', headers.Authorization);

        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('10.');
        
        const wsServer = (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SIGNALING_SERVER) 
          || process.env.NEXT_PUBLIC_SIGNALING_SERVER
          || 'wss://peddlenet-websocket-server-staging-hfttiarlja-uc.a.run.app';
        
        console.log('[DIRECT API DEBUG] Environment:', {
          hostname,
          isLocal,
          wsServer,
          processEnv: process.env.NEXT_PUBLIC_SIGNALING_SERVER
        });
        
        // For staging/production, always use the WebSocket server directly
        if (!isLocal && wsServer) {
          const apiServerUrl = wsServer.replace('wss://', 'https://');
          const fullUrl = `${apiServerUrl}/admin${endpoint}`;
          console.log('[DIRECT API DEBUG] Using WebSocket server:', fullUrl);
          
          try {
            const response = await fetch(fullUrl, {
              ...options,
              headers
            });
            
            console.log('[DIRECT API DEBUG] Response status:', response.status);
            console.log('[DIRECT API DEBUG] Response ok:', response.ok);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('[DIRECT API DEBUG] Response error:', errorText);
              throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            console.log('[DIRECT API DEBUG] === API CALL SUCCESS ===\n');
            return response;
          } catch (error) {
            console.error('[DIRECT API DEBUG] WebSocket server API call failed:', error);
            throw error;
          }
        }
        
        // For local development, try API routes
        if (isLocal) {
          const apiUrl = `/api/admin${endpoint}`;
          console.log('[DIRECT API DEBUG] Trying API routes:', apiUrl);
          
          try {
            const response = await fetch(apiUrl, {
              ...options,
              headers
            });
            
            console.log('[DIRECT API DEBUG] API routes response status:', response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('[DIRECT API DEBUG] API routes error:', errorText);
              throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            console.log('[DIRECT API DEBUG] API routes success!');
            return response;
          } catch (error) {
            console.error('[DIRECT API DEBUG] API routes failed:', error);
            throw error;
          }
        }
        
        throw new Error('Unable to connect to admin API - no available endpoints');
      };
      
      console.log('[LOGIN DEBUG] Making direct API call to /admin/analytics...');
      const response = await makeDirectAPICall('/analytics');
      
      console.log('[LOGIN DEBUG] Authentication response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (response.ok) {
        console.log('[LOGIN DEBUG] Authentication successful!');
        // 🔧 CRITICAL FIX: Set credentials AFTER successful authentication
        setCredentials({ username, password });
        setIsConnected(true);
        saveSession(username, password);
        console.log('[LOGIN DEBUG] Session saved successfully');
        console.log('[LOGIN DEBUG] === LOGIN SUCCESS ===\n');
      } else {
        console.error('[LOGIN DEBUG] Authentication failed - invalid credentials');
        setCredentials(null);
        setLoginError('Invalid credentials. Please try again.');
      }
    } catch (error) {
      console.error('[LOGIN DEBUG] Authentication error:', error);
      console.error('[LOGIN DEBUG] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setCredentials(null);
      setLoginError(`Connection error: ${error.message}. Please check your network and try again.`);
    } finally {
      setIsLoading(false);
      console.log('[LOGIN DEBUG] === LOGIN ATTEMPT END ===\n');
    }
  };

  // Logout function
  const handleLogout = () => {
    setCredentials(null);
    setIsConnected(false);
    setDashboardData(defaultDashboardData);
    setActivities([]);
    clearSession();
    console.log('🔒 Admin logout, session cleared');
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!credentials) return;

    try {
      const response = await makeAPICall('/analytics');
      const data = await response.json();
      setDashboardData(data);
      setIsConnected(true);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data');
      setIsConnected(false);
    }
  };

  // Fetch activity data
  const fetchActivityData = async () => {
    if (!credentials) return;

    try {
      const response = await makeAPICall('/activity');
      const data = await response.json();
      const newActivities = data.activities || [];
      setActivities(newActivities);
    } catch (error) {
      console.error('Failed to fetch activity data:', error);
    }
  };

  // Polling for updates
  useEffect(() => {
    if (credentials && isClient) {
      fetchDashboardData();
      fetchActivityData();
      const interval = setInterval(() => {
        fetchDashboardData();
        fetchActivityData();
      }, 5000); // Every 5 seconds
      return () => clearInterval(interval);
    }
  }, [credentials, isClient]);

  // 🔧 ENHANCED: Admin action handlers with new endpoints
  const handleBroadcast = async (message: string) => {
    if (!credentials) return;

    try {
      const response = await makeAPICall('/broadcast', {
        method: 'POST',
        body: JSON.stringify({ message })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Broadcast sent to ${result.roomsTargeted || 'all'} rooms (${result.messagesSent || 0} messages)!`);
        
        // 🔧 FIXED: Immediate activity refresh to show broadcast
        console.log('🔄 Refreshing activity feed to show broadcast...');
        
        // Refresh activity data immediately
        await fetchActivityData();
        
        console.log('✅ Activity feed refreshed');
      } else {
        throw new Error('Failed to send broadcast');
      }
    } catch (error) {
      console.error('Broadcast failed:', error);
      alert(`❌ Broadcast failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 🔧 NEW: Room-specific broadcast handler
  const handleRoomBroadcast = async (message: string, roomCodes: string[]) => {
    if (!credentials) return;

    try {
      const response = await makeAPICall('/broadcast/room', {
        method: 'POST',
        body: JSON.stringify({ message, roomCodes })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Room broadcast sent to ${result.roomsTargeted}/${result.totalRequested} rooms (${result.messagesSent} messages)!`);
        
        // Show details if some failed
        if (result.failedRooms && result.failedRooms.length > 0) {
          console.log('⚠️ Failed rooms:', result.failedRooms);
        }
        
        // Refresh activity data immediately
        await fetchActivityData();
      } else {
        throw new Error('Failed to send room broadcast');
      }
    } catch (error) {
      console.error('Room broadcast failed:', error);
      alert(`❌ Room broadcast failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearRoom = async (roomCode: string) => {
    if (!credentials) return;

    try {
      const response = await makeAPICall('/room/clear', {
        method: 'POST',
        body: JSON.stringify({ roomCode })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Cleared ${result.messagesCleared || 0} messages from room "${roomCode}"!`);
        
        // 🔧 FIXED: Immediate cache refresh
        console.log('🔄 Forcing immediate data refresh after room clear...');
        
        // Update dashboard data immediately to reflect changes
        await Promise.all([
          fetchDashboardData(),
          fetchActivityData()
        ]);
        
        // Force a re-render by updating timestamp
        setDashboardData(prev => ({
          ...prev,
          timestamp: Date.now()
        }));
        
        console.log('✅ Cache refreshed successfully');
      } else {
        throw new Error('Failed to clear room');
      }
    } catch (error) {
      console.error('Clear room failed:', error);
      alert(`❌ Clear room failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleWipeDatabase = async () => {
    if (!credentials) return;

    try {
      const response = await makeAPICall('/database/wipe', {
        method: 'POST',
        body: JSON.stringify({ confirm: 'WIPE_ALL_DATA' })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Database wiped! Deleted ${result.totalMessagesDeleted || 0} messages from ${result.totalRoomsAffected || 0} rooms!`);
        
        // 🔧 FIXED: Immediate cache clear and refresh
        console.log('🔄 Forcing immediate data reset after database wipe...');
        
        // Immediately clear all cached data
        setActivities([]);
        setDashboardData(defaultDashboardData);
        
        // Clear localStorage cache
        if (isClient) {
          try {
            localStorage.removeItem(ADMIN_ACTIVITY_KEY);
            console.log('🗑️ Cleared cached activities from localStorage');
          } catch (error) {
            console.warn('Failed to clear localStorage:', error);
          }
        }
        
        // Fetch fresh data immediately
        await Promise.all([
          fetchDashboardData(),
          fetchActivityData()
        ]);
        
        // Force dashboard re-render with fresh timestamp
        setDashboardData(prev => ({
          ...prev,
          timestamp: Date.now()
        }));
        
        console.log('✅ All data reset and refreshed successfully');
      } else {
        throw new Error('Failed to wipe database');
      }
    } catch (error) {
      console.error('Database wipe failed:', error);
      alert(`❌ Database wipe failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearActivity = () => {
    setActivities([]);
    if (isClient) {
      try {
        localStorage.removeItem(ADMIN_ACTIVITY_KEY);
        console.log('📊 Activity feed cleared from localStorage');
      } catch (error) {
        console.warn('Failed to clear activities from localStorage:', error);
      }
    }
  };

  // If no credentials, show login form
  if (!credentials) {
    return <LoginForm onLogin={handleLogin} error={loginError} isLoading={isLoading} />;
  }

  // 🔧 HYDRATION FIX: Don't render main dashboard until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Logout and Admin Level */}
        <div className="mb-8">
          {/* Top bar with admin info and logout */}
          <div className="flex justify-between items-center mb-4">
            {/* 🔧 SIMPLIFIED: Single admin level indicator */}
            <div className="flex items-center gap-4">
              {dashboardData.admin && (
                <div className="px-3 py-1 rounded-full text-sm border bg-blue-500/20 text-blue-200 border-blue-500/50">
                  <span className="mr-1">👤</span>
                  Admin
                </div>
              )}
              <span className="text-gray-400 text-sm">
                Welcome, {credentials.username}
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors flex items-center text-sm"
            >
              <span className="mr-2">🚪</span>
              Logout
            </button>
          </div>
          
          {/* Main title */}
          <div className="text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center mb-2 gap-2 sm:gap-3">
              <img 
                src="/peddlenet-logo.svg" 
                alt="PeddleNet Logo" 
                className="w-12 h-9 sm:w-16 sm:h-12"
              />
              <h1 className="text-2xl sm:text-4xl font-bold">PeddleNet Admin</h1>
            </div>
            <p className="text-purple-200 text-sm sm:text-base">
              Enhanced real-time monitoring and administration dashboard
            </p>
          </div>
        </div>

        {/* Connection Status with Network Quality */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm ${
              isConnected ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="hidden sm:inline">
                {isConnected ? 'Connected to server' : 'Disconnected - using cached data'}
              </span>
              <span className="sm:hidden">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* Network Quality Status - Mobile Optimized */}
            <div className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm ${
              dashboardData.networkStatus.quality > 90 ? 'bg-green-500/20 border border-green-500/50' : 
              dashboardData.networkStatus.quality > 70 ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-red-500/20 border border-red-500/50'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                dashboardData.networkStatus.quality > 90 ? 'bg-green-400' : 
                dashboardData.networkStatus.quality > 70 ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
              <span>
                🌐 {dashboardData.networkStatus.quality}%
                <span className="hidden sm:inline"> • {dashboardData.networkStatus.avgLatency}ms</span>
              </span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-400 text-xl mr-2">⚠️</span>
              <div>
                <div className="text-red-200 font-medium">Connection Error</div>
                <div className="text-red-300 text-sm">{error}</div>
                <div className="text-red-400 text-xs mt-1">Using cached data where available</div>
              </div>
            </div>
          </div>
        )}

        {/* 🌐 MESH NETWORK STATUS - Prominent placement above main metrics */}
        <MeshNetworkStatus isLoading={isLoading} credentials={credentials} />

        {/* 🔧 ENHANCED: Interactive Metrics Grid - Beautiful pills for active/total */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Users"
            value={`${dashboardData.realTimeStats.activeUsers}/${dashboardData.realTimeStats.totalUsers}`}
            subvalue={`Active / Total (Peak: ${dashboardData.realTimeStats.peakUsers || 0})`}
            icon="👥"
            color={dashboardData.realTimeStats.activeUsers > 10 ? 'green' : dashboardData.realTimeStats.activeUsers > 5 ? 'yellow' : 'gray'}
            onClick={() => setShowUserDetails(true)}
            isClickable={true}
          />
          <MetricCard
            title="Rooms"
            value={`${dashboardData.realTimeStats.activeRooms}/${dashboardData.realTimeStats.totalRooms}`}
            subvalue={`Peak: ${dashboardData.realTimeStats.peakRooms || 0} • ${dashboardData.realTimeStats.roomTrend}`}
            icon="🏠"
            color={dashboardData.realTimeStats.activeRooms > 5 ? 'green' : dashboardData.realTimeStats.activeRooms > 2 ? 'yellow' : 'gray'}
            onClick={() => setShowRoomDetails(true)}
            isClickable={true}
          />
          <MetricCard
            title="Messages/Min"
            value={dashboardData.realTimeStats.messagesPerMinute.toString()}
            subvalue={`Total: ${dashboardData.realTimeStats.totalMessages.toLocaleString()} • ${dashboardData.realTimeStats.totalMessages > 1000 ? 'High Volume' : 'Normal'}`}
            icon="💬"
            color={dashboardData.realTimeStats.messagesPerMinute > 20 ? 'green' : dashboardData.realTimeStats.messagesPerMinute > 10 ? 'yellow' : 'gray'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Activity Feed - Takes up 2 columns */}
          <div className="lg:col-span-2">
            <ActivityFeed 
              activities={activities} 
              onClearActivity={handleClearActivity}
            />
          </div>

          {/* 🔧 ENHANCED: Admin Controls with new features */}
          <div className="w-full min-w-0">
            <AdminControls
              onBroadcast={handleBroadcast}
              onRoomBroadcast={handleRoomBroadcast}
              onClearRoom={handleClearRoom}
              onWipeDatabase={handleWipeDatabase}
              adminLevel={dashboardData.admin?.adminLevel || 'basic'}
              adminPassword={credentials?.password ?? null}
            />
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Database Stats */}
          <div className="bg-gray-800/80 rounded-lg p-6 backdrop-blur-sm border border-gray-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">🗄️</span>
              Database Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Messages:</span>
                <span className="font-bold">{dashboardData.dbStats.totalMessages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Rooms:</span>
                <span className="font-bold">{dashboardData.dbStats.totalRooms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Sessions:</span>
                <span className="font-bold">{dashboardData.dbStats.totalSessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Recent Activity:</span>
                <span className="font-bold">{dashboardData.dbStats.recentActivity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Database Size:</span>
                <span className="font-bold">{dashboardData.dbStats.dbSize}</span>
              </div>
            </div>
          </div>

          {/* Server Performance */}
          <div className="bg-gray-800/80 rounded-lg p-6 backdrop-blur-sm border border-gray-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">⚡</span>
              Server Performance
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Memory Used:</span>
                <span className="font-bold">{dashboardData.serverHealth.memoryUsed}MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Memory Total:</span>
                <span className="font-bold">{dashboardData.serverHealth.memoryTotal}MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">CPU Usage:</span>
                <span className="font-bold">{dashboardData.serverHealth.cpuUsage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Status:</span>
                <span className="font-bold text-green-400">{dashboardData.serverHealth.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Uptime:</span>
                <span className="font-bold">{dashboardData.serverHealth.uptime}</span>
              </div>
            </div>
          </div>

          {/* Network Monitoring */}
          <div className="bg-gray-800/80 rounded-lg p-6 backdrop-blur-sm border border-gray-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">📡</span>
              Network Monitoring
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Quality Score:</span>
                <span className={`font-bold ${
                  dashboardData.networkStatus.quality > 90 ? 'text-green-400' : 
                  dashboardData.networkStatus.quality > 70 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {dashboardData.networkStatus.quality}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Avg Latency:</span>
                <span className="font-bold">{dashboardData.networkStatus.avgLatency}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Delivery Rate:</span>
                <span className="font-bold text-green-400">{dashboardData.networkStatus.deliveryRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Environment:</span>
                <span className="font-bold text-blue-400">{dashboardData.realTimeStats.environment}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🔧 NEW: Admin Features Summary */}
        {dashboardData.admin && (
          <div className="mt-8 bg-gray-800/80 rounded-lg p-6 backdrop-blur-sm border border-gray-700/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">🔧</span>
              Enhanced Admin Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-green-400 mb-2">✅ Fixed Issues:</h4>
                <ul className="text-sm space-y-1 text-gray-300">
                  <li>• Unique user counting (no double counting across rooms)</li>
                  <li>• All rooms visible (active + inactive with history)</li>
                  <li>• Room-specific broadcasting by code</li>
                  <li>• Enhanced historical tracking</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-purple-400 mb-2">🔐 Admin Features:</h4>
                <ul className="text-sm space-y-1 text-gray-300">
                  <li>• Full admin access</li>
                  <li>• All features enabled</li>
                  <li>• Current Level: <strong>{dashboardData.admin.adminLevel}</strong></li>
                  <li>• Available Features: {dashboardData.admin.availableFeatures.length}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <div suppressHydrationWarning>Last updated: {dashboardData.timestamp > 0 ? new Date(dashboardData.timestamp).toLocaleTimeString() : 'Loading...'}</div>
          <div className="mt-1">
            PeddleNet Admin Dashboard v1.1.0-admin-enhanced • 
            Build: {process.env.NODE_ENV} • 
            Server: {process.env.NEXT_PUBLIC_SIGNALING_SERVER?.split('//')[1]?.split('.')[0] || 'unknown'} • 
            {isConnected ? ' Real-time updates active' : ' Using cached data'} • 
            Admin: {credentials.username} ({dashboardData.admin?.adminLevel || 'basic'})
          </div>
        </div>
      </div>

      {/* 🔧 FIXED: Detailed Modals with proper handlers */}
      <DetailedUserView
        isOpen={showUserDetails}
        onClose={() => setShowUserDetails(false)}
        fetchDetailedUsers={fetchDetailedUsers}
        removeUser={removeUser}
      />
      
      <DetailedRoomView
        isOpen={showRoomDetails}
        onClose={() => setShowRoomDetails(false)}
        fetchDetailedRooms={fetchDetailedRooms}
        deleteRoom={deleteRoom}
      />
    </div>
  );
}
