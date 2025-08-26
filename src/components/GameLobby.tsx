'use client';

import React, { useState } from 'react';

interface GameLobbyProps {
  username: string;
  onCreateGame: () => void;
  onJoinGame: (gameId: string) => void;
  onJoinAsSpectator: (gameId: string) => void;
}

export default function GameLobby({ 
  username, 
  onCreateGame, 
  onJoinGame, 
  onJoinAsSpectator 
}: GameLobbyProps) {
  const [gameId, setGameId] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);

  const handleJoinGame = () => {
    if (gameId.trim()) {
      onJoinGame(gameId.trim().toUpperCase());
    }
  };

  const handleJoinAsSpectator = () => {
    if (gameId.trim()) {
      onJoinAsSpectator(gameId.trim().toUpperCase());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏘️</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">For Sale</h1>
          <p className="text-gray-600">เกมบอร์ดออนไลน์แบบเรียลไทม์</p>
          <div className="mt-4 bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ยินดีต้อนรับ <span className="font-bold">{username}</span>! 🎮
            </p>
          </div>
        </div>

        {/* Game Actions */}
        <div className="space-y-4">
          {/* Create New Game */}
          <button
            onClick={onCreateGame}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">🎯</span>
              <span>สร้างเกมใหม่</span>
            </div>
          </button>

          {/* Join Game Toggle */}
          <button
            onClick={() => setShowJoinForm(!showJoinForm)}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">🚪</span>
              <span>เข้าร่วมเกม</span>
            </div>
          </button>

          {/* Join Game Form */}
          {showJoinForm && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 animate-fadeIn">
              <div>
                <label htmlFor="gameId" className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสเกม (Game ID)
                </label>
                <input
                  type="text"
                  id="gameId"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value.toUpperCase())}
                  placeholder="เช่น ABC123"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-center text-lg"
                  maxLength={6}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleJoinGame}
                  disabled={!gameId.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  เล่น
                </button>
                <button
                  onClick={handleJoinAsSpectator}
                  disabled={!gameId.trim()}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  ดู
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Game Rules */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-3">📋 กติกาเกม</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">1.</span>
              <span>ประมูลซื้อบ้าน - ผู้ประมูลชนะได้บ้านที่ดีที่สุด</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span>ผู้ยอมแพ้ได้บ้านที่แย่ที่สุดและเงินคืนครึ่งหนึ่ง</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-purple-600 font-bold">3.</span>
              <span>ขายบ้าน - บ้านที่ดีกว่าได้เงินมากกว่า</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600 font-bold">4.</span>
              <span>ผู้มีเงินรวมมากสุดชนะ!</span>
            </div>
          </div>
        </div>

        {/* Game Info */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <p>👥 ผู้เล่น: 2-10 คน</p>
            <p>⏱️ ระยะเวลา: 15-30 นาที</p>
            <p>🎮 รองรับ: Desktop, Mobile</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            สร้างด้วย Next.js + Socket.IO + MongoDB
          </p>
        </div>
      </div>
    </div>
  );
} 