"use client"

import { motion } from "framer-motion"
import { Users, Trophy, TrendingUp } from "lucide-react"

const benefits = [
  { icon: Users, title: "Умный подбор", desc: "По уровню, целям и расписанию" },
  { icon: Trophy, title: "Trust Score", desc: "Рейтинг надёжности партнёров" },
  { icon: TrendingUp, title: "Прогресс вместе", desc: "Сравнение результатов в реальном времени" },
]

export function BenefitsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <b.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">{b.title}</h3>
              <p className="text-muted-foreground">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}