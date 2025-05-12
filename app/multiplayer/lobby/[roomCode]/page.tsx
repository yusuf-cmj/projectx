'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, onValue, off, update, serverTimestamp, remove, onDisconnect } from 'firebase/database';
import { Difficulty, DIFFICULTY_LEVELS } from '@/lib/difficulty';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
    Crown, Users, PlayCircle, Settings, ClipboardCopy, CheckCircle, 
    Hourglass, Trash2, Loader2, LogOut, ThumbsUp, ThumbsDown, 
    Gauge, ListChecks, Zap, Gamepad2, CopyCheck, Wand2, UsersRound, ShieldQuestion, Award 
} from 'lucide-react';

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
  questions?: Quote[] | null;
  currentQuestionIndex?: number | null;
  currentQuestionStartTime?: object | null; // Allow null for reset
  answers?: { [questionIndex: number]: { [playerId: string]: string } } | null; // Allow null for reset
  lockedPlayers?: { [questionIndex: number]: string[] | null } | null; // Allow null for reset
  gameMode?: 'normal' | 'rushmode';
  difficulty?: Difficulty;
  questionCount?: 5 | 10 | 15 | 20;
}

const iconSize = 18;
const sectionIconSize = 22;

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = typeof params?.roomCode === 'string' ? params.roomCode : null;
  const { data: session, status: sessionStatus } = useSession();
  const userId = session?.user?.id;

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15 | 20>(5);
  const [gameMode, setGameMode] = useState<'normal' | 'rushmode'>('normal');

  useEffect(() => {
    if (roomData?.difficulty) setDifficulty(roomData.difficulty);
    if (roomData?.questionCount) setQuestionCount(roomData.questionCount);
    if (roomData?.gameMode) setGameMode(roomData.gameMode);
  }, [roomData?.difficulty, roomData?.questionCount, roomData?.gameMode]);

  useEffect(() => {
    if (!roomCode) {
      setError('Room code is missing.');
      setLoading(false);
      return;
    }
    if (sessionStatus === 'loading') return;

    const roomRef = ref(db, `rooms/${roomCode}`);
    let playerRefForDisconnect: any = null;

    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as RoomData;
        setRoomData(data);
        setError(null);

        if (userId && data.players && data.players[userId] && !playerRefForDisconnect) {
          playerRefForDisconnect = ref(db, `rooms/${roomCode}/players/${userId}`);
          onDisconnect(playerRefForDisconnect).remove()
            .catch((err) => console.error(`Failed to set up onDisconnect for ${userId}:`, err));
        }
        
        const playerCount = data.players ? Object.keys(data.players).length : 0;
        if (playerCount === 0) {
          remove(roomRef).catch((err) => console.error(`Error removing empty room ${roomCode}:`, err));
          return;
        }

        if (data.status === 'in-game') {
          router.push(`/multiplayer/game/${roomCode}`);
          setLoading(false);
          return;
        }
        setLoading(false);
      } else {
        setRoomData(null);
        setError(`Room "${roomCode}" not found or closed.`);
        setLoading(false);
      }
    }, (err) => {
      console.error("Firebase read failed: ", err);
      setError('Failed to load room data.');
      setLoading(false);
    });

    return () => {
      off(roomRef, 'value', unsubscribe);
      if (playerRefForDisconnect) {
        onDisconnect(playerRefForDisconnect).cancel();
      }
    };
  }, [roomCode, router, sessionStatus, userId]);

  const isCreator = userId && roomData?.creatorId === userId;
  const currentPlayer = userId && roomData?.players ? roomData.players[userId] : null;

  const updateSetting = async (settingName: string, value: any, successMessage: string) => {
    if (!isCreator || !roomCode || roomData?.status !== 'waiting') {
      toast.error("Only the host can change settings while waiting.");
      return;
    }
    try {
      await update(ref(db, `rooms/${roomCode}`), { [settingName]: value });
      toast.success(successMessage);
    } catch (error) {
      toast.error(`Failed to update ${settingName}.`);
      // Revert local state if needed, though Firebase listener should correct it
    }
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    updateSetting('difficulty', newDifficulty, `Difficulty: ${DIFFICULTY_LEVELS[newDifficulty].label}`);
  };
  const handleQuestionCountChange = (newCount: 5 | 10 | 15 | 20) => {
    setQuestionCount(newCount);
    updateSetting('questionCount', newCount, `Questions: ${newCount}`);
  };
  const handleGameModeChange = (newMode: 'normal' | 'rushmode') => {
    setGameMode(newMode);
    updateSetting('gameMode', newMode, `Mode: ${newMode === 'rushmode' ? 'Rush Mode' : 'Normal Mode'}`);
  };
  
  const handleReadyClick = async () => {
    if (!userId || !roomCode || !currentPlayer || roomData?.status !== 'waiting') {
      toast.error("Cannot change ready status now.");
      return;
    }
    const playerPath = `rooms/${roomCode}/players/${userId}/isReady`;
    try {
      await update(ref(db), { [playerPath]: !currentPlayer.isReady });
    } catch (err) {
      toast.error("Failed to update ready status.");
    }
  };

  const handleStartGameClick = async () => {
    if (!isCreator || !allPlayersReady || !roomCode || isStarting || roomData?.status !== 'waiting') {
      toast.warning("Cannot start game. Ensure all players are ready.");
      return;
    }
    setIsStarting(true);
    const gameDifficulty = difficulty;
    const numQuestions = questionCount;
    const currentMode = gameMode;

    const questionsToFetch: Quote[] = [];
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      for (let i = 0; i < numQuestions; i++) {
        const randomType = Math.floor(Math.random() * 4) + 1 as 1 | 2 | 3 | 4;
        const response = await fetch(`${origin}/api/singleplayer-question?type=${randomType}&difficulty=${gameDifficulty}`);
        if (!response.ok) throw new Error(`API Error (Type ${randomType}): ${response.status}`);
        const question = await response.json();
        if (!question || !question.questionText) throw new Error(`Failed to fetch a valid question (Type ${randomType}).`);
        
        if (question.media?.image && question.media.image.startsWith('/')) {
          question.media.image = `${origin}${question.media.image}`;
        }
        if (question.media?.voice_record && question.media.voice_record.startsWith('/')) {
          question.media.voice_record = `${origin}${question.media.voice_record}`;
        }
        questionsToFetch.push(question as Quote);
      }
      if (questionsToFetch.length !== numQuestions) throw new Error(`Fetched ${questionsToFetch.length}/${numQuestions} questions.`);

      const initialGameState: Partial<RoomData> = {
        questions: questionsToFetch,
        currentQuestionIndex: 0,
        currentQuestionStartTime: serverTimestamp(),
        answers: null, 
        lockedPlayers: null, 
        status: 'in-game',
        difficulty: gameDifficulty,
        questionCount: numQuestions,
        gameMode: currentMode,
      };
      await update(ref(db, `rooms/${roomCode}`), initialGameState);
    } catch (err) {
      toast.error(`Failed to start game: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsStarting(false);
    }
  };

  const handleStartNewGame = async () => {
    if (!isCreator || !roomCode || roomData?.status !== 'finished' || isResetting) return;
    setIsResetting(true);
    try {
      const updates: Partial<RoomData> & { [key: string]: any } = {
        status: 'waiting',
        currentQuestionIndex: null,
        currentQuestionStartTime: null,
        answers: null,
        lockedPlayers: null,
        questions: null,
      };
      if (roomData.players) {
        Object.keys(roomData.players).forEach(pId => {
          updates[`players/${pId}/score`] = 0;
          updates[`players/${pId}/isReady`] = false;
        });
      }
      await update(ref(db, `rooms/${roomCode}`), updates);
      toast.success("Room reset! Ready for a new game.");
    } catch (err) {
      toast.error("Failed to reset room.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!userId || !roomCode) return;
    const playerPath = `rooms/${roomCode}/players/${userId}`;
    try {
      await remove(ref(db, playerPath));
      toast.info("You left the room.");
      router.push('/home'); 
    } catch (error) {
      toast.error("Failed to leave room.");
    }
  };

  const SettingButton = ({ value, currentValue, onClick, children, className = '' }: any) => (
    <Button
      variant={value === currentValue ? 'default' : 'outline'}
      onClick={onClick}
      className={`border-purple-600/70 hover:bg-purple-600/30 data-[state=active]:bg-purple-600 data-[state=active]:text-white ${value === currentValue ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'text-purple-200 hover:text-white'} ${className}`}
      size="sm"
    >
      {children}
    </Button>
  );

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-950 flex items-center justify-center p-4">
        <Loader2 className="h-12 w-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-purple-800/30 backdrop-blur-sm p-8 rounded-2xl border border-purple-400/20 shadow-lg shadow-purple-500/20 text-center">
          <p className="text-red-400 text-xl">Please log in to access the lobby.</p>
          <Button onClick={() => router.push('/login')} className="mt-4">Go to Login</Button>
        </div>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-950 flex flex-col items-center justify-center p-4 text-center">
        <ShieldQuestion size={48} className="text-red-500 mb-4" />
        <p className="text-xl text-red-400 mb-4">{error || 'Room not found or has been closed.'}</p>
        <Button onClick={() => router.push('/home')} className="bg-purple-600 hover:bg-purple-500 text-white">
          Back to Home
        </Button>
      </div>
    );
  }

  const playersArray = roomData.players ? Object.entries(roomData.players).map(([id, player]) => ({ id, ...player })) : [];
  const allPlayersReady = playersArray.length > 0 && playersArray.every(p => p.isReady);

  if (roomData.status === 'finished') {
    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-950 flex flex-col items-center justify-center p-6 text-white">
            <div className="bg-black/30 backdrop-blur-xl p-8 rounded-3xl border border-purple-700/50 shadow-2xl shadow-purple-500/30 text-center max-w-md w-full">
                <h2 className="text-4xl font-bold mb-3 flex items-center justify-center gap-2">
                    <Award size={36} className="text-yellow-400" /> Game Over!
                </h2>
                <p className="text-lg text-purple-300 mb-6">Final scores:</p>
                <ul className="space-y-2.5 mb-8 max-h-72 overflow-y-auto px-2 custom-scrollbar">
                    {playersArray.sort((a, b) => b.score - a.score).map((player, idx) => (
                        <li key={player.id} className={`flex justify-between items-center py-3 px-4 rounded-xl transition-all duration-300 ${idx === 0 ? 'bg-yellow-500/25 border-yellow-400/60' : 'bg-purple-700/40 border-purple-600/50'} border`}>
                            <span className="font-medium text-lg flex items-center gap-2.5">
                                {player.name} {idx === 0 && <Crown size={iconSize} className="text-yellow-300" />}
                            </span>
                            <span className={`font-bold text-xl ${idx === 0 ? 'text-yellow-300' : 'text-white'}`}>{player.score.toFixed(1)} pts</span>
                        </li>
                    ))}
                </ul>
                {isCreator && (
                    <Button onClick={handleStartNewGame} disabled={isResetting} className="w-full bg-green-600 hover:bg-green-500 text-white text-lg py-3.5 mb-3 shadow-lg hover:shadow-green-500/50 transition-all duration-300">
                        {isResetting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <PlayCircle className="mr-2 h-5 w-5" />} {isResetting ? 'Resetting...' : 'Start New Game'}
                    </Button>
                )}
                {!isCreator && (
                    <p className="text-purple-300 mb-4 italic">Waiting for {roomData.players[roomData.creatorId!]?.name || 'the host'} to start a new game.</p>
                )}
                <Button variant="outline" onClick={handleLeaveRoom} className="w-full text-purple-300 border-purple-600/70 hover:bg-purple-700/30 hover:text-white py-3 text-base">
                    <LogOut size={iconSize} className="mr-2" /> Leave Room
                </Button>
            </div>
        </div>
    );
}

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-950 flex flex-col items-center justify-start py-8 px-4 text-white">
      <div className="bg-black/30 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-purple-700/50 shadow-2xl shadow-purple-500/30 w-full max-w-3xl">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-purple-700/50">
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 flex items-center gap-2"><Wand2 size={30}/>Lobby</h1>
          <div className="flex items-center gap-2">
            <div className="text-right">
                <p className="text-xs text-purple-400">ROOM CODE</p>
                <span 
                    onClick={() => { navigator.clipboard.writeText(roomCode!); setCopied(true); toast.success("Room code copied!"); setTimeout(()=>setCopied(false), 2000);}}
                    className="font-mono text-lg bg-purple-900/60 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-purple-700/70 transition-colors flex items-center gap-2"
                >
                    {roomCode} {copied ? <CopyCheck size={iconSize} className='text-green-400'/> : <ClipboardCopy size={iconSize} />}
                </span>
            </div>
            <Button variant="ghost" onClick={handleLeaveRoom} className="text-purple-300 hover:text-red-400 p-2 aspect-square h-auto">
              <LogOut size={22}/>
            </Button>
          </div>
        </div>

        <div className="mb-8 p-5 bg-black/20 rounded-2xl border border-purple-800/60">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-purple-200"><Settings size={sectionIconSize}/> Game Settings</h3>
            {isCreator && (
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-purple-300 mb-1.5 flex items-center gap-1.5"><Gauge size={iconSize}/>Difficulty</label>
                        <div className="flex gap-2 flex-wrap">
                            {Object.keys(DIFFICULTY_LEVELS).map((key) => (
                                <SettingButton key={key} value={key} currentValue={difficulty} onClick={() => handleDifficultyChange(key as Difficulty)}>
                                    {DIFFICULTY_LEVELS[key as Difficulty].label}
                                </SettingButton>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-purple-300 mb-1.5 flex items-center gap-1.5"><ListChecks size={iconSize}/>Number of Questions</label>
                        <div className="flex gap-2 flex-wrap">
                            {[5, 10, 15, 20].map(num => (
                                <SettingButton key={num} value={num} currentValue={questionCount} onClick={() => handleQuestionCountChange(num as 5 | 10 | 15 | 20)}>
                                    {num} Questions
                                </SettingButton>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-purple-300 mb-1.5 flex items-center gap-1.5"><Gamepad2 size={iconSize}/>Game Mode</label>
                        <div className="flex gap-2 flex-wrap">
                            <SettingButton value="normal" currentValue={gameMode} onClick={() => handleGameModeChange('normal')}>Normal</SettingButton>
                            <SettingButton value="rushmode" currentValue={gameMode} onClick={() => handleGameModeChange('rushmode')} className="group">
                                <Zap size={iconSize-2} className={`mr-1.5 group-data-[state=active]:text-yellow-300 ${gameMode === 'rushmode' ? 'text-yellow-300' : 'text-purple-300 group-hover:text-yellow-400'} transition-colors`}/>Rush Mode
                            </SettingButton>
                        </div>
                    </div>
                </div>
            )}
            {(!isCreator && roomData?.status === 'waiting') && (
                <div className="space-y-3 text-purple-200">
                    <p><Gauge size={iconSize} className="inline mr-2"/>Difficulty: <span className='font-semibold text-white'>{DIFFICULTY_LEVELS[difficulty]?.label || 'N/A'}</span></p>
                    <p><ListChecks size={iconSize} className="inline mr-2"/>Questions: <span className='font-semibold text-white'>{questionCount || 'N/A'}</span></p>
                    <p><Gamepad2 size={iconSize} className="inline mr-2"/>Mode: <span className='font-semibold text-white'>{gameMode === 'rushmode' ? 'Rush Mode' : 'Normal Mode'}</span></p>
                </div>
            )}
        </div>
        
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-purple-200"><UsersRound size={sectionIconSize}/> Players ({playersArray.length})</h3>
          {playersArray.length > 0 ? (
            <ul className="space-y-2.5">
              {playersArray.map(player => (
                <li key={player.id} className={`flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-purple-500/30 ${player.isReady ? 'bg-green-600/25 border-green-500/60' : 'bg-purple-800/40 border-purple-700/60'} border`}>
                  <div className="flex items-center gap-3">
                    {player.id === roomData.creatorId && <Crown size={iconSize} className="text-yellow-400" />}
                    <span className="font-medium text-lg text-white truncate max-w-[250px] sm:max-w-[350px]">{player.name} {player.id === userId && <span className="text-xs text-purple-300">(You)</span>}</span>
                  </div>
                  {player.isReady ? (
                    <span className="text-green-300 font-semibold flex items-center gap-1.5 text-sm"><CheckCircle size={iconSize-2}/> Ready</span>
                  ) : (
                    <span className="text-purple-300 flex items-center gap-1.5 text-sm"><Hourglass size={iconSize-2}/> Not Ready</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-purple-300 italic text-center py-4">Lobby is quiet... too quiet. Waiting for players!</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-purple-700/50">
          {currentPlayer && roomData.status === 'waiting' && (
            <Button 
              onClick={handleReadyClick} 
              variant={currentPlayer.isReady ? "destructive" : "default"}
              className={`flex-1 py-3.5 text-lg shadow-lg hover:shadow-xl transition-all duration-300 ${currentPlayer.isReady ? 'bg-red-600 hover:bg-red-500 focus:ring-red-400' : 'bg-green-600 hover:bg-green-500 focus:ring-green-400'}`}
            >
              {currentPlayer.isReady ? <><ThumbsDown className="mr-2 h-5 w-5"/>Not Ready</> : <><ThumbsUp className="mr-2 h-5 w-5"/>Ready Up!</>}
            </Button>
          )}
          {isCreator && roomData.status === 'waiting' && (
            <Button 
              onClick={handleStartGameClick} 
              disabled={!allPlayersReady || isStarting || playersArray.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3.5 text-lg shadow-lg hover:shadow-purple-500/50 transition-all duration-300 disabled:bg-gray-700 disabled:shadow-none disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {isStarting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <PlayCircle className="mr-2 h-5 w-5" />}
              {isStarting ? 'Starting...' : `Start Game (${playersArray.filter(p=>p.isReady).length}/${playersArray.length} Ready)`}
            </Button>
          )}
        </div>
         {!currentPlayer && roomData.status === 'waiting' && userId && (
           <Button onClick={async () => {
             if (userId && session?.user?.name) {
                try {
                    await update(ref(db, `rooms/${roomCode}/players/${userId}`), {
                        name: session.user.name, score: 0, isReady: false,
                    });
                    toast.success("Joined the room!");
                } catch (e) { toast.error("Failed to join room."); }
             }
           }}
           className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 text-lg shadow-lg hover:shadow-indigo-500/50 transition-all duration-300"
           >
             Join Room
           </Button>
        )}
      </div>
    </div>
  );
} 