"use client"
import Link from "next/link"
import { motion } from "framer-motion"
import { Star, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

type Partner = {
  id: string
  name: string | null
  city: string | null
  fitness_level: string | null
  fitness_goals: string | null
  trust_score: number | null
}

export function PartnerList({ partners }: { partners: Partner[] }) {
  return (
    <div className="space-y-6">
      {partners.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="group rounded-3xl border border-border hover:border-primary bg-white p-6 flex gap-6 items-center transition-all hover:shadow-2xl"
        >
          <div className="text-5xl">🏋️</div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-semibold">{p.name ?? "Пользователь"}</h3>
                <p className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {p.city ?? "Город не указан"} • {p.fitness_level ?? "Уровень не указан"}
                </p>
              </div>
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="h-6 w-6 fill-current" />
                {p.trust_score ?? 0}
              </div>
            </div>
            <p className="mt-3 text-muted-foreground">{p.fitness_goals ?? "Цели пока не заполнены"}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild>
              <Link href={`/profile/${p.id}`}>Профиль</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/invite/${p.id}`}>Пригласить</Link>
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}