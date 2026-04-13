"use client"
import { FormEvent, use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export default function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [workoutType, setWorkoutType] = useState("gym")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState("")
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    setStatus("")
    const supabase = getSupabaseBrowserClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) {
      router.replace("/auth")
      return
    }

    const workoutTime = date && time ? new Date(`${date}T${time}:00`).toISOString() : null
    const { error } = await supabase.from("invitations").insert({
      sender_id: authData.user.id,
      receiver_id: id,
      workout_time: workoutTime,
      message,
      status: "pending",
    })

    if (error) {
      setStatus(`Ошибка отправки: ${error.message}`)
    } else {
      setStatus("Приглашение отправлено")
      setMessage("")
    }
    setSending(false)
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Пригласить на тренировку</h1>
      <p className="text-muted-foreground mb-8">Партнёр получит уведомление</p>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Дата</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Время</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Тип тренировки</Label>
          <Select>
            <SelectTrigger><SelectValue placeholder={workoutType === "gym" ? "Зал" : "Бег"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gym" onClick={() => setWorkoutType("gym")}>Зал</SelectItem>
              <SelectItem value="running" onClick={() => setWorkoutType("running")}>Бег</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Сообщение партнёру</Label>
          <Textarea
            rows={4}
            placeholder="Привет! Давай потренируемся вместе..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        {status && <p className="text-sm text-muted-foreground">{status}</p>}

        <div className="flex gap-4">
          <Button type="submit" className="flex-1" disabled={sending}>
            {sending ? "Отправка..." : "Отправить приглашение"}
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href={`/profile/${id}`}>Назад</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}