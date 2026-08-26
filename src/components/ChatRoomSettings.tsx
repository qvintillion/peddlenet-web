'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useBackgroundNotifications } from '@/hooks/use-background-notifications';

interface ChatRoomSettingsProps {
  roomId: string;
  className?: string;
  onClose?: () => void;
}

export function ChatRoomSettings({ roomId, className = '', onClose }: ChatRoomSettingsProps) {
  const router = useRouter();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const { unsubscribeFromRoom } = useBackgroundNotifications();
  
  const {
    permission,
    isSupported,
    isSubscribed,
    settings,
    requestPermission,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    updateSettings,
    sendTestNotification
  } = usePushNotifications(roomId);

  const handlePermissionRequest = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      await subscribeToNotifications();
    }
  };

  const handleSubscriptionToggle = async () => {
    if (isSubscribed) {
      await unsubscribeFromNotifications();
      // Also unsubscribe from background notifications
      unsubscribeFromRoom(roomId);
    } else {
      if (permission === 'granted') {
        await subscribeToNotifications();
      } else {
        await handlePermissionRequest();
      }
    }
  };

  const handleLeaveRoom = () => {
    // Remove from favorites AND unsubscribe from notifications
    // This is the same as clicking the X button on the favorites card
    
    // Remove from favorites list
    const favorites = JSON.parse(localStorage.getItem('favoriteRooms') || '[]');
    const updatedFavorites = favorites.filter((id: string) => id !== roomId);
    localStorage.setItem('favoriteRooms', JSON.stringify(updatedFavorites));
    
    // Unsubscribe from both push notifications and background notifications
    if (isSubscribed) {
      unsubscribeFromNotifications();
    }
    
    // Also unsubscribe from background notifications
    unsubscribeFromRoom(roomId);
    
    // Dispatch custom event to notify Favorites component
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('favoritesChanged'));
    }
    
    // Navigate back to homepage
    router.push('/app');
    
    // Close settings if callback provided
    if (onClose) {
      onClose();
    }
  };

  if (!isSupported) {
    return (
      <div className={`p-4 bg-gray-800 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-gray-400">
          <span>🔔</span>
          <div>
            <h3 className="font-semibold text-sm">Notifications</h3>
            <p className="text-xs">Not supported in this browser</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-gray-800 rounded-lg border border-gray-600 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center space-x-2">
            <span>⚙️</span>
            <span>Room Settings</span>
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Leave Room Section */}
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-medium text-red-200">Leave Room</h4>
              <p className="text-xs text-red-300">
                Remove from favorites and unsubscribe from notifications
              </p>
            </div>
          </div>
          
          {!showLeaveConfirm ? (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="w-full py-2 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              🚪 Leave Room
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-200 font-medium">
                This will remove the room from your favorites and turn off notifications.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleLeaveRoom}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Yes, Leave
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification Settings */}
        <div className="space-y-3">
          <h4 className="font-semibold text-white">🔔 Notifications</h4>

          {/* Permission Status */}
          {permission === 'default' && (
            <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-200 mb-2">
                ⚠️ Notifications not enabled. <Link href="/app" className="underline font-medium">Enable on homepage</Link> first.
              </p>
            </div>
          )}

          {permission === 'denied' && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-200 mb-2">
                ❌ Notifications are blocked. To enable:
              </p>
              <ul className="text-xs text-red-300 space-y-1 mb-3">
                <li>• Click the lock icon in your address bar</li>
                <li>• Allow notifications for this site</li>
                <li>• Refresh the page</li>
              </ul>
            </div>
          )}

          {permission === 'granted' && (
            <>
              {/* Room Subscription Toggle */}
              <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-white">Room notifications</p>
                    <p className="text-xs text-gray-300">
                      Get notified when you're away from this room
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isSubscribed}
                      onChange={handleSubscriptionToggle}
                      className="sr-only"
                    />
                    <div
                      onClick={handleSubscriptionToggle}
                      className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${
                        isSubscribed ? 'bg-purple-600' : 'bg-gray-400'
                      }`}
                    >
                      <div
                        className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                          isSubscribed ? 'transform translate-x-6' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  {isSubscribed 
                    ? "✓ You'll get notified when away from this room" 
                    : "Toggle on to get notifications for this room"
                  }
                </p>
              </div>

              {/* Notification Preferences */}
              {isSubscribed && (
                <div className="space-y-2">
                  <h5 className="font-medium text-sm text-white">Notify me when:</h5>
                  
                  {/* New Messages Toggle */}
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded border border-gray-600">
                    <div>
                      <span className="text-sm text-gray-200">Someone sends a message</span>
                      <p className="text-xs text-gray-400">Get notified for all new messages</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={settings.newMessages}
                        onChange={(e) => updateSettings({ newMessages: e.target.checked })}
                        className="sr-only"
                      />
                      <div
                        onClick={() => updateSettings({ newMessages: !settings.newMessages })}
                        className={`block w-10 h-6 rounded-full cursor-pointer transition-colors ${
                          settings.newMessages ? 'bg-purple-600' : 'bg-gray-400'
                        }`}
                      >
                        <div
                          className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                            settings.newMessages ? 'transform translate-x-4' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </label>
                  
                  {/* User Joined Toggle */}
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded border border-gray-600">
                    <div>
                      <span className="text-sm text-gray-200">Someone joins</span>
                      <p className="text-xs text-gray-400">When new people join the room</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={settings.userJoined}
                        onChange={(e) => updateSettings({ userJoined: e.target.checked })}
                        className="sr-only"
                      />
                      <div
                        onClick={() => updateSettings({ userJoined: !settings.userJoined })}
                        className={`block w-10 h-6 rounded-full cursor-pointer transition-colors ${
                          settings.userJoined ? 'bg-purple-600' : 'bg-gray-400'
                        }`}
                      >
                        <div
                          className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                            settings.userJoined ? 'transform translate-x-4' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </label>
                  
                  {/* User Left Toggle */}
                  <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded border border-gray-600">
                    <div>
                      <span className="text-sm text-gray-200">Someone leaves</span>
                      <p className="text-xs text-gray-400">When people leave the room</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={settings.userLeft}
                        onChange={(e) => updateSettings({ userLeft: e.target.checked })}
                        className="sr-only"
                      />
                      <div
                        onClick={() => updateSettings({ userLeft: !settings.userLeft })}
                        className={`block w-10 h-6 rounded-full cursor-pointer transition-colors ${
                          settings.userLeft ? 'bg-purple-600' : 'bg-gray-400'
                        }`}
                      >
                        <div
                          className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                            settings.userLeft ? 'transform translate-x-4' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </label>

                  {/* Test Notification */}
                  <button
                    onClick={sendTestNotification}
                    className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    🧪 Send Test Notification
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Festival Tips */}
        <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <p className="text-xs text-blue-200 font-medium mb-1">🎪 Festival Tips:</p>
          <ul className="text-xs text-blue-300 space-y-1">
            <li>• Notifications work even when your phone is locked</li>
            <li>• Tap notification to jump back to the conversation</li>
            <li>• Only get notified when app is in background</li>
            <li>• Battery optimized - won't drain your phone</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
