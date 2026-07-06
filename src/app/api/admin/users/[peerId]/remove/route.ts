import { NextRequest, NextResponse } from 'next/server';

// Simple authentication check
function isAuthenticated(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  // Env-only credentials — the old hardcoded fallbacks were published in the
  // public repo (and remain in its git history). Fail closed when unset.
  const validUsername = process.env.ADMIN_USERNAME;
  const validPassword = process.env.ADMIN_PASSWORD;
  if (!validUsername || !validPassword) return false;
  
  return username === validUsername && password === validPassword;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { peerId: string } }
) {
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

  try {
    const { peerId } = params;
    const body = await request.json();
    const { roomId, reason = 'Removed by admin' } = body;

    if (!peerId || !roomId) {
      return NextResponse.json(
        { error: 'Peer ID and Room ID are required' },
        { status: 400 }
      );
    }

    console.log(`🚫 Admin: Attempting to remove user ${peerId} from room ${roomId}`);

    // For Vercel deployment, we can't directly remove users from WebSocket connections
    // This would require integration with the WebSocket server
    const response = {
      success: true,
      removedUser: {
        peerId,
        roomId,
        displayName: 'Unknown User', // Would come from WebSocket server
        removedAt: new Date().toISOString(),
        reason
      },
      platform: 'vercel',
      note: 'User removal logged but requires WebSocket server integration for live effect'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Remove user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}