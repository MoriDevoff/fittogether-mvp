"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AuthMode = "login" | "register"

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/profile")
      }
    })
  }, [router])

  const routeAfterLogin = async () => {
    const supabase = getSupabaseBrowserClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return router.replace("/auth")

    const { data: profile } = await supabase
      .from("profiles")
      .select("city, bio, fitness_goals")
      .eq("id", authData.user.id)
      .maybeSingle()

    const incomplete = !(profile?.city && profile?.bio && profile?.fitness_goals)
    router.replace(incomplete ? "/profile/edit" : "/search")
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    const supabase = getSupabaseBrowserClient()

    if (mode === "register") {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || "Новый пользователь",
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
      } else {
        // If email confirmation is disabled, Supabase can return a session immediately.
        // Otherwise, ask the user to confirm email and then login.
        if (signUpData.session) {
          await routeAfterLogin()
        } else {
          setSuccess("Регистрация создана. Если включено подтверждение почты — подтвердите email, затем войдите.")
          setMode("login")
        }
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError(signInError.message)
      } else {
        await routeAfterLogin()
      }
    }

    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">{mode === "login" ? "Вход в FitTogether" : "Регистрация"}</h1>
      <p className="text-muted-foreground mb-8">Используем Supabase Auth и таблицу `profiles`</p>

      <div className="flex gap-2 mb-6">
        <Button variant={mode === "login" ? "default" : "outline"} className="flex-1" onClick={() => setMode("login")}>
          Вход
        </Button>
        <Button variant={mode === "register" ? "default" : "outline"} className="flex-1" onClick={() => setMode("register")}>
          Регистрация
        </Button>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {mode === "register" && (
          <div>
            <Label>Имя</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" required />
          </div>
        )}

        <div>
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>

        <div>
          <Label>Пароль</Label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-primary">{success}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
        </Button>
      </form>
    </div>
  )
}
