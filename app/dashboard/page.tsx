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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-4">
        <h1 className="text-xl font-bold">RepliQuote"</h1>
        <NavUser user={userData} />
      </header>

      {/* Ana içerik alanı */}
      <main className="flex flex-1 items-center justify-center">
        <HomeTabs /> {/* 💡 onPlay kaldırıldı, yönlendirme içeride yapılacak */}
      </main>
    </div>
  )
}
