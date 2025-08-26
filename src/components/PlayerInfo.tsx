import React from 'react';
import { Player } from '@/types/game';
import { PropertyCardComponent, MoneyCardComponent, CardBack } from './GameCard';

interface PlayerInfoProps {
  player: Player;
  isCurrentPlayer?: boolean;
  isSelf?: boolean;
  isCurrentTurn?: boolean;
  showCards?: boolean;
  compact?: boolean;
  className?: string;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  selfPlayerId?: string;
  spectatorMode?: boolean;
  className?: string;
}

export function PlayerInfo({
  player,
  isCurrentPlayer = false,
  isSelf = false,
  isCurrentTurn = false,
  showCards = false,
  compact = false,
  className = ''
}: PlayerInfoProps) {
  const totalPropertyValue = player.propertyCards.reduce((sum, card) => sum + card.value, 0);
  const totalMoneyValue = player.moneyCards.reduce((sum, card) => sum + card.value, 0);
  const totalScore = player.money + totalMoneyValue;

  // Debug log
  console.log(`👤 PlayerInfo: ${player.username} - showCards: ${showCards}, isSelf: ${isSelf}, moneyCards: ${player.moneyCards.length}`);

  return (
    <div
      className={`
        bg-white rounded-lg shadow-lg p-4 border-2 transition-all duration-200
        ${isCurrentTurn ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}
        ${isSelf ? 'ring-2 ring-blue-400' : ''}
        ${!player.isConnected ? 'opacity-60' : ''}
        ${className}
      `}
    >
      {/* Player Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${player.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <h3 className={`font-bold ${compact ? 'text-sm' : 'text-lg'}`}>
            {player.username}
            {player.isHost && <span className="ml-1 text-yellow-600">👑</span>}
            {isSelf && <span className="ml-1 text-blue-600">(คุณ)</span>}
          </h3>
        </div>
        
        {isCurrentTurn && (
          <div className="flex items-center space-x-1 text-yellow-600">
            <span className="text-sm font-medium">ตาของคุณ</span>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Player Stats */}
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-3'} gap-2 mb-3`}>
        <div className="bg-green-100 rounded-lg p-2 text-center">
          <div className={`font-bold text-green-800 ${compact ? 'text-sm' : 'text-lg'}`}>
            {showCards ? `฿${player.money.toLocaleString()}` : '฿???'}
          </div>
          <div className="text-xs text-green-600">เงินสด</div>
        </div>
        
        <div className="bg-blue-100 rounded-lg p-2 text-center">
          <div className={`font-bold text-blue-800 ${compact ? 'text-sm' : 'text-lg'}`}>
            {player.propertyCards.length}
          </div>
          <div className="text-xs text-blue-600">บ้าน</div>
        </div>
        
        {!compact && (
          <div className="bg-purple-100 rounded-lg p-2 text-center">
            <div className={`font-bold text-purple-800 ${compact ? 'text-sm' : 'text-lg'}`}>
              {player.moneyCards.length}
            </div>
            <div className="text-xs text-purple-600">เช็ค</div>
          </div>
        )}
      </div>

      {/* Total Score (if game is finished or for self) */}
      {(showCards || isSelf) && (
        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg p-2 mb-3">
          <div className="text-center">
            <div className={`font-bold text-yellow-800 ${compact ? 'text-base' : 'text-xl'}`}>
              ฿{totalScore.toLocaleString()}
            </div>
            <div className="text-xs text-yellow-700">คะแนนรวม</div>
          </div>
        </div>
      )}

      {/* Cards Display */}
      {showCards && (
        <div className="space-y-3">
          {/* Property Cards */}
          {player.propertyCards.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">การ์ดบ้าน</h4>
              <div className="flex flex-wrap gap-1">
                {player.propertyCards.map((card) => (
                  <PropertyCardComponent
                    key={card.id}
                    card={card}
                    size="small"
                  />
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                มูลค่ารวม: {totalPropertyValue}
              </div>
            </div>
          )}

          {/* Money Cards */}
          {player.moneyCards.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">เช็คเงิน</h4>
              <div className="flex flex-wrap gap-1">
                {player.moneyCards.map((card) => (
                  <MoneyCardComponent
                    key={card.id}
                    card={card}
                    size="small"
                  />
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                มูลค่ารวม: ฿{totalMoneyValue.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden Cards (for other players) */}
      {!showCards && !isSelf && (
        <div className="space-y-2">
          {/* Property Cards */}
          {player.propertyCards.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">การ์ดบ้าน</h4>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: Math.min(player.propertyCards.length, 5) }).map((_, i) => (
                  <CardBack key={i} type="property" size="small" />
                ))}
                {player.propertyCards.length > 5 && (
                  <div className="w-16 h-20 flex items-center justify-center text-xs text-gray-500">
                    +{player.propertyCards.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Money Cards */}
          {player.moneyCards.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">เช็คเงิน</h4>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: Math.min(player.moneyCards.length, 5) }).map((_, i) => (
                  <CardBack key={i} type="money" size="small" />
                ))}
                {player.moneyCards.length > 5 && (
                  <div className="w-16 h-20 flex items-center justify-center text-xs text-gray-500">
                    +{player.moneyCards.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PlayerList({
  players,
  currentPlayerId,
  selfPlayerId,
  spectatorMode = false,
  className = ''
}: PlayerListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        ผู้เล่น ({players.length} คน)
      </h2>
      
      {players.map((player) => {
        const shouldShowCards = spectatorMode || selfPlayerId === player.id;
        console.log(`🎭 PlayerList: ${player.username} - spectatorMode: ${spectatorMode}, selfPlayerId: "${selfPlayerId}", shouldShowCards: ${shouldShowCards}`);
        
        return (
          <PlayerInfo
            key={player.id}
            player={player}
            isCurrentPlayer={currentPlayerId === player.id}
            isSelf={selfPlayerId === player.id}
            isCurrentTurn={currentPlayerId === player.id}
            showCards={shouldShowCards}
            compact={players.length > 4}
          />
        );
      })}
    </div>
  );
}

export function PlayerSummary({ 
  player, 
  rank, 
  className = '' 
}: { 
  player: Player; 
  rank: number;
  className?: string;
}) {
  const totalPropertyValue = player.propertyCards.reduce((sum, card) => sum + card.value, 0);
  const totalMoneyValue = player.moneyCards.reduce((sum, card) => sum + card.value, 0);
  const totalScore = player.money + totalMoneyValue;

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-yellow-500 text-yellow-900';
      case 2: return 'from-gray-300 to-gray-400 text-gray-900';
      case 3: return 'from-orange-400 to-orange-500 text-orange-900';
      default: return 'from-blue-100 to-blue-200 text-blue-900';
    }
  };

  const getRankEmoji = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '📊';
    }
  };

  return (
    <div className={`bg-gradient-to-r ${getRankColor(rank)} rounded-lg p-4 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getRankEmoji(rank)}</span>
          <div>
            <h3 className="font-bold text-lg">{player.username}</h3>
            <p className="text-sm opacity-80">อันดับ {rank}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">฿{totalScore.toLocaleString()}</div>
          <div className="text-sm opacity-80">คะแนนรวม</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="text-center">
          <div className="font-semibold">฿{player.money.toLocaleString()}</div>
          <div className="opacity-70">เงินสด</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{totalPropertyValue}</div>
          <div className="opacity-70">มูลค่าบ้าน</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">฿{totalMoneyValue.toLocaleString()}</div>
          <div className="opacity-70">เช็คเงิน</div>
        </div>
      </div>
    </div>
  );
} 