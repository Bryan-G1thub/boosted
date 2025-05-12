'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface Score {
  id: string;
  playerName: string;
  score: number;
  lastUpdated: Date;
}

export default function ScoreBoard() {
  const [scores, setScores] = useState<Score[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'scores'), orderBy('score', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const scoreData: Score[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        scoreData.push({
          id: doc.id,
          playerName: data.playerName,
          score: data.score,
          lastUpdated: data.lastUpdated?.toDate() || new Date(),
        });
      });
      setScores(scoreData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Current Scores</h2>
      <div className="space-y-4">
        {scores.map((score, index) => (
          <div key={score.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <div className="flex items-center">
              <span className="text-gray-500 w-8">{index + 1}.</span>
              <span className="font-medium">{score.playerName}</span>
            </div>
            <span className="text-xl font-bold">{score.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 