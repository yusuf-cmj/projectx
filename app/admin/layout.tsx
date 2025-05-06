'use client';

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarProvider, // Keep SidebarProvider if AppSidebar or SidebarInset depends on its context
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

// Helper function to get page title from pathname
function getPageTitle(pathname: string): string {
  if (pathname === '/admin') return 'Dashboard';
  if (pathname.startsWith('/admin/manage-users')) return 'Manage Users';
  if (pathname.startsWith('/admin/create')) return 'Create Question';
  if (pathname.startsWith('/admin/edit')) return 'Edit Question';
  if (pathname.startsWith('/admin/requests')) return 'Requests';
  return 'Admin'; // Fallback
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname ?? '');

  return (
    <SidebarProvider> {/* SidebarProvider wraps everything if its context is needed by AppSidebar or children */}
      <div className="flex min-h-screen w-full bg-gray-950">
        <AppSidebar />
        <SidebarInset> {/* This will be the main content area next to the sidebar */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-800 bg-gray-900 px-4 md:sticky md:top-0 md:z-10">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6 bg-gray-800" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild className="text-gray-300 hover:text-white">
                    <Link href="/admin">Admin Panel</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block text-gray-800" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-gray-400">
                    {pageTitle}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <main className="flex-1 overflow-auto">
            {/* children will be the specific page content e.g. Dashboard, ManageUsersPage */}
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
