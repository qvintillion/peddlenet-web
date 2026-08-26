'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RoomCodeJoin } from '@/components/RoomCode';
import { useBackgroundNotifications, useGlobalBackgroundNotifications } from '@/hooks/use-background-notifications';
import { CompactGlobalNotificationBanner } from '@/components/CompactGlobalNotificationBanner';
import { JoinedRooms } from '@/components/JoinedRooms';
import { RecentRooms } from '@/components/RecentRooms';
import { PublicRooms } from '@/components/PublicRooms';
import { generateRoomCode } from '@/utils/generate-room-code';
import { ServerUtils } from '@/utils/server-utils';

export default function HomePage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  
  // Background notifications state
  const { setCurrentRoom } = useBackgroundNotifications();
  
  // Global notification handler for homepage
  useGlobalBackgroundNotifications();
  
  // Set current room to null when on homepage
  useEffect(() => {
    setCurrentRoom(null);
  }, [setCurrentRoom]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('displayName');
      if (savedName) setDisplayName(savedName);
      
      // Check URL params to set initial mode
      const urlParams = new URLSearchParams(window.location.search);
      const urlMode = urlParams.get('mode');
      if (urlMode === 'join') {
        setMode('join');
      } else if (urlMode === 'create') {
        setMode('create');
      }
      // If no mode specified, default to 'create' (already set in useState)
    }
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setIsCreating(true);
    console.log('🚀 Creating room with name:', roomName);

    try {
      // Ensure user has a display name
      let userName = displayName;
      if (!userName) {
        userName = prompt('Enter your display name:') || `Host_${Math.floor(Math.random() * 1000)}`;
        localStorage.setItem('displayName', userName);
        setDisplayName(userName);
        console.log('📝 Set display name:', userName);
      }

      // Generate memorable room code - this IS the room ID
      const roomCode = generateRoomCode();
      console.log('🏷️ Generated room code:', roomCode);

      // Store the display name for this room (localStorage for immediate access)
      localStorage.setItem(`room:${roomCode}:name`, roomName);

      // Store metadata on server for cross-platform sync
      try {
        const serverUrl = ServerUtils.getHttpServerUrl();
        const response = await fetch(`${serverUrl}/room/${roomCode}/metadata`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: roomName,
            createdBy: userName
          })
        });

        if (response.ok) {
          console.log('✅ Room metadata stored on server');
        } else {
          console.warn('⚠️ Failed to store room metadata on server, using localStorage only');
        }
      } catch (error) {
        console.warn('⚠️ Could not reach server, using localStorage only:', error);
      }

      const targetUrl = `/chat/${roomCode}`;
      console.log('🗺️ Navigating to:', targetUrl);

      // Use Next.js router now that we have SSR
      router.push(targetUrl);
      console.log('✅ Navigation initiated');
      
    } catch (error) {
      console.error('❌ Error creating room:', error);
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 text-white px-6 py-12 flex flex-col items-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/peddlenet-logo.svg" 
              alt="PeddleNet Logo" 
              className="w-20 h-16"
            />
          </div>
          <h1 className="text-4xl font-bold mb-2">PeddleNet</h1>
          <p className="text-purple-200">Create instant P2P chat rooms</p>
        </div>
        
        {/* Compact Global Notification Banner */}
        <CompactGlobalNotificationBanner className="mb-6" />
        
        {/* Mode Toggle */}
        <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => {
              setMode('create');
              // Update URL to reflect the mode
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('mode', 'create');
                window.history.replaceState({}, '', url.toString());
              }
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              mode === 'create'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            🏠 Create Room
          </button>
          <button
            onClick={() => {
              setMode('join');
              // Update URL to reflect the mode
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('mode', 'join');
                window.history.replaceState({}, '', url.toString());
              }
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              mode === 'join'
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            🚪 Join Room
          </button>
        </div>
        
        {/* Conditional Form Rendering */}
        {mode === 'create' ? (
          <form onSubmit={handleCreateRoom} className="space-y-6" suppressHydrationWarning={true}>
            <div>
              <label className="block mb-3 font-semibold text-lg">Room Name</label>
              <input
                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                placeholder="e.g. Main Stage VIP"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                disabled={isCreating}
                required
                suppressHydrationWarning={true}
              />
              <p className="mt-1 text-xs text-purple-200">
                💡 A memorable room code will be generated (e.g., "cosmic-dragon-42")
              </p>
            </div>

            <button
              type="submit"
              disabled={!roomName.trim() || isCreating}
              className="w-full py-4 rounded-lg bg-purple-600 font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isCreating ? '🚀 Creating Room...' : '🎪 Create & Join Room'}
            </button>
            
            {/* Festival Reconnection Tips */}
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center">
                <span className="mr-2">🎪</span>
                Festival Room Creation
              </h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Your room gets a unique code others can use to join</li>
                <li>• Share the QR code or room code with your festival crew</li>
                <li>• Room stays active even if you temporarily disconnect</li>
                <li>• Already have a room? <button onClick={() => {
                  setMode('join');
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('mode', 'join');
                    window.history.replaceState({}, '', url.toString());
                  }
                }} className="text-purple-400 hover:text-purple-300 underline">Use "Join Room" tab</button></li>
              </ul>
            </div>
          </form>
        ) : (
          /* Join Room Section - Enhanced Layout */
          <div className="space-y-6">
            {/* Room Code Join - Primary Method */}
            <div>
              <RoomCodeJoin className="" />
            </div>
            
            {/* Joined Rooms Section */}
            <JoinedRooms className="" />
            
            {/* Recent Rooms Section */}
            <RecentRooms className="" />
            
            {/* Public Rooms - Moved from Create Room */}
            <PublicRooms className="" />
          </div>
        )}

        {displayName && (
          <div className="mt-4 text-center text-sm text-purple-200">
            Peddling as: <span className="font-semibold">{displayName}</span>
            <button
              onClick={() => {
                const newName = prompt('Change display name:', displayName);
                if (newName) {
                  localStorage.setItem('displayName', newName);
                  setDisplayName(newName);
                }
              }}
              className="ml-2 text-purple-400 hover:text-purple-300"
            >
              (change)
            </button>
          </div>
        )}

        {/* Network Diagnostics CTA */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <Link
            href="/diagnostics"
            className="w-full flex items-center justify-center py-3 px-4 border-2 border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 hover:border-gray-500 transition-colors text-sm"
          >
            <span className="mr-2">🔍</span>
            Network Diagnostics
          </Link>
          <p className="text-xs text-gray-500 text-center mt-2">
            Test connection capabilities and troubleshoot issues
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-400">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span>Offline - P2P Only</span>
        </div>
      </div>
    </main>
  );
}
