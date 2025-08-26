// Game Types for "For Sale" Board Game

// Card Types
export interface PropertyCard {
  id: number;
  value: number; // 1-30
}

export interface MoneyCard {
  id: number;
  value: number; // 2000-15000
}

// Player Related Types
export interface Player {
  id: string;
  username: string;
  money: number;
  propertyCards: PropertyCard[];
  moneyCards: MoneyCard[];
  isConnected: boolean;
  isHost: boolean;
  lastActivity: Date;
}

export interface PlayerAction {
  playerId: string;
  type: 'BID' | 'PASS' | 'SELECT_CARD' | 'READY';
  data?: {bidAmount?: number, cardId?: number};
  timestamp: Date;
}

// Game State Types
export type GamePhase = 'LOBBY' | 'BUYING' | 'SELLING' | 'FINISHED';

export interface BiddingState {
  currentPlayerId: string;
  currentBid: number;
  biddingOrder: string[]; // Player IDs in order
  passedPlayers: string[]; // Players who passed
  highestBidder?: string;
}

export interface SellingState {
  round: number;
  selectedCards: Record<string, PropertyCard>; // playerId -> selected card
  allCardsSelected: boolean;
}

export interface GameState {
  id: string;
  phase: GamePhase;
  players: Player[];
  hostId: string;
  maxPlayers: number;
  
  // Cards
  propertyDeck: PropertyCard[];
  moneyDeck: MoneyCard[];
  activePropertyCards: PropertyCard[]; // Cards currently being bid on
  activeMoneyCards: MoneyCard[]; // Cards currently available for selling
  
  // Game Logic
  currentRound: number;
  biddingState?: BiddingState;
  sellingState?: SellingState;
  
  // Game Settings
  autoStart: boolean;
  autoStartTimer?: number;
  spectatorMode: boolean;
  
  // Metadata
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  lastActivity: Date;
}

// Game Actions & Events
export interface GameEvent {
  id: string;
  gameId: string;
  type: GameEventType;
  playerId?: string;
  data: {
    card?: {id: number, value: number};
    propertyCard?: {id: number, value: number};
    reason?: string;
    summary?: Array<{playerId: string, playerName: string, propertyCard: {id: number, value: number}, moneyCard: {id: number, value: number} | null, moneyReceived: number}>;
    round?: number;
    results?: GameResult[];
  };
  timestamp: Date;
}

export type GameEventType = 
  | 'PLAYER_JOINED'
  | 'PLAYER_RECONNECTED'
  | 'PLAYER_LEFT'
  | 'GAME_STARTED'
  | 'PHASE_CHANGED'
  | 'BID_PLACED'
  | 'PLAYER_PASSED'
  | 'PROPERTY_WON'
  | 'MONEY_RECEIVED'
  | 'SELLING_SUMMARY'
  | 'CARDS_SELECTED'
  | 'ROUND_COMPLETED'
  | 'GAME_FINISHED'
  | 'ERROR';

// Socket Events
export interface ForSaleServerToClientEvents {
  'game-state-updated': (gameState: GameState) => void;
  'game-event': (event: GameEvent) => void;
  'player-joined': (player: Player) => void;
  'player-left': (playerId: string) => void;
  'error': (error: { message: string; code?: string }) => void;
  'spectator-update': (data: SpectatorData) => void;
  'reconnected': (data: { message: string; gamePhase: GamePhase }) => void;
}

export interface ForSaleClientToServerEvents {
  'join-game': (data: { gameId: string; username: string; isSpectator?: boolean }) => void;
  'create-game': (data: { username: string; maxPlayers?: number; autoStart?: boolean }) => void;
  'start-game': (gameId: string) => void;
  'place-bid': (data: { gameId: string; bid: number }) => void;
  'pass-bid': (gameId: string) => void;
  'select-card': (data: { gameId: string; cardId: number }) => void;
  'leave-game': (gameId: string) => void;
}

// Spectator Data (limited view)
export interface SpectatorData {
  gameId: string;
  phase: GamePhase;
  players: SpectatorPlayer[];
  activePropertyCards: PropertyCard[];
  activeMoneyCards: MoneyCard[];
  currentRound: number;
  biddingState?: Omit<BiddingState, 'biddingOrder'>;
}

export interface SpectatorPlayer {
  id: string;
  username: string;
  money: number;
  propertyCardCount: number;
  moneyCardCount: number;
  isConnected: boolean;
}

// Game Results
export interface GameResult {
  playerId: string;
  username: string;
  finalScore: number;
  rank: number;
  money: number;
  propertyValues: number[];
  moneyValues: number[];
}

// Game Statistics
export interface GameStats {
  totalGames: number;
  averageGameDuration: number;
  averagePlayersPerGame: number;
  mostWins: { username: string; wins: number }[];
}

// Utility Types
export interface CardDeck {
  properties: PropertyCard[];
  money: MoneyCard[];
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  averageScore: number;
  highestScore: number;
  totalMoneyEarned: number;
} 