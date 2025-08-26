import mongoose from 'mongoose';
import { GameState, GamePhase, Player, PropertyCard, MoneyCard, BiddingState, SellingState } from '@/types/game';

const PropertyCardSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  value: { type: Number, required: true }
}, { _id: false });

const MoneyCardSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  value: { type: Number, required: true }
}, { _id: false });

const PlayerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  username: { type: String, required: true },
  money: { type: Number, required: true },
  propertyCards: [PropertyCardSchema],
  moneyCards: [MoneyCardSchema],
  isConnected: { type: Boolean, default: true },
  isHost: { type: Boolean, default: false },
  lastActivity: { type: Date, default: Date.now }
}, { _id: false });

const BiddingStateSchema = new mongoose.Schema({
  currentPlayerId: { type: String, required: true },
  currentBid: { type: Number, required: true },
  biddingOrder: [{ type: String }],
  passedPlayers: [{ type: String }],
  highestBidder: { type: String }
}, { _id: false });

const SellingStateSchema = new mongoose.Schema({
  round: { type: Number, required: true },
  selectedCards: { type: Map, of: PropertyCardSchema },
  allCardsSelected: { type: Boolean, default: false }
}, { _id: false });

const GameSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  phase: { 
    type: String, 
    enum: ['LOBBY', 'BUYING', 'SELLING', 'FINISHED'],
    default: 'LOBBY'
  },
  players: [PlayerSchema],
  hostId: { type: String, required: true },
  maxPlayers: { type: Number, default: 6, min: 2, max: 10 },
  
  // Cards
  propertyDeck: [PropertyCardSchema],
  moneyDeck: [MoneyCardSchema],
  activePropertyCards: [PropertyCardSchema],
  activeMoneyCards: [MoneyCardSchema],
  
  // Game Logic
  currentRound: { type: Number, default: 0 },
  biddingState: BiddingStateSchema,
  sellingState: SellingStateSchema,
  
  // Game Settings
  autoStart: { type: Boolean, default: false },
  autoStartTimer: { type: Number },
  spectatorMode: { type: Boolean, default: true },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  lastActivity: { type: Date, default: Date.now }
});

// Indexes for performance
GameSchema.index({ id: 1 });
GameSchema.index({ 'players.id': 1 });
GameSchema.index({ phase: 1 });
GameSchema.index({ createdAt: -1 });

// Methods
GameSchema.methods.toGameState = function(): GameState {
  return {
    id: this.id,
    phase: this.phase,
    players: this.players,
    hostId: this.hostId,
    maxPlayers: this.maxPlayers,
    propertyDeck: this.propertyDeck,
    moneyDeck: this.moneyDeck,
    activePropertyCards: this.activePropertyCards,
    activeMoneyCards: this.activeMoneyCards,
    currentRound: this.currentRound,
    biddingState: this.biddingState,
    sellingState: this.sellingState,
    autoStart: this.autoStart,
    autoStartTimer: this.autoStartTimer,
    spectatorMode: this.spectatorMode,
    createdAt: this.createdAt,
    startedAt: this.startedAt,
    finishedAt: this.finishedAt,
    lastActivity: this.lastActivity
  };
};

// Cleanup old games (older than 24 hours)
GameSchema.statics.cleanupOldGames = async function() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.deleteMany({ 
    lastActivity: { $lt: cutoff },
    phase: { $in: ['LOBBY', 'FINISHED'] }
  });
};

export default mongoose.models.Game || mongoose.model('Game', GameSchema); 