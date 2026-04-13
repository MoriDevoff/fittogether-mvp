"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseBrowserClient } from "@/lib/supabase"

type Workout = {
  id: string
  user_id: string
  partner_id: string | null
  scheduled_time: string
  type: string | null
  location: string | null
  status: "planned" | "completed" | "cancelled"
  created_at: string
}

export default function WorkoutsPage() {
  const router = useRouter()
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [statusMessage, setStatusMessage] = useState("")
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    date: "",
    time: "",
    type: "gym",
    location: "",
    partnerId: "",
  })

  const loadWorkouts = async (userId: string) => {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .order("scheduled_time", { ascending: true })

    if (error) {
      setStatusMessage(`Ошибка загрузки тренировок: ${error.message}`)
      return
    }

    setWorkouts((data ?? []) as Workout[])
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    supabase.auth.getUser().then(async ({ data: authData }) => {
      if (!authData.user) {
        router.replace("/auth")
        return
      }

      setMyUserId(authData.user.id)
      await loadWorkouts(authData.user.id)
    })
  }, [router])

  const createWorkout = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setStatusMessage("")

    const supabase = getSupabaseBrowserClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      router.replace("/auth")
      return
    }

    if (!form.date || !form.time) {
      setStatusMessage("Укажи дату и время тренировки.")
      setCreating(false)
      return
    }

    const scheduledTime = new Date(`${form.date}T${form.time}:00`).toISOString()
    const payload = {
      user_id: authData.user.id,
      partner_id: form.partnerId.trim() || null,
      scheduled_time: scheduledTime,
      type: form.type,
      location: form.location.trim() || null,
      status: "planned" as const,
    }

    const { error } = await supabase.from("workouts").insert(payload)

    if (error) {
      setStatusMessage(`Ошибка создания: ${error.message}`)
    } else {
      setStatusMessage("Тренировка создана.")
      setForm({ date: "", time: "", type: "gym", location: "", partnerId: "" })
      await loadWorkouts(authData.user.id)
    }

    setCreating(false)
  }

  const updateWorkoutStatus = async (id: string, status: "completed" | "cancelled") => {
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.from("workouts").update({ status }).eq("id", id)
    if (error) {
      setStatusMessage(`Ошибка обновления: ${error.message}`)
      return
    }
    if (myUserId) {
      await loadWorkouts(myUserId)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="text-4xl font-bold mb-2">Мои тренировки</h1>
        <p className="text-muted-foreground">Создавай, отслеживай и отмечай выполненные тренировки</p>
      </div>

      <form className="rounded-2xl border border-border p-6 space-y-5 bg-white" onSubmit={createWorkout}>
        <h2 className="text-2xl font-semibold">Создать тренировку</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Дата</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label>Время</Label>
            <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Тип тренировки</Label>
            <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="gym / running / home" />
          </div>
          <div>
            <Label>Локация</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Зал / парк / дом" />
          </div>
        </div>
        <div>
          <Label>ID партнера (опционально)</Label>
          <Input value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })} placeholder="UUID пользователя" />
        </div>
        {statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}
        <Button type="submit" disabled={creating}>{creating ? "Создание..." : "Создать тренировку"}</Button>
      </form>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">История тренировок</h2>
        {workouts.length === 0 ? (
          <p className="text-muted-foreground">Пока нет тренировок.</p>
        ) : (
          workouts.map((w) => {
            const isOwner = myUserId === w.user_id
            return (
              <div key={w.id} className="rounded-2xl border border-border p-5 bg-white">
                <p className="font-medium">{new Date(w.scheduled_time).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{w.type ?? "Без типа"} • {w.location ?? "Локация не указана"}</p>
                <p className="text-sm mt-1">Статус: <span className="font-medium">{w.status}</span></p>
                {isOwner && w.status === "planned" && (
                  <div className="flex gap-3 mt-4">
                    <Button onClick={() => updateWorkoutStatus(w.id, "completed")}>Отметить выполненной</Button>
                    <Button variant="outline" onClick={() => updateWorkoutStatus(w.id, "cancelled")}>Отменить</Button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
