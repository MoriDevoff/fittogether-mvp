"use client"
import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export default function ProfileEditPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    age: 0,
    city: "",
    bio: "",
    fitness_goals: "",
    fitness_level: "beginner" as "beginner" | "intermediate" | "advanced",
  })

  useEffect(() => {
    const bootstrap = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        router.replace("/auth")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, age, city, bio, fitness_goals, fitness_level")
        .eq("id", authData.user.id)
        .maybeSingle()

      if (profile) {
        setFormData({
          name: profile.name ?? "",
          age: profile.age ?? 0,
          city: profile.city ?? "",
          bio: profile.bio ?? "",
          fitness_goals: profile.fitness_goals ?? "",
          fitness_level: (profile.fitness_level ?? "beginner") as "beginner" | "intermediate" | "advanced",
        })
      }
      setLoading(false)
    }

    bootstrap()
  }, [router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage("")
    const supabase = getSupabaseBrowserClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) {
      router.replace("/auth")
      return
    }

    const { error } = await supabase.from("profiles").update(formData).eq("id", authData.user.id)

    if (error) {
      setMessage(`Ошибка сохранения: ${error.message}`)
    } else {
      try {
        if (!authData.user.email) {
          throw new Error("Email пользователя не найден")
        }

        const hubspotResponse = await fetch("/api/hubspot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authData.user.email,
            name: formData.name,
            city: formData.city,
            fitness_goals: formData.fitness_goals,
            fitness_level: formData.fitness_level,
            lifecycleStage: "lead",
          }),
        })

        const hubspotResult = await hubspotResponse.json()

        if (!hubspotResponse.ok) {
          throw new Error(hubspotResult.error || "Ошибка HubSpot API")
        }

        setMessage("Профиль успешно сохранен и отправлен в HubSpot")
      } catch (hubspotError) {
        setMessage(`Профиль сохранен, но HubSpot вернул ошибку: ${(hubspotError as Error).message}`)
      }
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-6 py-10">Загрузка профиля...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">Редактирование профиля</h1>
      
      <form className="space-y-8" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label>Имя</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <Label>Возраст</Label>
            <Input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div>
          <Label>Город</Label>
          <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
        </div>

        <div>
          <Label>О себе</Label>
          <Textarea
            rows={4}
            placeholder="Коротко о себе и целях..."
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          />
        </div>
        <div>
          <Label>Фитнес-цели</Label>
          <Input
            value={formData.fitness_goals}
            onChange={(e) => setFormData({ ...formData, fitness_goals: e.target.value })}
            placeholder="Например: похудение, выносливость"
          />
        </div>

        <div>
          <Label>Уровень подготовки</Label>
          <div className="mt-2">
            <select
              className="h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.fitness_level}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fitness_level: e.target.value as "beginner" | "intermediate" | "advanced",
                })
              }
            >
              <option value="beginner">Новичок</option>
              <option value="intermediate">Средний</option>
              <option value="advanced">Продвинутый</option>
            </select>
          </div>
        </div>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить изменения"}
        </Button>
      </form>
    </div>
  )
}