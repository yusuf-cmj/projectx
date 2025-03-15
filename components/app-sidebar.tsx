"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Gamepad,
  Quote,
  Edit,
  Image,
  User,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();

  const userData = {
    name: session?.user?.name || "Guest",
    email: session?.user?.email || "",
    avatar: session?.user?.image || ""
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavUser user={userData} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
