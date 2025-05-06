'use client'

import { MailWarning } from "lucide-react"
import { useSession } from "next-auth/react"

export default function RequestsPage() {
  const { data: session } = useSession()

  if (session?.user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-lg text-center">
          <div className="flex flex-col items-center gap-4">
            <MailWarning className="h-12 w-12 text-red-400" />
            <h2 className="text-xl font-semibold text-white">Access Denied</h2>
            <p className="text-gray-300">You do not have permission to view this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-white tracking-wide flex items-center gap-2">
            <MailWarning className="w-6 h-6" />
            Requests
          </h1>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-gray-400 text-lg">
              Feature coming soon...
            </div>
            <p className="text-gray-500 mt-2 text-sm">
              This feature is under development.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}