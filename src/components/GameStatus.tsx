'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface GameState {
  packCount: number;
  totalPacks: number;
  gameStatus: 'active' | 'completed' | 'pending';
  lastUpdated: Date;
}

export default function GameStatus() {
  const [gameState, setGameState] = useState<GameState>({
    packCount: 0,
    totalPacks: 0,
    gameStatus: 'pending',
    lastUpdated: new Date(),
  });

  useEffect(() => {
    const gameStateRef = doc(db, 'gameState', 'current');
    const unsubscribe = onSnapshot(gameStateRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setGameState({
          packCount: data.packCount || 0,
          totalPacks: data.totalPacks || 0,
          gameStatus: data.gameStatus || 'pending',
          lastUpdated: data.lastUpdated?.toDate() || new Date(),
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Game Status</h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Packs Opened:</span>
          <span className="font-bold">{gameState.packCount} / {gameState.totalPacks}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Status:</span>
          <span className={`font-bold ${
            gameState.gameStatus === 'active' ? 'text-green-600' :
            gameState.gameStatus === 'completed' ? 'text-blue-600' :
            'text-yellow-600'
          }`}>
            {gameState.gameStatus.charAt(0).toUpperCase() + gameState.gameStatus.slice(1)}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {gameState.lastUpdated.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
} 