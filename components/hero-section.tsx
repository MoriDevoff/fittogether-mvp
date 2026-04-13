"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Dumbbell } from "lucide-react"

export function HeroSection() {
  return (
    <section className="pt-20 pb-16 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-3xl bg-white px-6 py-2 shadow-md mb-6">
            <Dumbbell className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">MVP готов к запуску</span>
          </div>

          <h1 className="text-6xl font-bold tracking-tighter leading-none mb-6">
            Тренируйся <span className="text-primary">вместе</span>.<br />
            Мотивируйся <span className="text-primary">вместе</span>.
          </h1>

          <p className="text-xl text-muted-foreground max-w-lg mx-auto mb-10">
            Найди идеального партнёра по тренировкам. Trust Score, чат и совместный прогресс.
          </p>

          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/search">Найти партнёра прямо сейчас</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/progress">Мой прогресс</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}