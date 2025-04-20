"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"

/**
 * Giriş Formu Bileşeni
 * 
 * Kullanıcıların email ve şifreleriyle kimlik doğrulaması yapmalarını sağlar.
 * NextAuth.js entegrasyonu ile MySQL'de kimlik doğrulama yapar.
 */
export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  /**
   * Form gönderildiğinde çalışan işleyici
   * Kullanıcının kimlik bilgilerini doğrular ve giriş yapar
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setError("")
      setLoading(true)
      
      // NextAuth.js ile giriş
      const success = await signIn(email, password)
      
      if (success) {
        router.push("/dashboard")
      } else {
        setError("Failed to login. Please check your credentials.")
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      setError("Failed to login. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-purple-800/30 backdrop-blur-sm border-purple-400/20 shadow-lg shadow-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white">Login to your account</CardTitle>
          <CardDescription className="text-purple-200">
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 text-sm text-red-400">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="bg-purple-700/50 border-purple-400/20 text-white placeholder:text-purple-300"
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="ml-auto inline-block text-sm text-purple-200 underline-offset-4 hover:text-white hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-purple-700/50 border-purple-400/20 text-white"
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700 transition-all duration-200 hover:scale-105 active:scale-95"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-purple-200">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-white hover:text-purple-200 underline underline-offset-4">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}