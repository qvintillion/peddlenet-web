// 🔧 ENHANCED: Admin dashboard improvements + WebSocket Optimizations
// Phase 1: Simplified data structures for user tracking
// Phase 2: Removed unused P2P signaling code (Android handles mesh independently)
// Fixes: 1) Unique user counting 2) All rooms visible 3) Admin password for clear/wipe 4) Broadcast to specific rooms
// Cross-referenced with complete backup to ensure all WebSocket handlers and endpoints are included

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const os = require('os');

// ===== PHASE 2: P2P imports removed =====
// socket.io-p2p-server import removed (unused - Android handles mesh)

const app = express();
const server = createServer(app);

// ===== COLD START DETECTION FOR CLOUD RUN =====
const SERVER_START_TIME = Date.now();

function isColdStart() {
  return process.uptime() < 30; // First 30 seconds after start
}

function getConnectionTimeout() {
  // Give cold start connections more time
  return isColdStart() ? 45000 : 30000;
}

function logColdStartInfo() {
  const uptime = Math.floor(process.uptime());
  const coldStart = isColdStart();
  return {
    uptime,
    coldStart,
    uptimeFormatted: `${Math.floor(uptime / 60)}m ${uptime % 60}s`
  };
}

// Environment detection
const isDevelopment = process.env.NODE_ENV !== 'production';
const buildTarget = process.env.BUILD_TARGET || 'unknown';
const platform = process.env.PLATFORM || 'local';

// 🔐 SIMPLIFIED: Single admin level
const ADMIN_CREDENTIALS = {
  // Admin access (full features)
  admin: { username: 'th3p3ddl3r', password: 'letsmakeatrade' }
};

// Enhanced environment detection using BUILD_TARGET
function getEnvironment() {
  // Use BUILD_TARGET if available (staging/production/preview)
  if (buildTarget === 'staging') return 'staging';
  if (buildTarget === 'production') return 'production';
  if (buildTarget === 'preview') return 'preview';
  
  // Fallback to NODE_ENV detection
  return isDevelopment ? 'development' : 'production';
}

// CORS configuration - FIXED: Added Firebase domains
function getCorsOrigins() {
  const origins = [
    "http://localhost:3000",
    "https://localhost:3000"
  ];

  // 🚨 CRITICAL FIX: Add Firebase hosting domains
  // Main Firebase staging domain
  origins.push("https://festival-chat-peddlenet.web.app");
  origins.push("https://festival-chat-peddlenet.firebaseapp.com");
  
  // Firebase preview channels (dynamic URLs)
  origins.push("https://festival-chat-peddlenet--pr-*.web.app");
  origins.push("https://festival-chat-peddlenet--*.web.app");
  
  // Production Vercel domain
  origins.push("https://peddlenet.app");
  origins.push("https://www.peddlenet.app");

  // Additional Firebase preview channel patterns (not currently used)
  // origins.push("https://festival-chat--*.web.app");
  // origins.push("https://festival-chat-peddlenet--feature-*.web.app");

  if (isDevelopment) {
    // Add local network IPs for mobile testing
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          origins.push(`http://${iface.address}:3000`);
          origins.push(`https://${iface.address}:3000`);
        }
      }
    }
  } else {
    // In production, add regex patterns for dynamic subdomains
    // Firebase preview channels (not currently used)
    // origins.push(/^https:\/\/festival-chat-peddlenet--.*\.web\.app$/);
    // origins.push(/^https:\/\/festival-chat--.*\.web\.app$/);

    // Vercel preview deployments - must use regex for wildcard support
    origins.push(/^https:\/\/festival-chat-.*\.vercel\.app$/);
    origins.push(/^https:\/\/.*\.vercel\.app$/);
  }

  console.log('🌐 CORS Origins configured:', origins.length, 'domains');
  console.log('🌐 Sample origins:', origins.slice(0, 5));
  
  return origins;
}

// Socket.IO setup with connection state recovery
const io = new Server(server, {
  cors: {
    origin: getCorsOrigins(),
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,        // 60s - standard timeout
  pingInterval: 25000,       // 25s - standard interval
  upgradeTimeout: 30000,     // 30s for polling → websocket upgrade
  connectionStateRecovery: {
    // Allows clients to reconnect and restore their state
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  }
});

// ===== PHASE 2: P2P server initialization removed =====
// socket.io-p2p-server middleware removed (unused)

// Middleware
app.use(cors({
  origin: getCorsOrigins(),
  methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// ===== PHASE 1 OPTIMIZED: Simplified Data Structures (October 9, 2025) =====

// Single source of truth for active users
// Key format: "displayName_socketId" to support multiple connections per user
const activeUsers = new Map(); // userKey → UserData

// Room membership tracking
// Key format: roomId → Set<userKey>
const rooms = new Map(); // roomId → Set<userKey>

// User data structure:
// UserData = {
//   displayName: string,
//   socketId: string,
//   currentRoom: string,
//   joinedAt: number,
//   isBackgroundConnection: boolean,  // CRITICAL for notification system
//   isActive: boolean
// }

// Historical tracking (simplified)
const allRoomsEverCreated = new Map(); // roomId → { created, lastActivity, totalMessages }
const messageStore = new Map(); // roomId → [messages]
const activityLog = []; // Recent activities for admin dashboard

// Connection stats
const connectionStats = {
  totalConnections: 0,
  currentConnections: 0,
  peakConnections: 0,
  peakRooms: 0,
  totalMessages: 0,
  messagesPerMinute: 0,
  lastMessageTime: Date.now()
};

// Room code mapping (keep existing)
const roomCodes = new Map(); // roomCode → roomId

// Room metadata storage (for display names, etc.)
// roomId → { displayName, createdBy, createdAt, lastActivity }
const roomMetadata = new Map();

// Phase 12: Virtual BLE-peer presence announced by relay nodes.
// presenceKey (relay:nodeId or relay:displayName) → { displayName, roomId, relaySocket, ts }
// Keyed by nodeId so RPA rotation on the BLE side doesn't create duplicates.
const relayPresence = new Map();

// Phase 12: how long a relay-presence entry survives without a refresh before it's swept.
// A relay re-announces every ~10s (Android presence heartbeat), so 30s = refreshed 3x per
// window for a present peer (never falsely swept), while a peer that left BLE range / whose
// relay stopped bridging it clears within ~30-45s. Must stay < the 120s replay freshness gate
// (line ~1858) so a stale entry is gone before it could be replayed to a newly-joining client.
const STALE_RELAY_PRESENCE_MS = 30_000;
const RELAY_PRESENCE_SWEEP_INTERVAL = 15_000; // sweep twice per staleness window

// ===== PHASE 2 COMPLETE: P2P Code Removed =====
// Removed in Phase 2 (unused - Android handles mesh independently):
// - p2pConnections Map
// - meshMetrics object
// - 5 P2P event handlers (request-connection, request-p2p-upgrade, etc.)
// - P2P cleanup logic
//
// Phase 1 removals (replaced by simplified data structures):
// - allUsersEver Map (replaced by activeUsers)
// - connectionStats.totalUniqueUsers Set (replaced by activeUsers)
// - Complex dual tracking by peerId AND displayName (now unified)

// 🔐 SIMPLIFIED: Single admin authentication
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  // Check admin credentials
  if (username === ADMIN_CREDENTIALS.admin.username && password === ADMIN_CREDENTIALS.admin.password) {
    req.adminLevel = 'basic';
    req.adminUser = username;
    return next();
  }
  
  return res.status(401).json({ error: 'Invalid credentials' });
}

// 🔐 REMOVED: No longer needed with single admin level

// Utility functions
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

// ===== PHASE 1 OPTIMIZED: Helper Functions (October 9, 2025) =====

/**
 * Generate unique key for user (supports multiple connections per display name)
 */
function generateUserKey(displayName, socketId) {
  return `${displayName}_${socketId}`;
}

/**
 * Count active rooms (rooms with non-background users)
 * CRITICAL: Only count rooms with actual chat users, not just background connections
 */
function getActiveRoomCount() {
  let count = 0;
  for (const [roomId] of rooms.entries()) {
    if (getRoomUserCount(roomId) > 0) {
      count++;
    }
  }
  return count;
}

/**
 * Get accurate room user count (filters background connections)
 * CRITICAL: This is the only correct way to count users
 */
function getRoomUserCount(roomId) {
  const room = rooms.get(roomId);
  const wsCount = room
    ? Array.from(room)
        .map(userKey => activeUsers.get(userKey))
        .filter(user => user && !user.isBackgroundConnection)
        .length
    : 0;

  // Also count BLE-relayed peers announced via relay-presence.
  const relayCount = Array.from(relayPresence.values())
    .filter(p => p.roomId === roomId && (Date.now() - p.ts) < 120_000)
    .length;

  return wsCount + relayCount;
}

/**
 * Find user data by socket ID
 */
function findUserBySocketId(socketId) {
  for (const [userKey, userData] of activeUsers.entries()) {
    if (userData.socketId === socketId) {
      return { userKey, userData };
    }
  }
  return null;
}

/**
 * Add user to room (notification-safe)
 */
function addUserToRoom(displayName, socketId, roomId, options = {}) {
  const userKey = generateUserKey(displayName, socketId);

  const userData = {
    displayName,
    socketId,
    currentRoom: roomId,
    joinedAt: Date.now(),
    isActive: true,
    isBackgroundConnection: options.isBackgroundConnection || false  // CRITICAL
  };

  // Add to active users
  activeUsers.set(userKey, userData);

  // Add to room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(userKey);

  // Track room if new
  if (!allRoomsEverCreated.has(roomId)) {
    allRoomsEverCreated.set(roomId, {
      roomId,
      created: Date.now(),
      lastActivity: Date.now(),
      totalMessages: 0
    });
  }

  return { userKey, userData };
}

/**
 * Remove user from room
 */
function removeUserFromRoom(userKey) {
  const userData = activeUsers.get(userKey);
  if (!userData) return null;

  const roomId = userData.currentRoom;

  // Remove from active users
  activeUsers.delete(userKey);

  // Remove from room
  const room = rooms.get(roomId);
  if (room) {
    room.delete(userKey);

    // Clean up empty rooms
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }

  return { userData, roomId };
}

/**
 * Update room activity timestamp
 */
function updateRoomActivity(roomId) {
  if (allRoomsEverCreated.has(roomId)) {
    allRoomsEverCreated.get(roomId).lastActivity = Date.now();
  }
}

/**
 * Store message (simplified)
 */
function storeMessage(roomId, messageData) {
  if (!messageStore.has(roomId)) {
    messageStore.set(roomId, []);
  }

  const messages = messageStore.get(roomId);
  messages.push(messageData);

  // Keep only last 100 messages per room
  if (messages.length > 100) {
    messages.splice(0, messages.length - 100);
  }

  // Update room message count
  if (allRoomsEverCreated.has(roomId)) {
    allRoomsEverCreated.get(roomId).totalMessages++;
  }

  // Update global stats
  connectionStats.totalMessages++;
  connectionStats.lastMessageTime = Date.now();

  updateRoomActivity(roomId);
}

/**
 * Add activity log entry
 */
function addActivityLog(type, data, icon = '📝') {
  const activity = {
    id: Date.now() + Math.random(),
    type,
    data,
    timestamp: Date.now(),
    icon
  };

  activityLog.unshift(activity);

  // Keep only last 1000 activities
  if (activityLog.length > 1000) {
    activityLog.length = 1000;
  }
}

/**
 * Generate message ID
 */
function generateMessageId() {
  return Math.random().toString(36).substring(2, 15);
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'PeddleNet Signaling Server',
    version: '4.3.5-cleanup-crash-fix',
    status: 'running',
    description: 'Persists relayed BLE messages and replays message-history + relay-presence on join so reconnecting clients catch up',
    features: [
      'admin-dashboard-enhanced', 
      'unique-user-counting', 
      'all-rooms-visible', 
      'super-admin-security',
      'room-specific-broadcast',
      'room-codes',
      'websocket-signaling',
      'optimized-data-structures'
    ],
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      BUILD_TARGET: buildTarget,
      PLATFORM: platform,
      detected: getEnvironment()
    },
    endpoints: {
      health: '/health',
      signaling: '/socket.io/',
      registerRoomCode: '/register-room-code',
      resolveRoomCode: '/resolve-room-code/:code',
      roomStats: '/room-stats/:roomId',
      adminAnalytics: '/admin/analytics',
      adminActivity: '/admin/activity',
      adminUsers: '/admin/users/detailed',
      adminRooms: '/admin/rooms/detailed',
      adminBroadcast: '/admin/broadcast',
      adminBroadcastToRoom: '/admin/broadcast/room',
      adminRoomClear: '/admin/room/clear [ADMIN]',
      adminDatabaseWipe: '/admin/database/wipe [ADMIN]'
    },
    enhancements: [
      'Fixed unique user counting (no double counting across rooms)',
      'All created rooms visible (not just active ones)',
      'Admin access for all operations',
      'Broadcast to specific rooms by room code',
      'Enhanced user and room tracking'
    ],
    security: {
      admin: 'Full access to all features'
    },
    timestamp: Date.now()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PeddleNet Signaling Server',
    version: '4.3.5-cleanup-crash-fix',
    timestamp: Date.now()
  });
});

