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
  GameEvent,
  SpectatorData
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
const spectatorConnections = new Map<string, string[]>(); // gameId -> socketIds[]

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
      gameStates.set(gameId, gameState);
      return gameState;
    }
    return null;
  } catch (error) {
    console.error('Error loading game state:', error);
    return null;
  }
}

function broadcastGameState(io: ServerIO, gameState: GameState) {
  // Broadcast to all players
  gameState.players.forEach(player => {
    const socketId = playerConnections.get(player.id);
    if (socketId) {
      io.to(socketId).emit('game-state-updated', gameState);
    }
  });

  // Broadcast to spectators with limited data
  const spectatorData: SpectatorData = {
    gameId: gameState.id,
    phase: gameState.phase,
    players: gameState.players.map(p => ({
      id: p.id,
      username: p.username,
      money: p.money,
      propertyCardCount: p.propertyCards.length,
      moneyCardCount: p.moneyCards.length,
      isConnected: p.isConnected
    })),
    activePropertyCards: gameState.activePropertyCards,
    activeMoneyCards: gameState.activeMoneyCards,
    currentRound: gameState.currentRound,
    biddingState: gameState.biddingState ? {
      currentPlayerId: gameState.biddingState.currentPlayerId,
      currentBid: gameState.biddingState.currentBid,
      passedPlayers: gameState.biddingState.passedPlayers,
      highestBidder: gameState.biddingState.highestBidder
    } : undefined
  };

  const spectatorSockets = spectatorConnections.get(gameState.id) || [];
  spectatorSockets.forEach(socketId => {
    io.to(socketId).emit('spectator-update', spectatorData);
  });
}

