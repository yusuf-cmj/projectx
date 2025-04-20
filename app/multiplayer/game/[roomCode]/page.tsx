'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, onValue, off, update, serverTimestamp } from 'firebase/database';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Interfaces (match backend QuestionFormat)
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

interface Player {
  name: string;
  score: number;
  isReady: boolean;
}

interface RoomData {
  creatorId?: string;
  createdAt?: number;
  status: 'waiting' | 'in-game' | 'finished';
  players: { [playerId: string]: Player };
  questions?: Quote[];
  currentQuestionIndex?: number;
  currentQuestionStartTime?: any; // Can be number (timestamp) or object (serverTimestamp placeholder)
  answers?: { [questionIndex: number]: { [playerId: string]: { answer: string; timestamp: any } } }; // Store answer and time
  preloadMediaUrl?: string | null;
}

const QUESTION_DURATION = 30; // Seconds for each question

export default function MultiplayerGamePage() {
    const params = useParams();
    const router = useRouter();
    const roomCode = typeof params?.roomCode === 'string' ? params.roomCode : null;
    const { data: session, status: sessionStatus } = useSession();

    const [roomData, setRoomData] = useState<RoomData | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to store timer interval
    const userId = session?.user?.id;

    // Function to calculate time left based on server start time
    const calculateTimeLeft = (startTime: number | undefined) => {
        if (!startTime) return QUESTION_DURATION;
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        return Math.max(0, QUESTION_DURATION - elapsed);
    };

    // --- Function to move to next question or end game (RUNS ONLY ON CREATOR) ---
    const moveToNextQuestionOrEnd = async () => {
        // Double-check conditions on entry
        if (!roomData || !currentQuestion || !userId || userId !== roomData.creatorId || roomData.status !== 'in-game') {
             console.warn("moveToNextQuestionOrEnd called prematurely or by non-creator.");
             return;
        }

        console.log("Creator moving to next question/end...");
        const currentIndex = roomData.currentQuestionIndex ?? -1;
        const totalQuestions = roomData.questions?.length ?? 0;
        const playersInRoom = Object.keys(roomData.players || {});
        const answersForCurrentQuestion = roomData.answers?.[currentIndex] ?? {};

        // --- SCORING LOGIC --- 
        const scoreUpdates: { [key: string]: any } = {};
        playersInRoom.forEach(playerId => {
           const playerData = roomData.players[playerId];
           const playerAnswerData = answersForCurrentQuestion[playerId];
           let scoreChange = -5; // Penalty
           if (playerAnswerData && playerAnswerData.answer === currentQuestion.correctAnswer) {
                scoreChange = timeLeft > 0 ? timeLeft : 5; // Basic score 
           }
           const newScore = (playerData.score || 0) + scoreChange;
           scoreUpdates[`players/${playerId}/score`] = newScore;
        });
        // --- END SCORING LOGIC ---

        // --- TRANSITION LOGIC --- 
        try {
            if (currentIndex >= totalQuestions - 1) {
                // --- END GAME ---
                console.log("Game finished! Updating status.");
                await update(ref(db, `rooms/${roomCode}`), {
                    status: 'finished',
                    preloadMediaUrl: null, // Clear preload URL at the end
                    ...scoreUpdates
                });
            } else {
                // --- NEXT QUESTION ---
                const nextIndex = currentIndex + 1;
                const nextQuestion = roomData.questions?.[nextIndex];
                let nextMediaUrl: string | null = null;
                if (nextQuestion?.media?.image) {
                    nextMediaUrl = nextQuestion.media.image;
                } else if (nextQuestion?.media?.voice_record) {
                    nextMediaUrl = nextQuestion.media.voice_record;
                }
                console.log(`Moving to next question (${nextIndex}). Preloading media: ${nextMediaUrl ?? 'None'}`);

                await update(ref(db, `rooms/${roomCode}`), {
                    currentQuestionIndex: nextIndex,
                    currentQuestionStartTime: serverTimestamp(),
                    preloadMediaUrl: nextMediaUrl, // Add URL for clients to preload
                    ...scoreUpdates
                });
            }
        } catch (error) {
            console.error("Error during question transition:", error);
        }
        // --- END TRANSITION LOGIC ---
    };

    // --- Effect for Creator to Check Transition Conditions (Existing) ---
    useEffect(() => {
        if (!roomData || !userId || userId !== roomData.creatorId || roomData.status !== 'in-game') {
            return;
        }
        const currentIndex = roomData.currentQuestionIndex ?? -1;
         if (currentIndex < 0 || !roomData.questions || currentIndex >= roomData.questions.length) {
             return; 
         }
        const playersInRoom = Object.keys(roomData.players || {});
        const answersForCurrentQuestion = roomData.answers?.[currentIndex] ?? {};
        const answeredPlayerIds = Object.keys(answersForCurrentQuestion);
        const allPlayersAnswered = answeredPlayerIds.length >= playersInRoom.length;
        const timeIsUp = timeLeft <= 0;

        if (allPlayersAnswered || timeIsUp) {
             // Prevent multiple rapid calls if state updates slightly delayed
            const alreadyProcessedKey = `processed_${currentIndex}`; 
            if (!(window as any)[alreadyProcessedKey]) {
                 (window as any)[alreadyProcessedKey] = true;
                 console.log(`Creator triggering transition for index ${currentIndex}. All Answered: ${allPlayersAnswered}, Time Up: ${timeIsUp}`);
                 moveToNextQuestionOrEnd();
                 // Reset flag for the next potential transition check after a delay
                 // This is a simple debounce/flag mechanism
                 setTimeout(() => { (window as any)[alreadyProcessedKey] = false; }, 1500); 
            }
        }
    }, [roomData?.answers, roomData?.currentQuestionIndex, timeLeft, roomData?.creatorId, userId, roomData?.status, roomData?.players]); // Dependencies adjusted slightly

    // --- Effect for Preloading Media (All Clients) ---
    useEffect(() => {
        if (roomData?.preloadMediaUrl) {
            const url = roomData.preloadMediaUrl;
            console.log("Preloading media:", url);
            if (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.jpeg') || url.endsWith('.gif') || url.endsWith('.webp')) {
                // Preload image
                const img = new Image();
                img.src = url;
            } else if (url.endsWith('.mp3') || url.endsWith('.ogg') || url.endsWith('.wav')) {
                // Preload audio - less straightforward, creating an audio element might work
                 const audio = document.createElement('audio');
                 audio.preload = 'auto'; // Hint to the browser to preload
                 audio.src = url;
                 // Note: Actual preloading effectiveness varies by browser
            }
        }
    }, [roomData?.preloadMediaUrl]); // Run only when preloadMediaUrl changes

    // Effect to update question and manage timer
    useEffect(() => {
        if (!roomData || roomData.currentQuestionIndex === undefined) return;

        // Update Current Question
        const qIndex = roomData.currentQuestionIndex;
        const question = roomData.questions?.[qIndex] ?? null;
        setCurrentQuestion(question);

        // Reset answer state for the new question
        setSelectedAnswer(null);
        setIsSubmitting(false);

        // --- Timer Logic ---
        // Clear any existing timer
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        if (question && roomData.status === 'in-game') {
            // Attempt to get start time (might be object or number)
            const startTime = typeof roomData.currentQuestionStartTime === 'number' 
                                ? roomData.currentQuestionStartTime 
                                : undefined; // Can't start timer reliably without a number timestamp yet

            if (startTime) {
                const initialTimeLeft = calculateTimeLeft(startTime);
                setTimeLeft(initialTimeLeft);

                if (initialTimeLeft > 0) {
                    timerIntervalRef.current = setInterval(() => {
                        setTimeLeft(prev => {
                            if (prev <= 1) {
                                clearInterval(timerIntervalRef.current!); 
                                timerIntervalRef.current = null;
                                // Time's up logic will be handled by next question check
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                } else {
                     setTimeLeft(0);
                     // Time was already up when question loaded
                }
            } else {
                 // Start time not yet available (Firebase serverTimestamp might still be resolving)
                 // Set to max duration, will adjust when startTime updates in roomData
                 setTimeLeft(QUESTION_DURATION); 
            }
        } else {
            // Not in game or no question, ensure timer is stopped/reset
            setTimeLeft(QUESTION_DURATION);
        }

        // Cleanup timer on effect re-run or unmount
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
        // Rerun when question index or start time changes
    }, [roomData?.currentQuestionIndex, roomData?.currentQuestionStartTime, roomData?.status]);

    // Main Effect for Firebase Listener
    useEffect(() => {
        if (!roomCode) {
            setError('Room code is missing.');
            setLoading(false);
            return;
        }
        if (sessionStatus === 'loading') {
            // Wait for session to load
            return;
        }
        if (sessionStatus === 'unauthenticated') {
            setError('You must be logged in to play.');
            setLoading(false);
            // Optionally redirect to login
            // router.push('/login');
            return;
        }

        const roomRef = ref(db, `rooms/${roomCode}`);

        const unsubscribe = onValue(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val() as RoomData;
                setRoomData(data);
                setError(null);

                // --- Update Current Question --- 
                if (data.questions && data.currentQuestionIndex !== undefined && data.currentQuestionIndex < data.questions.length) {
                    setCurrentQuestion(data.questions[data.currentQuestionIndex]);
                    // Reset selection for new question
                    setSelectedAnswer(null);
                    setIsSubmitting(false);
                } else if (data.status === 'in-game') {
                    // Questions might not be loaded yet, or index out of bounds
                    setCurrentQuestion(null); 
                }
                // --- End Update Current Question ---

                // Check player participation
                if (userId && data.players && !data.players[userId] && data.status !== 'finished') {
                     setError("You are not part of this game room.");
                }
                
                // Redirect or handle finished status
                if (data.status === 'finished') {
                    console.log('Game finished according to Firebase data.');
                    // Clear timer if game finishes while it's running
                    if (timerIntervalRef.current) {
                       clearInterval(timerIntervalRef.current);
                       timerIntervalRef.current = null;
                    }
                     // Instead of redirect, we'll let the render logic handle showing the finished state
                    // router.push(`/multiplayer/results/${roomCode}`); 
                }

            } else {
                setRoomData(null);
                setError(`Room with code "${roomCode}" not found or has been closed.`);
                // Optionally redirect
                // router.push('/dashboard');
            }
            setLoading(false);
        }, (err) => {
            console.error("Firebase read failed: ", err);
            setError('Failed to load game data. Please try again.');
            setLoading(false);
        });

        // Cleanup listener
        return () => off(roomRef, 'value', unsubscribe);

    }, [roomCode, router, sessionStatus, userId]); // Dependencies

    // --- Game Logic Functions ---
    const handleAnswerSubmit = async (answer: string) => {
        if (!userId || !roomCode || roomData?.currentQuestionIndex === undefined || isSubmitting) {
            console.error("Cannot submit answer: Missing data or already submitted.");
            return;
        }
        setIsSubmitting(true);
        setSelectedAnswer(answer); // Show immediate feedback

        const answerPath = `rooms/${roomCode}/answers/${roomData.currentQuestionIndex}/${userId}`;
        const answerData = {
            answer: answer,
            timestamp: serverTimestamp() // Record when the answer was submitted
        };

        try {
            await update(ref(db, answerPath), answerData);
            console.log(`Player ${userId} submitted answer: ${answer} for question ${roomData.currentQuestionIndex}`);
        } catch (err) {
            console.error("Error submitting answer:", err);
            alert("Failed to submit answer.");
            setIsSubmitting(false); // Allow retry on error
            setSelectedAnswer(null);
        }
    };
    // --- End Game Logic Functions ---

    // --- Helper for Progress Bar Color ---
    const getProgressColor = () => {
        const percentage = (timeLeft / QUESTION_DURATION) * 100;
        if (percentage > 66) return 'bg-green-500';
        if (percentage > 33) return 'bg-yellow-400';
        if (percentage > 10) return 'bg-orange-500';
        return 'bg-red-600';
    }
    // --- End Helper ---

    if (loading || sessionStatus === 'loading') {
        return <div className="container mx-auto p-4 text-center">Loading game...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-4 text-center text-red-500">{error}</div>;
    }

    if (!roomData) {
        return <div className="container mx-auto p-4 text-center">Loading room data...</div>;
    }

    // --- Game Finished State --- >
    if (roomData.status === 'finished') {
        return (
             <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8">
                 <div className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-xl shadow-xl text-center">
                     <h1 className="text-3xl font-bold mb-6">Game Finished! 🏁</h1>
                     <h2 className="text-xl font-semibold mb-4">Final Scores:</h2>
                     <ul className="space-y-2 text-left">
                         {Object.entries(roomData.players || {}).sort(([, a], [, b]) => b.score - a.score) // Sort by score descending
                             .map(([id, player]) => (
                                 <li key={id} className="flex justify-between items-center py-1 px-2 rounded bg-gray-50 dark:bg-gray-800">
                                     <span>{player.name}</span>
                                     <span className="font-semibold">{player.score}</span>
                                 </li>
                             ))}
                     </ul>
                     <Button className="mt-8" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
                 </div>
            </div>
        );
    }
    // <--- End Game Finished State ---

    // --- Waiting for Question State --- >
    if (roomData.status === 'in-game' && !currentQuestion) {
       return <div className="container mx-auto p-4 text-center">Waiting for question...</div>;
    }
    // <--- End Waiting for Question State ---

    // --- Fallback/Error State (Should ideally not be reached if status is handled) --- >
    if (!currentQuestion) { 
        console.warn("Render reached !currentQuestion check unexpectedly. Status:", roomData.status);
        return <div className="container mx-auto p-4 text-center">Error loading question or game state invalid.</div>;
    }
    // <--- End Fallback --- >

    const questionIndex = roomData.currentQuestionIndex;

    // Determine if the current player has answered this question
    const playerAnswered = userId && questionIndex !== undefined && roomData.answers?.[questionIndex]?.[userId];

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-8">
            {/* Player Scores/List Area (Moved to top or side?) */}
            <div className="w-full max-w-sm bg-white dark:bg-gray-900 shadow-md rounded p-4 mb-4 sticky top-4">
                <h3 className="text-xl font-semibold mb-2">Players</h3>
                <ul>
                    {Object.entries(roomData.players || {}).map(([id, player]) => (
                        <li key={id} className="flex justify-between items-center py-1">
                            <span>{player.name}</span>
                             {/* Add answered status indicator? */}
                            <span>Score: {player.score}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Game Content Area - Adapted from Singleplayer */}
            <div className="w-full max-w-4xl bg-white dark:bg-gray-800 pt-4 px-6 pb-6 rounded-xl shadow-md relative">
                {/* Timer Bar */}
                <div className="mb-4 relative h-3 w-full bg-neutral-200 dark:bg-neutral-700 rounded overflow-hidden">
                    <div
                        className={`absolute left-0 top-0 h-full transition-all duration-500 ease-linear ${getProgressColor()}`}
                        style={{ width: `${(timeLeft / QUESTION_DURATION) * 100}%` }}
                    />
                     <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
                        {timeLeft}s
                    </span>
                </div>

                {/* Question Number & Source */}
                <h2 className="text-center text-xl font-semibold mb-1">
                     Question {questionIndex !== undefined ? questionIndex + 1 : '-'} / {roomData.questions?.length ?? '-'}
                 </h2>
                 <p className="text-center text-sm text-muted-foreground mb-4">
                    {currentQuestion.source === 'film' ? '🎬 Movie Question' : '🎮 Game Question'}
                 </p>

                {/* Media Area */}
                <div className="flex justify-center items-center mb-4 min-h-[100px]"> {/* Added min-height */} 
                    {currentQuestion.media?.image && (
                        <img src={currentQuestion.media.image} alt="scene" className="max-w-full max-h-64 h-auto object-contain rounded" />
                    )}
                    {currentQuestion.media?.voice_record && (
                        <div className='w-full max-w-md'> {/* Constrain audio player width */} 
                           {currentQuestion.media.quote && <p className="text-center italic text-sm mb-2">"{currentQuestion.media.quote}"</p>} 
                            <audio
                                key={currentQuestion.media.voice_record} // Key helps React reset the element
                                controls
                                className="w-full"
                            >
                                <source src={currentQuestion.media.voice_record} type="audio/mp3" />
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    )}
                     {!currentQuestion.media?.image && !currentQuestion.media?.voice_record && (
                         <p className="text-center text-2xl italic text-gray-600 dark:text-gray-400 my-6">"{currentQuestion.questionText}"</p>
                     )}
                </div>
                
                 {/* Question Text (only if not shown with audio) */}
                 {(currentQuestion.media?.image || currentQuestion.media?.voice_record) && (
                     <p className="text-center text-lg font-medium mb-6">{currentQuestion.questionText}</p>
                 )}

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentQuestion.options.map((opt) => {
                        const isCorrect = opt === currentQuestion.correctAnswer;
                        const isSelected = selectedAnswer === opt;
                        let buttonStyle = "bg-muted hover:bg-primary/10 dark:bg-gray-700 dark:hover:bg-gray-600"; // Default
                        let showIndicator = false;
                        let indicatorCorrect = false;

                        // Logic to show correct/incorrect after selection or time up (simplified for now)
                        // TODO: Enhance this when next question logic is added
                        if (playerAnswered || timeLeft <= 0) {
                            buttonStyle = isCorrect 
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : isSelected
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-gray-400 dark:bg-gray-600 text-gray-700 dark:text-gray-300 opacity-70";
                        }

                        return (
                            <Button
                                key={opt}
                                variant="outline" // Use outline as base, color classes override background
                                size="lg" 
                                className={`w-full justify-center h-auto py-3 whitespace-normal transition-colors duration-200 ${buttonStyle}`}
                                onClick={() => handleAnswerSubmit(opt)}
                                disabled={isSubmitting || !!playerAnswered || timeLeft <= 0} 
                            >
                                {opt}
                            </Button>
                        );
                    })}
                </div>
                 {playerAnswered && !isSubmitting && (
                     <p className="text-center mt-4 text-green-600 dark:text-green-400 font-semibold">Your answer is submitted! Waiting for others...</p>
                 )}
                  {timeLeft <= 0 && !playerAnswered && (
                      <p className="text-center mt-4 text-red-600 dark:text-red-400 font-semibold">Time's up!</p>
                  )}
            </div>

        </div>
    );
} 