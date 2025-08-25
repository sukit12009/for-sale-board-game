// Socket.IO Event Types
export interface ServerToClientEvents {
  'receive-message': (message: MessageData) => void;
  'user-joined': (data: { username: string; message: string }) => void;
  'user-left': (data: { username: string; message: string }) => void;
  'error': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'join-chat': (username: string) => void;
  'send-message': (data: { username: string; message: string }) => void;
}

export interface MessageData {
  username: string;
  message: string;
  timestamp: Date;
  _id?: string;
}

export interface SocketData {
  username?: string;
} 