import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import { Socket as NetSocket } from 'net';
import connectMongoDB from '@/lib/mongodb';
import Game from '@/models/Game';
import { 
  GameState, 
  Player, 
  ForSaleServerToClientEvents, 
  ForSaleClientToServerEvents,
  GameEvent
} from '@/types/game';
import {
  createPlayer,
  initializeGame,
  canStartGame,
  startGame,
  canPlaceBid,
  placeBid,
  passPlayer,
  selectCardForSelling,
  calculateFinalScores
} from '@/lib/gameLogic';

interface SocketServer extends NetServer {
  io?: ServerIO<ForSaleClientToServerEvents, ForSaleServerToClientEvents>;
}

interface SocketWithData extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithData;
}

// In-memory game states for faster access
const gameStates = new Map<string, GameState>();
const playerConnections = new Map<string, string>(); // playerId -> socketId

async function saveGameState(gameState: GameState) {
  try {
    await connectMongoDB();
    await Game.findOneAndUpdate(
      { id: gameState.id },
      gameState,
      { upsert: true, new: true }
    );
    gameStates.set(gameState.id, gameState);
  } catch (error) {
    console.error('Error saving game state:', error);
  }
}

async function loadGameState(gameId: string): Promise<GameState | null> {
  try {
    // Check memory first
    if (gameStates.has(gameId)) {
      return gameStates.get(gameId)!;
    }

    // Load from database
    await connectMongoDB();
    const gameDoc = await Game.findOne({ id: gameId });
    if (gameDoc) {
      const gameState = gameDoc.toGameState();
      console.log(`Loaded game ${gameId}:`, {
        phase: gameState.phase,
        playerCount: gameState.players?.length || 0
      });
      gameStates.set(gameId, gameState);
      return gameState;
    }
    return null;
  } catch (error) {
    console.error('Error loading game state:', error);
    return null;
  }
}

