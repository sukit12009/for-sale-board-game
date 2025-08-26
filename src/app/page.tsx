'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import GameLobby from '@/components/GameLobby';
import GameBoard from '@/components/GameBoard';

type AppState = 'login' | 'lobby' | 'game';

interface GameConfig {
  gameId?: string;
  isSpectator?: boolean;
}

// Utility functions สำหรับจัดการ localStorage
const saveUsernameToStorage = (username: string) => {
  try {
    localStorage.setItem('forSaleUsername', username);
  } catch (error) {
    console.error('ไม่สามารถบันทึกข้อมูลได้:', error);
  }
};

const getUsernameFromStorage = (): string | null => {
  try {
    return localStorage.getItem('forSaleUsername');
  } catch (error) {
    console.error('ไม่สามารถอ่านข้อมูลได้:', error);
    return null;
  }
};

const removeUsernameFromStorage = () => {
  try {
    localStorage.removeItem('forSaleUsername');
  } catch (error) {
    console.error('ไม่สามารถลบข้อมูลได้:', error);
  }
};

export default function Home() {
  const [username, setUsername] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('login');
  const [gameConfig, setGameConfig] = useState<GameConfig>({});
  const [isLoading, setIsLoading] = useState(true);

  // เช็ค localStorage เมื่อโหลดหน้า
  useEffect(() => {
    const savedUsername = getUsernameFromStorage();
    if (savedUsername) {
      setUsername(savedUsername);
      setAppState('lobby');
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (name: string) => {
    // เก็บชื่อใน localStorage
    saveUsernameToStorage(name);
    setUsername(name);
    setAppState('lobby');
  };

  const handleLogout = () => {
    // ลบออกจาก localStorage
    removeUsernameFromStorage();
    setUsername(null);
    setAppState('login');
    setGameConfig({});
  };

  const handleCreateGame = () => {
    setGameConfig({});
    setAppState('game');
  };

  const handleJoinGame = (gameId: string) => {
    setGameConfig({ gameId, isSpectator: false });
    setAppState('game');
  };

  const handleJoinAsSpectator = (gameId: string) => {
    setGameConfig({ gameId, isSpectator: true });
    setAppState('game');
  };

  const handleBackToLobby = () => {
    setGameConfig({});
    setAppState('lobby');
  };

  // แสดง loading ระหว่างเช็ค localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
        <div className="text-white text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  // Login Screen
  if (appState === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  // Game Lobby
  if (appState === 'lobby' && username) {
  return (
    <div>
        <GameLobby
          username={username}
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          onJoinAsSpectator={handleJoinAsSpectator}
        />
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="fixed top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200 z-50"
        >
          ออกจากระบบ
        </button>
      </div>
    );
  }

  // Game Screen
  if (appState === 'game' && username) {
    return (
        <div>
        <GameBoard
          username={username}
          gameId={gameConfig.gameId}
          isSpectator={gameConfig.isSpectator}
        />
        
        {/* Back to Lobby Button */}
        <button
          onClick={handleBackToLobby}
          className="fixed top-4 left-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200 z-50"
        >
          ← กลับ Lobby
        </button>
        
        {/* Logout Button */}
          <button
            onClick={handleLogout}
          className="fixed top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200 z-50"
          >
            ออกจากระบบ
          </button>
        </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-2xl font-bold mb-4">เกิดข้อผิดพลาด</h1>
        <button 
          onClick={() => window.location.reload()}
          className="bg-white text-red-600 px-6 py-2 rounded-lg font-semibold"
        >
          รีโหลดหน้า
        </button>
      </div>
    </div>
  );
}
