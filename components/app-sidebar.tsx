"use client"

import * as React from "react"
import {
  Gamepad,
  Quote,
  Edit,
  Image,
  User,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useSession } from "next-auth/react"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Singleplayer",
      url: "#",
      icon: Gamepad,
      isActive: true,
      items: [
        {
          title: "PickAQuote",
          url: "#",
          icon: Quote,
        },
        {
          title: "CompletionQuote",
          url: "#",
          icon: Edit,
        },
        {
          title: "SceneQuote",
          url: "#",
          icon: Image,
        },
        {
          title: "WhoseQuote",
          url: "#",
          icon: User,
        }
      ],
    },
    {
      title: "Multiplayer",
      url: "#",
      icon: Users,
      items: [
        {
          title: "PickAQuote",
          url: "#",
          icon: Quote,
        },
        {
          title: "CompletionQuote",
          url: "#",
          icon: Edit,
        },
        {
          title: "SceneQuote",
          url: "#",
          icon: Image,
        },
        {
          title: "WhoseQuote",
          url: "#",
          icon: User,
        },
      ],
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onModeSelect?: (mode: string, category: string) => void
}

export function AppSidebar({ onModeSelect, ...props }: AppSidebarProps) {
  const { data: session } = useSession()

  const userData = {
    name: session?.user?.name || "Guest",
    email: session?.user?.email || "",
    avatar: session?.user?.image || ""
  }

  const handleModeSelect = (mode: string, category: string) => {
    if (onModeSelect) {
      onModeSelect(mode, category)
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavUser user={userData} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} onModeSelect={handleModeSelect} />
      </SidebarContent>
      <SidebarFooter>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
