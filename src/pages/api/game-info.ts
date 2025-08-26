import { NextApiRequest, NextApiResponse } from 'next';
import connectMongoDB from '@/lib/mongodb';
import Game from '@/models/Game';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gameId } = req.query;

  if (!gameId || typeof gameId !== 'string') {
    return res.status(400).json({ error: 'Game ID is required' });
  }

  try {
    await connectMongoDB();
    const gameDoc = await Game.findOne({ id: gameId.toUpperCase() });
    
    if (!gameDoc) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = gameDoc.toGameState();
    
    // Return public game info
    const gameInfo = {
      id: gameState.id,
      phase: gameState.phase,
      playerCount: gameState.players.length,
      maxPlayers: gameState.maxPlayers,
      players: gameState.players.map((p: {username: string, isHost: boolean, isConnected: boolean}) => ({
        username: p.username,
        isHost: p.isHost,
        isConnected: p.isConnected
      })),
      currentRound: gameState.currentRound,
      createdAt: gameState.createdAt,
      startedAt: gameState.startedAt
    };

    res.status(200).json(gameInfo);
  } catch (error) {
    console.error('Error fetching game info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 