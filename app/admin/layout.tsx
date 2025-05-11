import { SidebarProvider } from "@/components/ui/sidebar"  // yol doğruysa
import "../globals.css" // eğer global stil gerekiyorsa

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      {children}
    </SidebarProvider>
  )
}
