'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import NextImage from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { X, Timer, Film, Gamepad2, Play, Pause } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from "sonner"

interface Question {
  questionText: string
  options: string[]
  correctAnswer: string
  media?: {
    image?: string | null
    voice_record?: string | null
    quote?: string | null
  }
  type: number
  source: 'film' | 'game'
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function SingleplayerPlayPage() {
  const router = useRouter()
  const [question, setQuestion] = useState<Question | null>(null)
  const [questionIndex, setQuestionIndex] = useState(1)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showNext, setShowNext] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const { data: session } = useSession()

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const saveScore = useCallback(async (finalScore: number) => {
    if (!session?.user?.id) {
      console.error("Cannot save score: User not logged in.");
      return; 
    }
    try {
      const response = await fetch("/api/game-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: finalScore }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save score");
      }
      console.log("Game score saved successfully.");
    } catch (error) {
      console.error("Error saving game score:", error);
      toast.error(error instanceof Error ? error.message : "Could not save score");
    }
  }, [session]);

  useEffect(() => {
    const loadQuestion = async () => {
      try {
        const type = (Math.floor(Math.random() * 4) + 1) as 1 | 2 | 3 | 4
        const res = await fetch(`/api/singleplayer-question?type=${type}`)
        if (!res.ok) {
          throw new Error(`Failed to fetch question (status: ${res.status})`);
        }
        const data = await res.json()
        if (!data || !data.questionText) {
           throw new Error("Invalid question data received from API.");
        }
        setQuestion(data)
        setSelectedOption(null)
        setShowNext(false)
        setTimeLeft(30)
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
      } catch (error) {
        console.error("Error loading question:", error);
        toast.error(error instanceof Error ? error.message : "Could not load question");
      }
    }

    loadQuestion()
  }, [questionIndex])

  useEffect(() => {
    if (selectedOption || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setShowNext(true)
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [selectedOption, timeLeft])

  const handleOptionClick = (option: string) => {
    if (!selectedOption && question) {
      setSelectedOption(option)
      setShowNext(true)
      if (audioRef.current && !audioRef.current.paused) {
         audioRef.current.pause();
         setIsPlaying(false);
      }
      if (option === question.correctAnswer) {
        setScore(prev => prev + timeLeft)
      } else {
        setScore(prev => prev - 5)
      }
    }
  }

  const handleNext = () => {
    if (questionIndex === 5) {
      setShowResult(true)
    } else {
      setQuestionIndex(prev => prev + 1)
    }
  }

  useEffect(() => {
    if (showResult) {
      saveScore(score);
    }
  }, [showResult, score, saveScore]);

  const handleExitConfirm = () => {
    setShowExitDialog(false)
    router.push('/dashboard')
  }

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
    if(audioRef.current) audioRef.current.currentTime = 0;
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

  if (!question) return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-purple-800/30 backdrop-blur-sm p-8 rounded-2xl border border-purple-400/20 shadow-lg shadow-purple-500/20 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-white text-xl animate-pulse flex items-center gap-2">
            <span className="animate-spin">🎬</span>
            Loading question...
            <span className="animate-spin">🎮</span>
          </div>
          <div className="text-purple-300 text-sm">Get ready for an epic quiz adventure!</div>
        </div>
      </div>
    </div>
  )

  const getProgressColor = () => {
    if (timeLeft > 20) return 'bg-green-500'
    if (timeLeft > 10) return 'bg-yellow-400'
    if (timeLeft > 5) return 'bg-orange-500'
    return 'bg-red-600'
  }

  if (showResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex flex-col items-center justify-center p-4">
        <div className="bg-purple-800/50 backdrop-blur-md p-8 rounded-3xl border border-purple-400/30 shadow-xl shadow-purple-500/30 text-center max-w-md w-full animate-in fade-in duration-500">
          <h2 className="text-3xl font-bold mb-3 text-white tracking-tight flex items-center justify-center gap-2">
            <span className="animate-bounce">🎉</span>
            Quiz Complete!
          </h2>
          <p className="text-lg mb-4 text-purple-200">Your Final Score:</p>
          <p className="text-6xl font-bold text-yellow-400 mb-8 animate-pulse">
            {score}
          </p>
          <Button 
            variant="default" 
            size="lg" 
            onClick={() => router.push('/dashboard')}
            className="w-full bg-purple-600 hover:bg-purple-500 text-lg transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
          >
            Back to Menu
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-3xl bg-purple-800/40 backdrop-blur-md p-6 rounded-2xl border border-purple-400/20 shadow-xl shadow-purple-500/20 relative animate-in fade-in duration-300">
        <div className="absolute top-4 right-3 z-10">
          <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-purple-300 hover:text-white hover:bg-purple-700/50 rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-purple-800/50 backdrop-blur-lg border-purple-400/30 text-white rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                  Exit Game
                </DialogTitle>
                <DialogDescription className="text-purple-200 pt-2">
                  Are you sure? Your current score ({score}) will be saved, but you&apos;ll exit the quiz.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={() => setShowExitDialog(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleExitConfirm}>Exit Now</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-3 items-center gap-4 mb-4">
          <div className="flex items-center justify-start gap-2 text-purple-200 text-sm">
            {question.source === 'film' ? <Film size={16} /> : <Gamepad2 size={16} />}
            <span className="truncate">{question.source === 'film' ? 'Movie Question' : 'Game Question'}</span>
          </div>
          <div className="text-white font-medium text-lg text-center">
            Question {questionIndex}/5
          </div>
          <div className="flex items-center justify-end gap-1 text-yellow-400 font-semibold text-sm mr-8">
             <Timer size={16} />
             <span>{timeLeft}s</span>
          </div>
        </div>
        
        <div className="mb-6 relative h-2 w-full bg-purple-900/60 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-linear ${getProgressColor()}`}
            style={{ width: `${(timeLeft / 30) * 100}%` }}
          />
        </div>

        <div className="mb-5 min-h-[160px] flex flex-col items-center justify-center">
          {question.media?.image && (
            <div className="relative w-full max-w-lg h-40 animate-in fade-in duration-300">
              <NextImage 
                src={question.media.image} 
                alt="scene" 
                layout="fill" 
                objectFit="contain"
                className="rounded-lg"
                priority={questionIndex === 1}
              />
            </div>
          )}
          {question.media?.voice_record && (
            <div className="w-full max-w-md flex flex-col items-center gap-3 animate-in fade-in duration-300">
              <audio
                ref={audioRef}
                key={question.media.voice_record}
                src={question.media.voice_record}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleAudioEnded}
                preload="metadata"
                autoPlay
                hidden
              >
                Your browser does not support the audio element.
              </audio>
              {question.media.quote && (
                 <p className="text-center italic text-sm text-purple-200 mb-1">&quot;{question.media.quote}&quot;</p>
              )}
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

        <p className="text-center mb-6 text-xl font-semibold text-white min-h-[56px]">{question.questionText}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((opt: string, idx: number) => {
            const isCorrect = opt === question.correctAnswer
            const isSelected = selectedOption === opt

            let buttonClasses = "bg-purple-700/60 hover:bg-purple-600/60 text-white border-purple-500/30 focus:ring-purple-400"
            if (selectedOption || timeLeft <= 0) {
              buttonClasses = isCorrect 
                ? "bg-green-600/80 text-white border-green-500/50 focus:ring-green-400 scale-105 shadow-lg"
                : isSelected 
                ? "bg-red-600/80 text-white border-red-500/50 focus:ring-red-400"
                  : "bg-purple-900/50 text-purple-300 border-purple-700/30 opacity-70 cursor-not-allowed"
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(opt)}
                className={`min-h-[60px] flex items-center justify-center p-3 rounded-lg text-center text-base font-medium w-full border ${buttonClasses} transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none`}
                disabled={!!selectedOption || timeLeft <= 0}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {(showNext || timeLeft <= 0) && (
          <div className="mt-6 text-center animate-in fade-in duration-500">
            <Button 
              variant="default" 
              size="lg" 
              onClick={handleNext}
              className="w-full sm:w-auto sm:px-10 bg-purple-600 hover:bg-purple-500 text-lg transition-all duration-300 hover:shadow-md active:scale-95"
            >
              {questionIndex === 5 ? 'Finish Quiz' : 'Next Question'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
