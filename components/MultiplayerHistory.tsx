'use client'
import { useEffect, useState } from "react"

type GameHistoryItem = {
  id: number
  score: number
  playedAt: string
  mode: string
}

export default function MultiplayerHistory() {
  const [history, setHistory] = useState<GameHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch("/api/game-history")
      if (!res.ok) {
        console.error("Failed to fetch history:", res.status)
        return
      }
      const data = await res.json()

      // 🎯 Sadece Multiplayer modundakileri filtrele
      const multiplayerGames = data.filter((item: GameHistoryItem) => item.mode === "Multiplayer")

      setHistory(multiplayerGames)
      setLoading(false)
    }

    fetchHistory()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-white text-xl animate-pulse">Loading...</div>
    </div>
  )

  if (history.length === 0) return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-purple-800/30 backdrop-blur-sm p-8 rounded-2xl border border-purple-400/20 shadow-lg shadow-purple-500/20 text-center">
        <p className="text-white text-xl">No multiplayer games played yet.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-purple-800/30 backdrop-blur-sm p-6 rounded-2xl border border-purple-400/20 shadow-lg shadow-purple-500/20">
          <h2 className="text-2xl font-bold mb-6 text-white tracking-wide flex items-center gap-2">
            <span className="animate-bounce">🎮</span> Multiplayer Game History
          </h2>
          <div className="overflow-x-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-purple-400/20">
                  <th className="p-3 text-purple-200 font-semibold">Date</th>
                  <th className="p-3 text-purple-200 font-semibold">Game</th>
                  <th className="p-3 text-purple-200 font-semibold">Score</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const badgeStyle = item.score >= 100
                    ? 'bg-green-600/30 text-green-400'
                    : item.score >= 50
                    ? 'bg-yellow-600/30 text-yellow-400'
                    : 'bg-red-600/30 text-red-400'

                  return (
                    <tr key={item.id} className="border-b border-purple-400/10 hover:bg-purple-700/20 transition-colors">
                      <td className="p-3 text-white">{new Date(item.playedAt).toLocaleString()}</td>
                      <td className="p-3 text-white">Multiplayer Mode</td>
                      <td className="p-3 flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badgeStyle}`}>{item.score}</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badgeStyle}`}>points</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
