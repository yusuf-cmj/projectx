'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase'; // Adjust path if needed
import { ref, onValue, off, update, serverTimestamp, remove } from 'firebase/database';
import { Difficulty, DIFFICULTY_LEVELS } from '@/lib/difficulty';
import { useSession } from 'next-auth/react'; // Import useSession
// import { useAuth } from '@/context/AuthContext'; // Assuming you have an AuthContext

// Define the structure of a player (adjust as needed)
interface Player {
  name: string;
  score: number;
  isReady: boolean;
  // Add other player properties if necessary
}

// Define the structure of the room data
interface Quote {
  questionText: string;
  options: string[];
  correctAnswer: string;
  media?: {
    image?: string | null;
    voice_record?: string | null;
    quote?: string | null;
  };
  type: number;
  source: 'film' | 'game';
}

interface RoomData {
  creatorId?: string;
  createdAt?: number;
  status: 'waiting' | 'in-game' | 'finished';
  players: { [playerId: string]: Player };
  questions?: Quote[]; // Array to hold the game questions
  currentQuestionIndex?: number;
  currentQuestionStartTime?: object; // Using serverTimestamp object
  answers?: { [questionIndex: number]: { [playerId: string]: string } }; // Structure to store answers
  gameMode?: 'normal' | 'rushmode'; // Add game mode field
}

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter(); // Initialize useRouter
  // Ensure params and roomCode exist before proceeding
  const roomCode = typeof params?.roomCode === 'string' ? params.roomCode : null;
  const { data: session, status: sessionStatus } = useSession(); // Get session
  // const { user } = useAuth(); // Get current user if available
  
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false); // State to disable button during start

  useEffect(() => {
    if (!roomCode) {
      setError('Room code is missing.');
      setLoading(false);
      return;
    }

    const roomRef = ref(db, `rooms/${roomCode}`);

    // Listener for real-time updates
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as RoomData;
        setRoomData(data);
        setError(null); // Clear error if data is found

        // *** ADDED: Navigate if game starts ***
        if (data.status === 'in-game') {
          console.log('Game started, navigating to game screen...');
          router.push(`/multiplayer/game/${roomCode}`);
          // No need to check for empty room if game started
          setLoading(false); // Ensure loading is set false here too
          return; // Exit early
        }
        // *****************************************

        // *** ADDED: Check for empty room cleanup (by creator) ***
        const playerCount = data.players ? Object.keys(data.players).length : 0;
        // Check if current user is the creator AFTER session data is available
        const currentUserId = session?.user?.id;
        const isCreator = currentUserId && data.creatorId === currentUserId;

        if (playerCount === 0 && isCreator && data.status === 'waiting') {
          console.log(`Creator ${currentUserId} detected an empty lobby (${roomCode}). Removing room...`);
          // Remove the room immediately if empty and in waiting status
          remove(roomRef)
            .then(() => console.log(`Room ${roomCode} successfully removed by creator.`))
            .catch((err) => console.error(`Error removing empty room ${roomCode}:`, err));
          // Note: The listener will naturally stop receiving updates after removal.
          // No need to explicitly navigate here, error handling will show room not found.
        }
        // *****************************************

      } else {
        setRoomData(null);
        setError(`Room with code "${roomCode}" not found or has been closed.`);
      }
      setLoading(false); // Set loading false after processing data or error
    }, (err) => {
      console.error("Firebase read failed: ", err);
      setError('Failed to load room data. Please try again.');
      setLoading(false);
    });

    // Cleanup listener when the component unmounts
    return () => off(roomRef, 'value', unsubscribe);

  }, [roomCode, router, session]); // Add session to dependency array to ensure userId is available

  // Get current user ID and player data
  const userId = session?.user?.id;
  const currentPlayer = userId && roomData?.players ? roomData.players[userId] : null;

  // --- Ready Button Logic ---
  const handleReadyClick = async () => {
    if (!userId || !roomCode || !currentPlayer) {
      console.error("Cannot toggle ready: User not logged in, room code missing, or player not in room.");
      alert("Could not update ready status. Please try again.");
      return;
    }

    const playerRef = ref(db, `rooms/${roomCode}/players/${userId}`);
    try {
      await update(playerRef, { isReady: !currentPlayer.isReady });
      console.log(`User ${userId} ready status toggled to ${!currentPlayer.isReady}`);
    } catch (err) {
      console.error("Error updating ready status:", err);
      alert("Failed to update ready status.");
    }
  };
  // --- End Ready Button Logic ---

  // --- Start Game Logic ---
  const handleStartGameClick = async () => {
    if (!isCreator || !allPlayersReady || !roomCode || isStarting) {
      console.error("Start game conditions not met or already starting.");
      return;
    }

    setIsStarting(true);
    const numberOfQuestions = 5; // Define how many questions to fetch
    const questions: Quote[] = [];

    try {
      console.log(`Attempting to fetch ${numberOfQuestions} questions...`);
      const origin = typeof window !== 'undefined' ? window.location.origin : ''; // Get base URL

      // 1. Fetch Questions (Loop)
      for (let i = 0; i < numberOfQuestions; i++) {
        const randomType = Math.floor(Math.random() * 4) + 1 as 1 | 2 | 3 | 4;
        console.log(`Fetching question ${i + 1} (type ${randomType})...`);
        const response = await fetch(`/api/singleplayer-question?type=${randomType}`);

        if (!response.ok) {
          throw new Error(`API Error (Type ${randomType}): ${response.status} ${response.statusText}`);
        }

        const question = await response.json();

        if (!question || !question.questionText) { // Basic validation
          console.warn(`Received invalid question data for type ${randomType}, trying again...`);
          // Optionally retry with the same i or a different type, or just fail
          // For simplicity, we'll throw an error here to indicate failure to get enough questions
          throw new Error(`Failed to fetch a valid question (Type ${randomType}) after API success.`);
        } else {
          // Convert relative media URLs to absolute URLs
          if (question.media?.image && question.media.image.startsWith('/')) {
            question.media.image = `${origin}${question.media.image}`;
          }
          if (question.media?.voice_record && question.media.voice_record.startsWith('/')) {
            question.media.voice_record = `${origin}${question.media.voice_record}`;
          }
          questions.push(question as Quote);
          console.log(`Successfully fetched question ${i + 1}. Media URLs adjusted.`);
        }
        // Optional: Add a small delay between API calls if needed
        // await new Promise(resolve => setTimeout(resolve, 100)); 
      }

      if (questions.length !== numberOfQuestions) {
        throw new Error(`Could not fetch the required ${numberOfQuestions} questions. Got ${questions.length}.`);
      }

      // 2. Prepare Initial Game State
      const initialGameState = {
        questions: questions,
        currentQuestionIndex: 0,
        currentQuestionStartTime: serverTimestamp(),
        answers: {}, // Initialize empty answers object
        status: 'in-game', // Set status last
        difficulty: difficulty,
      };

      // 3. Update Firebase
      const roomRef = ref(db, `rooms/${roomCode}`);
      await update(roomRef, initialGameState);

      console.log(`Room ${roomCode} started with ${questions.length} questions.`);
      // Navigation is handled by the listener detecting 'in-game' status

    } catch (err) {
      console.error("Error starting game:", err);
      alert(`Failed to start the game: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsStarting(false); // Re-enable button on error
    }
    // No need to set isStarting back to false on success
  };
  // --- End Start Game Logic ---

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading lobby...</div>
      </div>
    );
  }

  // Check session after loading
  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-purple-800/30 backdrop-blur-sm p-8 rounded-2xl border border-purple-400/20 shadow-lg shadow-purple-500/20 text-center">
          <p className="text-red-400 text-xl">Please log in to view the lobby.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-purple-800/30 backdrop-blur-sm p-8 rounded-2xl border border-purple-400/20 shadow-lg shadow-purple-500/20 text-center">
          <p className="text-red-400 text-xl">{error}</p>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading room data...</div>
      </div>
    );
  }

  const playersArray = roomData.players ? Object.entries(roomData.players) : [];
  const isCreator = userId && roomData.creatorId === userId;
  const allPlayersReady = playersArray.length > 0 && playersArray.every(([, player]) => player.isReady);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl bg-purple-800/30 backdrop-blur-sm p-8 rounded-2xl border border-purple-400/20 shadow-lg shadow-purple-500/20">
        <h1 className="text-3xl font-bold mb-4 text-center text-white tracking-wide animate-pulse">Lobby</h1>
        <div className="text-center mb-6">
          <p className="text-xl font-mono bg-purple-700/20 p-3 rounded-lg inline-block border border-purple-400/20">
            Room Code: <span className="font-bold text-yellow-400">{roomCode}</span>
          </p>
          <p className="mt-2 text-purple-200">Status: {roomData.status}</p>
        </div>

        <div className="bg-purple-800/20 backdrop-blur-sm p-6 rounded-xl border border-purple-400/20 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-white tracking-wide flex items-center gap-2">
            <span className="animate-bounce">👥</span> Players ({playersArray.length})
          </h2>
          {playersArray.length === 0 ? (
            <p className="text-purple-300 text-center">Waiting for players...</p>
          ) : (
            <ul className="space-y-3">
              {playersArray.map(([playerId, player]) => (
                <li key={playerId} className="flex justify-between items-center p-3 rounded-lg bg-purple-700/20 hover:bg-purple-700/30 transition-colors">
                  <span className="text-white font-medium">{player.name || `Player ${playerId.substring(0, 6)}`}</span>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${player.isReady
                    ? 'bg-green-600/30 text-green-400'
                    : 'bg-yellow-600/30 text-yellow-400'
                    }`}>
                    {player.isReady ? 'Ready' : 'Not Ready'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-purple-800/20 backdrop-blur-sm p-6 rounded-xl border border-purple-400/20 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-white tracking-wide flex items-center gap-2">
            <span className="animate-bounce">🎮</span> Game Mode
          </h2>
          {userId === roomData?.creatorId ? (
            <select
              value={roomData?.gameMode || 'normal'}
              onChange={(e) => {
                const roomRef = ref(db, `rooms/${roomCode}`);
                update(roomRef, { gameMode: e.target.value });
              }}
              className="w-full p-3 rounded-lg bg-purple-700/30 border border-purple-400/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="normal">Normal Mode</option>
              <option value="rushmode">Rush Mode</option>
            </select>
          ) : (
            <p className="text-purple-300 text-center">
              {roomData?.gameMode === 'rushmode' ? 'Rush Mode' : 'Normal Mode'}
            </p>
          )}
        </div>
        <div className="bg-purple-800/20 backdrop-blur-sm p-6 rounded-xl border border-purple-400/20 mb-6">
        <h2 className="text-2xl font-semibold mb-4 text-white tracking-wide flex items-center gap-2">
        <span className="animate-bounce">⚙️</span> Difficulty
        </h2>
        {userId === roomData?.creatorId ? (
        <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value as Difficulty)}
        className="w-full p-3 rounded-lg bg-purple-700/30 border border-purple-400/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
        {Object.entries(DIFFICULTY_LEVELS).map(([key, value]) => (
          <option key={key} value={key}>
            {value.label} - {value.description}
          </option>
        ))}
      </select>
      ) : (
        <p className="text-purple-300 text-center">
          Difficulty will be set by the room creator.
        </p>
          )}
          </div>
        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Ready Button */}
          {currentPlayer && (
            <button
              onClick={handleReadyClick}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold transition-all duration-200 hover:scale-105 active:scale-95 ${currentPlayer.isReady
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-green-600 hover:bg-green-700'
                }`}
            >
              {currentPlayer.isReady ? 'Set Not Ready' : 'Set Ready'}
            </button>
          )}

          {/* Start Game Button */}
          {isCreator && (
            <button
              onClick={handleStartGameClick}
              disabled={!allPlayersReady || playersArray.length < 1 || isStarting}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold transition-all duration-200 ${!allPlayersReady || playersArray.length < 1 || isStarting
                ? 'bg-purple-900/50 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
                }`}
            >
              {isStarting ? 'Starting...' : 'Start Game'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 