function broadcastGameEvent(io: ServerIO, event: GameEvent) {
  const gameState = gameStates.get(event.gameId);
  if (!gameState) return;

  // Broadcast to all connected players
  gameState.players.forEach(player => {
    const socketId = playerConnections.get(player.id);
    if (socketId) {
      io.to(socketId).emit('game-event', event);
    }
  });

  // Broadcast to spectators
  const spectatorSockets = spectatorConnections.get(event.gameId) || [];
  spectatorSockets.forEach(socketId => {
    io.to(socketId).emit('game-event', event);
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
      console.log('Client connected:', socket.id);

      // Create Game
      socket.on('create-game', async (data) => {
        try {
          const { username, maxPlayers = 6, autoStart = false } = data;
          
          const hostPlayer = createPlayer(username, true);
          const gameState = initializeGame(hostPlayer, maxPlayers);
          gameState.autoStart = autoStart;

          await saveGameState(gameState);
          playerConnections.set(hostPlayer.id, socket.id);

          socket.emit('game-state-updated', gameState);

          const event: GameEvent = {
            id: Date.now().toString(),
            gameId: gameState.id,
            type: 'PLAYER_JOINED',
            playerId: hostPlayer.id,
            data: { username },
            timestamp: new Date()
          };
          broadcastGameEvent(io, event);

          console.log(`Game created: ${gameState.id} by ${username}`);
        } catch (error) {
          console.error('Error creating game:', error);
          socket.emit('error', { message: 'Failed to create game' });
        }
      });

      // Join Game
      socket.on('join-game', async (data) => {
        try {
          const { gameId, username, isSpectator = false } = data;
          
          const gameState = await loadGameState(gameId);
          if (!gameState) {
            socket.emit('error', { message: 'Game not found', code: 'GAME_NOT_FOUND' });
            return;
          }

          if (isSpectator) {
            // Add spectator
            if (!spectatorConnections.has(gameId)) {
              spectatorConnections.set(gameId, []);
            }
            spectatorConnections.get(gameId)!.push(socket.id);

            // Send spectator data
            const spectatorData: SpectatorData = {
              gameId: gameState.id,
              phase: gameState.phase,
              players: gameState.players.map(p => ({
                id: p.id,
                username: p.username,
                money: p.money,
                propertyCardCount: p.propertyCards.length,
                moneyCardCount: p.moneyCards.length,
                isConnected: p.isConnected
              })),
              activePropertyCards: gameState.activePropertyCards,
              activeMoneyCards: gameState.activeMoneyCards,
              currentRound: gameState.currentRound,
              biddingState: gameState.biddingState ? {
                currentPlayerId: gameState.biddingState.currentPlayerId,
                currentBid: gameState.biddingState.currentBid,
                passedPlayers: gameState.biddingState.passedPlayers,
                highestBidder: gameState.biddingState.highestBidder
              } : undefined
            };
            socket.emit('spectator-update', spectatorData);
            return;
          }

          // Check if game is full
          if (gameState.players.length >= gameState.maxPlayers) {
            socket.emit('error', { message: 'Game is full', code: 'GAME_FULL' });
            return;
          }

          // Check if game already started
          if (gameState.phase !== 'LOBBY') {
            socket.emit('error', { message: 'Game already started', code: 'GAME_STARTED' });
            return;
          }

          // Check if username is taken
          if (gameState.players.some(p => p.username === username)) {
            socket.emit('error', { message: 'Username already taken', code: 'USERNAME_TAKEN' });
            return;
          }

          // Add player to game
          const newPlayer = createPlayer(username, false);
          gameState.players.push(newPlayer);
          gameState.lastActivity = new Date();

          await saveGameState(gameState);
          playerConnections.set(newPlayer.id, socket.id);

          broadcastGameState(io, gameState);

          const event: GameEvent = {
            id: Date.now().toString(),
            gameId: gameState.id,
            type: 'PLAYER_JOINED',
            playerId: newPlayer.id,
            data: { username },
            timestamp: new Date()
          };
          broadcastGameEvent(io, event);

          console.log(`Player joined: ${username} in game ${gameId}`);
        } catch (error) {
          console.error('Error joining game:', error);
          socket.emit('error', { message: 'Failed to join game' });
        }
      });

      // Start Game
      socket.on('start-game', async (gameId) => {
        try {
          const gameState = await loadGameState(gameId);
          if (!gameState) {
            socket.emit('error', { message: 'Game not found' });
            return;
          }

          // Check if player is host
          const playerId = Array.from(playerConnections.entries())
            .find(([, socketId]) => socketId === socket.id)?.[0];
          
          if (!playerId || gameState.hostId !== playerId) {
            socket.emit('error', { message: 'Only host can start the game' });
            return;
          }

          if (!canStartGame(gameState)) {
            socket.emit('error', { message: 'Cannot start game: invalid conditions' });
            return;
          }

          const updatedGameState = startGame(gameState);
          await saveGameState(updatedGameState);

          broadcastGameState(io, updatedGameState);

          const event: GameEvent = {
            id: Date.now().toString(),
            gameId: gameState.id,
            type: 'GAME_STARTED',
            data: {},
            timestamp: new Date()
          };
          broadcastGameEvent(io, event);

          console.log(`Game started: ${gameId}`);
        } catch (error) {
          console.error('Error starting game:', error);
          socket.emit('error', { message: 'Failed to start game' });
        }
      });

      // Place Bid
      socket.on('place-bid', async (data) => {
        try {
          const { gameId, bid } = data;
          
          const gameState = await loadGameState(gameId);
          if (!gameState) {
            socket.emit('error', { message: 'Game not found' });
            return;
          }

          const playerId = Array.from(playerConnections.entries())
            .find(([, socketId]) => socketId === socket.id)?.[0];
          
          if (!playerId) {
            socket.emit('error', { message: 'Player not found' });
            return;
          }

          if (!canPlaceBid(gameState, playerId, bid)) {
            socket.emit('error', { message: 'Invalid bid' });
            return;
          }

          const updatedGameState = placeBid(gameState, playerId, bid);
          await saveGameState(updatedGameState);

          broadcastGameState(io, updatedGameState);

          const event: GameEvent = {
            id: Date.now().toString(),
            gameId: gameState.id,
            type: 'BID_PLACED',
            playerId,
            data: { bid },
            timestamp: new Date()
          };
          broadcastGameEvent(io, event);

        } catch (error) {
          console.error('Error placing bid:', error);
          socket.emit('error', { message: 'Failed to place bid' });
        }
      });

      // Pass Bid
      socket.on('pass-bid', async (gameId) => {
        try {
          const gameState = await loadGameState(gameId);
          if (!gameState) {
            socket.emit('error', { message: 'Game not found' });
            return;
          }

          const playerId = Array.from(playerConnections.entries())
            .find(([, socketId]) => socketId === socket.id)?.[0];
          
          if (!playerId) {
            socket.emit('error', { message: 'Player not found' });
            return;
          }

          const updatedGameState = passPlayer(gameState, playerId);
          await saveGameState(updatedGameState);

          broadcastGameState(io, updatedGameState);

          const event: GameEvent = {
            id: Date.now().toString(),
            gameId: gameState.id,
            type: 'PLAYER_PASSED',
            playerId,
            data: {},
            timestamp: new Date()
          };
          broadcastGameEvent(io, event);

        } catch (error) {
          console.error('Error passing bid:', error);
          socket.emit('error', { message: 'Failed to pass' });
        }
      });

      // Select Card for Selling
      socket.on('select-card', async (data) => {
        try {
          const { gameId, cardId } = data;
          
          const gameState = await loadGameState(gameId);
          if (!gameState) {
            socket.emit('error', { message: 'Game not found' });
            return;
          }

          const playerId = Array.from(playerConnections.entries())
            .find(([, socketId]) => socketId === socket.id)?.[0];
          
          if (!playerId) {
            socket.emit('error', { message: 'Player not found' });
            return;
          }

          const updatedGameState = selectCardForSelling(gameState, playerId, cardId);
          await saveGameState(updatedGameState);

          broadcastGameState(io, updatedGameState);

          // Check if game finished
          if (updatedGameState.phase === 'FINISHED') {
            const results = calculateFinalScores(updatedGameState);
            const event: GameEvent = {
              id: Date.now().toString(),
              gameId: gameState.id,
              type: 'GAME_FINISHED',
              data: { results },
              timestamp: new Date()
            };
            broadcastGameEvent(io, event);
          }

        } catch (error) {
          console.error('Error selecting card:', error);
          socket.emit('error', { message: 'Failed to select card' });
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
            // Remove player from game
            gameState.players = gameState.players.filter(p => p.id !== playerId);
            playerConnections.delete(playerId);

            // If host left, make another player host
            if (gameState.hostId === playerId && gameState.players.length > 0) {
              gameState.hostId = gameState.players[0].id;
              gameState.players[0].isHost = true;
            }

            await saveGameState(gameState);
            broadcastGameState(io, gameState);

            const event: GameEvent = {
              id: Date.now().toString(),
              gameId: gameState.id,
              type: 'PLAYER_LEFT',
              playerId,
              data: {},
              timestamp: new Date()
            };
            broadcastGameEvent(io, event);
          }

          // Remove spectator
          const spectators = spectatorConnections.get(gameId);
          if (spectators) {
            const index = spectators.indexOf(socket.id);
            if (index > -1) {
              spectators.splice(index, 1);
              if (spectators.length === 0) {
                spectatorConnections.delete(gameId);
              }
            }
          }

        } catch (error) {
          console.error('Error leaving game:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Find and handle player disconnection
        const playerId = Array.from(playerConnections.entries())
          .find(([, socketId]) => socketId === socket.id)?.[0];
        
        if (playerId) {
          // Mark player as disconnected but don't remove immediately
          // They might reconnect
          playerConnections.delete(playerId);
          // TODO: Implement reconnection logic
        }

        // Remove from spectator connections
        spectatorConnections.forEach((sockets, gameId) => {
          const index = sockets.indexOf(socket.id);
          if (index > -1) {
            sockets.splice(index, 1);
            if (sockets.length === 0) {
              spectatorConnections.delete(gameId);
            }
          }
        });
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