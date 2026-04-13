"use client"

import Link from "next/link"
import { useEffect, useId, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase"

type Profile = { id: string; name: string | null; city: string | null; fitness_level: string | null }
type MessageRow = { sender_id: string; receiver_id: string; content: string | null; sent_at: string }
type InvitationRow = { id: string; sender_id: string; receiver_id: string; workout_time: string | null; message: string | null; status: string; created_at: string }

export default function ChatHubPage() {
  const router = useRouter()
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({})
  const [lastMessages, setLastMessages] = useState<Record<string, MessageRow>>({})
  const [incomingInvites, setIncomingInvites] = useState<InvitationRow[]>([])
  const [status, setStatus] = useState("")

  const peerIds = useMemo(() => Object.keys(lastMessages), [lastMessages])
  const instanceId = useId()

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let msgChannel: ReturnType<typeof supabase.channel> | null = null
    let invChannel: ReturnType<typeof supabase.channel> | null = null
    let active = true

    const bootstrap = async () => {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.replace("/auth")
        return
      }
      setMyUserId(authData.user.id)

      // Load last messages (cheap approach: load recent, then reduce).
      const { data: recentMessages, error: msgErr } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, content, sent_at")
        .or(`sender_id.eq.${authData.user.id},receiver_id.eq.${authData.user.id}`)
        .order("sent_at", { ascending: false })
        .limit(200)

      if (msgErr) setStatus(`Ошибка загрузки чатов: ${msgErr.message}`)

      const map: Record<string, MessageRow> = {}
      for (const m of (recentMessages ?? []) as MessageRow[]) {
        const peer = m.sender_id === authData.user.id ? m.receiver_id : m.sender_id
        if (!map[peer]) map[peer] = m
      }
      setLastMessages(map)

      // Load incoming invitations.
      const { data: inv, error: invErr } = await supabase
        .from("invitations")
        .select("*")
        .eq("receiver_id", authData.user.id)
        .order("created_at", { ascending: false })

      if (invErr) setStatus(`Ошибка загрузки приглашений: ${invErr.message}`)
      setIncomingInvites((inv ?? []) as InvitationRow[])

      // Load profiles for peers + senders
      const idsToFetch = Array.from(new Set([...Object.keys(map), ...((inv ?? []) as InvitationRow[]).map((i) => i.sender_id)]))
      if (idsToFetch.length) {
        const { data: profs } = await supabase.from("profiles").select("id, name, city, fitness_level").in("id", idsToFetch)
        const dict: Record<string, Profile> = {}
        for (const p of (profs ?? []) as Profile[]) dict[p.id] = p
        setProfilesById(dict)
      }

      // Realtime: messages
      if (!active) return
      msgChannel = supabase
        .channel(`chat-hub:${authData.user.id}:${instanceId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          const m = payload.new as unknown as MessageRow & { sender_id: string; receiver_id: string }
          const isMine = m.sender_id === authData.user.id || m.receiver_id === authData.user.id
          if (!isMine) return
          const peer = m.sender_id === authData.user.id ? m.receiver_id : m.sender_id
          setLastMessages((cur) => ({ ...cur, [peer]: m }))
        })
        .subscribe()

      // Realtime: invitations
      if (!active) return
      invChannel = supabase
        .channel(`invites:${authData.user.id}:${instanceId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "invitations" }, async (payload) => {
          const row = payload.new as unknown as InvitationRow
          if (row.receiver_id !== authData.user.id) return
          const { data: inv2 } = await supabase
            .from("invitations")
            .select("*")
            .eq("receiver_id", authData.user.id)
            .order("created_at", { ascending: false })
          setIncomingInvites((inv2 ?? []) as InvitationRow[])
        })
        .subscribe()
    }

    void bootstrap()

    return () => {
      active = false
      if (msgChannel) supabase.removeChannel(msgChannel)
      if (invChannel) supabase.removeChannel(invChannel)
    }
  }, [router, instanceId])

  const acceptInvite = async (invite: InvitationRow) => {
    if (!myUserId) return
    const supabase = getSupabaseBrowserClient()
    // create workout for receiver (owner) with partner = sender
    const { error: wErr } = await supabase.from("workouts").insert({
      user_id: myUserId,
      partner_id: invite.sender_id,
      scheduled_time: invite.workout_time ?? new Date().toISOString(),
      type: "gym",
      location: null,
      status: "planned",
    })
    if (wErr) return setStatus(`Ошибка создания тренировки: ${wErr.message}`)

    const { error } = await supabase.from("invitations").update({ status: "accepted" }).eq("id", invite.id)
    if (error) setStatus(`Ошибка принятия: ${error.message}`)
  }

  const declineInvite = async (invite: InvitationRow) => {
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.from("invitations").update({ status: "declined" }).eq("id", invite.id)
    if (error) setStatus(`Ошибка отклонения: ${error.message}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="text-4xl font-bold mb-2">Чаты</h1>
        <p className="text-muted-foreground">Диалоги и приглашения на тренировки</p>
        {status && <p className="text-sm text-destructive mt-2">{status}</p>}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Диалоги</h2>
          {peerIds.length === 0 ? (
            <p className="text-muted-foreground">Пока нет сообщений. Открой профиль партнёра и нажми “Открыть чат”.</p>
          ) : (
            peerIds.map((peerId) => {
              const p = profilesById[peerId]
              const last = lastMessages[peerId]
              return (
                <Card key={peerId} className="p-5 flex items-center justify-between gap-6">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p?.name ?? "Пользователь"}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {last?.content ?? "Вложение"} • {last ? new Date(last.sent_at).toLocaleString() : ""}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/chat/${peerId}`}>Открыть</Link>
                  </Button>
                </Card>
              )
            })
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Приглашения</h2>
          {incomingInvites.filter((i) => i.status === "pending").length === 0 ? (
            <p className="text-muted-foreground">Нет новых приглашений.</p>
          ) : (
            incomingInvites
              .filter((i) => i.status === "pending")
              .map((inv) => {
                const sender = profilesById[inv.sender_id]
                return (
                  <Card key={inv.id} className="p-5 space-y-2">
                    <p className="font-semibold">{sender?.name ?? inv.sender_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {inv.workout_time ? new Date(inv.workout_time).toLocaleString() : "Время не указано"}
                    </p>
                    {inv.message && <p className="text-sm">{inv.message}</p>}
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => acceptInvite(inv)}>Принять</Button>
                      <Button variant="outline" onClick={() => declineInvite(inv)}>Отклонить</Button>
                    </div>
                  </Card>
                )
              })
          )}
        </div>
      </div>
    </div>
  )
}

