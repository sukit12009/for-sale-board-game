import { MongooseConnection } from 'mongoose';

declare global {
  var mongoose: {
    conn: typeof import('mongoose') | null;
    promise: Promise<typeof import('mongoose')> | null;
  } | undefined;
}

// Socket.IO augmentation
declare module 'socket.io' {
  interface Socket {
    data: {
      username?: string;
    };
  }
}

export {}; 