// ===== ENHANCED ADMIN ENDPOINTS =====

// ===== PHASE 1 OPTIMIZED: Mesh Status Endpoint (P2P Deprecated) =====
app.get('/admin/mesh-status', requireAdminAuth, (req, res) => {
  try {
    console.log(`🌐 Mesh status request from ${req.adminUser}`);

    // PHASE 1: P2P/Mesh is deprecated, return WebSocket-only status
    const meshConnections = [];

    // Collect all active WebSocket connections
    for (const [roomId, userKeys] of rooms.entries()) {
      for (const userKey of userKeys) {
        const userData = activeUsers.get(userKey);
        if (!userData) continue;

        // Skip background connections in mesh status
        if (userData.isBackgroundConnection) continue;

        const connectionAge = Date.now() - userData.joinedAt;

        // WebSocket quality based on connection age
        const connectionQuality = connectionAge < 30000 ? 'good' :
                                 connectionAge < 120000 ? 'fair' : 'poor';

        const meshConnection = {
          peerId: userData.displayName,
          displayName: userData.displayName,
          socketId: userData.socketId.substring(0, 8) + '...', // Truncate for privacy
          roomId,
          p2pPeers: [], // P2P deprecated in Phase 1
          connectionQuality,
          lastSeen: userData.joinedAt,
          isP2PActive: false, // P2P deprecated
          connectionAge
        };

        meshConnections.push(meshConnection);
      }
    }

    // Count unique display names (not socket connections)
    const uniqueDisplayNames = new Set(meshConnections.map(c => c.displayName));

    // ===== ADMIN DASHBOARD DEDUPLICATION (Phase 1 - Version 4.0-optimized) =====
    // Deduplicate connections by displayName (show most recent connection per user)
    // This handles page navigation where user briefly has sockets in multiple rooms
    //
    // PRIORITY RULES:
    // 1. ALWAYS prefer chat connections over background notification connections
    // 2. Among chat connections, prefer most recent (highest lastSeen)
    // 3. Only show background connections if no chat connection exists
    //
    // SCENARIO: User navigates from Room A → Room B
    //   - Chat socket in Room B (joinedAt: 2000)
    //   - Background socket in Room A (joinedAt: 2500, listening for notifications)
    //   - Admin sees: User in Room B only (active chat, not background listener)
    //
    const uniqueConnectionsMap = new Map();
    for (const connection of meshConnections) {
      const existing = uniqueConnectionsMap.get(connection.displayName);

      // Determine if we should replace existing connection
      let shouldReplace = false;

      if (!existing) {
        shouldReplace = true; // No existing, always add
      } else {
        // Get connection types from userData
        const existingUserData = activeUsers.get(`${existing.displayName}_${existing.socketId.replace('...', '')}`);
        const currentUserData = activeUsers.get(`${connection.displayName}_${connection.socketId.replace('...', '')}`);

        // Extract full socket IDs to lookup userData
        let existingIsBackground = false;
        let currentIsBackground = false;

        // Find userData by checking all userKeys with matching displayName
        for (const [userKey, userData] of activeUsers.entries()) {
          if (userData.displayName === existing.displayName && existing.socketId.startsWith(userData.socketId.substring(0, 8))) {
            existingIsBackground = userData.isBackgroundConnection || false;
          }
          if (userData.displayName === connection.displayName && connection.socketId.startsWith(userData.socketId.substring(0, 8))) {
            currentIsBackground = userData.isBackgroundConnection || false;
          }
        }

        // Priority logic:
        // 1. If existing is background and current is chat → replace
        // 2. If existing is chat and current is background → keep existing
        // 3. If both same type → prefer most recent
        if (existingIsBackground && !currentIsBackground) {
          shouldReplace = true; // Chat connection takes priority over background
        } else if (!existingIsBackground && currentIsBackground) {
          shouldReplace = false; // Keep chat connection, ignore background
        } else {
          // Both same type, prefer most recent
          shouldReplace = connection.lastSeen > existing.lastSeen;
        }
      }

      if (shouldReplace) {
        uniqueConnectionsMap.set(connection.displayName, {
          ...connection,
          // Count total sockets across all rooms for this display name
          totalConnections: meshConnections.filter(c => c.displayName === connection.displayName).length
        });
      }
    }
    // ===== END ADMIN DASHBOARD DEDUPLICATION =====
    const uniqueConnections = Array.from(uniqueConnectionsMap.values());

    // Build room topology with deduplicated users (one entry per unique user per room)
    const roomTopology = {};
    for (const connection of uniqueConnections) {
      if (!roomTopology[connection.roomId]) {
        roomTopology[connection.roomId] = [];
      }
      roomTopology[connection.roomId].push(connection);
    }

    // ===== PHASE 2: Simplified WebSocket-only metrics =====
    // P2P metrics removed as unused (Android handles mesh independently)
    const connectionMetrics = {
      totalActiveUsers: uniqueDisplayNames.size, // Count unique users, not connections
      totalWebSocketConnections: meshConnections.length,
      averageConnectionTime: 0,
      totalRoomsWithUsers: Object.keys(roomTopology).length
    };

    const meshStatus = {
      metrics: connectionMetrics,
      connections: uniqueConnections.sort((a, b) => b.lastSeen - a.lastSeen),
      topology: roomTopology,
      summary: {
        totalConnections: meshConnections.length,
        totalRoomsWithUsers: Object.keys(roomTopology).length,
        averageLatency: meshConnections.reduce((acc, c) => {
          const latency = c.connectionQuality === 'good' ? 50 :
                         c.connectionQuality === 'fair' ? 100 : 200;
          return acc + latency;
        }, 0) / Math.max(meshConnections.length, 1)
      },
      timestamp: Date.now(),
      phase: 'Phase 2 - WebSocket Only',
      status: {
        signalingActive: true,
        webSocketEnabled: true
      }
    };

    console.log(`🌐 Connection status: ${connectionMetrics.totalActiveUsers} active users, ${connectionMetrics.totalWebSocketConnections} WebSocket connections`);

    res.json(meshStatus);
  } catch (error) {
    console.error('❌ Mesh status error:', error);
    res.status(500).json({ error: 'Failed to get mesh status' });
  }
});

