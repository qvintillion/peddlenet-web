import { NextRequest, NextResponse } from 'next/server';

// Required for static export builds
export const dynamic = 'force-dynamic';


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
  
  console.log('👥 Admin Users: Attempting to fetch from WebSocket server:', wsServerUrl);
  
  try {
    // Fetch real user data from your WebSocket server
    console.log('📡 Making request to:', `${wsServerUrl}/admin/users`);
    const response = await fetch(`${wsServerUrl}/admin/users`, {
      headers: {
        'Authorization': request.headers.get('authorization') || ''
      },
      timeout: 5000
    });

    console.log('📊 Response status:', response.status, response.statusText);

    if (response.ok) {
      const realData = await response.json();
      console.log('✅ Successfully fetched real user data:', realData);
      return NextResponse.json(realData);
    } else {
      console.log('❌ WebSocket server users endpoint responded with error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('❌ Error response body:', errorText);
    }
  } catch (error) {
    console.error('❌ Failed to fetch users from WebSocket server:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
  }

  console.log('🚨 NO REAL USER DATA AVAILABLE - WebSocket server connection failed');
  console.log('🚨 Server URL attempted:', wsServerUrl);

  // Return error state instead of fallback data
  return NextResponse.json({
    error: 'WebSocket server connection failed',
    serverUrl: wsServerUrl,
    message: 'Your WebSocket server is offline or the admin users endpoint does not exist',
    users: [],
    totalUsers: 0,
    activeUsers: 0,
    timestamp: Date.now()
  });
}

export async function DELETE(request: NextRequest) {
  // Check authentication
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // In production, this would remove the user from your database/system
    console.log(`Admin removed user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: `User ${userId} has been removed`,
      timestamp: Date.now()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}