import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import { Socket as NetSocket } from 'net';
import connectMongoDB from '@/lib/mongodb';
import Game from '@/models/Game';
import { 
  GameState, 
  ForSaleServerToClientEvents, 
  ForSaleClientToServerEvents
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
  calculateFinalScores,
  getPassPlayerCard,
  getWinnerCard
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
                console.log(`🎯 Pass bid received for game ${gameId}`);
                const gameState = await loadGameState(gameId);
                if (!gameState) {
                  console.log(`❌ Game ${gameId} not found`);
                  return;
                }
                console.log(`✅ Game loaded successfully`);

                const playerId = Array.from(playerConnections.entries())
                  .find(([, socketId]) => socketId === socket.id)?.[0];

                if (!playerId) {
                  console.log(`❌ Player not found for socket ${socket.id}`);
                  socket.emit('error', { message: 'ไม่พบผู้เล่น' });
                  return;
                }
                console.log(`✅ Player ID found: ${playerId}`);

                console.log(`🎯 Player ${playerId} is passing bid`);

                // Get the card before passing (for event)
                console.log(`🔍 Getting card for pass event...`);
                const cardToReceive = getPassPlayerCard(gameState, playerId);
                console.log(`🔍 Card to receive:`, cardToReceive);

                                // Check if this pass will end the auction BEFORE calling passPlayer
                const currentBiddingState = gameState.biddingState!;
                const currentPassedPlayers = [...currentBiddingState.passedPlayers, playerId];
                const activePlayersBeforePass = currentBiddingState.biddingOrder.filter(id => !currentPassedPlayers.includes(id));
                const willEndAuction = activePlayersBeforePass.length === 1;
                const winnerId = willEndAuction ? activePlayersBeforePass[0] : null;
                
                console.log(`🔍 Will end auction: ${willEndAuction}, Winner: ${winnerId}`);

                // Get winner card BEFORE calling passPlayer (while activePropertyCards still exist)
                let winnerCard = null;
                if (willEndAuction && gameState.activePropertyCards && gameState.activePropertyCards.length > 0) {
                  winnerCard = gameState.activePropertyCards.reduce((highest, card) =>
                    card.value > highest.value ? card : highest
                  );
                  console.log(`🎯 Winner will get card:`, winnerCard);
                }

                console.log(`🚀 About to call passPlayer function...`);
                const updatedGameState = passPlayer(gameState, playerId);
                console.log(`✅ passPlayer completed. New biddingState:`, updatedGameState.biddingState);
                await saveGameState(updatedGameState);
                broadcastToPlayers(io, updatedGameState);

                // Send property won event to the player who passed
                if (cardToReceive) {
                  const socketId = playerConnections.get(playerId);
                  console.log(`📨 Sending PROPERTY_WON event to ${playerId} (passed):`, cardToReceive);
                  if (socketId) {
                    io.to(socketId).emit('game-event', {
                      id: Date.now().toString(),
                      gameId: gameState.id,
                      type: 'PROPERTY_WON',
                      playerId: playerId,
                      data: { card: cardToReceive, reason: 'passed' },
                      timestamp: new Date()
                    });
                    console.log(`✅ Event sent to socket ${socketId}`);
                  } else {
                    console.log(`❌ No socket found for player ${playerId}`);
                  }
                } else {
                  console.log(`❌ No card to receive for player ${playerId}`);
                }

                // Send winner event if auction ended
                if (willEndAuction && winnerId && winnerCard) {
                  const winnerSocketId = playerConnections.get(winnerId);
                  console.log(`📨 Sending PROPERTY_WON event to ${winnerId} (winner):`, winnerCard);
                  if (winnerSocketId) {
                    io.to(winnerSocketId).emit('game-event', {
                      id: Date.now().toString(),
                      gameId: gameState.id,
                      type: 'PROPERTY_WON',
                      playerId: winnerId,
                      data: { card: winnerCard, reason: 'won_auction' },
                      timestamp: new Date()
                    });
                    console.log(`✅ Winner event sent to socket ${winnerSocketId}`);
                  } else {
                    console.log(`❌ No socket found for winner ${winnerId}`);
                  }
                }

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
          
          // Check if all players have selected cards BEFORE saving (because resolveSellingRound resets allCardsSelected)
          const allCardsSelected = updatedGameState.sellingState?.allCardsSelected;
          console.log(`🔍 Checking if all cards selected:`, allCardsSelected);
          
          await saveGameState(updatedGameState);
          broadcastToPlayers(io, updatedGameState);

          if (allCardsSelected) {
            console.log(`✅ All cards selected! Starting selling summary process...`);
            // Send money received events to all players
            const sellingState = updatedGameState.sellingState!;
            const activeMoneyCards = updatedGameState.activeMoneyCards;

            // Sort players by selected card value (highest to lowest)
            const sortedSelections = Object.entries(sellingState.selectedCards)
              .map(([playerId, card]) => ({ playerId, card }))
              .sort((a, b) => b.card.value - a.card.value);

            // Assign money cards (highest property gets highest money)
            sortedSelections.forEach((selection, index) => {
              if (index < activeMoneyCards.length) {
                const moneyCard = activeMoneyCards[index];
                const socketId = playerConnections.get(selection.playerId);
                console.log(`📨 Sending MONEY_RECEIVED event to ${selection.playerId}:`, moneyCard);
                if (socketId) {
                  io.to(socketId).emit('game-event', {
                    id: Date.now().toString(),
                    gameId: gameState.id,
                    type: 'MONEY_RECEIVED',
                    playerId: selection.playerId,
                    data: { card: moneyCard, propertyCard: selection.card },
                    timestamp: new Date()
                  });
                  console.log(`✅ Money event sent to socket ${socketId}`);
                } else {
                  console.log(`❌ No socket found for player ${selection.playerId}`);
                }
              }
            });

            // Send selling summary to all players after a short delay
            setTimeout(() => {
              console.log(`📋 Sending SELLING_SUMMARY event to all players`);
              
              // Prepare summary data
              const sellingSummary = sortedSelections.map((selection, index) => {
                const player = updatedGameState.players.find(p => p.id === selection.playerId);
                const moneyCard = index < activeMoneyCards.length ? activeMoneyCards[index] : null;
                
                return {
                  playerId: selection.playerId,
                  playerName: player?.username || 'Unknown',
                  propertyCard: selection.card,
                  moneyCard: moneyCard,
                  moneyReceived: moneyCard?.value || 0
                };
              });

              // Send to all players (including spectators)
              updatedGameState.players.forEach(player => {
                const socketId = playerConnections.get(player.id);
                if (socketId) {
                  io.to(socketId).emit('game-event', {
                    id: Date.now().toString(),
                    gameId: gameState.id,
                    type: 'SELLING_SUMMARY',
                    data: { 
                      summary: sellingSummary,
                      round: updatedGameState.currentRound 
                    },
                    timestamp: new Date()
                  });
                  console.log(`📋 Selling summary sent to ${player.username}`);
                }
              });

              // Send to spectators too
              io.emit('game-event', {
                id: Date.now().toString(),
                gameId: gameState.id,
                type: 'SELLING_SUMMARY',
                data: { 
                  summary: sellingSummary,
                  round: updatedGameState.currentRound 
                },
                timestamp: new Date()
              });
            }, 2000); // 2 second delay to let individual MONEY_RECEIVED events show first

            // After sending events, resolve the selling round
            setTimeout(async () => {
              console.log(`🔄 Resolving selling round after events sent...`);
              try {
                if (updatedGameState.sellingState) {
                  // Manually resolve the selling round here instead of importing
                  const sellingState = updatedGameState.sellingState;
                  const selectedCards = sellingState.selectedCards;
                  
                  // Sort players by their card values (highest first)
                  const sortedPlayers = Object.entries(selectedCards)
                    .sort(([, a], [, b]) => b.value - a.value)
                    .map(([playerId]) => playerId);

                  // Sort money cards (highest first)
                  const sortedMoneyCards = [...updatedGameState.activeMoneyCards].sort((a, b) => b.value - a.value);

                  // Award money cards to players
                  const updatedPlayers = updatedGameState.players.map(player => {
                    const playerIndex = sortedPlayers.indexOf(player.id);
                    if (playerIndex !== -1) {
                      const moneyCard = sortedMoneyCards[playerIndex];
                      const selectedCard = selectedCards[player.id];
                      
                      return {
                        ...player,
                        propertyCards: player.propertyCards.filter(c => c.id !== selectedCard.id),
                        moneyCards: [...player.moneyCards, moneyCard]
                      };
                    }
                    return player;
                  });

                  // Check if all property cards are sold
                  const hasMoreCards = updatedPlayers.some(p => p.propertyCards.length > 0);
                  
                  let resolvedGameState;
                  if (!hasMoreCards) {
                    // Game finished
                    resolvedGameState = {
                      ...updatedGameState,
                      players: updatedPlayers,
                      phase: 'FINISHED' as const,
                      lastActivity: new Date()
                    };
                  } else {
                    // Prepare next selling round
                    const nextMoneyCards = updatedGameState.moneyDeck.slice(0, updatedGameState.players.length);
                    const remainingMoneyDeck = updatedGameState.moneyDeck.slice(updatedGameState.players.length);

                    resolvedGameState = {
                      ...updatedGameState,
                      players: updatedPlayers,
                      moneyDeck: remainingMoneyDeck,
                      activeMoneyCards: nextMoneyCards,
                      currentRound: updatedGameState.currentRound + 1,
                      sellingState: {
                        round: sellingState.round + 1,
                        selectedCards: {},
                        allCardsSelected: false
                      },
                      lastActivity: new Date()
                    };
                  }

                  await saveGameState(resolvedGameState);
                  broadcastToPlayers(io, resolvedGameState);
                  console.log(`✅ Selling round resolved and saved`);
                }
              } catch (error) {
                console.error('Error resolving selling round:', error);
              }
            }, 2500); // Resolve after summary is sent
          }

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