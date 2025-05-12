'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import GameStatus from '@/components/GameStatus';

interface DetailedScore {
  id: string;
  playerName: string;
  score: number;
  packsOpened: number;
  lastUpdated: Date;
  notes?: string;
}

export default function ScoresPage() {
  const [scores, setScores] = useState<DetailedScore[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'scores'), orderBy('score', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const scoreData: DetailedScore[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        scoreData.push({
          id: doc.id,
          playerName: data.playerName,
          score: data.score,
          packsOpened: data.packsOpened || 0,
          lastUpdated: data.lastUpdated?.toDate() || new Date(),
          notes: data.notes,
        });
      });
      setScores(scoreData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center text-gray-800">Detailed Scores</h1>
        
        <GameStatus />
        
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Player Statistics</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packs Opened</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scores.map((score, index) => (
                  <tr key={score.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{score.playerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{score.score}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{score.packsOpened}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {score.lastUpdated.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{score.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
} 