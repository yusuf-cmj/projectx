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
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useState } from "react"
import { CreateQuestionForm } from "./create/create-question-form"
import { EditQuestionForm } from "./edit/edit-question-form"
import ManageUsersPage from "./manage-users/page"

export default function AdminDashboard() {
  const [activePage, setActivePage] = useState('dashboard')

  return (
    <SidebarProvider>
      <AppSidebar onPageChange={setActivePage} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-purple-400/20 bg-purple-900/40 px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/admin">Admin Panel</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {activePage === 'dashboard' && 'Dashboard'}
                  {activePage === 'create' && 'Create Question'}
                  {activePage === 'edit' && 'Edit Question'}
                  {activePage === 'requests' && 'Requests'}
                  {activePage === 'manage-users' && 'Manage Users'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-6 text-black">
          {activePage === 'dashboard' ? (
            <>
              <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                <div className="aspect-video rounded-xl bg-purple-800/30 shadow-md" />
                <div className="aspect-video rounded-xl bg-purple-800/30 shadow-md" />
                <div className="aspect-video rounded-xl bg-purple-800/30 shadow-md" />
              </div>
              <div className="min-h-[100vh] flex-1 rounded-xl bg-purple-800/30 shadow-md" />
            </>
          ) : activePage === 'create' ? (
            <CreateQuestionForm />
          ) : activePage === 'edit' ? (
            <EditQuestionForm />
          ) : activePage === 'manage-users' ? (
            <ManageUsersPage />
          ) : activePage === 'requests' ? (
             <div className="flex-1 rounded-xl bg-purple-800/30 shadow-md p-6">
                 <h2 className="text-xl font-semibold text-white">Requests Page (Placeholder)</h2>
                 {/* Add content for requests page here later */}
            </div>
          ) : (
            <div>Unknown page selected</div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
