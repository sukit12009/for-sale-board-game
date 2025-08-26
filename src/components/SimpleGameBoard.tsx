'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface SimpleGameBoardProps {
  username: string;
  gameId?: string;
}

export default function SimpleGameBoard({ username, gameId }: SimpleGameBoardProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    console.log('Initializing Socket.IO connection...');
    
    const socketInstance = io({
      path: '/api/socket'
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server:', socketInstance.id);
      setConnectionStatus('connected');
      setSocket(socketInstance);
      
      if (gameId) {
        console.log('Joining game:', gameId);
        socketInstance.emit('join-game', { gameId, username });
      } else {
        console.log('Creating new game...');
        socketInstance.emit('create-game', { username });
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus('disconnected');
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message);
    });

    socketInstance.on('game-created', (game) => {
      console.log('Game created:', game);
      setGameState(game);
    });

    socketInstance.on('game-updated', (game) => {
      console.log('Game updated:', game);
      setGameState(game);
    });

    return () => {
      console.log('Cleaning up socket connection...');
      socketInstance.disconnect();
    };
  }, [gameId, username]);

  const startGame = () => {
    if (socket && gameState) {
      console.log('Starting game:', gameState.id);
      socket.emit('start-game', gameState.id);
    }
  };

  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
        <div className="text-white text-xl">เชื่อมต่อเซิร์ฟเวอร์...</div>
      </div>
    );
  }

  if (connectionStatus === 'disconnected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">การเชื่อมต่อขาดหาย</h1>
          <button 
            onClick={() => window.location.reload()}
            className="bg-white text-red-600 px-6 py-2 rounded-lg font-semibold"
          >
            เชื่อมต่อใหม่
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">เกิดข้อผิดพลาด</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
        <div className="text-white text-xl">รอข้อมูลเกม...</div>
      </div>
    );
  }

  const isHost = gameState.players.find((p: any) => p.id === socket?.id)?.isHost;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🏘️ For Sale</h1>
              <p className="text-gray-600">
                เกม ID: <span className="font-mono font-bold">{gameState.id}</span>
              </p>
              <p className="text-sm text-gray-500">
                สถานะ: {gameState.phase === 'LOBBY' ? 'รอผู้เล่น' : 'กำลังเล่น'}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 px-3 py-1 rounded-full">
                <span className="text-green-800 text-sm">🟢 เชื่อมต่อแล้ว</span>
              </div>
              
              {gameState.phase === 'LOBBY' && isHost && (
                <button
                  onClick={startGame}
                  disabled={gameState.players.length < 2}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  เริ่มเกม
                </button>
              )}
              
              <button
                onClick={() => window.location.href = '/'}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                ออกจากเกม
              </button>
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            ผู้เล่น ({gameState.players.length} คน)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameState.players.map((player: any) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg border-2 ${
                  player.id === socket?.id 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    player.isConnected ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <h3 className="font-bold">
                    {player.username}
                    {player.isHost && <span className="ml-1 text-yellow-600">👑</span>}
                    {player.id === socket?.id && <span className="ml-1 text-blue-600">(คุณ)</span>}
                  </h3>
                </div>
              </div>
            ))}
          </div>
          
          {gameState.phase === 'LOBBY' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800 text-center">
                {gameState.players.length < 2 
                  ? '🔄 รอผู้เล่นเพิ่มเติม (ต้องการอย่างน้อย 2 คน)'
                  : isHost 
                    ? '✅ พร้อมเริ่มเกม! กดปุ่ม "เริ่มเกม" ด้านบน'
                    : '⏳ รอ Host เริ่มเกม...'
                }
              </p>
            </div>
          )}

          {gameState.phase === 'PLAYING' && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 text-center">
                🎮 เกมเริ่มแล้ว! (ในเวอร์ชันนี้เป็นการทดสอบการเชื่อมต่อ)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 