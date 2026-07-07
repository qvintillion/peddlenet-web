import { NextRequest, NextResponse } from 'next/server';

// Required for static export builds
export const dynamic = 'force-dynamic';
export const revalidate = false;

// Simple authentication check for admin routes
function isAuthenticated(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  // Check credentials (allow environment override)
  // Env-only credentials — the old hardcoded fallbacks were published in the
  // public repo (and remain in its git history). Fail closed when unset.
  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;
  if (!validUsername || !validPassword) return false;
  
  return username === validUsername && password === validPassword;
}

export async function GET(request: NextRequest) {
  // Check authentication
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { 
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Festival Chat Admin Dashboard"'
        }
      }
    );
  }

  // Get the WebSocket server URL from environment
  const wsServerUrl = process.env.NEXT_PUBLIC_SIGNALING_SERVER?.replace('wss://', 'https://').replace('ws://', 'http://') || 'http://localhost:8080';
  
  console.log('🔍 Admin Rooms: Attempting to fetch from WebSocket server:', wsServerUrl);
  
  try {
    // Fetch real room data from your WebSocket server
    console.log('📡 Making rooms request to:', `${wsServerUrl}/admin/rooms/detailed`);
    const response = await fetch(`${wsServerUrl}/admin/rooms/detailed`, {
      headers: {
        'Authorization': request.headers.get('authorization') || ''
      },
      timeout: 5000
    });

    console.log('📊 Rooms response status:', response.status, response.statusText);

    if (response.ok) {
      const realData = await response.json();
      console.log('✅ Successfully fetched real room data from WebSocket server:', realData);
      return NextResponse.json(realData);
    } else {
      console.log('❌ WebSocket server rooms endpoint responded with error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('❌ Rooms error response body:', errorText);
    }
  } catch (error) {
    console.error('❌ Failed to fetch rooms from WebSocket server:', error);
    console.error('❌ Rooms error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
  }

  console.log('🚨 NO REAL ROOM DATA AVAILABLE - WebSocket server connection failed');
  console.log('🚨 Rooms Server URL attempted:', wsServerUrl);

  // Return empty rooms instead of demo data
  return NextResponse.json({
    activeRooms: [],
    summary: {
      totalRooms: 0,
      totalActiveUsers: 0,
      totalMessages: 0,
      timestamp: Date.now()
    },
    error: 'WebSocket server rooms endpoint unavailable',
    serverUrl: wsServerUrl,
    message: 'Your WebSocket server rooms endpoint is offline or not responding'
  });
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}