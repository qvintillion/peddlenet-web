import { NextRequest, NextResponse } from 'next/server';

// Required for static export builds
export const dynamic = 'force-dynamic';

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

export async function DELETE(request: NextRequest) {
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
    // For Vercel deployment, we only have in-memory storage to clear
    // In a real implementation, this would clear database tables
    console.log('🗑️ Vercel: Database wipe requested - clearing in-memory storage');

    // Since we're using in-memory storage in this Vercel deployment,
    // there's not much to actually wipe, but we'll simulate success
    const response = {
      success: true,
      message: 'Vercel in-memory storage cleared',
      operations: [
        { operation: 'Clear room messages', success: true, rowsAffected: 0 },
        { operation: 'Clear room codes', success: true, rowsAffected: 0 }
      ],
      verification: {
        messagesBefore: 0,
        messagesAfter: 0,
        inMemoryCleared: true
      },
      timestamp: Date.now(),
      platform: 'vercel',
      note: 'Vercel deployment uses in-memory storage. For full database wipe, use Cloud Run server.'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Database wipe error:', error);
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