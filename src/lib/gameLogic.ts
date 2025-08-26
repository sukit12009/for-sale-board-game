import { 
  GameState, 
  Player, 
  PropertyCard, 
  MoneyCard, 
  BiddingState, 
  SellingState,
  GameResult,
  CardDeck
} from '@/types/game';

// Constants
export const PROPERTY_CARDS = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, value: i + 1 }));
export const MONEY_CARDS = [
  { id: 1, value: 2000 }, { id: 2, value: 3000 }, { id: 3, value: 4000 }, { id: 4, value: 5000 },
  { id: 5, value: 6000 }, { id: 6, value: 7000 }, { id: 7, value: 8000 }, { id: 8, value: 9000 },
  { id: 9, value: 10000 }, { id: 10, value: 11000 }, { id: 11, value: 12000 }, { id: 12, value: 13000 },
  { id: 13, value: 14000 }, { id: 14, value: 15000 }, { id: 15, value: 15000 }, { id: 16, value: 14000 },
  { id: 17, value: 13000 }, { id: 18, value: 12000 }, { id: 19, value: 11000 }, { id: 20, value: 10000 },
  { id: 21, value: 9000 }, { id: 22, value: 8000 }, { id: 23, value: 7000 }, { id: 24, value: 6000 },
  { id: 25, value: 5000 }, { id: 26, value: 4000 }, { id: 27, value: 3000 }, { id: 28, value: 2000 },
  { id: 29, value: 0 }, { id: 30, value: 0 }
];

// Utility Functions
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateGameId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Game Setup Functions
export function getStartingMoney(playerCount: number): number {
  return playerCount <= 4 ? 16000 : 14000;
}

export function createCardDecks(): CardDeck {
  return {
    properties: shuffleArray([...PROPERTY_CARDS]),
    money: shuffleArray([...MONEY_CARDS])
  };
}

export function createPlayer(username: string, isHost: boolean = false): Player {
  return {
    id: generatePlayerId(),
    username,
    money: 0, // Will be set when game starts
    propertyCards: [],
    moneyCards: [],
    isConnected: true,
    isHost,
    lastActivity: new Date()
  };
}

export function initializeGame(hostPlayer: Player, maxPlayers: number = 6): GameState {
  const decks = createCardDecks();
  
  return {
    id: generateGameId(),
    phase: 'LOBBY',
    players: [hostPlayer],
    hostId: hostPlayer.id,
    maxPlayers: Math.min(Math.max(maxPlayers, 2), 10),
    
    propertyDeck: decks.properties,
    moneyDeck: decks.money,
    activePropertyCards: [],
    activeMoneyCards: [],
    
    currentRound: 0,
    biddingState: undefined,
    sellingState: undefined,
    
    autoStart: false,
    spectatorMode: true,
    
    createdAt: new Date(),
    lastActivity: new Date()
  };
}

// Game State Management
export function canStartGame(gameState: GameState): boolean {
  return (
    gameState.phase === 'LOBBY' &&
    gameState.players.length >= 2 &&
    gameState.players.length <= gameState.maxPlayers
  );
}

export function startGame(gameState: GameState): GameState {
  if (!canStartGame(gameState)) {
    throw new Error('Cannot start game: invalid conditions');
  }

  const playerCount = gameState.players.length;
  const startingMoney = getStartingMoney(playerCount);
  
  // Give starting money to all players
  const updatedPlayers = gameState.players.map(player => ({
    ...player,
    money: startingMoney
  }));

  // Setup first round
  const activePropertyCards = gameState.propertyDeck.slice(0, playerCount);
  const remainingPropertyDeck = gameState.propertyDeck.slice(playerCount);

  // Initialize bidding with random starting player
  const biddingOrder = shuffleArray(updatedPlayers.map(p => p.id));
  
  return {
    ...gameState,
    phase: 'BUYING',
    players: updatedPlayers,
    propertyDeck: remainingPropertyDeck,
    activePropertyCards,
    currentRound: 1,
    biddingState: {
      currentPlayerId: biddingOrder[0],
      currentBid: 0,
      biddingOrder,
      passedPlayers: [],
      highestBidder: undefined
    },
    startedAt: new Date(),
    lastActivity: new Date()
  };
}

