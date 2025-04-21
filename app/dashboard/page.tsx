"use client"

import { useSession } from "next-auth/react"
import { NavUser } from "@/components/nav-user"
import HomeTabs from "@/components/game-modes/home-tabs"

export default function Page() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <p>Loading...</p>
  }
  if (!session) {
    return <p>Access Denied</p>
  }

  const userData = {
    name: session?.user?.name || "Guest",
    email: session?.user?.email || "",
    avatar: session?.user?.image || ""
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
