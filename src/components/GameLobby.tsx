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
  const [gameInfo, setGameInfo] = useState<any>(null);
  const [loadingGameInfo, setLoadingGameInfo] = useState(false);

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

  // Fetch game info when game ID changes
  const fetchGameInfo = async (id: string) => {
    if (id.length >= 3) {
      setLoadingGameInfo(true);
      try {
        const response = await fetch(`/api/game-info?gameId=${id}`);
        if (response.ok) {
          const info = await response.json();
          setGameInfo(info);
        } else {
          setGameInfo(null);
        }
      } catch (error) {
        setGameInfo(null);
      }
      setLoadingGameInfo(false);
    } else {
      setGameInfo(null);
    }
  };

  const handleGameIdChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setGameId(upperValue);
    if (upperValue.length >= 3) {
      fetchGameInfo(upperValue);
    } else {
      setGameInfo(null);
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
                  onChange={(e) => handleGameIdChange(e.target.value)}
                  placeholder="เช่น ABC123"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-center text-lg"
                  maxLength={6}
                />
                
                {/* Game Info Display */}
                {loadingGameInfo && (
                  <div className="mt-2 text-center text-gray-500 text-sm">
                    🔍 กำลังค้นหาเกม...
                  </div>
                )}
                
                {gameInfo && (
                  <div className="mt-2 bg-green-50 rounded-lg p-3">
                    <div className="text-sm text-green-800">
                      <div className="font-bold mb-1">✅ พบเกม: {gameInfo.id}</div>
                      <div>📊 สถานะ: {
                        gameInfo.phase === 'LOBBY' ? 'รอผู้เล่น' :
                        gameInfo.phase === 'BUYING' ? 'ประมูลซื้อบ้าน' :
                        gameInfo.phase === 'SELLING' ? 'ขายบ้าน' : 'จบเกมแล้ว'
                      }</div>
                      <div>👥 ผู้เล่น: {gameInfo.playerCount}/{gameInfo.maxPlayers}</div>
                      
                      {gameInfo.players.length > 0 && (
                        <div className="mt-2">
                          <div className="font-medium mb-1">ผู้เล่นในเกม:</div>
                          <div className="flex flex-wrap gap-1">
                            {gameInfo.players.map((player: any, index: number) => (
                              <span 
                                key={index}
                                className={`text-xs px-2 py-1 rounded-full ${
                                  player.username === username 
                                    ? 'bg-blue-200 text-blue-800 font-bold' 
                                    : player.isConnected 
                                      ? 'bg-green-200 text-green-800'
                                      : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {player.username}
                                {player.isHost && ' 👑'}
                                {!player.isConnected && ' 💤'}
                                {player.username === username && ' (คุณ)'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {gameId.length >= 3 && !loadingGameInfo && !gameInfo && (
                  <div className="mt-2 text-center text-red-500 text-sm">
                    ❌ ไม่พบเกม
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <p>💡 หากใช้ชื่อเดียวกันกับคนในเกม จะเข้าไปเล่นแทนได้เลย</p>
                  {gameInfo && gameInfo.phase !== 'LOBBY' && (
                    <p className="text-orange-600 font-medium">
                      ⚠️ เกมนี้เริ่มแล้ว - ผู้เล่นใหม่เข้าไม่ได้ (ใช้ชื่อเดิมเท่านั้น)
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleJoinGame}
                  disabled={!gameId.trim() || loadingGameInfo}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {gameInfo && gameInfo.players.some((p: any) => p.username === username) 
                    ? '🔄 เล่นต่อ' 
                    : gameInfo && gameInfo.phase !== 'LOBBY'
                      ? '⚠️ เข้าร่วม'
                      : '🎮 เล่น'
                  }
                </button>
                <button
                  onClick={handleJoinAsSpectator}
                  disabled={!gameId.trim() || loadingGameInfo}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  👁️ ดู
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