// ===== PHASE 1 OPTIMIZED: Admin Analytics Endpoint =====
app.get('/admin/analytics', requireAdminAuth, (req, res) => {
  try {
    console.log(`📊 Admin analytics request from ${req.adminUser}`);

    // Calculate active unique users (filter background connections)
    const uniqueDisplayNames = new Set();
    const displayNameToUserData = new Map(); // Track unique users by display name

    for (const [userKey, userData] of activeUsers.entries()) {
      if (!userData.isBackgroundConnection) {
        uniqueDisplayNames.add(userData.displayName);

        // Keep the most recent connection for each unique display name
        const existing = displayNameToUserData.get(userData.displayName);
        if (!existing || userData.joinedAt > existing.joinedAt) {
          displayNameToUserData.set(userData.displayName, userData);
        }
      }
    }

    // Build activeUsersList with unique users only (one per display name)
    const activeUsersList = Array.from(displayNameToUserData.values()).map(userData => ({
      displayName: userData.displayName,
      currentRoom: userData.currentRoom,
      joinedAt: userData.joinedAt,
      isActive: true
    }));

    const activeUserCount = uniqueDisplayNames.size;

    // Get all rooms data
    const allRoomsData = [];
    for (const [roomId, roomData] of allRoomsEverCreated.entries()) {
      const isActive = rooms.has(roomId);
      const currentUsers = isActive ? getRoomUserCount(roomId) : 0;

      allRoomsData.push({
        roomId,
        created: roomData.created,
        isCurrentlyActive: isActive,
        currentUsers,
        totalMessages: roomData.totalMessages,
        lastActivity: roomData.lastActivity,
        status: isActive ? 'Active' : 'Inactive'
      });
    }

    // Sort rooms by last activity
    allRoomsData.sort((a, b) => b.lastActivity - a.lastActivity);

    // Count active rooms (only rooms with non-background users)
    const activeRoomCount = getActiveRoomCount();

    // Update peak stats
    connectionStats.peakConnections = Math.max(connectionStats.peakConnections, activeUserCount);
    connectionStats.peakRooms = Math.max(connectionStats.peakRooms, activeRoomCount);

    const analyticsData = {
      users: {
        totalUniqueActive: activeUserCount,
        currentlyOnline: activeUserCount,
        peakConnections: connectionStats.peakConnections,
        detailed: activeUsersList
      },

      rooms: {
        totalActive: activeRoomCount,
        totalEverCreated: allRoomsEverCreated.size,
        detailed: allRoomsData
      },

      messages: {
        total: connectionStats.totalMessages,
        perMinute: connectionStats.messagesPerMinute,
        lastMessageTime: connectionStats.lastMessageTime
      },

      server: {
        uptime: process.uptime(),
        uptimeFormatted: formatUptime(process.uptime()),
        version: '4.3.5-cleanup-crash-fix',
        environment: getEnvironment(),
        memoryUsage: process.memoryUsage(),
        timestamp: Date.now()
      },

      activity: {
        recentActivities: activityLog.slice(0, 20),
        totalActivities: activityLog.length
      },

      // Server health (frontend expects this)
      serverHealth: {
        status: 'healthy',
        uptime: formatUptime(process.uptime()),
        memoryUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        memoryTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        cpuUsage: '0%', // Simplified for now
        coldStarts: 0
      },

      // Network status (simplified - frontend expects this)
      networkStatus: {
        quality: 100, // Default to 100% for now
        avgLatency: 0,
        deliveryRate: 100
      },

      // Database stats (frontend expects this)
      dbStats: {
        totalMessages: connectionStats.totalMessages,
        totalRooms: allRoomsEverCreated.size,
        totalSessions: connectionStats.totalConnections,
        recentActivity: activityLog.length,
        dbSize: '0 KB', // Simplified - in-memory
        oldestMessage: 0
      },

      // Message flow (frontend expects this)
      messageFlow: {
        messagesPerMinute: connectionStats.messagesPerMinute,
        trend: 'stable',
        history: []
      },

      // Enhanced dashboard format
      realTimeStats: {
        activeUsers: activeUserCount,
        totalUsers: activeUserCount,
        activeRooms: activeRoomCount,
        totalRooms: allRoomsEverCreated.size,
        peakUsers: connectionStats.peakConnections,
        peakRooms: connectionStats.peakRooms || activeRoomCount,
        messagesPerMinute: connectionStats.messagesPerMinute,
        totalMessages: connectionStats.totalMessages,
        storageUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        userTrend: 'stable',
        roomTrend: 'stable',
        environment: getEnvironment()
      },

      // Top-level fields frontend expects
      timestamp: Date.now(),
      databaseReady: true
    };

    console.log(`📈 Analytics: ${activeUserCount} active users, ${activeRoomCount} active rooms`);
    
    res.json(analyticsData);
  } catch (error) {
    console.error('❌ Admin analytics error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Activity endpoint for live feed
app.get('/admin/activity', requireAdminAuth, (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    // Start with activity log (already sorted newest first when we add items)
    const activities = [...activityLog]; // Copy activity log

    // PHASE 1: Add current user join states if not already in activity log
    // rooms Map structure: roomId → Set<userKey>
    // activeUsers Map structure: userKey → UserData
    for (const [roomId, userKeys] of rooms.entries()) {
      for (const userKey of userKeys) {
        const userData = activeUsers.get(userKey);

        // Skip if user data not found or is background connection
        if (!userData || userData.isBackgroundConnection) {
          continue;
        }

        // Only add if we don't already have recent join activity for this user
        const hasRecentJoin = activities.some(activity =>
          activity.type === 'user-joined' &&
          activity.data.displayName === userData.displayName &&
          activity.data.roomId === roomId &&
          (Date.now() - activity.timestamp) < 5 * 60 * 1000 // Within 5 minutes
        );

        if (!hasRecentJoin && userData.displayName) {
          activities.push({
            id: Date.now() + Math.random(),
            type: 'user-joined',
            data: {
              roomId,
              peerId: userData.displayName, // Use displayName as peerId for consistency
              displayName: userData.displayName
            },
            timestamp: userData.joinedAt || Date.now(),
            icon: '👥'
          });
        }
      }
    }
    
    // CRITICAL FIX: Sort by timestamp DESCENDING (newest first)
    const sortedActivities = activities
      .sort((a, b) => b.timestamp - a.timestamp) // b - a = newest first
      .slice(0, parseInt(limit));
    
    res.json({
      activities: sortedActivities,
      total: activities.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('❌ Admin activity error:', error);
    res.status(500).json({ error: 'Failed to get activity log' });
  }
});

// ===== PHASE 1 OPTIMIZED: Detailed Users Endpoint =====
app.get('/admin/users/detailed', requireAdminAuth, (req, res) => {
  try {
    console.log('\n👥 ===== DETAILED USERS REQUEST (Phase 1) =====');
    console.log(`🔍 Active users: ${activeUsers.size}`);
    console.log(`🔍 Total rooms: ${rooms.size}`);

    const allUsersData = [];
    const uniqueDisplayNames = new Set();
    const displayNameToUsers = new Map(); // displayName -> array of userKeys

    // Group users by display name to handle multiple connections
    for (const [userKey, userData] of activeUsers.entries()) {
      const displayName = userData.displayName;
      if (!displayNameToUsers.has(displayName)) {
        displayNameToUsers.set(displayName, []);
      }
      displayNameToUsers.get(displayName).push({ userKey, userData });
    }

    // Create one entry per unique display name
    for (const [displayName, userEntries] of displayNameToUsers.entries()) {
      uniqueDisplayNames.add(displayName);

      // Pick the first user entry as representative
      const firstEntry = userEntries[0];
      const userData = firstEntry.userData;

      // Find current room
      let currentRoomData = null;
      if (userData.currentRoom && allRoomsEverCreated.has(userData.currentRoom)) {
        const roomData = allRoomsEverCreated.get(userData.currentRoom);
        currentRoomData = {
          roomId: userData.currentRoom,
          roomCode: roomData.roomCode || null,
          userCount: getRoomUserCount(userData.currentRoom)
        };
      }

      allUsersData.push({
        uniqueDisplayName: displayName,
        peerId: displayName,
        displayName: displayName,
        firstSeen: userData.joinedAt,
        lastSeen: Date.now(),
        isCurrentlyActive: true,
        totalRoomsJoined: 1,
        currentRoom: currentRoomData,
        status: 'Online',
        sessionDuration: Date.now() - userData.joinedAt,
        socketId: userData.socketId.substring(0, 8) + '...',
        allPeerIds: userEntries.map(e => e.userData.socketId.substring(0, 8)),
        totalConnections: userEntries.length // Show if user has multiple connections
      });
    }

    // Create active users list (unique by display name)
    const activeUsersList = Array.from(displayNameToUsers.entries()).map(([displayName, userEntries]) => {
      const firstEntry = userEntries[0];
      const userData = firstEntry.userData;

      return {
        socketId: userData.socketId,
        peerId: displayName,
        displayName: displayName,
        uniqueDisplayName: displayName,
        roomId: userData.currentRoom,
        joinedAt: userData.joinedAt,
        duration: Date.now() - userData.joinedAt,
        isActive: true,
        totalConnections: userEntries.length
      };
    });

    // Sort by joined time (most recent first)
    allUsersData.sort((a, b) => b.lastSeen - a.lastSeen);

    console.log(`✅ Detailed users response (Phase 1):`);
    console.log(`   - Unique display names: ${uniqueDisplayNames.size}`);
    console.log(`   - Total active connections: ${activeUsers.size}`);
    console.log(`   - Active users list: ${activeUsersList.length}`);
    console.log('👥 ===== END DETAILED USERS =====\n');

    res.json({
      users: allUsersData,
      activeUsers: activeUsersList,
      recentSessions: [],
      summary: {
        totalUsers: allUsersData.length,
        activeUsers: allUsersData.length,
        inactiveUsers: 0, // Phase 1: Only tracking active users
        totalActive: activeUsersList.length,
        uniqueUsers: uniqueDisplayNames.size,
        totalRooms: rooms.size,
        totalSocketConnections: activeUsers.size,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('❌ Admin detailed users error:', error);
    res.status(500).json({ error: 'Failed to get detailed users' });
  }
});

// ===== PHASE 1 OPTIMIZED: Detailed Rooms Endpoint =====
app.get('/admin/rooms/detailed', requireAdminAuth, (req, res) => {
  try {
    const allRoomsData = [];

    // Get ALL rooms (active and inactive)
    for (const [roomId, roomData] of allRoomsEverCreated.entries()) {
      const isActive = rooms.has(roomId);
      let currentUsers = [];
      let currentUserCount = 0;

      if (isActive) {
        const roomUserKeys = rooms.get(roomId); // Phase 1: Set of userKeys

        // Deduplicate users by displayName (one entry per unique user)
        const uniqueUsersMap = new Map();
        for (const userKey of roomUserKeys) {
          const userData = activeUsers.get(userKey);
          if (userData && !userData.isBackgroundConnection) {
            // Keep the most recent connection for each unique display name
            const existing = uniqueUsersMap.get(userData.displayName);
            if (!existing || userData.joinedAt > existing.joinedAt) {
              uniqueUsersMap.set(userData.displayName, {
                peerId: userData.displayName,
                displayName: userData.displayName,
                joinedAt: userData.joinedAt,
                socketId: userData.socketId.substring(0, 8) + '...' // Truncated for privacy
              });
            }
          }
        }

        currentUsers = Array.from(uniqueUsersMap.values());
        currentUserCount = currentUsers.length;
      }

      // Get recent messages
      const recentMessages = messageStore.has(roomId) ?
        messageStore.get(roomId).slice(-5) : []; // Last 5 messages

      allRoomsData.push({
        roomId,
        roomCode: roomData.roomCode || null,
        created: roomData.created,
        isCurrentlyActive: isActive,
        currentUserCount,
        currentUsers,
        totalUsersEver: roomData.totalUsersEver || 0,
        totalMessages: roomData.totalMessages,
        lastActivity: roomData.lastActivity,
        recentMessages: recentMessages.map(msg => ({
          id: msg.id,
          content: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
          sender: msg.sender,
          timestamp: msg.timestamp,
          type: msg.type
        })),
        status: isActive ? 'Active' : 'Inactive',
        ageHours: Math.floor((Date.now() - roomData.created) / (1000 * 60 * 60)),
        activeUsers: currentUserCount, // For compatibility
        userList: currentUsers // For compatibility
      });
    }

    // Sort by last activity (most recent first)
    allRoomsData.sort((a, b) => b.lastActivity - a.lastActivity);

    // Calculate total messages for compatibility
    const totalMessages = Array.from(messageStore.values())
      .reduce((sum, messages) => sum + messages.length, 0);

    res.json({
      rooms: allRoomsData,
      activeRooms: allRoomsData, // For compatibility with existing frontend
      summary: {
        totalRooms: allRoomsData.length,
        activeRooms: allRoomsData.filter(r => r.isCurrentlyActive).length,
        inactiveRooms: allRoomsData.filter(r => !r.isCurrentlyActive).length,
        totalActiveUsers: allRoomsData.reduce((sum, r) => sum + r.currentUserCount, 0),
        totalMessages: totalMessages,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('❌ Admin detailed rooms error:', error);
    res.status(500).json({ error: 'Failed to get detailed rooms' });
  }
});

// 🔧 ENHANCED: Broadcast to ALL rooms (basic admin)
app.post('/admin/broadcast', requireAdminAuth, (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    let messagesSent = 0;
    let roomsTargeted = 0;
    
    // Broadcast to all active rooms
    for (const [roomId, roomPeers] of rooms.entries()) {
      const broadcastMessage = {
        id: generateMessageId(),
        content: `📢 ADMIN BROADCAST: ${message}`,
        sender: `System Administrator (${req.adminUser})`,
        timestamp: Date.now(),
        type: 'system',
        roomId
      };
      
      // Send to all users in the room
      io.to(roomId).emit('chat-message', broadcastMessage);
      messagesSent += roomPeers.size;
      roomsTargeted++;
      
      // Store the broadcast message
      storeMessage(roomId, broadcastMessage);
    }
    
    // Log the broadcast activity
    addActivityLog('admin-broadcast', {
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      roomsTargeted,
      messagesSent,
      adminUser: req.adminUser,
      adminLevel: req.adminLevel
    }, '📢');
    
    console.log(`📢 Admin broadcast sent to ${roomsTargeted} rooms, ${messagesSent} messages total by ${req.adminUser}`);
    
    res.json({
      success: true,
      message: `Broadcast sent to ${roomsTargeted} rooms`,
      messagesSent,
      roomsTargeted,
      adminUser: req.adminUser
    });
  } catch (error) {
    console.error('❌ Admin broadcast error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// 🔧 NEW: Broadcast to specific room(s) by room code (basic admin)
app.post('/admin/broadcast/room', requireAdminAuth, (req, res) => {
  try {
    const { message, roomCodes: targetRoomCodes } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!targetRoomCodes || !Array.isArray(targetRoomCodes) || targetRoomCodes.length === 0) {
      return res.status(400).json({ error: 'roomCodes array is required' });
    }
    
    console.log(`\n📢 ===== ROOM-SPECIFIC BROADCAST =====`);
    console.log(`🔍 Target room codes:`, targetRoomCodes);
    console.log(`🔍 Available active rooms:`, Array.from(rooms.keys()));
    console.log(`🔍 Available room code mappings:`, Array.from(roomCodes.entries()));
    
    let messagesSent = 0;
    let roomsTargeted = 0;
    let successfulRooms = [];
    let failedRooms = [];
    
    // Process each target room code
    for (const targetCode of targetRoomCodes) {
      const normalizedCode = targetCode.toLowerCase().trim();
      let targetRoomId = null;
      let searchMethod = '';
      
      // Method 1: Find by registered room code mapping
      for (const [code, roomId] of roomCodes.entries()) {
        if (code === normalizedCode) {
          targetRoomId = roomId;
          searchMethod = 'registered-code';
          break;
        }
      }
      
      // Method 2: Find by exact room ID match
      if (!targetRoomId && rooms.has(targetCode)) {
        targetRoomId = targetCode;
        searchMethod = 'exact-id';
      }
      
      // Method 3: Find by partial room ID match (fuzzy search)
      if (!targetRoomId) {
        for (const [roomId] of rooms.entries()) {
          if (roomId.toLowerCase().includes(normalizedCode) || 
              roomId.substring(0, 8).toLowerCase() === normalizedCode) {
            targetRoomId = roomId;
            searchMethod = 'partial-match';
            break;
          }
        }
      }
      
      if (targetRoomId && rooms.has(targetRoomId)) {
        const roomPeers = rooms.get(targetRoomId);
        
        const broadcastMessage = {
          id: generateMessageId(),
          content: `📢 ROOM BROADCAST: ${message}`,
          sender: `System Administrator (${req.adminUser})`,
          timestamp: Date.now(),
          type: 'system',
          roomId: targetRoomId
        };
        
        // Send to all users in the specific room
        io.to(targetRoomId).emit('chat-message', broadcastMessage);
        messagesSent += roomPeers.size;
        roomsTargeted++;
        
        // Store the broadcast message
        storeMessage(targetRoomId, broadcastMessage);
        
        successfulRooms.push({
          roomCode: targetCode,
          roomId: targetRoomId,
          userCount: getActualUserCount(roomPeers),
          searchMethod
        });
        
        console.log(`✅ Broadcast sent to room ${targetCode} (${targetRoomId}) - ${roomPeers.size} users - method: ${searchMethod}`);
      } else {
        failedRooms.push({
          roomCode: targetCode,
          reason: 'Room not found or inactive'
        });
        console.log(`❌ Room ${targetCode} not found or inactive`);
      }
    }
    
    // Log the room-specific broadcast activity
    addActivityLog('admin-room-broadcast', {
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      targetRoomCodes,
      roomsTargeted,
      messagesSent,
      successfulRooms: successfulRooms.length,
      failedRooms: failedRooms.length,
      adminUser: req.adminUser,
      adminLevel: req.adminLevel
    }, '🎯');
    
    console.log(`📢 Room-specific broadcast completed:`);
    console.log(`   - Successful rooms: ${successfulRooms.length}`);
    console.log(`   - Failed rooms: ${failedRooms.length}`);
    console.log(`   - Total messages sent: ${messagesSent}`);
    console.log(`📢 ===== END ROOM BROADCAST =====\n`);
    
    res.json({
      success: true,
      message: `Broadcast sent to ${roomsTargeted} of ${targetRoomCodes.length} requested rooms`,
      messagesSent,
      roomsTargeted,
      totalRequested: targetRoomCodes.length,
      successfulRooms,
      failedRooms,
      adminUser: req.adminUser
    });
  } catch (error) {
    console.error('❌ Admin room broadcast error:', error);
    res.status(500).json({ error: 'Failed to send room broadcast' });
  }
});

// 🔐 ENHANCED: Clear specific room messages (ADMIN ACCESS)
app.post('/admin/room/clear', requireAdminAuth, (req, res) => {
  try {
    const { roomCode } = req.body;
    
    if (!roomCode) {
      return res.status(400).json({ error: 'Room code is required' });
    }
    
    console.log(`\n🗑️ ===== ADMIN ROOM CLEAR REQUEST =====`);
    console.log(`🔐 Admin: ${req.adminUser} (${req.adminLevel})`);
    console.log(`🔍 Input room code: "${roomCode}"`);
    
    // Find room by code or ID with improved matching
    let targetRoomId = null;
    let messagesCleared = 0;
    let searchMethod = '';
    
    // Method 1: Find by registered room code mapping
    const normalizedCode = roomCode.toLowerCase().trim();
    
    for (const [code, roomId] of roomCodes.entries()) {
      if (code === normalizedCode) {
        targetRoomId = roomId;
        searchMethod = 'registered-code';
        break;
      }
    }
    
    // Method 2: Find by exact room ID match
    if (!targetRoomId && rooms.has(roomCode)) {
      targetRoomId = roomCode;
      searchMethod = 'exact-id';
    }
    
    // Method 3: Find by partial room ID match (fuzzy search)
    if (!targetRoomId) {
      for (const [roomId] of rooms.entries()) {
        if (roomId.toLowerCase().includes(normalizedCode) || 
            roomId.substring(0, 8).toLowerCase() === normalizedCode) {
          targetRoomId = roomId;
          searchMethod = 'partial-match';
          break;
        }
      }
    }
    
    if (!targetRoomId) {
      return res.status(404).json({ 
        error: `Room "${roomCode}" not found`,
        debug: {
          input: roomCode,
          normalized: normalizedCode,
          availableRooms: Array.from(rooms.keys()),
          availableRoomCodes: Array.from(roomCodes.keys())
        }
      });
    }
    
    // Check if the room has messages before clearing
    if (messageStore.has(targetRoomId)) {
      const roomMessages = messageStore.get(targetRoomId);
      messagesCleared = roomMessages.length;
      
      // Clear the messages
      messageStore.set(targetRoomId, []);
    } else {
      messageStore.set(targetRoomId, []);
      messagesCleared = 0;
    }
    
    // Send notification to room users if room is active
    if (rooms.has(targetRoomId)) {
      const clearMessage = {
        id: generateMessageId(),
        content: `🗑️ Room messages have been cleared by administrator (${messagesCleared} messages removed)`,
        sender: `Administrator (${req.adminUser})`,
        timestamp: Date.now(),
        type: 'system',
        roomId: targetRoomId
      };
      
      io.to(targetRoomId).emit('chat-message', clearMessage);
      io.to(targetRoomId).emit('room-messages-cleared', {
        roomId: targetRoomId,
        clearedBy: `Administrator (${req.adminUser})`,
        timestamp: Date.now(),
        messagesCleared,
        message: `${messagesCleared} messages were cleared by administrator`
      });
      
      // Store only the notification message
      if (messagesCleared > 0) {
        messageStore.get(targetRoomId).push(clearMessage);
      }
    }
    
    // Update global connection stats
    connectionStats.totalMessages = Math.max(0, connectionStats.totalMessages - messagesCleared);
    
    // Log the room clear activity
    addActivityLog('admin-room-clear', {
      roomCode,
      roomId: targetRoomId,
      messagesCleared,
      searchMethod,
      adminUser: req.adminUser,
      adminLevel: req.adminLevel,
      timestamp: Date.now()
    }, '🗑️');
    
    console.log(`✅ ADMIN ROOM CLEAR COMPLETED by ${req.adminUser}: ${messagesCleared} messages cleared from ${targetRoomId}`);
    
    res.json({
      success: true,
      message: `Successfully cleared ${messagesCleared} messages from room "${roomCode}"`,
      messagesCleared,
      roomId: targetRoomId,
      searchMethod,
      adminUser: req.adminUser,
      adminLevel: req.adminLevel
    });
  } catch (error) {
    console.error('❌ Super admin room clear error:', error);
    res.status(500).json({ error: 'Failed to clear room messages', details: error.message });
  }
});

// 🔐 ENHANCED: Wipe entire database (ADMIN ACCESS)
app.post('/admin/database/wipe', requireAdminAuth, (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'WIPE_ALL_DATA') {
      return res.status(400).json({ error: 'Confirmation required: { "confirm": "WIPE_ALL_DATA" }' });
    }
    
    console.log(`\n💥 ===== ADMIN DATABASE WIPE REQUEST =====`);
    console.log(`🔐 Admin: ${req.adminUser} (${req.adminLevel})`);
    
    let totalMessagesDeleted = 0;
    let totalRoomsAffected = 0;
    
    // Count total messages before wiping
    for (const [roomId, messages] of messageStore.entries()) {
      totalMessagesDeleted += messages.length;
      totalRoomsAffected++;
    }
    
    // Disconnect all users and clear active rooms
    let usersDisconnected = 0;
    for (const [roomId, roomPeers] of rooms.entries()) {
      const shutdownMessage = {
        id: generateMessageId(),
        content: `⚠️ SYSTEM MAINTENANCE: All data has been reset by administrator. Please rejoin your rooms.`,
        sender: `Administrator (${req.adminUser})`,
        timestamp: Date.now(),
        type: 'system',
        roomId
      };
      
      io.to(roomId).emit('chat-message', shutdownMessage);
      io.to(roomId).emit('database-wiped', {
        timestamp: Date.now(),
        message: 'Database has been wiped by administrator',
        adminUser: req.adminUser,
        forceReload: true
      });
      
      // Disconnect all users in this room
      for (const [socketId, peerData] of roomPeers.entries()) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('system-shutdown', {
            message: 'Database has been reset by administrator. Please refresh and rejoin.',
            reason: 'database-wipe',
            adminUser: req.adminUser
          });
          socket.disconnect(true);
          usersDisconnected++;
        }
      }
    }
    
    // Clear all data structures
    rooms.clear();
    allRoomsEverCreated.clear();
    messageStore.clear();
    activeUsers.clear();
    activityLog.length = 0;
    roomCodes.clear();
    
    // Reset connection stats
    connectionStats.totalMessages = 0;
    connectionStats.messagesPerMinute = 0;
    connectionStats.totalUniqueUsers.clear();
    connectionStats.totalRoomsCreated = 0;
    connectionStats.lastMessageTime = Date.now();
    
    // Log the wipe activity (this will be the only activity)
    addActivityLog('admin-database-wipe', {
      totalMessagesDeleted,
      totalRoomsAffected,
      usersDisconnected,
      adminUser: req.adminUser,
      adminLevel: req.adminLevel,
      timestamp: Date.now()
    }, '💥');
    
    console.log(`💥 ADMIN DATABASE WIPE COMPLETED by ${req.adminUser}: ${totalMessagesDeleted} messages deleted, ${usersDisconnected} users disconnected`);
    
    res.json({
      success: true,
      message: `Database completely wiped by administrator: ${totalMessagesDeleted} messages deleted from ${totalRoomsAffected} rooms`,
      totalMessagesDeleted,
      totalRoomsAffected,
      usersDisconnected,
      adminUser: req.adminUser,
      adminLevel: req.adminLevel
    });
  } catch (error) {
    console.error('❌ Super admin database wipe error:', error);
    res.status(500).json({ error: 'Failed to wipe database', details: error.message });
  }
});

// ===== ROOM CODE ENDPOINTS =====

// Register room code
app.post('/register-room-code', (req, res) => {
  const { roomId, roomCode } = req.body;
  
  if (!roomId || !roomCode) {
    return res.status(400).json({ error: 'roomId and roomCode are required' });
  }
  
  roomCodes.set(roomCode.toLowerCase(), roomId);
  
  // Track the room
  trackRoom(roomId, roomCode);
  
  console.log(`🏷️ Room code registered: ${roomCode} -> ${roomId}`);
  
  res.json({ 
    success: true, 
    roomCode,
    roomId,
    message: `Room code "${roomCode}" registered for room ${roomId}`
  });
});

// Resolve room code
app.get('/resolve-room-code/:code', (req, res) => {
  const code = req.params.code.toLowerCase();
  const roomId = roomCodes.get(code);

  if (!roomId) {
    return res.status(404).json({ error: 'Room code not found' });
  }

  res.json({
    roomId,
    roomCode: code,
    message: `Room code "${code}" resolves to room ${roomId}`
  });
});

// ===== ROOM METADATA ENDPOINTS =====

// Store room metadata (display name, etc.)
app.post('/room/:roomId/metadata', (req, res) => {
  const { roomId } = req.params;
  const { displayName, createdBy } = req.body;

  if (!displayName) {
    return res.status(400).json({ error: 'Display name is required' });
  }

  const metadata = {
    displayName,
    createdBy: createdBy || 'unknown',
    createdAt: Date.now(),
    lastActivity: Date.now()
  };

  roomMetadata.set(roomId, metadata);

  console.log(`📝 Stored metadata for room ${roomId}:`, metadata);

  res.json({
    success: true,
    roomId,
    metadata
  });
});

// Get room metadata
app.get('/room/:roomId/metadata', (req, res) => {
  const { roomId } = req.params;

  const metadata = roomMetadata.get(roomId);

  if (!metadata) {
    return res.status(404).json({
      error: 'Room metadata not found',
      roomId
    });
  }

  res.json({
    success: true,
    roomId,
    metadata
  });
});

// ===== PHASE 1 OPTIMIZED: Room Stats Endpoint =====
app.get('/room-stats/:roomId', (req, res) => {
  const roomId = req.params.roomId;

  console.log(`📊 Room stats request for: ${roomId}`);

  // Check if room exists in current active rooms
  if (!rooms.has(roomId)) {
    // Check if room exists in historical data
    if (allRoomsEverCreated.has(roomId)) {
      const roomData = allRoomsEverCreated.get(roomId);
      console.log(`📊 Found inactive room: ${roomId}`);

      return res.json({
        roomId,
        userCount: 0,
        users: [],
        status: 'inactive',
        created: roomData.created,
        lastActivity: roomData.lastActivity,
        totalMessagesEver: roomData.totalMessages,
        timestamp: Date.now()
      });
    }

    console.log(`❌ Room ${roomId} not found`);
    return res.status(404).json({
      error: 'Room not found',
      roomId,
      timestamp: Date.now()
    });
  }

  const room = rooms.get(roomId);
  const roomData = allRoomsEverCreated.get(roomId);

  // Get user list (filter background connections)
  const peerList = Array.from(room)
    .map(userKey => activeUsers.get(userKey))
    .filter(user => user && !user.isBackgroundConnection)
    .map(user => ({
      peerId: user.displayName,
      displayName: user.displayName,
      joinedAt: user.joinedAt
    }));

  const userCount = getRoomUserCount(roomId);

  console.log(`✅ Room stats for ${roomId}: ${userCount} active users (${room.size} total connections)`);

  res.json({
    roomId,
    userCount,
    users: peerList,
    status: 'active',
    created: roomData ? roomData.created : Date.now(),
    lastActivity: roomData ? roomData.lastActivity : Date.now(),
    totalMessagesEver: roomData ? roomData.totalMessages : 0,
    timestamp: Date.now()
  });
});

// Signaling proxy info
app.get('/signaling-proxy', (req, res) => {
  res.json({
    signalingAvailable: true,
    endpoint: '/socket.io/',
    version: '4.1-websocket-only',
    features: [
      'peer-discovery',
      'room-management',
      'admin-dashboard-enhanced',
      'super-admin-security',
      'websocket-only',
      'enhanced-timeouts',
      'memory-cleanup',
      'cold-start-detection',
      'health-monitoring',
      'optimized-data-structures'
    ],
    timestamp: Date.now()
  });
});

// ===== WEBSOCKET HANDLERS =====

io.on('connection', (socket) => {
  const coldStartInfo = logColdStartInfo();

  if (coldStartInfo.coldStart) {
    console.log(`❄️ COLD START connection: uptime ${coldStartInfo.uptimeFormatted}`);
  }

  // Detect if this is a background notification connection (should not be counted as active user)
  const connectionType = socket.handshake.headers['x-connection-type'] || 'chat';
  const isBackgroundConnection = connectionType === 'background-notifications';

  console.log(`🔌 User connected: ${socket.id} (cold start: ${coldStartInfo.coldStart}, type: ${connectionType})`);
  connectionStats.totalConnections++;
  connectionStats.currentConnections++;

  // Connection health tracking (passive - no forced disconnects)
  const connectionHealth = {
    socketId: socket.id,
    connectedAt: Date.now(),
    isColdStart: coldStartInfo.coldStart,
    isBackgroundConnection
  };

  // Update peak connections
  connectionStats.peakConnections = Math.max(connectionStats.peakConnections, connectionStats.currentConnections);

  socket.on('join-room', (data) => {
    try {
      const { roomId, peerId, displayName, roomDisplayName } = data;
      console.log(`🔍 join-room received data:`, JSON.stringify(data));

      // Detect connection type
      const connectionType = socket.handshake.headers['x-connection-type'] || 'chat';
      const isBackground = connectionType === 'background-notifications';

      console.log(`👤 User joining: ${displayName} (${peerId}) -> Room: ${roomId} [${connectionType}]`);

      // ===== DUPLICATE SOCKET PREVENTION (Phase 1 - Version 4.0-optimized) =====
      // Handles edge cases where multiple sockets exist for the same user
      //
      // SCENARIO 1: Page Refresh in Same Room
      //   - User refreshes page while in Room A
      //   - New page creates new socket, joins Room A
      //   - Old socket still connected briefly until browser cleans up
      //   - Solution: Disconnect old socket in same room
      //
      // SCENARIO 2: Multi-tab Same Room
      //   - User opens Room A in two browser tabs
      //   - Both tabs create sockets to same room
      //   - Solution: Keep newest socket, disconnect older ones
      //
      // SCENARIO 3: Page Navigation (ALLOWED)
      //   - User navigates from Room A → Room B
      //   - Old page socket still in Room A (cleanup pending)
      //   - New page socket joins Room B
      //   - Solution: DON'T disconnect - different rooms, legitimate behavior
      //   - Admin dashboard deduplication shows most recent room only
      //
      if (!isBackground) {
        const duplicateSocketsInSameRoom = [];
        for (const [userKey, userData] of activeUsers.entries()) {
          // Find other sockets with same displayName in the SAME room (duplicate tabs/connections)
          if (userData.displayName === displayName &&
              userData.socketId !== socket.id &&
              userData.currentRoom === roomId &&  // CRITICAL: Only same room
              !userData.isBackgroundConnection) {
            duplicateSocketsInSameRoom.push({ userKey, userData });
          }
        }

        if (duplicateSocketsInSameRoom.length > 0) {
          console.log(`🧹 Cleaning up ${duplicateSocketsInSameRoom.length} duplicate socket(s) in room "${roomId}" for user "${displayName}"`);
          for (const { userKey, userData } of duplicateSocketsInSameRoom) {
            console.log(`   Disconnecting duplicate socket: ${userData.socketId}`);

            // Find and disconnect the old socket
            const oldSocket = io.sockets.sockets.get(userData.socketId);
            if (oldSocket) {
              oldSocket.disconnect(true);
            }

            // Clean up from data structures (in case disconnect didn't trigger)
            removeUserFromRoom(userKey);
          }
        }
      }
      // ===== END DUPLICATE SOCKET PREVENTION =====

      // Check if user already exists
      const existingUser = findUserBySocketId(socket.id);

      // If already in the same room, skip duplicate join
      if (existingUser && existingUser.userData.currentRoom === roomId) {
        console.log(`⏭️ User ${displayName} already in room ${roomId}, skipping duplicate join`);
        // Still send room-peers to handle client reconnection
        const roomUserKeys = rooms.get(roomId) || new Set();
        const otherPeers = Array.from(roomUserKeys)
          .map(key => activeUsers.get(key))
          .filter(user => user && user.socketId !== socket.id && !user.isBackgroundConnection)
          .map(user => ({
            peerId: peerId,
            displayName: user.displayName,
            joinedAt: user.joinedAt
          }));
        socket.emit('room-peers', otherPeers);
        return;
      }

      // Check if user is switching rooms
      if (existingUser && existingUser.userData.currentRoom !== roomId) {
        const oldRoomId = existingUser.userData.currentRoom;

        console.log(`🔄 Room switch detected: ${displayName} moving from ${oldRoomId} to ${roomId}`);
        console.log(`   Old userKey: ${existingUser.userKey}`);
        console.log(`   Socket ID: ${socket.id}`);

        // Remove from old room
        removeUserFromRoom(existingUser.userKey);

        // Leave old socket.io room
        socket.leave(oldRoomId);

        // Notify old room (only for non-background)
        if (!existingUser.userData.isBackgroundConnection) {
          socket.to(oldRoomId).emit('user-left', {
            peerId,
            displayName,
            userCount: getRoomUserCount(oldRoomId)
          });

          console.log(`👋 User ${displayName} left room ${oldRoomId} (remaining: ${getRoomUserCount(oldRoomId)} users)`);
        }
      }

      // Add to new room
      const { userKey, userData } = addUserToRoom(displayName, socket.id, roomId, {
        isBackgroundConnection: isBackground
      });

      console.log(`✅ Added to room ${roomId}: userKey=${userKey}, socketId=${socket.id}`);

      // Join socket.io room
      socket.join(roomId);

      // ===== Metadata durability (v4.3): repopulate-on-join =====
      // roomMetadata is in-memory and is wiped on Cloud Run scale-to-zero cold
      // starts. If a joining client carries the room's friendly name (cached
      // locally from when it was created/first joined) and the server has no
      // metadata for this room, restore it. This keeps shared-by-code room names
      // durable: the first client that still remembers the name re-seeds it for
      // everyone else. Never overwrite existing metadata; only refresh activity.
      if (!isBackground) {
        const existingMeta = roomMetadata.get(roomId);
        if (!existingMeta && roomDisplayName && String(roomDisplayName).trim()) {
          const restored = {
            displayName: String(roomDisplayName).trim(),
            createdBy: displayName || 'unknown',
            createdAt: Date.now(),
            lastActivity: Date.now(),
            restoredOnJoin: true
          };
          roomMetadata.set(roomId, restored);
          console.log(`♻️ Repopulated room metadata on join for ${roomId}:`, restored);
        } else if (existingMeta) {
          existingMeta.lastActivity = Date.now();
        }
      }

      // Calculate accurate user count
      const userCount = getRoomUserCount(roomId);

      // Debug: Show all active rooms for this display name
      let userRooms = [];
      for (const [rid, userKeys] of rooms.entries()) {
        for (const uk of userKeys) {
          const ud = activeUsers.get(uk);
          if (ud && ud.displayName === displayName && !ud.isBackgroundConnection) {
            userRooms.push({ roomId: rid, socketId: ud.socketId });
          }
        }
      }
      console.log(`🔍 User "${displayName}" is now in ${userRooms.length} room(s):`, JSON.stringify(userRooms));

      // Only broadcast user-joined for non-background connections
      if (!isBackground) {
        socket.to(roomId).emit('user-joined', {
          peerId,
          displayName,
          joinedAt: userData.joinedAt,
          userCount
        });

        // Log activity (only if we have a valid displayName)
        console.log(`📊 Logging activity: displayName="${displayName}", peerId="${peerId}", roomId="${roomId}"`);
        if (displayName && displayName.trim()) {
          addActivityLog('user-joined', {
            peerId,
            displayName: displayName.trim(),
            roomId,
            userCount
          }, '👋');
        } else {
          console.warn(`⚠️ Skipped activity log - missing displayName for ${socket.id}`);
        }
      }

      // Send current room info to new user
      const otherPeers = Array.from(rooms.get(roomId) || [])
        .map(key => activeUsers.get(key))
        .filter(user => user && user.socketId !== socket.id && !user.isBackgroundConnection)
        .map(user => ({
          peerId: peerId, // Use same peerId for compatibility
          displayName: user.displayName,
          joinedAt: user.joinedAt
        }));

      // Phase 12: replay BLE-relayed presence to the joining client. relay-presence
      // (line ~2025) only broadcasts a one-shot peer-joined, so a client that wasn't
      // connected at that instant — e.g. after a Cloud Run cold-start reconnect —
      // never learns the BLE peer exists. Fold the persistent relayPresence entries
      // for this room (same 120s freshness gate as getRoomUserCount) into otherPeers
      // so they ride the room-joined / room-peers payloads like any other peer.
      for (const entry of relayPresence.values()) {
        if (entry.roomId !== roomId) continue;
        if ((Date.now() - entry.ts) >= 120_000) continue;
        otherPeers.push({
          peerId: peerId, // Use same peerId for compatibility
          displayName: entry.displayName,
          joinedAt: entry.ts,
          relayed: true
        });
      }

      // Include the room's friendly display name (if known) so clients that
      // joined by code/QR - and never had it cached locally - can show and
      // persist the real name instead of falling back to the room code.
      const joinedMeta = roomMetadata.get(roomId);
      socket.emit('room-joined', {
        roomId,
        userCount,
        otherPeers,
        roomDisplayName: joinedMeta && joinedMeta.displayName ? joinedMeta.displayName : undefined
      });

      // Emit peer-joined for compatibility
      if (!isBackground) {
        // roomId included so a multi-room RELAY subscriber can attribute the event
        // (presence-down bridging, 07-06); web clients ignore the extra field.
        socket.to(roomId).emit('peer-joined', { peerId, displayName, roomId });
      }

      // Send current peers for compatibility
      socket.emit('room-peers', otherPeers);

      // Replay recent message history so a client that reconnects (e.g. after a
      // Cloud Run cold-start drop) catches up on messages broadcast while it was
      // gone — including relayed BLE messages, which are now persisted too. Both
      // web and Android clients merge this against their local store by id.
      const history = messageStore.has(roomId) ? messageStore.get(roomId).slice(-50) : [];
      if (history.length > 0) {
        socket.emit('message-history', history);
        console.log(`📚 Sent ${history.length} message(s) of history to ${displayName} on join`);
      }

      console.log(`✅ User ${displayName} joined room ${roomId}. Room now has ${userCount} users (${rooms.get(roomId).size} total connections)`);
    } catch (error) {
      console.error('❌ Error in join-room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  socket.on('chat-message', ({ roomId, message, type = 'chat' }) => {
    try {
      if (!rooms.has(roomId)) {
        // A relay socket can be relay-subscribed to a room that has no app-level
        // (`rooms` Map) members — that's expected, not an error. Skip the noisy
        // log for those; only flag genuinely unknown rooms from regular clients.
        const isRelaySubscribed = socket.data.relayRooms && socket.data.relayRooms.has(roomId);
        if (!isRelaySubscribed) {
          console.log(`❌ Message sent to non-existent room: ${roomId}`);
        }
        return;
      }

      // Find sender
      const sender = findUserBySocketId(socket.id);
      if (!sender) {
        console.log(`❌ Message from unknown user: ${socket.id}`);
        return;
      }

      // Phase 10.3: BLE→WebSocket bridge. When an Android bridge node relays a
      // mesh-originated message on behalf of another peer, it sets relayed=true and
      // carries the original sender. Honor it so the message is attributed to the
      // real author instead of the bridge node's socket identity. Falls back to the
      // socket's displayName for normal (non-relayed) messages.
      const originalSender = (message.relayed === true && message.sender)
        ? message.sender
        : sender.userData.displayName;

      const enhancedMessage = {
        id: message.id || generateMessageId(),
        content: message.content || message,
        sender: originalSender,
        senderId: originalSender, // Use displayName as consistent ID
        timestamp: Date.now(),
        type,
        roomId,
        fromSocket: socket.id,
        relayed: message.relayed === true,
        relayedBy: message.relayed === true ? sender.userData.displayName : undefined
      };

      // Store the message
      storeMessage(roomId, enhancedMessage);

      // CRITICAL: Broadcast to ALL connections in room (including background)
      io.to(roomId).emit('chat-message', enhancedMessage);

      // Phase 12: fan this message DOWN to relay nodes as a relay-forward so they bridge it
      // onto their BLE mesh (nord/iPad, etc.). Relays are room-subscribed and DO receive the
      // chat-message above, but their client only bridges 'relay-forward' events to BLE — a
      // plain chat-message dead-ends at the relay (the Mac→BLE "M55" loss). Mirror the reverse
      // direction (relay-forward handler → chat-message broadcast) so both ways bridge.
      // LOOP GUARD: only fan NON-relayed messages. A message that arrived via relay-forward is
      // marked relayed=true; re-fanning it would echo it back to relays forever
      // (project_ws_ble_bridge_loop_msgid). socket.to() also excludes the sending socket.
      if (!enhancedMessage.relayed && type === 'chat') {
        const meshJson = JSON.stringify({
          type: 'chat',
          msg: enhancedMessage.content,
          from: enhancedMessage.sender,
          room: roomId,
          timestamp: enhancedMessage.timestamp,
          msgId: enhancedMessage.id,
          hopCount: 0,
          maxHops: 5
        });
        // Count relay sockets (excluding sender) so we can tell "fired but no relays" from
        // "guard skipped" in the logs.
        const relayRoom = io.sockets.adapter.rooms.get('relays');
        const relayCount = relayRoom ? relayRoom.size : 0;
        socket.to('relays').emit('relay-forward', { message: meshJson, fromRelay: socket.id });
        console.log(`📡 [RELAY] fanned chat-message "${enhancedMessage.content}" (msgId=${enhancedMessage.id}) DOWN to ${relayCount} relay socket(s) in room ${roomId}`);
      }

      // Send delivery confirmation
      socket.emit('message-delivered', {
        messageId: enhancedMessage.id,
        timestamp: Date.now()
      });

      // Log activity
      addActivityLog('message-sent', {
        displayName: sender.userData.displayName,
        roomId,
        content: enhancedMessage.content.substring(0, 50) + (enhancedMessage.content.length > 50 ? '...' : ''),
        messageLength: enhancedMessage.content.length
      }, '💬');

      console.log(`💬 Message from ${sender.userData.displayName} in room ${roomId}`);
    } catch (error) {
      console.error('❌ Error in chat-message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Health check ping/pong
  socket.on('health-ping', (data) => {
    socket.emit('health-pong', { timestamp: Date.now(), received: data.timestamp });
  });

  // ===== PHASE 12: Relay backbone events =====
  // Room-agnostic: relay nodes forward all BLE-heard messages to the backbone.
  // The server fans out to all sockets in the "relays" room (excluding sender).
  // Room scoping is handled by the receiving peer, not by the relay layer.

  /**
   * relay-subscribe: join a room silently — receives chat-message events but
   * does NOT appear in activeUsers, peer counts, or user-joined broadcasts.
   * Used by relay nodes that forward between BLE mesh and backbone.
   */
  socket.on('relay-subscribe', (data) => {
    try {
      const roomId = data?.roomId;
      if (!roomId) return;
      socket.join(roomId);
      socket.data.relayRooms = socket.data.relayRooms || new Set();
      socket.data.relayRooms.add(roomId);
      console.log(`📡 [RELAY] ${socket.id} silently subscribed to room ${roomId}`);

      // Presence-down bridging (07-06): give the relay the CURRENT roster of real
      // WS users in the room so it can bridge web presence to its BLE-only peers.
      // Deltas thereafter ride the peer-joined/peer-left broadcasts the relay now
      // receives as a room member. Relayed virtual entries (relayPresence) are
      // EXCLUDED — those ARE the BLE peers, already visible over BLE.
      try {
        const userKeys = rooms.get(roomId) || new Set();
        const users = [...userKeys]
          .map((k) => activeUsers.get(k))
          .filter((u) => u && u.displayName)
          .map((u) => u.displayName);
        socket.emit('relay-roster', { roomId, users });
        console.log(`📡 [RELAY] roster snapshot for ${roomId} → ${socket.id}: [${users.join(', ')}]`);
      } catch (rosterErr) {
        console.error('[RELAY] roster snapshot error:', rosterErr);
      }

      // Replay recent message history to the relay, exactly as join-room does for a normal
      // client. A relay that (re)subscribes AFTER a message was posted — e.g. it was offline
      // when the Mac sent, or it only just learned the BLE peer's room — would otherwise never
      // see that message: relay-forward only fans LIVE messages, so a message already in the
      // room is missed forever (field-traced: M38/M40 lost when the relay's cell data was
      // toggled off during the send, then it re-subscribed on reconnect but got no history).
      // The relay's onRelayForward/history path pushes these down to its BLE peers; the peer
      // dedups by stable msgId, so a message it already has is harmless.
      const history = messageStore.has(roomId) ? messageStore.get(roomId).slice(-50) : [];
      if (history.length > 0) {
        socket.emit('message-history', history);
        console.log(`📚 [RELAY] Sent ${history.length} message(s) of history to relay ${socket.id} on subscribe to ${roomId}`);
      }
    } catch (err) {
      console.error('[RELAY] relay-subscribe error:', err);
    }
  });

  socket.on('register-relay', (data) => {
    try {
      const nodeId = data?.nodeId || 'unknown';
      socket.join('relays');
      socket.data.isRelay = true;
      socket.data.relayNodeId = nodeId;
      console.log(`📡 [RELAY] Socket ${socket.id} registered as relay (nodeId=${nodeId})`);
    } catch (err) {
      console.error('[RELAY] register-relay error:', err);
    }
  });

  socket.on('relay-forward', (data) => {
    try {
      const messageJson = data?.message;
      if (!messageJson || typeof messageJson !== 'string') return;

      // Fan out to other relay nodes (Android relay phones, etc.)
      socket.to('relays').emit('relay-forward', {
        message: messageJson,
        fromRelay: socket.id
      });

      // Also broadcast as chat-message to the room so regular WebSocket clients
      // (web browsers, non-relay Android phones) receive it.
      // Parse roomId from the embedded MeshMessage JSON.
      try {
        const parsed = JSON.parse(messageJson);
        const roomId = parsed.roomId || parsed.room;
        if (roomId && parsed.type === 'chat') {
          const broadcastMsg = {
            id: parsed.msgId || parsed.id,
            roomId,
            content: parsed.msg || parsed.content || '',
            sender: parsed.from || 'unknown',
            timestamp: parsed.timestamp || Date.now(),
            type: 'text',
            relayed: true,
            relayedBy: socket.data.relayNodeId || socket.id
          };
          io.to(roomId).emit('chat-message', broadcastMsg);
          // Persist so a client that was disconnected when this broadcast fired
          // (e.g. mid Cloud-Run-cold-start reconnect) catches up via message-history
          // on its next join-room. Relayed BLE messages were previously never stored.
          storeMessage(roomId, broadcastMsg);
          console.log(`📡 [RELAY] broadcast chat-message to room ${roomId} from relay ${socket.id}`);
        }
      } catch (parseErr) {
        console.error('[RELAY] relay-forward parse error for chat-message broadcast:', parseErr);
      }

      console.log(`📡 [RELAY] relay-forward from ${socket.id} (${messageJson.length}B) → all relays + room`);
    } catch (err) {
      console.error('[RELAY] relay-forward error:', err);
    }
  });
  // Phase 12: relay-presence — nord announces a BLE peer's room membership so WebSocket
  // clients (Mac browser) see a non-zero peer count even though a5 never sent a WS join.
  // This is presence-only: no activeUsers entry, no message history, no socket.
  // The relay sends this on every BLE room-join it processes; the server upserts the
  // virtual entry and fans out a peer-joined event to the room.
  socket.on('relay-presence', (data) => {
    try {
      const { roomId, displayName, nodeId } = data || {};
      if (!roomId || !displayName) return;
      if (!socket.data.isRelay) return; // only relays may do this

      // Upsert a virtual presence entry for the BLE peer (keyed by nodeId so
      // RPA rotation doesn't create duplicates).
      const presenceKey = `relay:${nodeId || displayName}`;
      if (!relayPresence) return; // guard: map initialised below at module scope

      relayPresence.set(presenceKey, { displayName, roomId, relaySocket: socket.id, ts: Date.now() });

      // Subscribe the relay socket to the room if not already (so chat-message fan-out reaches it).
      socket.join(roomId);

      // Tell room members a new peer appeared.
      socket.to(roomId).emit('peer-joined', { displayName, roomId, relayed: true });
      console.log(`📡 [RELAY-PRESENCE] ${displayName} (${presenceKey}) present in ${roomId} via relay ${socket.id}`);
    } catch (err) {
      console.error('[RELAY-PRESENCE] error:', err);
    }
  });

  // Phase 12: explicit relay-presence removal. The relay emits this the instant it stops bridging
  // a BLE peer (peer left BLE range, or relay mode turned off) so WebSocket clients drop it within
  // ~1s instead of waiting for the ~30s staleness sweep. The sweep (sweepStaleRelayPresence) remains
  // the safety net for cases where the relay can't send this (crash, network loss). Same removal +
  // peer-left broadcast as the sweep and the disconnect cleanup.
  socket.on('relay-presence-leave', (data) => {
    try {
      const { roomId, displayName, nodeId } = data || {};
      if (!socket.data.isRelay) return; // only relays may do this
      const presenceKey = `relay:${nodeId || displayName}`;
      const entry = relayPresence.get(presenceKey);
      // Only act on an entry this relay owns (don't let one relay evict another's peer).
      if (!entry || entry.relaySocket !== socket.id) return;
      relayPresence.delete(presenceKey);
      io.to(entry.roomId).emit('peer-left', { displayName: entry.displayName, roomId: entry.roomId, relayed: true });
      console.log(`📡 [RELAY-PRESENCE] ${entry.displayName} (${presenceKey}) left ${entry.roomId} (explicit leave from relay ${socket.id})`);
    } catch (err) {
      console.error('[RELAY-PRESENCE-LEAVE] error:', err);
    }
  });

  // ===== END PHASE 12 =====

  // ===== PHASE 2: P2P handlers removed =====
  // Legacy P2P connection handlers have been removed as they are unused.
  // The Android app handles mesh networking independently.
  // Removed handlers:
  // - request-connection
  // - connection-response
  // - request-p2p-upgrade
  // - p2p-connection-established
  // - p2p-connection-failed
  // - request-mesh-stats
  // ===== END PHASE 2 =====

  // Explicit participant leave WITHOUT a socket disconnect. Web clients "leave" by
  // disconnecting (page navigation), so room cleanup only lived in the disconnect
  // handler — but an Android RELAY that exits the room UI must keep its socket alive
  // to continue bridging (silent-relay). Without this event the relay's participant
  // registration lingered in activeUsers/rooms forever, so peers kept counting it as
  // an active room member ("2 active" incl. a swiped-away relay). Mirrors the user
  // portion of the disconnect cleanup; deliberately does NOT touch relay-presence
  // entries, socket.data.isRelay, or a relay's room-channel subscription (the relay
  // still needs the fan-out for bridging).
  socket.on('leave-room', () => {
    try {
      const user = findUserBySocketId(socket.id);
      if (!user) return;
      const { userKey, userData } = user;
      const roomId = userData.currentRoom;
      if (!roomId) return;

      removeUserFromRoom(userKey);

      const userCount = getRoomUserCount(roomId);
      socket.to(roomId).emit('user-left', {
        peerId: userData.displayName,
        displayName: userData.displayName,
        userCount
      });
      socket.to(roomId).emit('peer-left', {
        peerId: userData.displayName,
        displayName: userData.displayName,
        roomId
      });
      addActivityLog('user-left', {
        displayName: userData.displayName,
        roomId,
        userCount
      }, '👋');
      // Only non-relay sockets drop the room channel; a relay keeps receiving the
      // room's fan-out to bridge it onward.
      if (!socket.data.isRelay) socket.leave(roomId);
      console.log(`👋 User ${userData.displayName} left room ${roomId} (explicit leave-room, socket stays). Room now has ${userCount} users`);
    } catch (error) {
      console.error('❌ Error in leave-room:', error);
    }
  });

  socket.on('disconnect', () => {
    try {
      const connectionDuration = Date.now() - connectionHealth.connectedAt;
      const durationMinutes = Math.round(connectionDuration / 60000);

      console.log(`🔌 User disconnected: ${socket.id}`);
      console.log(`📊 Connection statistics: ${durationMinutes}m, cold start: ${connectionHealth.isColdStart}`);

      connectionStats.currentConnections--;

      // Find user by socket ID
      const user = findUserBySocketId(socket.id);

      // Phase 12: clean up relay-presence entries owned by this socket.
      if (socket.data.isRelay) {
        for (const [key, entry] of relayPresence.entries()) {
          if (entry.relaySocket === socket.id) {
            relayPresence.delete(key);
            socket.to(entry.roomId).emit('peer-left', { displayName: entry.displayName, roomId: entry.roomId, relayed: true });
            console.log(`📡 [RELAY-PRESENCE] removed ${entry.displayName} from ${entry.roomId} (relay disconnected)`);
          }
        }
      }

      if (user) {
        const { userKey, userData } = user;
        const roomId = userData.currentRoom;

        // Remove from room
        removeUserFromRoom(userKey);

        // Only broadcast and update for non-background disconnections
        if (!userData.isBackgroundConnection) {
          // Calculate new user count
          const userCount = getRoomUserCount(roomId);

          // Notify room
          socket.to(roomId).emit('user-left', {
            peerId: userData.displayName,
            displayName: userData.displayName,
            userCount
          });

          // Also emit peer-left for compatibility (roomId for relay roster attribution)
          socket.to(roomId).emit('peer-left', {
            peerId: userData.displayName,
            displayName: userData.displayName,
            roomId
          });

          // Log activity
          addActivityLog('user-left', {
            displayName: userData.displayName,
            roomId,
            userCount
          }, '👋');

          console.log(`👋 User ${userData.displayName} left room ${roomId}. Room now has ${userCount} users`);
        } else {
          console.log(`🔔 Background notification connection disconnected: ${userData.displayName}`);
        }
      }
    } catch (error) {
      console.error('❌ Error in disconnect:', error);
    }
  });
});

// ===== AUTOMATIC MEMORY CLEANUP =====
const CLEANUP_INTERVAL = 3600000; // 1 hour
const MAX_MESSAGES_PER_ROOM = 100;
const MAX_ACTIVITY_LOG = 1000;
const INACTIVE_USER_THRESHOLD = 86400000; // 24 hours

function cleanupOldData() {
  const now = Date.now();
  let messagesRemoved = 0;
  let roomsCleaned = 0;

  console.log('\n🧹 ===== STARTING MEMORY CLEANUP =====');

  // 1. Clean message stores - remove messages older than 24 hours for PUBLIC rooms only
  // Public rooms (pre-defined): age-based deletion + 100 message limit
  // User-created rooms: only 100 message limit (no age-based deletion)
  const publicRoomIds = [
    'main-stage-chat',
    'food-court-meetup',
    'lost-found',
    'ride-share',
    'after-party-planning',
    'vip-lounge'
  ];

  for (const [roomId, messages] of messageStore.entries()) {
    let filteredMessages = messages;
    let removedByAge = 0;
    const isPublicRoom = publicRoomIds.includes(roomId);

    // For PUBLIC rooms only: remove messages older than 24 hours
    if (isPublicRoom) {
      const oldLength = filteredMessages.length;
      filteredMessages = filteredMessages.filter(msg => {
        const messageAge = now - msg.timestamp;
        return messageAge < INACTIVE_USER_THRESHOLD; // 24 hours
      });
      removedByAge = oldLength - filteredMessages.length;
    }

    // For ALL rooms: keep only last 100 messages
    if (filteredMessages.length > MAX_MESSAGES_PER_ROOM) {
      const removedByCount = filteredMessages.length - MAX_MESSAGES_PER_ROOM;
      filteredMessages = filteredMessages.slice(-MAX_MESSAGES_PER_ROOM);
      messagesRemoved += removedByAge + removedByCount;
      roomsCleaned++;
    } else if (removedByAge > 0) {
      messagesRemoved += removedByAge;
      roomsCleaned++;
    }

    // Update the message store if anything was removed
    if (filteredMessages.length !== messages.length) {
      messageStore.set(roomId, filteredMessages);
    }
  }

  // 2. Inactive-user pruning removed: the long-lived `allUsersEver` Map was
  // dropped in favor of `activeUsers`, which only holds connected users and is
  // already cleaned on disconnect. The stale references here threw an uncaught
  // ReferenceError in this timer callback and crashed the process (Cloud Run
  // cold-restart wiped all in-memory presence → web clients saw "0 online").

  // 3. Clean activity log - keep only last 1000 entries
  if (activityLog.length > MAX_ACTIVITY_LOG) {
    const removed = activityLog.length - MAX_ACTIVITY_LOG;
    activityLog.splice(0, removed);
    console.log(`   - Trimmed activity log: removed ${removed} old entries`);
  }

  // 4. Report memory usage (P2P cleanup removed in Phase 2)
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

  console.log('🧹 Cleanup Results:');
  console.log(`   - Messages removed: ${messagesRemoved} from ${roomsCleaned} rooms`);
  console.log(`   - Current memory: ${heapUsedMB}MB / ${heapTotalMB}MB`);
  console.log(`   - Active rooms: ${rooms.size}`);
  console.log(`   - Total rooms ever: ${allRoomsEverCreated.size}`);
  console.log(`   - Active users: ${activeUsers.size}`);
  console.log('🧹 ===== CLEANUP COMPLETE =====\n');
}

// Run cleanup every hour
const cleanupTimer = setInterval(cleanupOldData, CLEANUP_INTERVAL);

// Phase 12: sweep stale relay-presence entries. A relay re-announces a bridged BLE peer every
// ~10s; when the peer leaves BLE range (or the relay stops bridging it but its socket stays up),
// the entry stops refreshing. Without this sweep the only removal path is the relay SOCKET fully
// disconnecting (disconnect handler ~line 2117) — so a gone BLE peer lingered in every WebSocket
// client's UI (e.g. the Mac kept showing a5) until the relay went offline entirely. Emit peer-left
// per swept entry so clients drop it promptly, mirroring the disconnect-cleanup broadcast.
function sweepStaleRelayPresence() {
  const now = Date.now();
  for (const [key, entry] of relayPresence.entries()) {
    if (now - entry.ts < STALE_RELAY_PRESENCE_MS) continue;
    relayPresence.delete(key);
    io.to(entry.roomId).emit('peer-left', { displayName: entry.displayName, roomId: entry.roomId, relayed: true });
    console.log(`📡 [RELAY-PRESENCE] swept stale ${entry.displayName} from ${entry.roomId} (${Math.round((now - entry.ts) / 1000)}s since last announce)`);
  }
}
const relayPresenceSweepTimer = setInterval(sweepStaleRelayPresence, RELAY_PRESENCE_SWEEP_INTERVAL);

// Run initial cleanup after 10 minutes of uptime (let server stabilize first)
setTimeout(() => {
  console.log('⏰ Running initial cleanup after 10 minutes uptime');
  cleanupOldData();
}, 600000);

// Cleanup on shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, cleaning up...');
  clearInterval(cleanupTimer);
  clearInterval(relayPresenceSweepTimer);
  cleanupOldData();
  server.close(() => {
    console.log('👋 Server closed gracefully');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎪 ===== PEDDLENET SIGNALING SERVER STARTED =====`);
  console.log(`🏷️ Version: 4.3.5-cleanup-crash-fix`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${getEnvironment()}`);
  console.log(`🔧 Build Target: ${buildTarget}`);
  console.log(`⚙️ Platform: ${platform}`);
  console.log(`🔒 Admin Authentication: ENABLED`);
  console.log(`   - Admin: ${ADMIN_CREDENTIALS.admin.username} (full access)`);
  console.log(`📊 Admin Dashboard: /admin/analytics`);
  console.log(`🎯 Room-specific broadcast: /admin/broadcast/room`);
  console.log(`🗑️ Room message clearing: /admin/room/clear [ADMIN]`);
  console.log(`💥 Database wipe: /admin/database/wipe [ADMIN]`);
  console.log(`🎪 ===== READY FOR FESTIVAL CHAT =====\n`);
});

module.exports = { app, server, io };
