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
import { RegisterError } from "@/contexts/AuthContext"

/**
 * Kayıt Formu Bileşeni
 * 
 * Yeni kullanıcıların sisteme kaydolmasını sağlar.
 * NextAuth.js ve MySQL veritabanı entegrasyonu ile çalışır.
 */
export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [generalError, setGeneralError] = useState("")
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  /**
   * Form gönderildiğinde çalışan işleyici
   * Kullanıcı bilgilerini doğrular ve kayıt işlemini gerçekleştirir
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setGeneralError("")
    setNameError("")
    setEmailError("")
    setPasswordError("")

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      setLoading(true)
      
      // NextAuth.js ile kayıt ve otomatik giriş
      const success = await signUp(name, email, password)
      
      if (success) {
        router.push('/home')
      } 

    } catch (error: unknown) {
      console.error("Registration error caught in form:", error)
      
      if (error instanceof RegisterError) {
        setGeneralError(error.message || "Please check the form.");
        setNameError(error.details.fieldErrors?.name?.join(", ") || "");
        setEmailError(error.details.fieldErrors?.email?.join(", ") || "");
        setPasswordError(error.details.fieldErrors?.password?.join(", ") || "");
      } else if (error instanceof Error) {
        setGeneralError(error.message || "Failed to create account.");
      } else {
        setGeneralError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-purple-800/30 backdrop-blur-sm border-purple-400/20 shadow-lg shadow-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white">Create an account</CardTitle>
          <CardDescription className="text-purple-200">
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generalError && (
            <div className="mb-4 text-sm text-red-400 bg-red-900/30 p-3 rounded-md border border-red-400/50">
              {generalError}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-1">
                <Label htmlFor="name" className="text-white">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className={cn(
                    "bg-purple-700/50 border-purple-400/20 text-white placeholder:text-purple-300",
                    nameError && "border-red-500 focus-visible:ring-red-500"
                  )}
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? "name-error" : undefined}
                />
                {nameError && <p id="name-error" className="text-xs text-red-400 mt-1">{nameError}</p>}
              </div>
              <div className="grid gap-1">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className={cn(
                    "bg-purple-700/50 border-purple-400/20 text-white placeholder:text-purple-300",
                    emailError && "border-red-500 focus-visible:ring-red-500"
                  )}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                />
                {emailError && <p id="email-error" className="text-xs text-red-400 mt-1">{emailError}</p>}
              </div>
              <div className="grid gap-1">
                <Label htmlFor="password" className="text-white">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className={cn(
                    "bg-purple-700/50 border-purple-400/20 text-white",
                    passwordError && "border-red-500 focus-visible:ring-red-500"
                  )}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? "password-error" : undefined}
                />
                {passwordError && <p id="password-error" className="text-xs text-red-400 mt-1">{passwordError}</p>}
              </div>
              <div className="grid gap-1">
                <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className={cn(
                    "bg-purple-700/50 border-purple-400/20 text-white",
                    passwordError && "border-red-500 focus-visible:ring-red-500"
                  )}
                  aria-invalid={!!passwordError}
                />
              </div>
              <div className="flex flex-col gap-3 mt-2">
                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700 transition-all duration-200 hover:scale-105 active:scale-95"
                  disabled={loading}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-purple-200">
              Already have an account?{" "}
              <Link href="/login" className="text-white hover:text-purple-200 underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}