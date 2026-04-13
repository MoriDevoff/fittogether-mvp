"use client"
import Link from "next/link"
import { Dumbbell, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(Boolean(data.session))
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session))
    })

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
  }

  return (
    <motion.header
      initial={{ y: -20 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-xl"
    >
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
          <Dumbbell className="h-8 w-8" />
          FitTogether
        </Link>

        {isLoggedIn ? (
          <nav className="flex items-center gap-8 text-sm font-medium">
            <Link href="/search" className="hover:text-primary transition-colors">Поиск</Link>
            <Link href="/workouts" className="hover:text-primary transition-colors">Мои тренировки</Link>
            <Link href="/progress" className="hover:text-primary transition-colors">Прогресс</Link>
            <Link href="/chat" className="hover:text-primary transition-colors">Чат</Link>
            <Link href="/profile" className="hover:text-primary transition-colors">Профиль</Link>
          </nav>
        ) : (
          <nav className="flex items-center gap-8 text-sm font-medium">
            <Link href="/auth" className="hover:text-primary transition-colors">Вход</Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/search">Найти партнёра</Link>
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleSignOut}>
                <User className="mr-2 h-4 w-4" />
                Выйти
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link href="/auth">Регистрация / Вход</Link>
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  )
}