// Bidding Logic
export function canPlaceBid(gameState: GameState, playerId: string, bidAmount: number): boolean {
  if (gameState.phase !== 'BUYING' || !gameState.biddingState) {
    return false;
  }

  const { currentPlayerId, currentBid, passedPlayers } = gameState.biddingState;
  const player = gameState.players.find(p => p.id === playerId);
  
  if (!player) {
    return false;
  }
  
  return (
    currentPlayerId === playerId &&
    !passedPlayers.includes(playerId) &&
    bidAmount > currentBid &&
    player.money >= bidAmount
  );
}

export function placeBid(gameState: GameState, playerId: string, bidAmount: number): GameState {
  if (!canPlaceBid(gameState, playerId, bidAmount)) {
    throw new Error('Invalid bid');
  }

  const biddingState = gameState.biddingState!;
  const nextPlayerIndex = (biddingState.biddingOrder.indexOf(playerId) + 1) % biddingState.biddingOrder.length;
  
  // Find next active player (not passed)
  let nextPlayerId = biddingState.biddingOrder[nextPlayerIndex];
  let attempts = 0;
  while (biddingState.passedPlayers.includes(nextPlayerId) && attempts < biddingState.biddingOrder.length) {
    const index = (biddingState.biddingOrder.indexOf(nextPlayerId) + 1) % biddingState.biddingOrder.length;
    nextPlayerId = biddingState.biddingOrder[index];
    attempts++;
  }

  const updatedBiddingState: BiddingState = {
    ...biddingState,
    currentBid: bidAmount,
    currentPlayerId: nextPlayerId,
    highestBidder: playerId
  };

  return {
    ...gameState,
    biddingState: updatedBiddingState,
    lastActivity: new Date()
  };
}

export function passPlayer(gameState: GameState, playerId: string): GameState {
  if (gameState.phase !== 'BUYING' || !gameState.biddingState) {
    throw new Error('Cannot pass: not in bidding phase');
  }

  const biddingState = gameState.biddingState;
  const player = gameState.players.find(p => p.id === playerId);
  
  if (!player || biddingState.currentPlayerId !== playerId) {
    throw new Error('Invalid player or not their turn');
  }

  const updatedPassedPlayers = [...biddingState.passedPlayers, playerId];
  const activePlayers = biddingState.biddingOrder.filter(id => !updatedPassedPlayers.includes(id));
  
  console.log(`🔍 passPlayer: Original passedPlayers:`, biddingState.passedPlayers);
  console.log(`🔍 passPlayer: Updated passedPlayers:`, updatedPassedPlayers);
  console.log(`🔍 passPlayer: Active players remaining:`, activePlayers.length, activePlayers);
  
  // Give player the lowest property card and half their bid back
  const lowestCard = gameState.activePropertyCards.reduce((lowest, card) => 
    card.value < lowest.value ? card : lowest
  );
  
  const halfBidBack = Math.ceil(biddingState.currentBid / 2);
  const updatedPlayer = {
    ...player,
    money: player.money + halfBidBack,
    propertyCards: [...player.propertyCards, lowestCard]
  };

  const updatedPlayers = gameState.players.map(p => p.id === playerId ? updatedPlayer : p);
  const remainingPropertyCards = gameState.activePropertyCards.filter(card => card.id !== lowestCard.id);

  // Check if bidding round is over
  if (activePlayers.length === 1) {
    return finalizeBiddingRound(gameState, updatedPlayers, remainingPropertyCards, updatedPassedPlayers);
  }

  // Find next active player
  const currentIndex = biddingState.biddingOrder.indexOf(playerId);
  let nextPlayerIndex = (currentIndex + 1) % biddingState.biddingOrder.length;
  while (updatedPassedPlayers.includes(biddingState.biddingOrder[nextPlayerIndex])) {
    nextPlayerIndex = (nextPlayerIndex + 1) % biddingState.biddingOrder.length;
  }

  return {
    ...gameState,
    players: updatedPlayers,
    activePropertyCards: remainingPropertyCards,
    biddingState: {
      ...biddingState,
      passedPlayers: updatedPassedPlayers,
      currentPlayerId: biddingState.biddingOrder[nextPlayerIndex]
    },
    lastActivity: new Date()
  };
}

