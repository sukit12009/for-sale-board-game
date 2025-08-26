'use client';

import { useState } from 'react';

interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏘️</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">For Sale</h1>
          <p className="text-gray-600">เกมบอร์ดออนไลน์แบบเรียลไทม์</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              ชื่อผู้เล่น
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ใส่ชื่อของคุณ..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg"
              required
              maxLength={20}
            />
          </div>
          
          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            เข้าสู่เกม 🎮
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">🎯 วิธีเล่น</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-green-600 font-bold">🏠</span>
              <span>ประมูลซื้อบ้านในราคาที่เหมาะสม</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-600 font-bold">💰</span>
              <span>ขายบ้านเพื่อรับเช็คเงิน</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-yellow-600 font-bold">🏆</span>
              <span>รวบรวมเงินให้ได้มากที่สุดเพื่อชนะ</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            💡 สนับสนุน 2-10 ผู้เล่น | ⏱️ 15-30 นาที
          </p>
        </div>
      </div>
    </div>
  );
} 