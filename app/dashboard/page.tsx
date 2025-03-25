"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SingleplayerContent } from "@/components/game-modes/singleplayer-content"
import { MultiplayerContent } from "@/components/game-modes/multiplayer-content"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
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

  return (
    <SidebarProvider>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">
                  Quote Game
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{activeCategory || "Select Category"}</BreadcrumbPage>
              </BreadcrumbItem>
              {activeMode && (
                <>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{activeMode}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <SidebarTrigger className="-mr-1 ml-auto rotate-180" />
        </header>
        <div className="flex-1">
          {activeCategory === "Singleplayer" && (
            <SingleplayerContent activeMode={activeMode} />
          )}
          {activeCategory === "Multiplayer" && (
            <MultiplayerContent activeMode={activeMode} />
          )}
        </div>
      </SidebarInset>
      <AppSidebar side="right" className="right" onModeSelect={handleModeSelect} />
    </SidebarProvider>
  )
}
