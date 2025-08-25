'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/Login';
import Chat from '@/components/Chat';

// Utility functions สำหรับจัดการ localStorage
const saveUsernameToStorage = (username: string) => {
  try {
    localStorage.setItem('chatUsername', username);
  } catch (error) {
    console.error('ไม่สามารถบันทึกข้อมูลได้:', error);
  }
};

const getUsernameFromStorage = (): string | null => {
  try {
    return localStorage.getItem('chatUsername');
  } catch (error) {
    console.error('ไม่สามารถอ่านข้อมูลได้:', error);
    return null;
  }
};

const removeUsernameFromStorage = () => {
  try {
    localStorage.removeItem('chatUsername');
  } catch (error) {
    console.error('ไม่สามารถลบข้อมูลได้:', error);
  }
};

export default function Home() {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // เช็ค localStorage เมื่อโหลดหน้า
  useEffect(() => {
    const savedUsername = getUsernameFromStorage();
    if (savedUsername) {
      setUsername(savedUsername);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (name: string) => {
    // เก็บชื่อใน localStorage
    saveUsernameToStorage(name);
    setUsername(name);
  };

  const handleLogout = () => {
    // ลบออกจาก localStorage
    removeUsernameFromStorage();
    setUsername(null);
  };

  // แสดง loading ระหว่างเช็ค localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div>
      {username ? (
        <div>
          <Chat username={username} />
          <button
            onClick={handleLogout}
            className="fixed top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200 z-10"
          >
            ออกจากระบบ
          </button>
        </div>
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}
