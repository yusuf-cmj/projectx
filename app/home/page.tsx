"use client"

import { useSession } from "next-auth/react"
import { NavUser } from "@/components/nav-user"
import HomeTabs from "@/components/game-modes/home-tabs"
import { useState } from "react"

export default function Page() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)

  // Session statusu değiştiğinde loading durumunu güncelle
  if (status !== "loading" && loading) {
    setLoading(false)
  }

  // Loading durumunda göster
  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 to-indigo-900">
        <div className="bg-purple-800/30 backdrop-blur-sm p-8 rounded-2xl border border-purple-400/20 shadow-lg text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-white text-xl animate-pulse flex items-center gap-2">
              <div className="h-6 w-6 animate-spin border-2 border-gray-400 border-t-white rounded-full" />
              Loading...
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Session yoksa veya user yoksa (middleware tarafından korunuyor olsa da ek kontrol)
  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 to-indigo-900">
        <div className="bg-purple-800/30 backdrop-blur-sm p-8 rounded-2xl border border-purple-400/20 shadow-lg text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-white text-xl">
              Session not available
            </div>
          </div>
        </div>
      </div>
    )
  }

  const userData = {
    name: session.user.name || "Guest",
    email: session.user.email || "",
    avatar: session.user.image || ""
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-purple-900 to-indigo-900">
      {/* Header */}
      <header className="flex h-20 items-center justify-between border-b border-purple-400/20 px-6 bg-purple-800/30 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-white tracking-wide animate-pulse">
          RepliQuote<span className="text-yellow-400">&quot;</span>
        </h1>
        <NavUser user={userData} />
      </header>

      {/* Ana içerik alanı - Dikey olarak ortalanmış */}
      <main className="flex flex-1 justify-center items-center p-4">
        <div className="w-full max-w-4xl">
          <div className="bg-purple-800/30 backdrop-blur-sm rounded-2xl border border-purple-400/20 p-8 py-20 shadow-lg shadow-purple-500/20">
            <HomeTabs />
          </div>
        </div>
      </main>
    </div>
  )
}
