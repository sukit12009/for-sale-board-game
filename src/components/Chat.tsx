'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageData } from '../lib/socket';

interface Message extends MessageData {
  _id?: string;
}

interface ChatProps {
  username: string;
}

export default function Chat({ username }: ChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // ดึงข้อความเก่าจาก API
    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/messages');
        if (response.ok) {
          const oldMessages = await response.json();
          setMessages(oldMessages);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // เชื่อมต่อ Socket.IO
    const socketConnection = io({
      path: '/api/socketio',
    });

    socketConnection.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setConnectionError(null);
      socketConnection.emit('join-chat', username);
    });

    socketConnection.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socketConnection.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
      setIsConnected(false);
    });

    socketConnection.on('error', (error) => {
      console.error('Socket error:', error);
      setConnectionError(error.message || 'เกิดข้อผิดพลาด');
    });

    socketConnection.on('receive-message', (message: MessageData) => {
      setMessages(prev => [...prev, message]);
    });

    socketConnection.on('user-joined', (data: { username: string; message: string }) => {
      setMessages(prev => [...prev, {
        username: 'System',
        message: data.message,
        timestamp: new Date(),
      }]);
    });

    socketConnection.on('user-left', (data: { username: string; message: string }) => {
      setMessages(prev => [...prev, {
        username: 'System',
        message: data.message,
        timestamp: new Date(),
      }]);
    });

    setSocket(socketConnection);

    return () => {
      socketConnection.disconnect();
    };
  }, [username]);

  const sendMessage = () => {
    if (socket && newMessage.trim() && isConnected) {
      console.log('Sending message:', { username, message: newMessage.trim() });
      socket.emit('send-message', {
        username,
        message: newMessage.trim(),
      });
      setNewMessage('');
    } else {
      console.warn('Cannot send message:', { 
        hasSocket: !!socket, 
        hasMessage: !!newMessage.trim(), 
        isConnected 
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Real-time Chat</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-sm">
              {connectionError ? connectionError : isConnected ? 'เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ...'}
            </span>
          </div>
        </div>
        <p className="text-blue-100 text-sm mt-1">ผู้ใช้: {username}</p>
        {connectionError && (
          <div className="mt-2">
            <button
              onClick={() => window.location.reload()}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs"
            >
              รีเฟรชหน้า
            </button>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="mb-2">ยังไม่มีข้อความ</p>
            <p className="text-sm">เริ่มต้นการสนทนากันเลย!</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.username === username ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.username === username
                  ? 'bg-blue-500 text-white'
                  : message.username === 'System'
                  ? 'bg-gray-300 text-gray-700 text-center text-sm'
                  : 'bg-white border border-gray-300 text-gray-800'
              }`}
            >
              {message.username !== username && message.username !== 'System' && (
                <p className="text-xs font-semibold mb-1 text-blue-600">
                  {message.username}
                </p>
              )}
              <p className="text-sm">{message.message}</p>
              <p className={`text-xs mt-1 ${
                message.username === username 
                  ? 'text-blue-100' 
                  : message.username === 'System'
                  ? 'text-gray-500'
                  : 'text-gray-500'
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-300 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="พิมพ์ข้อความ..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !newMessage.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors duration-200"
          >
            ส่ง
          </button>
        </div>
      </div>
    </div>
  );
} 