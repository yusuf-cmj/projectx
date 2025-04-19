"use client"


import { SingleplayerContent } from "@/components/game-modes/singleplayer-content"
import { MultiplayerContent } from "@/components/game-modes/multiplayer-content"
import { NavUser } from "@/components/nav-user"
import HomeTabs from "@/components/game-modes/home-tabs"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

import { useSession } from "next-auth/react"
import { useState } from "react"

export default function Page() {
  const { data: session, status } = useSession()
  const [activeMode, setActiveMode] = useState<string>("")
  const [activeCategory, setActiveCategory] = useState<string>("")

  const handleModeSelect = (mode: string, category: string) => {
    setActiveMode(mode)
    setActiveCategory(category)
  }

  if(status === "loading"){
    return <p>Loading...</p>
  }
  if(!session) {
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
  
      {/* Ana içerik alanı - şimdilik sadece yazı */}
      <main className="flex flex-1 items-center justify-center">
          <HomeTabs />
      </main>
    </div>
  )
  
}
