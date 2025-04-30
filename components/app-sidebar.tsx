"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import {
  LayoutDashboard,
  PlusCircle,
  FilePenLine,
  MailWarning,
} from "lucide-react"
import { useSession } from "next-auth/react"

interface AppSidebarProps {
  onPageChange: (page: string) => void
}

export function AppSidebar({ onPageChange }: AppSidebarProps) {
  const { data: session } = useSession()

  const userData = {
    name: session?.user?.name || "Guest",
    email: session?.user?.email || "",
    avatar: session?.user?.image || ""
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <NavUser user={userData} />
      </SidebarHeader>
      <SidebarContent>
        <div className="flex flex-col gap-1 px-2 py-4">
          <button
            onClick={() => onPageChange('dashboard')}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-black hover:bg-purple-600/30 transition"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="hidden md:inline">Dashboard</span>
          </button>
          <button
            onClick={() => onPageChange('create')}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-black hover:bg-purple-600/30 transition"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="hidden md:inline">Create Question</span>
          </button>
          <button
            onClick={() => onPageChange('edit')}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-black hover:bg-purple-600/30 transition"
          >
            <FilePenLine className="w-5 h-5" />
            <span className="hidden md:inline">Edit Question</span>
          </button>
          <button
            onClick={() => onPageChange('requests')}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-black hover:bg-purple-600/30 transition"
          >
            <MailWarning className="w-5 h-5" />
            <span className="hidden md:inline">Requests</span>
          </button>
        </div>
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
