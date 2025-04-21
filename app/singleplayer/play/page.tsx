'use client'

import { useEffect, useState, useCallback } from 'react'
import NextImage from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { X } from 'lucide-react'
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
      const type = (Math.floor(Math.random() * 4) + 1) as 1 | 2 | 3 | 4
      const res = await fetch(`/api/singleplayer-question?type=${type}`)
      const data = await res.json()
      setQuestion(data)
      setSelectedOption(null)
      setShowNext(false)
      setTimeLeft(30)
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

  if (!question) return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex flex-col items-center justify-center px-4">
        <div className="bg-purple-800/30 backdrop-blur-sm p-8 rounded-2xl border border-purple-400/20 shadow-lg shadow-purple-500/20 text-center max-w-lg w-full">
          <h2 className="text-3xl font-bold mb-4 text-white tracking-wide animate-pulse flex items-center justify-center gap-2">
            <span className="animate-bounce">🎬</span>
            Quiz Complete 
            <span className="animate-bounce">🎮</span>
          </h2>
          <p className="text-xl mb-2 text-purple-200">Your Total Score:</p>
          <p className="text-5xl font-bold text-yellow-400 animate-bounce">{score} points</p>
          <div className="mt-8">
            <Button 
              variant="default" 
              size="lg" 
              onClick={() => router.push('/dashboard')}
              className="w-full bg-purple-600 hover:bg-purple-700 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Back to Menu
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-4xl bg-purple-800/30 backdrop-blur-sm pt-6 px-8 pb-8 rounded-2xl border border-purple-400/20 shadow-lg shadow-purple-500/20 relative">
        <div className="absolute top-4 right-4">
          <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-purple-200 hover:text-white">
                <X className="w-6 h-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-purple-800/30 backdrop-blur-sm border-purple-400/20 text-white">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <span>🎬</span> Exit Game <span>🎮</span>
              </DialogTitle>
              <p className="text-purple-200 mb-6">Are you sure you want to exit? Your game progress will be lost.</p>
              <div className="flex justify-center gap-4">
                <Button variant="secondary" onClick={() => setShowExitDialog(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleExitConfirm}>Back to Menu</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6 relative h-4 w-full bg-purple-900/50 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full transition-all duration-500 ease-linear ${getProgressColor()}`}
            style={{ width: `${(timeLeft / 30) * 100}%` }}
          />
        </div>

        <h2 className="text-center text-2xl font-bold mb-2 text-white tracking-wide flex items-center justify-center gap-2">
          <span className="animate-pulse">🎬</span>
          Question {questionIndex}/5
          <span className="animate-pulse">🎮</span>
        </h2>
        <p className="text-center text-lg text-purple-200 mb-6">
          {question.source === 'film' ? '🎬 Movie Question' : '🎮 Game Question'}
        </p>

        {question.media?.image && (
          <div className="relative flex justify-center items-center mb-6 h-96">
            <NextImage 
              src={question.media.image} 
              alt="scene" 
              layout="fill" 
              objectFit="contain"
              className="rounded-lg border border-purple-400/20 shadow-lg shadow-purple-500/20" 
            />
          </div>
        )}
        
        {question.media?.voice_record && (
          <div className="flex justify-center items-center mb-6">
            <audio
              key={question.media.voice_record}
              controls
              className="w-full max-w-md"
              autoPlay={false}
            >
              <source src={question.media.voice_record} type="audio/mp3" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        <p className="text-center mb-8 text-xl font-medium text-white">{question.questionText}</p>

        <div className="grid grid-cols-2 gap-4">
          {question.options.map((opt: string, idx: number) => {
            const isCorrect = opt === question.correctAnswer
            const isSelected = selectedOption === opt

            let color = "bg-purple-700/50 hover:bg-purple-600/50 text-white"
            if (selectedOption || timeLeft <= 0) {
              color = isCorrect ? "bg-green-600 text-white"
                : isSelected ? "bg-red-600 text-white"
                  : "bg-purple-900/50 text-purple-300"
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(opt)}
                className={`py-4 px-6 rounded-xl text-center text-lg font-semibold w-full h-full ${color} transition-all duration-200 hover:scale-105 active:scale-95`}
                disabled={!!selectedOption || timeLeft <= 0}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {(showNext || timeLeft <= 0) && (
          <div className="mt-8 text-center">
            <Button 
              variant="default" 
              size="lg" 
              onClick={handleNext}
              className="w-full bg-purple-600 hover:bg-purple-700 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Next Question
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
