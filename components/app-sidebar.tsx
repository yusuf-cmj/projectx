"use client"

import * as React from "react"
import Link from "next/link";
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
import { usePathname } from "next/navigation"

export function AppSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname();

  const userData = {
    name: session?.user?.name || "Guest",
    email: session?.user?.email || "",
    avatar: session?.user?.image || ""
  }

  const menuItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, tooltip: "Dashboard" },
    { href: "/admin/create", label: "Create Question", icon: PlusCircle, tooltip: "Create Question" },
    { href: "/admin/edit", label: "Edit Question", icon: FilePenLine, tooltip: "Edit Question" },
    { href: "/admin/requests", label: "Requests", icon: MailWarning, tooltip: "Requests" },
    { href: "/admin/manage-users", label: "Manage Users", icon: Users, tooltip: "Manage Users" },
  ];

  return (
    <Sidebar collapsible="icon" className="bg-gray-900">
      <SidebarHeader className="bg-gray-900">
        <div className=" center overflow-hidden ">

          <NavUser user={userData} />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gray-900 px-2 py-4">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname ? (
                  pathname === item.href ||
                  (item.href === '/admin' && pathname === '/admin') ||
                  (item.href !== '/admin' && pathname.startsWith(item.href))
                ) : false}
                tooltip={item.tooltip}
                className="text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <Link href={item.href}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="bg-gray-900 px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname ? pathname === '/home' : false}
              tooltip="Home"
              className="text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Link href="/home">
                <Home className="w-5 h-5" />
                <span>Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {/* <SidebarRail className="bg-gray-800 hover:after:bg-gray-700 "/> */}
    </Sidebar>
  )
}