"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Lock } from "lucide-react"
import { useState } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PasswordChangeModal } from "./password-change-modal"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true)
      await signOut({ redirect: false })
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Failed to log out. Please try again.")
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-3 cursor-pointer bg-purple-700/40 px-3 py-1.5 rounded-full text-white hover:bg-purple-700/60 transition">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-purple-500/30 text-purple-100 font-semibold">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm truncate max-w-[120px]">{user.name}</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 mt-2 rounded-xl border border-purple-400/30 bg-purple-900 text-white backdrop-blur-md shadow-lg"
        >
          <DropdownMenuLabel className="text-purple-200">Account</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-purple-500/20" />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => setIsPasswordModalOpen(true)}
              className="hover:bg-purple-800 focus:bg-purple-700 transition"
            >
              <Lock className="mr-2 h-4 w-4 text-purple-300" />
              <span>Change Password</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-purple-500/20" />
          <DropdownMenuItem
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="hover:bg-purple-800 focus:bg-purple-700 transition"
          >
            <LogOut className="mr-2 h-4 w-4 text-purple-300" />
            <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  )
}
