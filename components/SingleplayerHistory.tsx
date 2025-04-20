"use client"
import { useEffect, useState } from "react"

type GameHistoryItem = {
  id: number
  score: number
  playedAt: string
}

export default function SingleplayerHistory() {
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
      setHistory(data)
      setLoading(false)
    }

    fetchHistory()
  }, [])

  if (loading) return <p className="text-center mt-8">Loading...</p>
  if (history.length === 0) return <p className="text-center mt-8">No games played yet.</p>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">🎮 Game History</h2>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="p-2">Date</th>
            <th className="p-2">Game</th>
            <th className="p-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="p-2">{new Date(item.playedAt).toLocaleString()}</td>
              <td className="p-2">Singleplayer Mode</td>
              <td className="p-2">{item.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
