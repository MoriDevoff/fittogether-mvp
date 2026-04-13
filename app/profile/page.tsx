"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase"

type MyProfile = {
  id: string
  name: string | null
  age: number | null
  city: string | null
  bio: string | null
  fitness_level: string | null
  fitness_goals: string | null
  trust_score: number | null
  total_workouts: number | null
}

export default function MyProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("")

  const isProfileIncomplete = useMemo(() => {
    if (!profile) return true
    return !(profile.name && profile.city && profile.fitness_goals && profile.bio)
  }, [profile])

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.replace("/auth")
        return
      }

      const { data, error } = await supabase.from("profiles").select("*").eq("id", authData.user.id).maybeSingle()
      if (error) {
        setStatus(`Ошибка загрузки профиля: ${error.message}`)
      }
      setProfile(data as MyProfile | null)
      setLoading(false)
    }
    void load()
  }, [router])

  if (loading) {
    return <div className="max-w-4xl mx-auto px-6 py-10">Загрузка профиля...</div>
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Мой профиль</h1>
        <p className="text-muted-foreground mb-8">Профиль не найден</p>
        {status && <p className="text-sm text-destructive">{status}</p>}
        <Button asChild>
          <Link href="/profile/edit">Создать / настроить профиль</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">Мой профиль</h1>
          <p className="text-muted-foreground mt-1">ID пользователя для приглашений: <span className="font-mono">{profile.id}</span></p>
          {isProfileIncomplete && (
            <p className="text-sm text-amber-600 mt-2">
              Профиль заполнен не полностью — лучше добавить город, цели и описание.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/profile/edit">Редактировать</Link>
          </Button>
        </div>
      </div>

      {status && <p className="text-sm text-destructive">{status}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-2">
          <p className="text-sm text-muted-foreground">Имя</p>
          <p className="text-xl font-semibold">{profile.name ?? "Не указано"}</p>
          <p className="text-sm text-muted-foreground mt-3">Возраст</p>
          <p className="text-xl font-semibold">{profile.age ?? "—"}</p>
          <p className="text-sm text-muted-foreground mt-3">Город</p>
          <p className="text-xl font-semibold">{profile.city ?? "Не указано"}</p>
        </Card>

        <Card className="p-6 space-y-2">
          <p className="text-sm text-muted-foreground">Trust Score</p>
          <p className="text-xl font-semibold">{profile.trust_score ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-3">Всего завершённых тренировок</p>
          <p className="text-xl font-semibold">{profile.total_workouts ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-3">Уровень</p>
          <p className="text-xl font-semibold">{profile.fitness_level ?? "Не указан"}</p>
        </Card>
      </div>

      <Card className="p-6 space-y-2">
        <p className="text-sm text-muted-foreground">Фитнес-цели</p>
        <p className="text-lg">{profile.fitness_goals ?? "Не указаны"}</p>
        <p className="text-sm text-muted-foreground mt-4">О себе</p>
        <p className="text-lg whitespace-pre-wrap">{profile.bio ?? "Не заполнено"}</p>
      </Card>
    </div>
  )
}

