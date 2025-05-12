// pages/index.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, updateDoc, addDoc, query, orderBy, deleteDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

interface Score {
  id: string;
  playerName: string;
  score: number;
}

interface GameState {
  packCount: number;
  totalPacks: number;
}

interface PackHistoryEntry {
  id: string;
  amount: number;
  timestamp?: { toDate: () => Date };
}

interface PlayerHistoryEntry {
  id: string;
  amount: number;
  card: string;
  timestamp?: { toDate: () => Date };
}

export default function Home() {
  const [scores, setScores] = useState<Score[]>([]);
  const [gameState, setGameState] = useState<GameState>({ packCount: 0, totalPacks: 0 });
  const [editingScore, setEditingScore] = useState<string | null>(null);
  const [newScore, setNewScore] = useState<string>("");
  const [newPlayer, setNewPlayer] = useState({ name: '', score: '', card: '' });
  const [editingNumerator, setEditingNumerator] = useState(false);
  const [numeratorValue, setNumeratorValue] = useState('');
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [playerHistories, setPlayerHistories] = useState<Record<string, PlayerHistoryEntry[]>>({});
  const [addAmount, setAddAmount] = useState<Record<string, string>>({});
  const [addCard, setAddCard] = useState<Record<string, string>>({});
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [packAddAmount, setPackAddAmount] = useState('');
  const [packHistory, setPackHistory] = useState<PackHistoryEntry[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Listen for game state changes
  useEffect(() => {
    const gameStateRef = doc(db, 'gameState', 'current');
    const unsubscribe = onSnapshot(gameStateRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setGameState({
          packCount: data.packCount || 0,
          totalPacks: data.totalPacks || 0,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for score changes
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
        });
      });
      setScores(scoreData);
    });
    return () => unsubscribe();
  }, []);

  // Listen for player history changes
  useEffect(() => {
    if (!expandedPlayer) return;
    const unsub = onSnapshot(
      collection(db, 'scores', expandedPlayer, 'playerHistory'),
      (snap) => {
        setPlayerHistories((prev) => ({
          ...prev,
          [expandedPlayer]: snap.docs.map((d) => ({ ...(d.data() as PlayerHistoryEntry), id: d.id })),
        }));
      }
    );
    return () => unsub();
  }, [expandedPlayer]);

  // Listen for packHistory changes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'gameState', 'current', 'packHistory'), (snap) => {
      setPackHistory(snap.docs.map((d) => ({ ...(d.data() as PackHistoryEntry), id: d.id })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('boosted_pw') === 't3rb0;httpz') {
        setUnlocked(true);
      }
    }
  }, []);

  const updateScore = async (id: string, newScore: number) => {
    try {
      await updateDoc(doc(db, 'scores', id), { score: newScore });
      setEditingScore(null);
    } catch (error) {
      console.error('Error updating score:', error);
    }
  };

  const handleScoreSubmit = (id: string) => {
    const score = parseFloat(newScore);
    if (!isNaN(score)) {
      updateScore(id, score);
    }
  };

  const addNewPlayer = async () => {
    if (newPlayer.name && newPlayer.score && newPlayer.card) {
      try {
        // Add player
        const playerRef = await addDoc(collection(db, 'scores'), {
          playerName: newPlayer.name,
          score: parseFloat(newPlayer.score),
        });
        // Add initial history
        await addDoc(collection(db, 'scores', playerRef.id, 'playerHistory'), {
          amount: parseFloat(newPlayer.score),
          card: newPlayer.card,
          timestamp: serverTimestamp(),
        });
        setNewPlayer({ name: '', score: '', card: '' });
      } catch (error) {
        console.error('Error adding player:', error);
      }
    }
  };

  const handleNumeratorClick = () => {
    setEditingNumerator(true);
    setNumeratorValue(gameState.packCount.toString());
  };

  const saveNumerator = async () => {
    const value = parseInt(numeratorValue);
    if (!isNaN(value)) {
      try {
        await updateDoc(doc(db, 'gameState', 'current'), { packCount: value });
      } catch (error) {
        console.error('Error updating pack count:', error);
      }
    }
    setEditingNumerator(false);
  };

  const handleNumeratorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveNumerator();
    } else if (e.key === 'Escape') {
      setEditingNumerator(false);
    }
  };

  // Reset Game logic
  const resetGame = async () => {
    if (!window.confirm('Are you sure you want to reset the game? This will clear all players and scores.')) return;
    // Delete all players
    const scoresSnapshot = await getDocs(collection(db, 'scores'));
    const deletePromises = scoresSnapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    // Delete packHistory
    const packHistorySnapshot = await getDocs(collection(db, 'gameState', 'current', 'packHistory'));
    const packDeletePromises = packHistorySnapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(packDeletePromises);
    // Prompt for new denominator
    let newDenominator = '';
    while (true) {
      newDenominator = window.prompt('Enter new denominator (total packs):', '36') || '';
      if (/^\d+$/.test(newDenominator) && parseInt(newDenominator) > 0) break;
      if (newDenominator === '') return; // Cancelled
      alert('Please enter a valid positive number.');
    }
    // Set numerator to 0 and update denominator
    await updateDoc(doc(db, 'gameState', 'current'), {
      packCount: 0,
      totalPacks: parseInt(newDenominator),
    });
  };

  const handleAddHistory = async (playerId: string) => {
    const amount = parseFloat(addAmount[playerId] || '');
    const card = addCard[playerId] || '';
    if (!amount || !card) return;
    // Add to playerHistory subcollection
    await addDoc(collection(db, 'scores', playerId, 'playerHistory'), {
      amount,
      card,
      timestamp: serverTimestamp(),
    });
    // Update player score
    await updateDoc(doc(db, 'scores', playerId), {
      score: (scores.find((s) => s.id === playerId)?.score || 0) + amount,
    });
    setAddAmount((prev) => ({ ...prev, [playerId]: '' }));
    setAddCard((prev) => ({ ...prev, [playerId]: '' }));
  };

  const handleNameEdit = (id: string, currentName: string) => {
    setEditingName(id);
    setNewName(currentName);
  };

  const saveName = async (id: string) => {
    if (newName.trim()) {
      await updateDoc(doc(db, 'scores', id), { playerName: newName.trim() });
    }
    setEditingName(null);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') saveName(id);
    else if (e.key === 'Escape') setEditingName(null);
  };

  const handleAddPack = async () => {
    let amount = parseFloat(packAddAmount);
    if (!amount) return;
    // Clamp to denominator
    let newPackCount = gameState.packCount + amount;
    if (newPackCount > gameState.totalPacks) {
      amount = gameState.totalPacks - gameState.packCount;
      newPackCount = gameState.totalPacks;
    }
    // Add to packHistory
    await addDoc(collection(db, 'gameState', 'current', 'packHistory'), {
      amount,
      timestamp: serverTimestamp(),
    });
    // Update packCount
    await updateDoc(doc(db, 'gameState', 'current'), {
      packCount: newPackCount,
    });
    setPackAddAmount('');
  };

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 't3rb0;httpz') {
      setUnlocked(true);
      localStorage.setItem('boosted_pw', 't3rb0;httpz');
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <>
      {!unlocked ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900">
          <form onSubmit={handlePassword} className="flex flex-col items-center gap-4 bg-gray-800 p-8 rounded-lg border-2 border-cyan-400 shadow-xl">
            <div className="text-3xl font-bold text-cyan-400 mb-2">Enter Password</div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="px-4 py-2 text-2xl rounded border-2 border-cyan-400 bg-gray-900 text-white focus:outline-none"
              autoFocus
            />
            {error && <div className="text-red-400 text-lg">{error}</div>}
            <button type="submit" className="px-8 py-2 bg-cyan-600 text-white text-xl rounded hover:bg-cyan-700">Unlock</button>
          </form>
        </div>
      ) : (
        <main className="min-h-screen bg-gray-900 text-white p-8">
          <div className="flex items-center justify-center gap-4 mb-12">
            <h1 className="font-extrabold text-cyan-400 text-2xl md:text-4xl leading-none">Boosted Pack Round</h1>
          </div>

          {/* Display Section */}
          <div className="w-full pt-12 flex flex-col items-center mb-[120vh]">
            <div className="text-center w-full">
              <div className="font-extrabold mb-12 text-cyan-400 flex items-center justify-center gap-6 select-none text-7xl md:text-9xl">
                {editingNumerator ? (
                  <input
                    type="number"
                    value={numeratorValue}
                    onChange={e => {
                      const maxDigits = gameState.totalPacks.toString().length;
                      let val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length > maxDigits) val = val.slice(0, maxDigits);
                      if (parseInt(val) > gameState.totalPacks) val = gameState.totalPacks.toString();
                      setNumeratorValue(val);
                    }}
                    onBlur={saveNumerator}
                    onKeyDown={handleNumeratorKeyDown}
                    className="w-64 md:w-80 px-4 py-2 bg-gray-800 border-4 border-cyan-400 rounded text-white text-7xl md:text-9xl text-center outline-none"
                    autoFocus
                  />
                ) : (
                  <span
                    className="cursor-pointer hover:underline"
                    onClick={handleNumeratorClick}
                    title="Click to edit"
                  >
                    {gameState.packCount}
                  </span>
                )}
                <span className="mx-6 text-7xl md:text-9xl font-extrabold">/</span>
                <span className="text-7xl md:text-9xl font-extrabold text-cyan-400">{gameState.totalPacks}</span>
              </div>
              {scores.length === 0 && (
                <div className="text-center text-5xl text-gray-400 mt-8">No Hits Yet!</div>
              )}
              {/* Top 3 Players - Vertical Stack */}
              <div className="flex flex-col justify-center items-center gap-24 mt-32">
                {scores.slice(0, 3).map((score, index) => {
                  let style = {};
                  let nameStyle = {};
                  let scoreStyle = {};
                  if (index === 0) {
                    // Gold gradient and reduced glow
                    style = {
                      background: 'linear-gradient(90deg, #FFD700 0%, #FFFACD 40%, #FFD700 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 10px #FFD700) drop-shadow(0 0 3px #FFFACD)',
                    };
                    nameStyle = {
                      textShadow: '0 0 5px #FFD700, 0 0 2px #FFFACD',
                    };
                    scoreStyle = {
                      background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 10px #FFD700) drop-shadow(0 0 3px #FFFACD)',
                    };
                  } else if (index === 1) {
                    // Silver gradient and reduced glow
                    style = {
                      background: 'linear-gradient(90deg, #e0e0e0 0%, #b0b0b0 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 8px #e0e0e0) drop-shadow(0 0 2px #b0b0b0)',
                    };
                    nameStyle = {
                      textShadow: '0 0 3px #e0e0e0, 0 0 1px #b0b0b0',
                    };
                    scoreStyle = {
                      background: 'linear-gradient(90deg, #f8fafc 0%, #a3a3a3 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 8px #e0e0e0) drop-shadow(0 0 2px #b0b0b0)',
                    };
                  } else {
                    // Bronze gradient and reduced glow
                    style = {
                      background: 'linear-gradient(90deg, #b87333 0%, #ffb347 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 8px #b87333) drop-shadow(0 0 2px #ffb347)',
                    };
                    nameStyle = {
                      textShadow: '0 0 3px #b87333, 0 0 1px #ffb347',
                    };
                    scoreStyle = {
                      background: 'linear-gradient(90deg, #b87333 0%, #ffb347 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 8px #b87333) drop-shadow(0 0 2px #ffb347)',
                    };
                  }
                  return (
                    <div
                      key={score.id}
                      className="flex flex-row items-center justify-center min-w-[320px] gap-8"
                    >
                      <span className="text-8xl font-extrabold" style={style}>#{index + 1}</span>
                      <span className="text-7xl font-bold text-white" style={nameStyle}>{score.playerName}</span>
                      <span className="text-8xl font-extrabold" style={scoreStyle}>{Number(score.score).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Input Section */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="flex gap-4 justify-center">
              <input
                type="text"
                value={newPlayer.name}
                onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                placeholder="Player Name"
                className="px-4 py-2 bg-gray-800 border-2 border-blue-600 rounded text-white placeholder-gray-400"
              />
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                pattern="^\\d*(\\.\\d{0,2})?$"
                value={newPlayer.score}
                onChange={e => {
                  let val = e.target.value;
                  if (val.includes('.')) {
                    const [int, dec] = val.split('.');
                    val = int + (dec ? '.' + dec.slice(0, 2) : '');
                  }
                  setNewPlayer({ ...newPlayer, score: val });
                }}
                placeholder="Score"
                className="w-32 px-4 py-2 bg-gray-800 border-2 border-blue-600 rounded text-white placeholder-gray-400"
              />
              <input
                type="text"
                value={newPlayer.card}
                onChange={(e) => setNewPlayer({ ...newPlayer, card: e.target.value })}
                placeholder="Which card?"
                className="w-48 px-4 py-2 bg-gray-800 border-2 border-blue-600 rounded text-white placeholder-gray-400"
              />
              <button
                onClick={addNewPlayer}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                disabled={!(newPlayer.name && newPlayer.score && newPlayer.card)}
              >
                Add Player
              </button>
            </div>
          </div>

          {/* Editable Scoreboard */}
          <div className="max-w-4xl mx-auto mb-16">
            {scores.length === 0 ? (
              <div className="text-center text-3xl text-gray-400 py-24">No Hits Yet!</div>
            ) : (
              <div className="space-y-4">
                {scores.map((score) => (
                  <div key={score.id} className="flex flex-col border-2 border-green-600 rounded mb-4">
                    <div className="flex justify-between items-center p-4">
                      <span className="font-medium text-xl text-white">
                        {editingName === score.id ? (
                          <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onBlur={() => saveName(score.id)}
                            onKeyDown={e => handleNameKeyDown(e, score.id)}
                            className="px-2 py-1 bg-gray-800 border border-blue-400 rounded text-white w-40"
                            autoFocus
                          />
                        ) : (
                          <>
                            {score.playerName}
                            <button
                              onClick={() => handleNameEdit(score.id, score.playerName)}
                              className="ml-2 px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-800"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </span>
                      {editingScore === score.id ? (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            pattern="^\\d*(\\.\\d{0,2})?$"
                            value={newScore}
                            onChange={e => {
                              let val = e.target.value;
                              if (val.includes('.')) {
                                const [int, dec] = val.split('.');
                                val = int + (dec ? '.' + dec.slice(0, 2) : '');
                              }
                              setNewScore(val);
                            }}
                            className="w-24 px-2 py-1 bg-gray-800 border-2 border-green-600 rounded text-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleScoreSubmit(score.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingScore(null)}
                            className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold text-yellow-400 drop-shadow-[0_0_8px_rgba(253,224,71,0.7)]">{Number(score.score).toFixed(2)}</span>
                          <button
                            onClick={() => {
                              setEditingScore(score.id);
                              setNewScore(score.score.toString());
                            }}
                            className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setExpandedPlayer(expandedPlayer === score.id ? null : score.id)}
                            className="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-800"
                          >
                            {expandedPlayer === score.id ? 'Hide' : 'Details'}
                          </button>
                        </div>
                      )}
                    </div>
                    {expandedPlayer === score.id && (
                      <div className="bg-gray-800 p-4 border-t border-green-600">
                        <div className="flex gap-4 mb-4">
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            pattern="^\\d*(\\.\\d{0,2})?$"
                            value={addAmount[score.id] || ''}
                            onChange={e => {
                              let val = e.target.value;
                              if (val.includes('.')) {
                                const [int, dec] = val.split('.');
                                val = int + (dec ? '.' + dec.slice(0, 2) : '');
                              }
                              setAddAmount((prev) => ({ ...prev, [score.id]: val }));
                            }}
                            placeholder="Add Amount"
                            className="w-32 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white"
                          />
                          <input
                            type="text"
                            value={addCard[score.id] || ''}
                            onChange={e => setAddCard((prev) => ({ ...prev, [score.id]: e.target.value }))}
                            placeholder="Which card?"
                            className="w-48 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white"
                          />
                          <button
                            onClick={() => handleAddHistory(score.id)}
                            className="px-4 py-1 bg-green-700 text-white rounded hover:bg-green-800"
                          >
                            Add
                          </button>
                        </div>
                        <div className="text-white text-lg font-bold mb-2">History</div>
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {(playerHistories[score.id] || []).length === 0 ? (
                            <div className="text-gray-400">No history yet.</div>
                          ) : (
                            playerHistories[score.id].map((h) => (
                              <div key={h.id} className="flex gap-4 items-center bg-gray-900 rounded px-2 py-1">
                                <span className="text-green-400">+{Number(h.amount).toFixed(2)}</span>
                                <span className="text-gray-300">{h.card}</span>
                                <span className="text-xs text-gray-500">{h.timestamp?.toDate ? new Date(h.timestamp.toDate()).toLocaleString() : ''}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset Game Button */}
          <div className="w-full flex flex-col items-center mt-32 mb-8 gap-12">
            {/* Add to Pack Count Section */}
            <div className="w-full max-w-2xl bg-gray-800 border-2 border-cyan-400 rounded-lg p-6 mb-8">
              <div className="flex gap-4 mb-4">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  pattern="^\\d*(\\.\\d{0,2})?$"
                  value={packAddAmount}
                  onChange={e => {
                    let val = e.target.value;
                    if (val.includes('.')) {
                      const [int, dec] = val.split('.');
                      val = int + (dec ? '.' + dec.slice(0, 2) : '');
                    }
                    setPackAddAmount(val);
                  }}
                  placeholder="Add Packs"
                  className="w-32 px-4 py-2 bg-gray-900 border border-cyan-400 rounded text-white"
                />
                <button
                  onClick={handleAddPack}
                  className="px-6 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
                  disabled={!packAddAmount}
                >
                  Add
                </button>
              </div>
              <div className="text-white text-lg font-bold mb-2">Pack Count History</div>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {packHistory.length === 0 ? (
                  <div className="text-gray-400">No history yet.</div>
                ) : (
                  packHistory.map((h) => (
                    <div key={h.id} className="flex gap-4 items-center bg-gray-900 rounded px-2 py-1">
                      <span className="text-cyan-400">+{Number(h.amount).toFixed(2)}</span>
                      <span className="text-xs text-gray-500">{h.timestamp?.toDate ? new Date(h.timestamp.toDate()).toLocaleString() : ''}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <button
              onClick={resetGame}
              className="px-8 py-4 bg-red-600 text-white text-2xl font-bold rounded-lg shadow-lg hover:bg-red-700 transition-colors"
            >
              Reset Game
            </button>
          </div>
        </main>
      )}
    </>
  );
}
