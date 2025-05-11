"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  //SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import {
  LayoutDashboard,
  PlusCircle,
  FilePenLine,
  MailWarning,
  Users,
  Home,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface AppSidebarProps {
  onPageChange: (page: string) => void
}

export function AppSidebar({ onPageChange }: AppSidebarProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const userData = {
    name: session?.user?.name || "Guest",
    email: session?.user?.email || "",
    avatar: session?.user?.image || ""
  }

  return (
    <Sidebar collapsible="icon" className="bg-gray-900">
      <SidebarHeader className="bg-gray-900">
        <div className=" center overflow-hidden ">
          
        <NavUser user={userData} />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gray-900 px-2 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onPageChange('dashboard')}
              tooltip="Dashboard"
              className="text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onPageChange('create')}
              tooltip="Create Question"
              className="text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create Question</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onPageChange('edit')}
              tooltip="Edit Question"
              className="text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <FilePenLine className="w-5 h-5" />
              <span>Edit Question</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onPageChange('requests')}
              tooltip="Requests"
              className="text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <MailWarning className="w-5 h-5" />
              <span>Requests</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onPageChange('manage-users')}
              tooltip="Manage Users"
              className="text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Users className="w-5 h-5" />
              <span>Manage Users</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="bg-gray-900 px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => router.push('/home')}
              tooltip="Home"
              className="text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {/* <SidebarRail className="bg-gray-800 hover:after:bg-gray-700 "/> */}
    </Sidebar>
  )
}