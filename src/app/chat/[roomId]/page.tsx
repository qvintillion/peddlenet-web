'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { InviteLanding } from '@/components/InviteLanding';
import nextDynamic from 'next/dynamic';
import { webChatEnabled } from '@/lib/install-links';

// LAZY: the 890-line browser chat drags in socket.io, qrcode and the diagnostics panels, and the
// invite landing is what nearly every visit to this route renders. Loaded only on "Continue in
// browser". (`nextDynamic`, because this module already exports the route config `dynamic`.)
const ChatRoom = nextDynamic(() => import('./ChatRoom'), { ssr: false });

// Disable static generation for chat pages to avoid SSR issues
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `/chat/<id>` is where every shared invite lands (ADR-0009 Stage 1a smart link, 10-20). It opens
 * on the invite (open the app / install / the code), not on the browser chat. That chat needs the
 * WebSocket relay, so it is only reachable when [webChatEnabled], and only by choice.
 */
export default function ChatRoute() {
  const params = useParams();
  const roomId = typeof params.roomId === 'string' ? decodeURIComponent(params.roomId) : '';
  const [inBrowser, setInBrowser] = useState(false);

  if (webChatEnabled && inBrowser) return <ChatRoom />;
  return <InviteLanding roomId={roomId} onContinueInBrowser={() => setInBrowser(true)} />;
}
