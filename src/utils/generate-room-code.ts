/**
 * Generate memorable room codes for easy sharing
 * Format: adjective-noun-number (e.g., "cosmic-dragon-42")
 */

// 🔑 ADR-0009 Stage 1a (10-20): `generateRoomCode` / `isValidRoomCode` and their word lists are
// GONE. The `adjective-noun-NN` code was the room id AND its only gate, at ~18 bits; new crews
// are minted by `mintCrew()` in `@/lib/room-secret`. Display helpers stay: legacy ids live on.

/**
 * Prettify a room code for display
 * @param code - Room code like "cosmic-dragon-42"
 * @returns Prettified version like "Cosmic Dragon 42"
 */
export function prettifyRoomCode(code: string): string {
  return code
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Resolve a room's display name: the locally-cached name (set when this client
 * created/cached the room) if present, otherwise the prettified room code.
 *
 * NOTE: this reads localStorage, so it must only be called in the browser
 * (event handlers, effects, or memoized render-phase reads in client
 * components). For SSR-rendered initial state, use prettifyRoomCode(roomId)
 * directly to avoid a hydration mismatch (React error #418).
 *
 * @param roomId - The room ID
 * @returns Cached display name, or prettified room code as fallback
 */
export function getRoomDisplayName(roomId: string): string {
  if (typeof window !== 'undefined') {
    const storedName = localStorage.getItem(`room:${roomId}:name`);
    if (storedName) return storedName;
  }
  return prettifyRoomCode(roomId);
}
