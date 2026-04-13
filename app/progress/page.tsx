"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase"

type Stats = { total: number; week: number; rate: string }

export default function ProgressPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ total: 0, week: 0, rate: "0%" })

  useEffect(() => {
    const loadStats = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        router.replace("/auth")
        return
      }

      const { data: workouts } = await supabase
        .from("workouts")
        .select("scheduled_time, status")
        .eq("user_id", authData.user.id)

      const total = workouts?.length ?? 0
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const week = (workouts ?? []).filter((w) => new Date(w.scheduled_time) >= weekAgo).length
      const completed = (workouts ?? []).filter((w) => w.status === "completed").length
      const rate = total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%"

      setStats({ total, week, rate })
    }

    loadStats()
  }, [router])

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-10">Мой прогресс</h1>

      <div className="grid grid-cols-3 gap-6 mb-12">
        <Card className="p-6 text-center">
          <p className="text-5xl font-bold text-primary">{stats.total}</p>
          <p className="text-sm text-muted-foreground mt-2">Всего тренировок</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-5xl font-bold text-primary">{stats.week}</p>
          <p className="text-sm text-muted-foreground mt-2">На этой неделе</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-5xl font-bold text-primary">{stats.rate}</p>
          <p className="text-sm text-muted-foreground mt-2">Выполнено</p>
        </Card>
      </div>

      <Button size="lg" asChild>
        <Link href="/workouts">Добавить тренировку вручную</Link>
      </Button>
    </div>
  )
}