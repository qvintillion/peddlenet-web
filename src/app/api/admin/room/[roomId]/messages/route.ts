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

// In-memory message storage (shared with room code registration)
// In a real implementation, this would be a database
const roomMessages = new Map<string, any[]>();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string } }
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
    const { roomId } = params;

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Clear messages from in-memory storage
    const messagesDeleted = roomMessages.get(roomId)?.length || 0;
    roomMessages.delete(roomId);

    console.log(`🗑️ Vercel: Cleared ${messagesDeleted} messages for room ${roomId}`);

    // For Vercel deployment, we can't directly notify connected users
    // The WebSocket server would handle that functionality
    const response = {
      success: true,
      roomId,
      messagesDeleted,
      usersNotified: 0, // Would require WebSocket server integration
      timestamp: Date.now(),
      platform: 'vercel',
      note: 'Messages cleared from Vercel storage. Live users would need WebSocket server integration for notifications.'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Clear room messages error:', error);
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
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}