function broadcastToPlayers(io: ServerIO, gameState: GameState) {
  gameState.players.forEach(player => {
    const socketId = playerConnections.get(player.id);
    if (socketId) {
      io.to(socketId).emit('game-state-updated', gameState);
    }
  });
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO...');
    
    const io = new ServerIO<ForSaleClientToServerEvents, ForSaleServerToClientEvents>(
      res.socket.server,
      {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      }
    );

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      // Create Game
      socket.on('create-game', async (data) => {
        try {
          const { username } = data;
          console.log(`Creating game for: ${username}`);
          
          const hostPlayer = createPlayer(username, true);
          const gameState = initializeGame(hostPlayer, 6);

          await saveGameState(gameState);
          playerConnections.set(hostPlayer.id, socket.id);

          socket.emit('game-state-updated', gameState);
          console.log(`Game created: ${gameState.id}`);
        } catch (error) {
          console.error('Error creating game:', error);
          socket.emit('error', { 
            message: 'ไม่สามารถสร้างเกมได้',
            code: 'CREATE_ERROR'
          });
        }
      });

      // Join Game - FIXED VERSION
      socket.on('join-game', async (data) => {
        try {
          console.log(`🔍 Raw join data:`, data);
          const { gameId, username, isSpectator = false } = data;
          console.log(`🔍 Parsed: gameId=${gameId}, username=${username}, isSpectator=${isSpectator} (type: ${typeof isSpectator})`);
          
          const gameState = await loadGameState(gameId);
          if (!gameState) {
            console.log(`❌ Game ${gameId} not found`);
            socket.emit('error', { message: 'ไม่พบเกม', code: 'GAME_NOT_FOUND' });
            return;
          }

          // SPECTATOR MODE - ไม่เช็กสิทธิ์ เข้าดูได้ตลอด (ต้องเช็กก่อน existing player)
          if (isSpectator === true) {
            console.log(`✅ SPECTATOR MODE ACTIVATED: ${username} → ${gameId}`);
            console.log(`Game phase: ${gameState.phase}, Players: ${gameState.players.length}`);
            
            // Send complete game state to spectator (can see everything)
            socket.emit('game-state-updated', gameState);
            
            console.log(`✅ Spectator ${username} successfully joined game ${gameId} - DONE!`);
            return;
          }
          
          console.log(`🎮 PLAYER MODE: ${username} → ${gameId}`);

          // Look for existing player with same username (เฉพาะ non-spectator)
          const existingPlayer = gameState.players.find(p => p.username === username);
          
          if (existingPlayer) {
            // RECONNECT: Take over existing player
            console.log(`Reconnecting ${username} to game ${gameId}`);
            
            // Update player status
            existingPlayer.isConnected = true;
            existingPlayer.lastActivity = new Date();
            
            // Handle old connection
            const oldSocketId = playerConnections.get(existingPlayer.id);
            if (oldSocketId && oldSocketId !== socket.id) {
              playerConnections.delete(existingPlayer.id);
              io.to(oldSocketId).emit('error', { 
                message: 'การเชื่อมต่อถูกแทนที่',
                code: 'REPLACED' 
              });
            }
            
            // Set new connection
            playerConnections.set(existingPlayer.id, socket.id);
            
            // Send game state
            socket.emit('game-state-updated', gameState);
            
            // Broadcast to others
            broadcastToPlayers(io, gameState);
            
            console.log(`${username} successfully reconnected to ${gameId}`);
            
          } else {
            // NEW PLAYER: Check if can join
            if (gameState.phase !== 'LOBBY') {
              socket.emit('error', { 
                message: 'เกมเริ่มแล้ว - ใช้ชื่อผู้เล่นที่มีอยู่เพื่อเข้าร่วม',
                code: 'GAME_STARTED_NEW_PLAYER' 
              });
              return;
            }
            
            if (gameState.players.length >= gameState.maxPlayers) {
              socket.emit('error', { message: 'เกมเต็มแล้ว', code: 'GAME_FULL' });
              return;
            }
            
            // Add new player
            const newPlayer = createPlayer(username, false);
            gameState.players.push(newPlayer);
            gameState.lastActivity = new Date();
            
            await saveGameState(gameState);
            playerConnections.set(newPlayer.id, socket.id);
            
            // Send game state
            socket.emit('game-state-updated', gameState);
            
            // Broadcast to others
            broadcastToPlayers(io, gameState);
            
            console.log(`New player ${username} joined ${gameId}`);
          }
          
        } catch (error) {
          console.error('Error in join-game:', error);
          socket.emit('error', { 
            message: 'ไม่สามารถเข้าร่วมเกมได้',
            code: 'JOIN_ERROR'
          });
        }
      });

      // Start Game
      socket.on('start-game', async (gameId) => {
        try {
          const gameState = await loadGameState(gameId);
          if (!gameState) {
            socket.emit('error', { message: 'ไม่พบเกม' });
            return;
          }

          const playerId = Array.from(playerConnections.entries())
            .find(([, socketId]) => socketId === socket.id)?.[0];
          
          if (!playerId || gameState.hostId !== playerId) {
            socket.emit('error', { message: 'เฉพาะ Host เท่านั้นที่เริ่มเกมได้' });
            return;
          }

          if (!canStartGame(gameState)) {
            socket.emit('error', { message: 'ไม่สามารถเริ่มเกมได้ - ต้องมีผู้เล่นอย่างน้อย 2 คน' });
            return;
          }

          const updatedGameState = startGame(gameState);
          await saveGameState(updatedGameState);

          broadcastToPlayers(io, updatedGameState);
          console.log(`Game ${gameId} started`);
        } catch (error) {
          console.error('Error starting game:', error);
          socket.emit('error', { message: 'ไม่สามารถเริ่มเกมได้' });
        }
      });

      // Place Bid
      socket.on('place-bid', async (data) => {
        try {
          const { gameId, bid } = data;
          const gameState = await loadGameState(gameId);
          if (!gameState) return;

          const playerId = Array.from(playerConnections.entries())
            .find(([, socketId]) => socketId === socket.id)?.[0];
          
          if (!playerId || !canPlaceBid(gameState, playerId, bid)) {
            socket.emit('error', { message: 'ไม่สามารถประมูลได้' });
            return;
          }

          const updatedGameState = placeBid(gameState, playerId, bid);
          await saveGameState(updatedGameState);
          broadcastToPlayers(io, updatedGameState);

        } catch (error) {
          console.error('Error placing bid:', error);
          socket.emit('error', { message: 'ไม่สามารถประมูลได้' });
        }
      });

      // Pass Bid
      socket.on('pass-bid', async (gameId) => {
        try {
          const gameState = await loadGameState(gameId);
          if (!gameState) return;

          const playerId = Array.from(playerConnections.entries())
            .find(([, socketId]) => socketId === socket.id)?.[0];
          
          if (!playerId) {
            socket.emit('error', { message: 'ไม่พบผู้เล่น' });
            return;
          }

          const updatedGameState = passPlayer(gameState, playerId);
          await saveGameState(updatedGameState);
          broadcastToPlayers(io, updatedGameState);

        } catch (error) {
          console.error('Error passing bid:', error);
          socket.emit('error', { message: 'ไม่สามารถยอมแพ้ได้' });
        }
      });

      // Select Card
      socket.on('select-card', async (data) => {
        try {
          const { gameId, cardId } = data;
          const gameState = await loadGameState(gameId);
          if (!gameState) return;

          const playerId = Array.from(playerConnections.entries())
            .find(([, socketId]) => socketId === socket.id)?.[0];
          
          if (!playerId) {
            socket.emit('error', { message: 'ไม่พบผู้เล่น' });
            return;
          }

          const updatedGameState = selectCardForSelling(gameState, playerId, cardId);
          await saveGameState(updatedGameState);
          broadcastToPlayers(io, updatedGameState);

          // Check if game finished
          if (updatedGameState.phase === 'FINISHED') {
            const results = calculateFinalScores(updatedGameState);
            gameState.players.forEach(player => {
              const socketId = playerConnections.get(player.id);
              if (socketId) {
                io.to(socketId).emit('game-event', {
                  id: Date.now().toString(),
                  gameId: gameState.id,
                  type: 'GAME_FINISHED',
                  data: { results },
                  timestamp: new Date()
                });
              }
            });
          }

        } catch (error) {
          console.error('Error selecting card:', error);
          socket.emit('error', { message: 'ไม่สามารถเลือกการ์ดได้' });
        }
      });

      // Leave Game
      socket.on('leave-game', async (gameId) => {
        try {
          const gameState = await loadGameState(gameId);
          if (!gameState) return;

          const playerId = Array.from(playerConnections.entries())
            .find(([, socketId]) => socketId === socket.id)?.[0];

          if (playerId) {
            // Mark as disconnected
            const player = gameState.players.find(p => p.id === playerId);
            if (player) {
              player.isConnected = false;
              player.lastActivity = new Date();
            }
            
            playerConnections.delete(playerId);
            await saveGameState(gameState);
            broadcastToPlayers(io, gameState);
          }
        } catch (error) {
          console.error('Error leaving game:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        const playerId = Array.from(playerConnections.entries())
          .find(([, socketId]) => socketId === socket.id)?.[0];
        
        if (playerId) {
          playerConnections.delete(playerId);
          
          // Mark player as disconnected in all games
          gameStates.forEach(async (gameState) => {
            const player = gameState.players.find(p => p.id === playerId);
            if (player) {
              player.isConnected = false;
              player.lastActivity = new Date();
              await saveGameState(gameState);
              broadcastToPlayers(io, gameState);
            }
          });
        }
      });
    });
  }

  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 