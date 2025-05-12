'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import NextImage from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
// Şu hale getir:
import { ref, onValue, off, update, serverTimestamp } from 'firebase/database';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { Timer, Film, Gamepad2, Play, Pause, Zap } from 'lucide-react';
import { getDifficultySettings} from '@/lib/difficulty';

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
  currentQuestionStartTime?: number | object; // Can be number (timestamp) or object (serverTimestamp placeholder)
  answers?: { [questionIndex: number]: { [playerId: string]: { answer: string; timestamp: number | object } } }; // Store answer and time
  preloadMediaUrl?: string | null;
  gameMode?: 'normal' | 'rushmode'; // Add game mode field
  lockedPlayers?: { [questionIndex: number]: string[] | null }; // Allow null for deleting keys via update
  difficulty?: 'easy' | 'medium' | 'hard'; // ✅ Ekle bunu
}

// Helper to format time (MM:SS) - Copied from singleplayer
const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

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
  const [timeLeft, setTimeLeft] = useState(30); // Default value, will be updated when difficultySettings is available
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedIndexRef = useRef<number | null>(null);
  const userId = session?.user?.id;
  type DifficultyType = 'easy' | 'medium' | 'hard';
  const difficulty: DifficultyType = roomData?.difficulty ?? "easy";
  const difficultySettings = useMemo(() => getDifficultySettings(difficulty, currentQuestion?.media, currentQuestion?.type), [difficulty, currentQuestion?.media, currentQuestion?.type]);
  // Audio player state - Added
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (difficultySettings) {
      setTimeLeft(difficultySettings.timeLimit);
    }
  }, [difficultySettings]);

  const calculateTimeLeft = (startTime: number | undefined) => {
    if (!startTime) return difficultySettings.timeLimit;
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    return Math.max(0, difficultySettings.timeLimit - elapsed);
  };

  const moveToNextQuestionOrEnd = useCallback(async () => {
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
    const scoreUpdates: { [key: string]: number | null } = {};
    const isRushMode = roomData.gameMode === 'rushmode';

    if (isRushMode) {
      // Find the first correct answer
      let firstCorrectAnswer: { playerId: string; timestamp: number } | null = null;
      for (const [playerId, answerData] of Object.entries(answersForCurrentQuestion)) {
        if (answerData.answer === currentQuestion.correctAnswer) {
          const timestamp = typeof answerData.timestamp === 'number' ? answerData.timestamp : Date.now();
          if (!firstCorrectAnswer || timestamp < firstCorrectAnswer.timestamp) {
            firstCorrectAnswer = { playerId, timestamp };
          }
        }
      }

      // Update scores for rushmode
      if (firstCorrectAnswer) {
        // Use question start time and answer time to calculate timeLeft
        const startTime = typeof roomData.currentQuestionStartTime === 'number'
          ? roomData.currentQuestionStartTime
          : Date.now(); // fallback
        const answerTime = typeof firstCorrectAnswer.timestamp === 'number'
          ? firstCorrectAnswer.timestamp
          : Date.now(); // fallback
        const timeSpent = Math.floor((answerTime - startTime) / 1000);
        const timeLeft = Math.max(difficultySettings.timeLimit - timeSpent, 0);
        const scoreChange = timeLeft > 0 ? timeLeft : 5;
        scoreUpdates[`players/${firstCorrectAnswer.playerId}/score`] =
          (roomData.players[firstCorrectAnswer.playerId].score || 0) + scoreChange;
        // Clear locked players for this question since it's finished
        scoreUpdates[`lockedPlayers/${currentIndex}`] = null;
      }
    } else {
      // Normal mode scoring
      playersInRoom.forEach(playerId => {
        const playerData = roomData.players[playerId];
        const playerAnswerData = answersForCurrentQuestion[playerId];
        let scoreChange = -5; // Penalty
        if (playerAnswerData && playerAnswerData.answer === currentQuestion.correctAnswer) {
          scoreChange = timeLeft > 0 ? timeLeft : 5;
        }
        const newScore = (playerData.score || 0) + scoreChange;
        scoreUpdates[`players/${playerId}/score`] = newScore;
      });
    }
    // --- END SCORING LOGIC ---

    // --- TRANSITION LOGIC ---
    try {
      if (currentIndex >= totalQuestions - 1) {
        // End game
        await update(ref(db, `rooms/${roomCode}`), {
          status: 'finished',
          ...scoreUpdates
        });
      } else {
        // Move to next question
        const nextIndex = currentIndex + 1;
        const nextQuestion = roomData.questions?.[nextIndex];
        let nextMediaUrl: string | null = null;
        if (nextQuestion?.media?.image) {
          nextMediaUrl = nextQuestion.media.image;
        } else if (nextQuestion?.media?.voice_record) {
          nextMediaUrl = nextQuestion.media.voice_record;
        }

        await update(ref(db, `rooms/${roomCode}`), {
          currentQuestionIndex: nextIndex,
          currentQuestionStartTime: serverTimestamp(),
          preloadMediaUrl: nextMediaUrl,
          ...scoreUpdates
        });
      }
    } catch (error) {
      console.error("Error during question transition:", error);
      toast.error("Error changing question. Please check connection.");
    }
    // --- END TRANSITION LOGIC ---
  }, [roomData, currentQuestion, userId, roomCode, timeLeft]);

  const scoreSavedRef = useRef(false);

  useEffect(() => {
    if (!roomData || !userId || scoreSavedRef.current) return;

    const isFinished = roomData.status === 'finished';
    const userHasScore = typeof roomData.players?.[userId]?.score === 'number';

    if (isFinished && userHasScore) {
      scoreSavedRef.current = true;

      fetch("/api/game-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          score: roomData.players[userId].score,
          mode: "Multiplayer",
        }),
      })
        .then(() => console.log("✅ Score saved once"))
        .catch((error) => {
          console.error("❌ Save failed", error);
          scoreSavedRef.current = false; // tekrar denenebilsin diye geri al
        });
    }
  }, [roomData, userId]);

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
      if (processedIndexRef.current !== currentIndex) {
        processedIndexRef.current = currentIndex;
        console.log(`Creator triggering transition for index ${currentIndex}. All Answered: ${allPlayersAnswered}, Time Up: ${timeIsUp}`);
        moveToNextQuestionOrEnd();
      }
    }
  }, [roomData, timeLeft, userId, moveToNextQuestionOrEnd]);

  useEffect(() => {
    if (roomData?.preloadMediaUrl) {
      const url = roomData.preloadMediaUrl;
      console.log("Preloading media:", url);
      if (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.jpeg') || url.endsWith('.gif') || url.endsWith('.webp')) {
        const img = new Image();
        img.src = url;
      } else if (url.endsWith('.mp3') || url.endsWith('.ogg') || url.endsWith('.wav')) {
        const audio = document.createElement('audio');
        audio.preload = 'auto';
        audio.src = url;
      }
    }
  }, [roomData?.preloadMediaUrl]);

  useEffect(() => {
    if (!roomData || roomData.currentQuestionIndex === undefined) return;

    // Update Current Question
    const qIndex = roomData.currentQuestionIndex;
    const question = roomData.questions?.[qIndex] ?? null;
    setCurrentQuestion(question);

    // Reset answer state for the new question
    setSelectedAnswer(null);
    setIsSubmitting(false);

    // Reset audio state for new question - Added
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset audio element time
    }

    // --- Timer Logic ---
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (question && roomData.status === 'in-game') {
      const startTime = typeof roomData.currentQuestionStartTime === 'number'
        ? roomData.currentQuestionStartTime
        : undefined;
      if (startTime) {
        const initialTimeLeft = calculateTimeLeft(startTime);
        setTimeLeft(initialTimeLeft);
        if (initialTimeLeft > 0) {
          timerIntervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
              if (prev <= 1) {
                clearInterval(timerIntervalRef.current!);
                timerIntervalRef.current = null;
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setTimeLeft(0);
        }
      } else {
        setTimeLeft(difficultySettings.timeLimit);
      }
    } else {
      setTimeLeft(difficultySettings.timeLimit);
    }

    // Cleanup timer on effect re-run or unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [roomData, roomData?.currentQuestionIndex, roomData?.currentQuestionStartTime, roomData?.status]);

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
        // router.push('/home');
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

  const handleAnswerSubmit = async (answer: string) => {
    if (!userId || !roomCode || roomData?.currentQuestionIndex === undefined || isSubmitting) {
      console.error("Cannot submit answer: Missing data or already submitted.");
      return;
    }

    // Check if player is locked in rushmode
    if (roomData.gameMode === 'rushmode' && roomData.lockedPlayers?.[roomData.currentQuestionIndex]?.includes(userId)) {
      toast.error("You are locked out of this question!");
      return;
    }

    // Check if question is already answered correctly in rushmode
    if (roomData.gameMode === 'rushmode') {
      const answersForCurrentQuestion = roomData.answers?.[roomData.currentQuestionIndex] ?? {};
      const hasCorrectAnswer = Object.values(answersForCurrentQuestion).some(
        answerData => answerData.answer === currentQuestion?.correctAnswer
      );
      if (hasCorrectAnswer) {
        toast.error("This question has already been answered correctly!");
        return;
      }
    }

    setIsSubmitting(true);
    setSelectedAnswer(answer);

    // Pause audio when answer is submitted
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    const answerPath = `rooms/${roomCode}/answers/${roomData.currentQuestionIndex}/${userId}`;
    const answerData = {
      answer: answer,
      timestamp: serverTimestamp()
    };

    try {
      await update(ref(db, answerPath), answerData);
      console.log(`Player ${userId} submitted answer: ${answer} for question ${roomData.currentQuestionIndex}`);

      // In rushmode, if answer is wrong, lock the player
      if (roomData.gameMode === 'rushmode' && answer !== currentQuestion?.correctAnswer) {
        const currentQuestionIndex = roomData.currentQuestionIndex;
        const currentLockedPlayers = roomData.lockedPlayers?.[currentQuestionIndex] || [];
        await update(ref(db, `rooms/${roomCode}/lockedPlayers`), {
          [currentQuestionIndex]: [...currentLockedPlayers, userId]
        });
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
      toast.error("Failed to submit answer.");
      setSelectedAnswer(null);
    }
  };

  // --- Audio Player Logic - Added ---
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.warn("Audio autoplay failed:", err);
        setIsPlaying(false);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const progressBar = e.currentTarget;
    const clickPosition = e.nativeEvent.offsetX;
    const barWidth = progressBar.offsetWidth;
    const newTime = (clickPosition / barWidth) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const getProgressColor = () => {
    const percentage = (timeLeft / difficultySettings.timeLimit) * 100;
    if (percentage > 66) return 'bg-green-500';
    if (percentage > 33) return 'bg-yellow-400';
    if (percentage > 10) return 'bg-orange-500';
    return 'bg-red-600';
  }

  // Add this effect to handle rushmode question progression
  useEffect(() => {
    if (!roomData || !userId || userId !== roomData.creatorId || roomData.status !== 'in-game' || roomData.gameMode !== 'rushmode') {
      return;
    }

    const currentIndex = roomData.currentQuestionIndex ?? -1;
    if (currentIndex < 0 || !roomData.questions || currentIndex >= roomData.questions.length) {
      return;
    }

    const answersForCurrentQuestion = roomData.answers?.[currentIndex] ?? {};
    const hasCorrectAnswer = Object.values(answersForCurrentQuestion).some(
      answerData => answerData.answer === currentQuestion?.correctAnswer
    );

    if (hasCorrectAnswer && processedIndexRef.current !== currentIndex) {
      processedIndexRef.current = currentIndex;
      moveToNextQuestionOrEnd();
    }
  }, [roomData, currentQuestion, userId, moveToNextQuestionOrEnd]);

  useEffect(() => {
    if (!roomData || !currentQuestion) return;

    const startTime = typeof roomData.currentQuestionStartTime === 'number'
      ? roomData.currentQuestionStartTime
      : Date.now();

    setTimeLeft(calculateTimeLeft(startTime));

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = +(prev - 0.1).toFixed(1);
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [roomData?.currentQuestionStartTime, currentQuestion, difficultySettings.timeLimit]);

  if (loading || sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black flex items-center justify-center">
        <div className="bg-black/50 backdrop-blur-sm p-8 rounded-2xl border border-purple-900/30 shadow-lg shadow-purple-900/20 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-white text-xl animate-pulse flex items-center gap-2">
              <span className="animate-spin">🎬</span>
              Loading game...
              <span className="animate-spin">🎮</span>
            </div>
            <div className="text-purple-400/70 text-sm">Preparing your epic multiplayer quiz battle!</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black flex items-center justify-center">
        <div className="bg-black/50 backdrop-blur-sm p-8 rounded-2xl border border-purple-900/30 shadow-lg shadow-purple-900/20 text-center">
          <div className="flex flex-col items-center gap-4">
            <p className="text-red-500 text-xl flex items-center gap-2">
              <span>🎬</span> {error} <span>🎮</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black flex items-center justify-center">
        <div className="bg-black/50 backdrop-blur-sm p-8 rounded-2xl border border-purple-900/30 shadow-lg shadow-purple-900/20 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-white text-xl animate-pulse flex items-center gap-2">
              <span className="animate-spin">🎬</span>
              Loading room data...
              <span className="animate-spin">🎮</span>
            </div>
            <div className="text-purple-400/70 text-sm">Setting up your multiplayer arena!</div>
          </div>
        </div>
      </div>
    );
  }

  if (roomData.status === 'finished') {
    const sortedPlayers = Object.entries(roomData.players || {})
      .sort(([, a], [, b]) => b.score - a.score);
    const highestScore = sortedPlayers[0]?.[1].score;

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex flex-col items-center justify-center p-4">
        <div className="bg-purple-800/50 backdrop-blur-md p-8 rounded-3xl border border-purple-400/30 shadow-xl shadow-purple-500/30 text-center max-w-lg w-full animate-in fade-in duration-500">
          <h2 className="text-3xl font-bold mb-4 text-white tracking-tight flex items-center justify-center gap-2">
            <span className="animate-bounce">🏆</span>
            Game Finished!
          </h2>
          <p className="text-lg mb-4 text-purple-200">Final Scores:</p>
          <ul className="space-y-3 mb-8 max-h-60 overflow-y-auto px-2">
            {sortedPlayers.map(([id, player]) => (
              <li
                key={id}
                className={`flex justify-between items-center py-2.5 px-4 rounded-lg transition-all duration-200 ${player.score === highestScore ? 'bg-green-600/30' : 'bg-orange-600/30'}`}
              >
                <span className="text-white font-medium flex items-center gap-2">
                  {player.name}
                  {player.score === highestScore && (
                    <span className="animate-bounce">👑</span>
                  )}
                </span>
                <span className={`font-bold ${player.score === highestScore ? 'text-green-400' : 'text-orange-400'}`}>
                  {player.score} pts
                </span>
              </li>
            ))}
          </ul>
          <Button
            variant="default"
            size="lg"
            onClick={() => router.replace('/home')}
            className="w-full bg-purple-600 hover:bg-purple-500 text-lg transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
          >
            Back to Home
          </Button>

        </div>
      </div>
    );
  }

  if (roomData.status === 'in-game' && !currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black flex items-center justify-center">
        <div className="bg-black/50 backdrop-blur-sm p-8 rounded-2xl border border-purple-900/30 shadow-lg shadow-purple-900/20 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-white text-xl animate-pulse flex items-center gap-2">
              <span className="animate-spin">🎬</span>
              Waiting for question...
              <span className="animate-spin">🎮</span>
            </div>
            <div className="text-purple-400/70 text-sm">Get ready for the next challenge!</div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black flex items-center justify-center">
        <div className="bg-black/50 backdrop-blur-sm p-8 rounded-2xl border border-purple-900/30 shadow-lg shadow-purple-900/20 text-center">
          <p className="text-red-500 text-xl">Error loading question or game state invalid.</p>
        </div>
      </div>
    );
  }

  const questionIndex = roomData.currentQuestionIndex;
  const playerAnswered = userId && questionIndex !== undefined && roomData.answers?.[questionIndex]?.[userId];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-3xl bg-purple-800/40 backdrop-blur-md p-6 rounded-2xl border border-purple-400/20 shadow-xl shadow-purple-500/20 relative animate-in fade-in duration-300">

        {/* Header Section: Timer, Question Count, Type */}
        <div className="grid grid-cols-3 items-center gap-4 mb-4">
          {/* Source Type (Left Aligned) */}
          <div className="flex items-center justify-start gap-2 text-purple-200 text-sm">
            {currentQuestion.source === 'film' ? <Film size={16} /> : <Gamepad2 size={16} />}
            <span className="truncate">{currentQuestion.source === 'film' ? 'Movie Question' : 'Game Question'}</span>
          </div>
          {/* Question Count (Center Aligned) */}
          <div className="text-white font-medium text-lg text-center">
            Question {roomData.currentQuestionIndex !== undefined ? roomData.currentQuestionIndex + 1 : '-'} / {roomData.questions?.length ?? '-'}
          </div>
          {/* Timer and Game Mode (Right Aligned) */}
          <div className="flex items-center justify-end gap-2">
            {roomData.gameMode === 'rushmode' && (
              <div className="flex items-center gap-1 text-yellow-400 font-semibold text-sm">
                <Zap size={16} />
                <span>Rush Mode</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-yellow-400 font-semibold text-sm">
              <Timer size={16} />
              <span>{timeLeft}s</span>
            </div>
          </div>
        </div>

        {/* Add locked player indicator for rushmode */}
        {roomData.gameMode === 'rushmode' && roomData.lockedPlayers?.[roomData.currentQuestionIndex ?? -1]?.includes(userId ?? '') && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-center">
            You are locked out of this question. Wait for the next one!
          </div>
        )}

        {/* Timer Bar */}
        <div className="mb-6 relative h-2 w-full bg-purple-900/60 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-linear ${getProgressColor()}`}
            style={{ width: `${(timeLeft / difficultySettings.timeLimit) * 100}%` }}
          />
        </div>

        {/* Media Area (Image or Audio) */}
        <div className="mb-5 min-h-[160px] flex flex-col items-center justify-center">
        {difficultySettings.showImage && currentQuestion.media?.image && (
            <div className="relative w-full max-w-lg h-56 animate-in fade-in duration-300 mb-4">
              <NextImage
                src={currentQuestion.media.image}
                alt="scene"
                layout="fill"
                objectFit="contain"
                className="rounded-lg"
                priority={questionIndex === 0} // Prioritize first image
              />
            </div>
          )}

          {/* Audio Display with Custom Controls - Added */}
          {difficultySettings.showAudio && currentQuestion.media?.voice_record && (
            <div className="w-full max-w-md flex flex-col items-center gap-3 animate-in fade-in duration-300">
              {/* Hidden Actual Audio Element */}
              <audio
                ref={audioRef}
                key={currentQuestion.media.voice_record}
                src={currentQuestion.media.voice_record}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleAudioEnded}
                preload="metadata"
                autoPlay // Attempt autoplay
                hidden
              >
                Your browser does not support the audio element.
              </audio>

              {/* Optional Quote Text */}
              {currentQuestion.media.quote && (
                <p className="text-center italic text-sm text-purple-200 mb-1">&quot;{currentQuestion.media.quote}&quot;</p>
              )}

              {/* Custom Controls */}
              <div className="flex items-center gap-4 w-full bg-purple-900/30 p-3 rounded-lg">
                <Button
                  onClick={togglePlayPause}
                  variant="ghost"
                  size="icon"
                  className="text-purple-200 hover:text-white hover:bg-purple-700/50 rounded-full"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </Button>
                <div className="flex-grow flex items-center gap-2">
                  <span className="text-xs text-purple-300 font-mono w-10 text-right">{formatTime(currentTime)}</span>
                  <div
                    className="relative w-full h-2 bg-purple-900/70 rounded-full cursor-pointer group"
                    onClick={handleProgressClick}
                  >
                    <div
                      className="absolute top-0 left-0 h-full bg-purple-400 rounded-full"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                    <div
                      className="absolute top-1/2 left-0 w-3 h-3 bg-white rounded-full -translate-y-1/2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 6px)` }}
                    />
                  </div>
                  <span className="text-xs text-purple-300 font-mono w-10">{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Question Text */}
        <p className="text-center mb-6 text-xl font-semibold text-white min-h-[60px] px-3 md:px-10">{currentQuestion.questionText}</p>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQuestion.options.map((opt) => {
            const isCorrect = opt === currentQuestion.correctAnswer;
            const isSelected = selectedAnswer === opt;

            // Determine button styles based on state (answered, time up, selected, correct)
            let buttonClasses = "bg-purple-700/60 hover:bg-purple-600/60 text-white border-purple-500/30 focus:ring-purple-400"; // Default
            if (playerAnswered || timeLeft <= 0) { // If player answered or time is up, reveal correct/incorrect
              buttonClasses = isCorrect
                ? "bg-green-600/80 text-white border-green-500/50 focus:ring-green-400 scale-105 shadow-lg" // Correct answer style
                : isSelected
                  ? "bg-red-600/80 text-white border-red-500/50 focus:ring-red-400" // Player selected this wrong answer
                  : "bg-purple-900/50 text-purple-300 border-purple-700/30 opacity-70 cursor-not-allowed"; // Other wrong answers
            } else if (isSelected) { // Player selected this option before reveal
              buttonClasses = "bg-purple-500 text-white border-purple-400/50 ring-2 ring-purple-400 ring-offset-2 ring-offset-purple-900"; // Style for selected before reveal
            }

            return (
              <button
                key={opt}
                onClick={() => handleAnswerSubmit(opt)}
                className={`min-h-[60px] flex items-center justify-center p-3 rounded-lg text-center text-base font-medium w-full border ${buttonClasses} transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none`}
                disabled={!!playerAnswered || timeLeft <= 0 || isSubmitting} // Disable if answered, time up, or currently submitting
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Feedback Text */}
        {playerAnswered && (
          <p className="text-center mt-4 text-green-400 font-semibold animate-in fade-in duration-500">
            Your answer submitted! Waiting for others...
          </p>
        )}
        {timeLeft <= 0 && !playerAnswered && (
          <p className="text-center mt-4 text-red-400 font-semibold animate-in fade-in duration-500">
            Time&apos;s up!
          </p>
        )}
      </div>
    </div>
  );
} 