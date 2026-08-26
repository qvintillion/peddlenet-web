'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export default function P2PDiagnosticPage() {
  const [peer, setPeer] = useState<any>(null);
  const [peerId, setPeerId] = useState<string>('');
  const [targetPeerId, setTargetPeerId] = useState<string>('');
  const [connection, setConnection] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [messageToSend, setMessageToSend] = useState('');
  const [receivedMessages, setReceivedMessages] = useState<any[]>([]);
  const router = useRouter();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  // Initialize PeerJS
  const initPeer = () => {
    if (typeof window === 'undefined' || !window.Peer) {
      addLog('❌ PeerJS not loaded');
      return;
    }

    addLog('🚀 Initializing PeerJS...');
    
    const newPeer = new window.Peer(undefined, {
      debug: 3, // Maximum debug level
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    newPeer.on('open', (id: string) => {
      addLog(`✅ PeerJS initialized with ID: ${id}`);
      setPeerId(id);
    });

    newPeer.on('connection', (conn: any) => {
      addLog(`📞 Incoming connection from: ${conn.peer}`);
      setupConnection(conn);
    });

    newPeer.on('error', (error: any) => {
      addLog(`❌ Peer error: ${error.type} - ${error.message}`);
    });

    newPeer.on('disconnected', () => {
      addLog('🔌 Peer disconnected');
    });

    setPeer(newPeer);
  };

  // Setup connection handlers
  const setupConnection = (conn: any) => {
    addLog(`🔗 Setting up connection with: ${conn.peer}`);
    
    conn.on('open', () => {
      addLog(`✅ Connection opened with: ${conn.peer}`);
      setConnection(conn);
      
      // Send test ping
      const pingData = { type: 'ping', timestamp: Date.now() };
      conn.send(pingData);
      addLog(`🏓 Sent ping: ${JSON.stringify(pingData)}`);
    });

    conn.on('data', (data: any) => {
      addLog(`📨 Received data: ${JSON.stringify(data)}`);
      setReceivedMessages(prev => [...prev, { data, timestamp: Date.now(), from: conn.peer }]);
      
      // Auto-respond to ping with pong
      if (data.type === 'ping') {
        const pongData = { type: 'pong', timestamp: Date.now() };
        conn.send(pongData);
        addLog(`🏓 Sent pong: ${JSON.stringify(pongData)}`);
      }
    });

    conn.on('close', () => {
      addLog(`❌ Connection closed with: ${conn.peer}`);
      if (connection?.peer === conn.peer) {
        setConnection(null);
      }
    });

    conn.on('error', (error: any) => {
      addLog(`⚠️ Connection error: ${error}`);
    });
  };

  // Connect to peer
  const connectToPeer = () => {
    if (!peer || !targetPeerId) {
      addLog('❌ Cannot connect: No peer or target ID');
      return;
    }

    addLog(`🚀 Connecting to: ${targetPeerId}`);
    const conn = peer.connect(targetPeerId, {
      reliable: true,
      metadata: { source: 'diagnostic' }
    });

    setupConnection(conn);
  };

  // Send custom message
  const sendMessage = () => {
    if (!connection || !connection.open) {
      addLog('❌ No open connection');
      return;
    }

    try {
      const messageData = {
        type: 'chat',
        content: messageToSend,
        timestamp: Date.now(),
        id: crypto.randomUUID()
      };
      
      connection.send(messageData);
      addLog(`✅ Sent message: ${JSON.stringify(messageData)}`);
      setMessageToSend('');
    } catch (error) {
      addLog(`❌ Send error: ${error}`);
    }
  };

  // Test data channel
  const testDataChannel = () => {
    if (!connection || !connection.open) {
      addLog('❌ No open connection');
      return;
    }

    addLog('🧪 Testing data channel...');
    
    // Test 1: Simple string
    try {
      connection.send('Hello World');
      addLog('✅ Test 1: Sent simple string');
    } catch (e) {
      addLog(`❌ Test 1 failed: ${e}`);
    }

    // Test 2: JSON object
    setTimeout(() => {
      try {
        connection.send({ test: 'json', number: 123 });
        addLog('✅ Test 2: Sent JSON object');
      } catch (e) {
        addLog(`❌ Test 2 failed: ${e}`);
      }
    }, 100);

    // Test 3: Complex message
    setTimeout(() => {
      try {
        connection.send({
          type: 'chat',
          content: 'Test message',
          sender: 'Diagnostic',
          timestamp: Date.now(),
          id: crypto.randomUUID()
        });
        addLog('✅ Test 3: Sent complex message');
      } catch (e) {
        addLog(`❌ Test 3 failed: ${e}`);
      }
    }, 200);

    // Test 4: Check if data channel is really open
    setTimeout(() => {
      addLog(`📊 Data channel state: ${connection.dataChannel?.readyState || 'unknown'}`);
      addLog(`📊 Connection open: ${connection.open}`);
      addLog(`📊 Peer connection state: ${connection.peerConnection?.connectionState || 'unknown'}`);
    }, 300);
  };

  // Initialize on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Peer) {
      initPeer();
    }

    return () => {
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
    };
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">P2P Connection Diagnostic</h1>
        <button
          onClick={() => router.push('/app')}
          className="text-blue-600 hover:text-blue-700"
        >
          ← Back
        </button>
      </div>

      {/* Status */}
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold mb-2">Status</h2>
        <div className="space-y-1 text-sm">
          <div>PeerJS Loaded: {typeof window !== 'undefined' && window.Peer ? '✅' : '❌'}</div>
          <div>Peer ID: {peerId || 'Not initialized'}</div>
          <div>Connection: {connection ? `Connected to ${connection.peer}` : 'Not connected'}</div>
          <div>Connection Open: {connection?.open ? '✅' : '❌'}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 mb-4">
        {/* Initialize */}
        {!peer && (
          <button
            onClick={initPeer}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Initialize PeerJS
          </button>
        )}

        {/* Connect */}
        {peer && (
          <div className="flex space-x-2">
            <input
              type="text"
              value={targetPeerId}
              onChange={(e) => setTargetPeerId(e.target.value)}
              placeholder="Enter target Peer ID"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={connectToPeer}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Connect
            </button>
          </div>
        )}

        {/* Test Data Channel */}
        {connection && (
          <button
            onClick={testDataChannel}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Test Data Channel
          </button>
        )}

        {/* Send Message */}
        {connection && (
          <div className="flex space-x-2">
            <input
              type="text"
              value={messageToSend}
              onChange={(e) => setMessageToSend(e.target.value)}
              placeholder="Enter message to send"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Send Message
            </button>
          </div>
        )}
      </div>

      {/* Received Messages */}
      {receivedMessages.length > 0 && (
        <div className="bg-green-50 p-4 rounded mb-4">
          <h2 className="font-bold mb-2">Received Messages</h2>
          <div className="space-y-2 text-sm font-mono">
            {receivedMessages.map((msg, i) => (
              <div key={i} className="p-2 bg-white rounded">
                <div className="text-xs text-gray-500">From: {msg.from} at {new Date(msg.timestamp).toLocaleTimeString()}</div>
                <div>{JSON.stringify(msg.data, null, 2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="bg-gray-900 text-green-400 p-4 rounded">
        <h2 className="font-bold mb-2">Logs</h2>
        <div className="h-96 overflow-y-auto text-xs font-mono space-y-1">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      </div>

      {/* Quick Copy */}
      {peerId && (
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <div className="flex justify-between items-center">
            <span className="text-sm">Your Peer ID:</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(peerId);
                addLog('📋 Peer ID copied to clipboard');
              }}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Copy
            </button>
          </div>
          <div className="font-mono text-sm mt-1 break-all">{peerId}</div>
        </div>
      )}
    </div>
  );
}