function finalizeBiddingRound(
  gameState: GameState, 
  players: Player[], 
  remainingPropertyCards: PropertyCard[],
  passedPlayers: string[]
): GameState {
  const biddingState = gameState.biddingState!;
  const winnerId = biddingState.biddingOrder.find(id => !passedPlayers.includes(id))!;
  const winner = players.find(p => p.id === winnerId)!;
  
  // Winner gets highest property card and pays full bid
  const highestCard = remainingPropertyCards.reduce((highest, card) => 
    card.value > highest.value ? card : highest
  );
  
  const updatedWinner = {
    ...winner,
    money: winner.money - biddingState.currentBid,
    propertyCards: [...winner.propertyCards, highestCard]
  };

  const finalPlayers = players.map(p => p.id === winnerId ? updatedWinner : p);

  // Check if buying phase is over
  if (gameState.propertyDeck.length === 0) {
    return startSellingPhase(gameState, finalPlayers);
  }

  // Start next bidding round
  const nextPropertyCards = gameState.propertyDeck.slice(0, gameState.players.length);
  const remainingDeck = gameState.propertyDeck.slice(gameState.players.length);
  
  return {
    ...gameState,
    players: finalPlayers,
    propertyDeck: remainingDeck,
    activePropertyCards: nextPropertyCards,
    currentRound: gameState.currentRound + 1,
    biddingState: {
      currentPlayerId: biddingState.biddingOrder[0],
      currentBid: 0,
      biddingOrder: biddingState.biddingOrder,
      passedPlayers: [],
      highestBidder: undefined
    },
    lastActivity: new Date()
  };
}

// Selling Phase Logic
function startSellingPhase(gameState: GameState, players: Player[]): GameState {
  const playerCount = players.length;
  const activeMoneyCards = gameState.moneyDeck.slice(0, playerCount);
  const remainingMoneyDeck = gameState.moneyDeck.slice(playerCount);

  return {
    ...gameState,
    phase: 'SELLING',
    players,
    moneyDeck: remainingMoneyDeck,
    activeMoneyCards,
    currentRound: 1,
    biddingState: undefined,
    sellingState: {
      round: 1,
      selectedCards: {},
      allCardsSelected: false
    },
    lastActivity: new Date()
  };
}

export function selectCardForSelling(gameState: GameState, playerId: string, cardId: number): GameState {
  if (gameState.phase !== 'SELLING' || !gameState.sellingState) {
    throw new Error('Not in selling phase');
  }

  const player = gameState.players.find(p => p.id === playerId);
  const card = player?.propertyCards.find(c => c.id === cardId);
  
  if (!player || !card) {
    throw new Error('Invalid player or card');
  }

  const updatedSelectedCards = {
    ...gameState.sellingState.selectedCards,
    [playerId]: card
  };

  const selectedCount = Object.keys(updatedSelectedCards).length;
  const totalPlayers = gameState.players.length;
  const allSelected = selectedCount === totalPlayers;
  
  console.log(`🔍 selectCardForSelling: Player ${playerId} selected card ${cardId}`);
  console.log(`🔍 Selected cards count: ${selectedCount} / ${totalPlayers}`);
  console.log(`🔍 Selected cards:`, Object.keys(updatedSelectedCards));
  console.log(`🔍 All players:`, gameState.players.map(p => p.id));
  console.log(`🔍 All selected? ${allSelected}`);

  if (allSelected) {
    // Return state with allCardsSelected: true first, let the server handle the resolution
    console.log(`✅ All cards selected! Returning state with allCardsSelected: true`);
    return {
      ...gameState,
      sellingState: {
        ...gameState.sellingState,
        selectedCards: updatedSelectedCards,
        allCardsSelected: true
      },
      lastActivity: new Date()
    };
  }

  return {
    ...gameState,
    sellingState: {
      ...gameState.sellingState,
      selectedCards: updatedSelectedCards,
      allCardsSelected: false
    },
    lastActivity: new Date()
  };
}

