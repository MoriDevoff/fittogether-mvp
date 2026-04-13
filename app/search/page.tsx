"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SearchFilters } from "@/components/search-filters"
import { PartnerList } from "@/components/partner-list"
import { getSupabaseBrowserClient } from "@/lib/supabase"

type Partner = {
  id: string
  name: string | null
  city: string | null
  fitness_level: string | null
  fitness_goals: string | null
  trust_score: number | null
}

export default function SearchPage() {
  const router = useRouter()
  const [partners, setPartners] = useState<Partner[]>([])

  useEffect(() => {
    const loadPartners = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        router.replace("/auth")
        return
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, name, city, fitness_level, fitness_goals, trust_score")
        .neq("id", authData.user.id)
        .order("created_at", { ascending: false })

      setPartners((data ?? []) as Partner[])
    }

    loadPartners()
  }, [router])

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-2">Поиск партнёров</h1>
      <p className="text-muted-foreground mb-10">Найди человека, который будет ждать тебя на тренировке</p>
      
      <div className="grid lg:grid-cols-[280px_1fr] gap-10">
        <SearchFilters />
        <PartnerList partners={partners} />
      </div>
    </div>
  )
}