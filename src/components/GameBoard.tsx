'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  GameState, 
  SpectatorData
} from '@/types/game';
import { PropertyCardComponent, MoneyCardComponent, EmptyCardSlot } from './GameCard';
import { PlayerList, PlayerSummary } from './PlayerInfo';
import ResultPopup from './ResultPopup';
import SellingSummaryPopup from './SellingSummaryPopup';

interface GameBoardProps {
  username: string;
  gameId?: string;
  isSpectator?: boolean;
}

export default function GameBoard({ username, gameId, isSpectator = false }: GameBoardProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [spectatorData, setSpectatorData] = useState<SpectatorData | null>(null);
  const [selfPlayerId, setSelfPlayerId] = useState<string>('');
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [gameResults, setGameResults] = useState<Array<{playerId: string, username: string, finalScore: number, rank: number}> | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<string>('');
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  
  // Result Popup State
  const [resultPopup, setResultPopup] = useState<{
    isOpen: boolean;
    type: 'property' | 'money';
    card: {id: number, value: number} | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'property',
    card: null,
    title: '',
    message: ''
  });

  // Selling Summary Popup State
  const [sellingSummaryPopup, setSellingSummaryPopup] = useState<{
    isOpen: boolean;
    summary: Array<{playerId: string, playerName: string, propertyCard: {id: number, value: number}, moneyCard: {id: number, value: number} | null, moneyReceived: number}>;
    round: number;
  }>({
    isOpen: false,
    summary: [],
    round: 0
  });

  // Initialize Socket Connection
  useEffect(() => {
    console.log('🚨 [DEBUG] Initializing Socket.IO connection...');
    
    const socketInstance = io({
      path: '/api/socket',
      forceNew: true,
      transports: ['polling', 'websocket'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected successfully!', socketInstance.id);
      setConnectionStatus('connected');
      setSocket(socketInstance);
      
      if (gameId) {
        // Join existing game
        console.log(`🔗 Joining game: ${gameId} as ${username} (spectator: ${isSpectator})`);
        setIsReconnecting(true);
        socketInstance.emit('join-game', { gameId, username, isSpectator });
      } else if (!isSpectator) {
        // Create new game
        console.log('Creating new game...');
        socketInstance.emit('create-game', { username, maxPlayers: 6, autoStart: false });
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('🚨 [DEBUG] Socket connection error:', error);
      console.error('🚨 [DEBUG] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      setConnectionStatus('disconnected');
      setError(`การเชื่อมต่อล้มเหลว: ${error.message}`);
    });

    socketInstance.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
      
      // Handle empty error objects
      if (!error || typeof error !== 'object') {
        console.error('Invalid error object received');
        return;
      }
      
      // Handle different error types
      if (error.code === 'GAME_STARTED_NEW_PLAYER') {
        setError(`${error.message}\n\n💡 วิธีแก้: ใช้ชื่อผู้เล่นที่มีอยู่ในเกมเพื่อเข้าไปเล่นต่อ`);
      } else if (error.code === 'REPLACED') {
        // Don't show error for replacement, just reload
        console.log('Connection replaced, reloading...');
        window.location.reload();
      } else if (error.message) {
        setError(error.message);
      } else {
        console.error('Unknown error format:', error);
        setError('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
      }
    });

          socketInstance.on('game-state-updated', (newGameState) => {
        console.log('Game state updated:', newGameState);
        setGameState(newGameState);
        setIsReconnecting(false);
        
        // Find self player ID
        const self = newGameState.players.find((p: {id: string, username: string}) => p.username === username);
        if (self) {
          console.log(`🔍 Setting selfPlayerId: ${self.id} for username: ${username}`);
          setSelfPlayerId(self.id);
          // Store in localStorage as backup
          localStorage.setItem(`playerId_${username}`, self.id);
        }
      });

    socketInstance.on('spectator-update', (data) => {
      console.log('Spectator update:', data);
      setSpectatorData(data);
    });

          // Register game-event listener FIRST
      console.log('🚨 [DEBUG] Registering game-event listener...');
      socketInstance.on('game-event', (event) => {
        console.log('🚨 [DEBUG] game-event listener fired!');
        console.log('🚨 [DEBUG] Raw event:', event);
        console.log('🚨 [DEBUG] Event type:', event?.type);
        console.log('🚨 [DEBUG] Event playerId:', event?.playerId);
        console.log('🚨 [DEBUG] Current selfPlayerId:', selfPlayerId);
        
        if (event.type === 'GAME_FINISHED') {
          setGameResults(event.data.results);
        }
        
        // Show reconnection message
        if (event.type === 'PLAYER_RECONNECTED' && event.data.username === username) {
          console.log('Successfully reconnected to game!');
        }

        // Show result popups for current player
        console.log(`🎮 Game event received:`, event);
        console.log(`🔍 selfPlayerId: "${selfPlayerId}", event.playerId: "${event.playerId}"`);
        
        // Debug username and player matching
        console.log(`🔍 Looking for player with username: "${username}"`);
        console.log(`🔍 gameState:`, !!gameState);
        console.log(`🔍 gameState.players:`, gameState?.players);
        console.log(`🔍 Available players:`, gameState?.players?.map((p: any) => ({ id: p.id, username: p.username })));
        
        // Try to find player in current gameState
        const currentPlayer = gameState?.players?.find((p: any) => p.username === username);
        
        // Alternative: Check if the event is for current user directly
        // Since we know the username, we can store playerId when we get game-state-updated
        const storedPlayerId = localStorage.getItem(`playerId_${username}`);
        
        console.log(`🔍 currentPlayer:`, currentPlayer);
        console.log(`🔍 storedPlayerId:`, storedPlayerId);
        
        // Use multiple fallbacks to determine if this event is for current player
        const isForCurrentPlayer = 
          event.playerId === selfPlayerId ||           // Primary check
          event.playerId === currentPlayer?.id ||      // Username match
          event.playerId === storedPlayerId;           // Stored playerId
        
        console.log(`🔍 Event for current player? ${isForCurrentPlayer} (${event.playerId} matches any of: selfPlayerId="${selfPlayerId}", currentPlayer.id="${currentPlayer?.id}", stored="${storedPlayerId}")`);
        
        console.log(`🔍 currentPlayer:`, currentPlayer);
        console.log(`🔍 currentPlayer?.id:`, currentPlayer?.id);
        console.log(`🔍 selfPlayerId comparison: "${event.playerId}" === "${selfPlayerId}" = ${event.playerId === selfPlayerId}`);
        console.log(`🔍 currentPlayer comparison: "${event.playerId}" === "${currentPlayer?.id}" = ${event.playerId === currentPlayer?.id}`);
        console.log(`🔍 isForCurrentPlayer:`, isForCurrentPlayer);
        
        if (isForCurrentPlayer) {
          console.log(`✅ Event is for current player!`);
          console.log(`🔍 Checking event type: "${event.type}"`);
          console.log(`🔍 Checking event.data:`, event.data);
          console.log(`🔍 Checking event.data.card:`, event.data?.card);
          
          if (event.type === 'PROPERTY_WON') {
            console.log(`✅ Event type is PROPERTY_WON`);
            
            if (event.data.card) {
              console.log(`✅ Event has card data`);
              console.log(`🏠 Showing property popup:`, event.data.card);
              console.log(`🏠 Card data:`, JSON.stringify(event.data.card));
              
              const newPopupState = {
                isOpen: true,
                type: 'property' as const,
                card: event.data.card,
                title: 'ได้รับบ้านใหม่! 🏠',
                message: event.data.reason === 'passed' ? 'คุณได้รับบ้านจากการยอมแพ้!' : 'คุณเป็นผู้ชนะการประมูล!'
              };
              
                          console.log(`🏠 Setting popup state:`, newPopupState);
            setResultPopup(newPopupState);
            
            // Check if state was set
            setTimeout(() => {
              console.log(`🏠 Popup should be visible now!`);
            }, 100);
            } else {
              console.log(`❌ Event has no card data`);
            }
          } else {
            console.log(`❌ Event type is not PROPERTY_WON: "${event.type}"`);
          }
          
          if (event.type === 'MONEY_RECEIVED' && event.data.card) {
            console.log(`💰 Showing money popup:`, event.data.card);
            setResultPopup({
              isOpen: true,
              type: 'money',
              card: event.data.card,
              title: 'ได้รับเช็คเงิน! 💰',
              message: 'คุณขายบ้านสำเร็จ!'
            });
          }
        } else {
          console.log(`❌ Event not for current player (${event.playerId} !== ${selfPlayerId})`);
        }

        // Show selling summary to everyone (not player-specific)
        if (event.type === 'SELLING_SUMMARY') {
          console.log(`📋 SELLING_SUMMARY event received!`);
          console.log(`📋 Event data:`, event.data);
          console.log(`📋 Summary:`, event.data.summary);
          console.log(`📋 Round:`, event.data.round);
          console.log(`📋 Setting selling summary popup state...`);
          
          setSellingSummaryPopup({
            isOpen: true,
            summary: event.data.summary,
            round: event.data.round
          });
          
          console.log(`📋 Selling summary popup state set!`);
        }
      });

    socketInstance.on('reconnected', (data) => {
      console.log('Reconnection successful:', data);
      setIsReconnecting(false);
      // Could show a toast notification here
    });

    // Listen for simple events for debugging
    socketInstance.on('game-created', (game) => {
      console.log('Game created event:', game);
      // Convert simple game to compatible format
      const compatibleGame = {
        ...game,
        phase: game.phase || 'LOBBY',
        players: game.players || [],
        activePropertyCards: game.activePropertyCards || [],
        activeMoneyCards: game.activeMoneyCards || [],
        currentRound: game.currentRound || 0
      };
      setGameState(compatibleGame);
      setIsReconnecting(false);
      // Find self player ID
      const self = compatibleGame.players.find((p: any) => p.username === username);
      if (self) {
        setSelfPlayerId(self.id);
      }
    });

    socketInstance.on('game-updated', (game) => {
      console.log('Game updated event:', game);
      // Convert simple game to compatible format
      const compatibleGame = {
        ...game,
        phase: game.phase || 'LOBBY',
        players: game.players || [],
        activePropertyCards: game.activePropertyCards || [],
        activeMoneyCards: game.activeMoneyCards || [],
        currentRound: game.currentRound || 0
      };
      setGameState(compatibleGame);
      setIsReconnecting(false);
      // Find self player ID
      const self = compatibleGame.players.find((p: any) => p.username === username);
      if (self) {
        setSelfPlayerId(self.id);
      }
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [gameId, username, isSpectator]);

  // Game Actions
  const startGame = useCallback(() => {
    if (socket && gameState) {
      socket.emit('start-game', gameState.id);
    }
  }, [socket, gameState]);

  const placeBid = useCallback(() => {
    if (socket && gameState && bidAmount > 0) {
      socket.emit('place-bid', { gameId: gameState.id, bid: bidAmount });
      setBidAmount(0);
    }
  }, [socket, gameState, bidAmount]);

  const passBid = useCallback(() => {
    console.log('🚨 [DEBUG] passBid called!');
    console.log('🚨 [DEBUG] socket:', !!socket);
    console.log('🚨 [DEBUG] gameState:', !!gameState);
    console.log('🚨 [DEBUG] gameState.id:', gameState?.id);
    
    if (socket && gameState) {
      console.log(`🚨 [DEBUG] Emitting pass-bid for game ${gameState.id}`);
      socket.emit('pass-bid', gameState.id);
    } else {
      console.log('🚨 [DEBUG] Cannot emit pass-bid: missing socket or gameState');
    }
  }, [socket, gameState]);

  const selectCard = useCallback((cardId: number) => {
    if (socket && gameState) {
      socket.emit('select-card', { gameId: gameState.id, cardId });
      setSelectedCardId(null);
    }
  }, [socket, gameState]);

  const leaveGame = useCallback(() => {
    if (socket && gameState) {
      socket.emit('leave-game', gameState.id);
    }
  }, [socket, gameState]);

  // Render different states
  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-xl mb-2">
            {isReconnecting ? 'กำลังเข้าร่วมเกม...' : 'เชื่อมต่อเซิร์ฟเวอร์...'}
          </div>
          {isReconnecting && (
            <div className="text-sm opacity-80">
              หากคุณเคยอยู่ในเกมนี้แล้ว จะเข้าไปเล่นต่อได้เลย
            </div>
          )}
        </div>
      </div>
    );
  }

  if (connectionStatus === 'disconnected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">การเชื่อมต่อขาดหาย</h1>
          <button 
            onClick={() => window.location.reload()}
            className="bg-white text-red-600 px-6 py-2 rounded-lg font-semibold"
          >
            เชื่อมต่อใหม่
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 text-center max-w-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">เกิดข้อผิดพลาด</h1>
          <div className="text-gray-700 mb-6 whitespace-pre-line">{error}</div>
          
          {gameId && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-blue-800 mb-2">🎮 เกม: {gameId}</h3>
              <p className="text-sm text-blue-700">
                ลองใช้ชื่อผู้เล่นที่มีอยู่ในเกมนี้เพื่อเข้าไปเล่นต่อ
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              ลองใหม่
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Spectator View - เห็นทุกอย่าง!
  if (isSpectator && gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-center mb-4">
              👁️ For Sale - โหมดผู้ชม
            </h1>
            <div className="text-center text-gray-600 space-y-2">
              <div>เกม ID: <span className="font-mono font-bold">{gameState.id}</span></div>
              <div className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full inline-block">
                🔍 คุณสามารถเห็นการ์ดและเงินของทุกคน
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Game Area */}
            <div className="lg:col-span-2">
              <GameArea 
                gameState={gameState}
                isSpectator={true}
                selfPlayerId="" // No self player for spectators
              />
            </div>

            {/* Players - Show all cards and money */}
            <div>
              <PlayerList
                players={gameState.players}
                currentPlayerId={gameState.biddingState?.currentPlayerId}
                selfPlayerId="" // Show all players' cards
                spectatorMode={true} // Show everything
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Player View
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-xl mb-4">รอข้อมูลเกม...</div>
          <div className="text-sm opacity-80">
            {gameId ? `กำลังเข้าร่วมเกม: ${gameId}` : 'กำลังสร้างเกมใหม่'}
          </div>
          <div className="mt-4">
            <button
              onClick={() => window.location.href = '/'}
              className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30"
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game Finished
  if (gameState.phase === 'FINISHED' && gameResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 to-pink-500 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-center mb-8">🎉 เกมจบแล้ว!</h1>
            
            <div className="space-y-4">
                              {gameResults.map((result, index) => {
                                  const player = gameState.players.find((p) => p.id === result.playerId)!;
                return (
                  <PlayerSummary
                    key={result.playerId}
                    player={player}
                    rank={result.rank}
                  />
                );
              })}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg"
              >
                เล่นใหม่
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selfPlayer = gameState.players.find((p: any) => p.id === selfPlayerId);
  const isHost = selfPlayer?.isHost || false;
  const isCurrentTurn = gameState.biddingState?.currentPlayerId === selfPlayerId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🏘️ For Sale</h1>
              <p className="text-gray-600">
                เกม ID: <span className="font-mono font-bold">{gameState.id}</span>
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {gameState.phase === 'LOBBY' && isHost && (
                <button
                  onClick={startGame}
                  disabled={gameState.players.length < 2}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  เริ่มเกม
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Game Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <GameArea 
              gameState={gameState}
              selfPlayerId={selfPlayerId}
              isCurrentTurn={isCurrentTurn}
              bidAmount={bidAmount}
              setBidAmount={setBidAmount}
              selectedCardId={selectedCardId}
              setSelectedCardId={setSelectedCardId}
              onPlaceBid={placeBid}
              onPassBid={passBid}
              onSelectCard={selectCard}
            />
          </div>

          {/* Players */}
          <div>
            <PlayerList
              players={gameState.players}
              currentPlayerId={gameState.biddingState?.currentPlayerId}
              selfPlayerId={selfPlayerId}
            />
          </div>
        </div>
      </div>

      {/* Result Popup */}
      <ResultPopup
        isOpen={resultPopup.isOpen}
        onClose={() => setResultPopup((prev) => ({ ...prev, isOpen: false }))}
        type={resultPopup.type}
        card={resultPopup.card}
        title={resultPopup.title}
        message={resultPopup.message}
      />

      {/* Selling Summary Popup */}
      <SellingSummaryPopup
        isOpen={sellingSummaryPopup.isOpen}
        onClose={() => setSellingSummaryPopup((prev) => ({ ...prev, isOpen: false }))}
        summary={sellingSummaryPopup.summary}
        round={sellingSummaryPopup.round}
      />
    </div>
  );
}

// Game Area Component
interface GameAreaProps {
  gameState?: GameState | null;
  spectatorData?: SpectatorData;
  isSpectator?: boolean;
  selfPlayerId?: string;
  isCurrentTurn?: boolean;
  bidAmount?: number;
  setBidAmount?: (amount: number) => void;
  selectedCardId?: number | null;
  setSelectedCardId?: (cardId: number | null) => void;
  onPlaceBid?: () => void;
  onPassBid?: () => void;
  onSelectCard?: (cardId: number) => void;
}

function GameArea({
  gameState,
  spectatorData,
  isSpectator = false,
  selfPlayerId,
  isCurrentTurn = false,
  bidAmount = 0,
  setBidAmount,
  selectedCardId,
  setSelectedCardId,
  onPlaceBid,
  onPassBid,
  onSelectCard
}: GameAreaProps) {
  const data = gameState || spectatorData;
  if (!data) return null;

  const selfPlayer = gameState?.players.find(p => p.id === selfPlayerId);

  return (
    <div className="space-y-6">
      {/* Phase Info */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">
            {data.phase === 'LOBBY' && '🚪 รอผู้เล่น'}
            {data.phase === 'BUYING' && '🏠 ประมูลซื้อบ้าน'}
            {data.phase === 'SELLING' && '💰 ขายบ้าน'}
            {data.phase === 'FINISHED' && '🎉 เกมจบ'}
          </h2>
          <p className="text-gray-600">รอบที่ {data.currentRound}</p>
        </div>
      </div>

      {/* Active Cards */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4">
          {data.phase === 'BUYING' && '🏠 การ์ดบ้านที่ประมูล'}
          {data.phase === 'SELLING' && '💰 เช็คเงินที่ขาย'}
        </h3>
        
        <div className="flex justify-center space-x-4">
          {data.phase === 'BUYING' && data.activePropertyCards.map((card) => (
            <PropertyCardComponent key={card.id} card={card} size="large" />
          ))}
          
          {data.phase === 'SELLING' && data.activeMoneyCards.map((card) => (
            <MoneyCardComponent key={card.id} card={card} size="large" />
          ))}
          
          {data.phase === 'LOBBY' && (
            <EmptyCardSlot size="large" label="รอเริ่มเกม" />
          )}
        </div>
      </div>

      {/* Bidding Interface */}
      {data.phase === 'BUYING' && !isSpectator && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4">💰 การประมูล</h3>
          
          {data.biddingState && (
            <div className="mb-4 text-center">
              <p className="text-gray-600">
                ราคาปัจจุบัน: <span className="font-bold text-green-600">฿{data.biddingState.currentBid.toLocaleString()}</span>
              </p>
              {data.biddingState.highestBidder && (
                <p className="text-sm text-gray-500">
                  ผู้ประมูลสูงสุด: {gameState?.players.find(p => p.id === data.biddingState?.highestBidder)?.username}
                </p>
              )}
            </div>
          )}

          {isCurrentTurn ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount?.(Math.max(0, parseInt(e.target.value) || 0))}
                  min={(data.biddingState?.currentBid || 0) + 1000}
                  step="1000"
                  className="flex-1 px-4 py-2 border rounded-lg"
                  placeholder="ใส่ราคาประมูล"
                />
                <button
                  onClick={onPlaceBid}
                  disabled={!bidAmount || bidAmount <= (data.biddingState?.currentBid || 0)}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  ประมูล
                </button>
              </div>
              
              <button
                onClick={onPassBid}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-semibold"
              >
                ยอมแพ้
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              รอตาผู้เล่นอื่น...
            </div>
          )}
        </div>
      )}

      {/* Card Selection Interface */}
      {data.phase === 'SELLING' && !isSpectator && selfPlayer && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">🏠 เลือกบ้านที่จะขาย</h3>
            {gameState?.sellingState?.selectedCards[selfPlayerId || ''] && (
              <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                กำลังขาย: บ้านหลัง {gameState.sellingState.selectedCards[selfPlayerId || ''].value}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {selfPlayer.propertyCards.map((card) => (
              <PropertyCardComponent
                key={card.id}
                card={card}
                selected={selectedCardId === card.id}
                onClick={() => setSelectedCardId?.(card.id)}
              />
            ))}
          </div>
          
          {selectedCardId && (
            <div className="mt-4 text-center">
              <button
                onClick={() => onSelectCard?.(selectedCardId)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-semibold"
              >
                ขายบ้านนี้
              </button>
            </div>
          )}
        </div>
      )}

      {/* Spectator View - Show all players' selected cards */}
      {data.phase === 'SELLING' && isSpectator && gameState?.sellingState && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4">👁️ การเลือกบ้านของผู้เล่น</h3>
          
          <div className="space-y-3">
            {gameState.players.map((player) => {
              const selectedCard = gameState.sellingState?.selectedCards[player.id];
              return (
                <div key={player.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${player.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="font-medium">{player.username}</span>
                  </div>
                  
                  <div>
                    {selectedCard ? (
                      <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                        กำลังขาย: บ้านหลัง {selectedCard.value}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">
                        กำลังเลือก...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 