function resolveSellingRound(gameState: GameState, selectedCards: Record<string, PropertyCard>): GameState {
  // Sort players by their card values (highest first)
  const sortedPlayers = Object.entries(selectedCards)
    .sort(([, a], [, b]) => b.value - a.value)
    .map(([playerId]) => playerId);

  // Sort money cards (highest first)
  const sortedMoneyCards = [...gameState.activeMoneyCards].sort((a, b) => b.value - a.value);

  // Award money cards to players
  const updatedPlayers = gameState.players.map(player => {
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
  
  if (!hasMoreCards) {
    return finishGame(gameState, updatedPlayers);
  }

  // Prepare next selling round
  const nextMoneyCards = gameState.moneyDeck.slice(0, gameState.players.length);
  const remainingMoneyDeck = gameState.moneyDeck.slice(gameState.players.length);

  return {
    ...gameState,
    players: updatedPlayers,
    moneyDeck: remainingMoneyDeck,
    activeMoneyCards: nextMoneyCards,
    currentRound: gameState.currentRound + 1,
    sellingState: {
      round: gameState.sellingState!.round + 1,
      selectedCards: {},
      allCardsSelected: false
    },
    lastActivity: new Date()
  };
}

// Game Completion
function finishGame(gameState: GameState, players: Player[]): GameState {
  return {
    ...gameState,
    phase: 'FINISHED',
    players,
    finishedAt: new Date(),
    lastActivity: new Date()
  };
}

export function calculateFinalScores(gameState: GameState): GameResult[] {
  if (gameState.phase !== 'FINISHED') {
    throw new Error('Game not finished');
  }

  const results = gameState.players.map(player => {
    const moneyValue = player.moneyCards.reduce((sum, card) => sum + card.value, 0);
    const finalScore = player.money + moneyValue;
    
    return {
      playerId: player.id,
      username: player.username,
      finalScore,
      rank: 0, // Will be set after sorting
      money: player.money,
      propertyValues: player.propertyCards.map(c => c.value),
      moneyValues: player.moneyCards.map(c => c.value)
    };
  });

  // Sort by score and assign ranks
  results.sort((a, b) => b.finalScore - a.finalScore);
  results.forEach((result, index) => {
    result.rank = index + 1;
  });

  return results;
}

// Helper functions to extract events from game state changes
export function getPassPlayerCard(gameState: GameState, playerId: string): PropertyCard | null {
  if (gameState.phase !== 'BUYING' || !gameState.biddingState) {
    console.log(`❌ getPassPlayerCard: Invalid phase or no bidding state`);
    return null;
  }
  
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) {
    console.log(`❌ getPassPlayerCard: Player ${playerId} not found`);
    return null;
  }
  
  if (gameState.activePropertyCards.length === 0) {
    console.log(`❌ getPassPlayerCard: No active property cards`);
    return null;
  }
  
  // Return the lowest property card (what player gets when passing)
  const lowestCard = gameState.activePropertyCards.reduce((lowest, card) => 
    card.value < lowest.value ? card : lowest
  );
  
  console.log(`✅ getPassPlayerCard: Player ${playerId} will get card ${lowestCard.value}`);
  return lowestCard;
}

export function getWinnerCard(gameState: GameState): { winnerId: string; card: PropertyCard } | null {
  if (gameState.phase !== 'BUYING' || !gameState.biddingState) return null;
  
  const biddingState = gameState.biddingState;
  if (!biddingState.highestBidder) return null;
  
  // Return the highest property card (what winner gets)
  const highestCard = gameState.activePropertyCards.reduce((highest, card) => 
    card.value > highest.value ? card : highest
  );
  
  return {
    winnerId: biddingState.highestBidder,
    card: highestCard
  };
} 