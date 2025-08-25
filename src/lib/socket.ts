import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import connectDB from './mongodb';
import Message from '../models/Message';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: ServerIO;
    };
  };
};

export interface MessageData {
  username: string;
  message: string;
  timestamp: Date;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export const initializeSocket = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO server...');
    
    const io = new ServerIO(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('join-chat', (username: string) => {
        socket.data.username = username;
        socket.broadcast.emit('user-joined', { username, message: `${username} เข้าร่วมแชท` });
        console.log(`${username} joined the chat`);
      });

      socket.on('send-message', async (data: { username: string; message: string }) => {
        try {
          const timestamp = new Date();
          let savedMessage = null;

          // ลองบันทึกข้อความลง MongoDB
          try {
            await connectDB();
            
            const newMessage = new Message({
              username: data.username,
              message: data.message,
              timestamp: timestamp,
            });
            
            savedMessage = await newMessage.save();
            console.log('Message saved to database:', savedMessage._id);
          } catch (dbError) {
            console.warn('MongoDB save failed, sending message anyway:', dbError instanceof Error ? dbError.message : 'Unknown database error');
            // ไม่ stop การทำงาน ให้ส่งข้อความไปได้แม้ database มีปัญหา
          }

          // ส่งข้อความไปยัง client ทุกคนไม่ว่า database จะมีปัญหาหรือไม่
          const messageData: MessageData = {
            username: data.username,
            message: data.message,
            timestamp: savedMessage ? savedMessage.timestamp : timestamp,
          };

          io.emit('receive-message', messageData);
          console.log('Message sent to all clients:', messageData);
        } catch (error) {
          console.error('Critical error in send-message:', error);
          
          // แม้เกิด error ก็ยังพยายามส่งข้อความ
          const fallbackMessage: MessageData = {
            username: data.username,
            message: data.message,
            timestamp: new Date(),
          };
          
          io.emit('receive-message', fallbackMessage);
          socket.emit('error', { message: 'Message sent but may not be saved' });
        }
      });

      socket.on('disconnect', () => {
        if (socket.data.username) {
          socket.broadcast.emit('user-left', { 
            username: socket.data.username, 
            message: `${socket.data.username} ออกจากแชท` 
          });
          console.log(`${socket.data.username} disconnected`);
        }
      });
    });

    res.socket.server.io = io;
  }
  
  res.end();
}; 