'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase'; // Adjust path if needed
import { ref, onValue, off, update, serverTimestamp } from 'firebase/database';
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
}

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter(); // Initialize useRouter
  // Ensure params and roomCode exist before proceeding
  const roomCode = typeof params?.roomCode === 'string' ? params.roomCode : null;
  const { data: session, status: sessionStatus } = useSession(); // Get session
  // const { user } = useAuth(); // Get current user if available

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
        }
        // *****************************************

      } else {
        setRoomData(null);
        setError(`Room with code "${roomCode}" not found or has been closed.`);
      }
      setLoading(false);
    }, (err) => {
      console.error("Firebase read failed: ", err);
      setError('Failed to load room data. Please try again.');
      setLoading(false);
    });

    // Cleanup listener when the component unmounts
    return () => off(roomRef, 'value', unsubscribe);

  }, [roomCode, router]); // Add router to dependency array

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
    return <div className="container mx-auto p-4 text-center">Loading lobby...</div>;
  }

  // Check session after loading
  if (sessionStatus === 'unauthenticated') {
     return <div className="container mx-auto p-4 text-center text-red-500">Please log in to view the lobby.</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">{error}</div>;
  }

  if (!roomData) {
    // This case might be covered by the error state, but added for safety
    return <div className="container mx-auto p-4 text-center">Loading room data...</div>;
  }

  const playersArray = roomData.players ? Object.entries(roomData.players) : [];
  const isCreator = userId && roomData.creatorId === userId;
  const allPlayersReady = playersArray.length > 0 && playersArray.every(([_, player]) => player.isReady);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">Lobby</h1>
      <p className="text-xl mb-6 text-center font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded inline-block">
        Room Code: <span className="font-bold text-blue-600 dark:text-blue-400">{roomCode}</span>
      </p>
      <p className="mb-4 text-center text-gray-600 dark:text-gray-400">Status: {roomData.status}</p>

      <div className="bg-white dark:bg-gray-900 shadow-md rounded p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Players ({playersArray.length})</h2>
        {playersArray.length === 0 ? (
          <p className="text-gray-500">Waiting for players...</p>
        ) : (
          <ul className="space-y-2">
            {playersArray.map(([playerId, player]) => (
              <li key={playerId} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span>{player.name || `Player ${playerId.substring(0, 6)}`}</span>
                {/* Display Ready status */}
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${player.isReady ? 'bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-100' : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100'}`}>
                  {player.isReady ? 'Ready' : 'Not Ready'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center space-y-4">
         {/* Ready Button */}
         {currentPlayer && (
             <button
                 onClick={handleReadyClick}
                 className={`${currentPlayer.isReady ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out w-full max-w-xs`}
             >
                 {currentPlayer.isReady ? 'Set Not Ready' : 'Set Ready'}
             </button>
         )}

         {/* Start Game Button */}
         {isCreator && (
            <button
                onClick={handleStartGameClick}
                disabled={!allPlayersReady || playersArray.length < 1 || isStarting}
                className={`bg-blue-500 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out w-full max-w-xs ${(!allPlayersReady || playersArray.length < 1 || isStarting) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
            >
                {isStarting ? 'Starting...' : 'Start Game'}
            </button>
         )}
      </div>
    </div>
  );
} 