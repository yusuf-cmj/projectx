'use client'

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useState, useEffect } from "react"
import { CreateQuestionForm } from "./create/create-question-form"
import { EditQuestionForm } from "./edit/edit-question-form"
import RequestsPage from "./requests/page"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Film, Gamepad2, ArrowUpRight, UserCog, MailWarning, Loader2, ShieldAlert } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import ManageUsersPage from "./manage-users/page"
import { useRouter } from "next/navigation"

type DashboardStats = {
  totalUsers: number;
  totalFilmQuotes: number;
  totalGameQuotes: number;
  recentActivity: {
    totalGames: number;
    uniquePlayers: number;
    averageScore: number;
    highestScore: number;
  }
}

export default function AdminDashboard() {
  const [activePage, setActivePage] = useState('dashboard')
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalFilmQuotes: 0,
    totalGameQuotes: 0,
    recentActivity: {
      totalGames: 0,
      uniquePlayers: 0,
      averageScore: 0,
      highestScore: 0
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/login")
    }
  }, [status, session, router])

  useEffect(() => {
    async function fetchStats() {
      if (!session) return
      try {
        const response = await fetch('/api/admin/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching stats:', error)
        toast.error('Failed to load dashboard statistics')
      } finally {
        setIsLoading(false)
      }
    }
    if (session?.user?.role === 'admin') {
      fetchStats()
    } else {
      setIsLoading(false)
    }
  }, [session])

  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-lg text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-white text-xl animate-pulse flex items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              Loading dashboard...
            </div>
            <div className="text-gray-400 text-sm">Preparing your admin dashboard</div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "authenticated" && session?.user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-lg text-center">
          <div className="flex flex-col items-center gap-4">
            <ShieldAlert className="h-12 w-12 text-red-400" />
            <h2 className="text-xl font-semibold text-white">Access Denied</h2>
            <p className="text-gray-300">You do not have permission to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppSidebar onPageChange={setActivePage} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-800 bg-gray-900 px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6 bg-gray-800" />
          
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/admin" className="text-gray-300 hover:text-white">Admin Panel</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block text-gray-800" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-gray-400">
                  {activePage === 'dashboard' && 'Dashboard'}
                  {activePage === 'create' && 'Create Question'}
                  {activePage === 'edit' && 'Edit Question'}
                  {activePage === 'manage-users' && 'Manage Users'}
                  {activePage === 'requests' && 'Requests'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-4 p-4 lg:p-6 text-white bg-gray-950 min-h-full">
            {activePage === 'dashboard' ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Card className="bg-gray-900 border-gray-800 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-white">Total Users</CardTitle>
                      <Users className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                      <p className="text-xs text-gray-400">
                        Active accounts in the system
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900 border-gray-800 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-white">Film Quotes</CardTitle>
                      <Film className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{stats.totalFilmQuotes}</div>
                      <p className="text-xs text-gray-400">
                        Total film quotes in database
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900 border-gray-800 shadow-lg sm:col-span-2 lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-white">Game Quotes</CardTitle>
                      <Gamepad2 className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{stats.totalGameQuotes}</div>
                      <p className="text-xs text-gray-400">
                        Total game quotes in database
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                  <Card className="bg-gray-900 border-gray-800 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-white">Recent Activity (24h)</CardTitle>
                      <CardDescription className="text-gray-400">Last 24 hours game statistics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-400">Total Games</div>
                          <div className="text-2xl font-bold text-white">{stats.recentActivity.totalGames}</div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-400">Unique Players</div>
                          <div className="text-2xl font-bold text-white">{stats.recentActivity.uniquePlayers}</div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-400">Average Score</div>
                          <div className="text-2xl font-bold text-white">{stats.recentActivity.averageScore}</div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-400">Highest Score</div>
                          <div className="text-2xl font-bold text-white">{stats.recentActivity.highestScore}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900 border-gray-800 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-white">Quick Actions</CardTitle>
                      <CardDescription className="text-gray-400">Common administrative tasks</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                          onClick={() => setActivePage('create')}
                          className="flex items-center space-x-2 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white border border-gray-700"
                        >
                          <Film className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left">New Quote</span>
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                        </button>
                        <button
                          onClick={() => setActivePage('edit')}
                          className="flex items-center space-x-2 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white border border-gray-700"
                        >
                          <Gamepad2 className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left">Edit Quotes</span>
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                        </button>
                        <button
                          onClick={() => setActivePage('manage-users')}
                          className="flex items-center space-x-2 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white border border-gray-700"
                        >
                          <UserCog className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left">Manage Users</span>
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                        </button>
                        <button
                          onClick={() => setActivePage('requests')}
                          className="flex items-center space-x-2 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white border border-gray-700"
                        >
                          <MailWarning className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left">Requests</span>
                          <ArrowUpRight className="h-4 w-4 shrink-0" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : activePage === 'create' ? (
              <CreateQuestionForm />
            ) : activePage === 'edit' ? (
              <EditQuestionForm />
            ) : activePage === 'manage-users' ? (
              <ManageUsersPage />
            ) : activePage === 'requests' ? (
              <RequestsPage />
            ) : null}
          </div>
        </div>
      </SidebarInset>
    </>
  )
}