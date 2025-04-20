'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { X } from 'lucide-react'

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

  const handleExitConfirm = () => {
    setShowExitDialog(false)
    router.push('/dashboard')
  }

  if (!question) return <div className="text-center mt-20">Loading...</div>

  const getProgressColor = () => {
    if (timeLeft > 20) return 'bg-green-500'
    if (timeLeft > 10) return 'bg-yellow-400'
    if (timeLeft > 5) return 'bg-orange-500'
    return 'bg-red-600'
  }

  if (showResult) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-lg w-full mt-6">
          <h2 className="text-2xl font-bold mb-4">Quiz Bitti 🎉</h2>
          <p className="text-lg mb-2">Toplam Skorun:</p>
          <p className="text-4xl font-bold text-green-600">{score} puan</p>
          <div className="mt-6">
            <Button onClick={() => router.push('/dashboard')}>Menüye Dön</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center px-4">
      <div className="w-full max-w-4xl bg-white pt-4 px-6 pb-6 rounded-xl shadow-md mt-10 relative">
        {/* Çıkış butonu ve dialog */}
        <div className="absolute top-4 right-4">
          <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <X className="w-6 h-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="text-center">
              <DialogTitle>Oyundan Çık</DialogTitle>
              <p className="text-sm text-muted-foreground mb-6">Çıkmak istediğinize emin misiniz? Oyun verileri kaybolacak.</p>
              <div className="flex justify-center gap-4">
                <Button variant="secondary" onClick={() => setShowExitDialog(false)}>İptal</Button>
                <Button variant="destructive" onClick={handleExitConfirm}>Menüye Dön</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-4 relative h-3 w-full bg-neutral-300 rounded overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full transition-all duration-500 ease-linear ${getProgressColor()}`}
            style={{ width: `${(timeLeft / 30) * 100}%` }}
          />
        </div>

        <h2 className="text-center text-xl font-bold mb-4">Question {questionIndex}/5</h2>

        {question.media?.image && (
          <img src={question.media.image} alt="scene" className="w-full h-64 object-contain rounded mb-4" />
        )}
        {question.media?.voice_record && (
          <audio controls className="w-full mb-4">
            <source src={question.media.voice_record} type="audio/mp3" />
            Tarayıcınız bu ses öğesini desteklemiyor.
          </audio>
        )}

        <p className="text-center mb-6 font-medium">{question.questionText}</p>

        <div className="grid grid-cols-2 gap-4">
          {question.options.map((opt: string, idx: number) => {
            const isCorrect = opt === question.correctAnswer
            const isSelected = selectedOption === opt

            let color = "bg-muted hover:bg-primary/10"
            if (selectedOption || timeLeft <= 0) {
              color = isCorrect ? "bg-green-500 text-white"
                : isSelected ? "bg-red-500 text-white"
                : "bg-gray-200 text-gray-500"
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(opt)}
                className={`py-4 px-6 rounded-lg text-center text-sm font-semibold w-full h-full ${color}`}
                disabled={!!selectedOption || timeLeft <= 0}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {(showNext || timeLeft <= 0) && (
          <div className="mt-6 text-center">
            <Button onClick={handleNext}>Next Question</Button>
          </div>
        )}
      </div>
    </div>
  )
}
