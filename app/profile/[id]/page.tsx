"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase"

type PartnerProfile = {
  id: string
  name: string | null
  age: number | null
  city: string | null
  trust_score: number | null
  bio: string | null
  fitness_level: string | null
  fitness_goals: string | null
  available_time: string[] | null
}

export default function PartnerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<PartnerProfile | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.replace("/auth")
        return
      }

      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle()
      setProfile(data as PartnerProfile | null)
    }

    loadProfile()
  }, [id, router])

  if (!profile) {
    return <div className="max-w-4xl mx-auto px-6 py-10">Загрузка профиля...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex gap-8">
        <div className="flex-1">
          <h1 className="text-4xl font-bold">{profile.name ?? "Пользователь"}</h1>
          <p className="text-muted-foreground">{profile.age ?? "?"} лет • {profile.city ?? "Город не указан"}</p>
          
          <div className="mt-6 flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Star className="h-8 w-8 text-amber-500 fill-current" />
              <span className="text-4xl font-bold">{profile.trust_score ?? 0}</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trust Score</p>
            </div>
          </div>

          <p className="mt-8 text-lg leading-relaxed">{profile.bio ?? "Пользователь пока не заполнил описание."}</p>

          <div className="mt-12 grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-medium mb-3">Информация о тренировках</h3>
              <dl className="space-y-4">
                <div><dt className="text-sm text-muted-foreground">Уровень</dt><dd>{profile.fitness_level ?? "Не указан"}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Цели</dt><dd>{profile.fitness_goals ?? "Не указаны"}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Время</dt><dd>{profile.available_time?.join(", ") ?? "Не указано"}</dd></div>
              </dl>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Button size="lg" asChild>
            <Link href={`/invite/${id}`}>Пригласить на тренировку</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href={`/chat/${id}`}>Открыть чат</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}