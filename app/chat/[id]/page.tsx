"use client"
import { FormEvent, use, useEffect, useId, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase"

type ProfileRow = { id: string; name: string | null; fitness_level: string | null }

type ChatMessage = {
  id: string
  sender_id: string
  receiver_id: string
  content: string | null
  attachment_path?: string | null
  attachment_mime?: string | null
  attachment_kind?: "image" | "video" | "gif" | "sticker" | "file" | null
  sent_at: string
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [peerProfile, setPeerProfile] = useState<ProfileRow | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [isBlockedByPeer, setIsBlockedByPeer] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})
  const mediaUrlsRef = useRef<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const instanceId = useId()

  const emojiQuick = useMemo(() => ["😀", "💪", "🔥", "✅", "😂", "👍", "❤️", "🏋️"], [])

  useEffect(() => {
    mediaUrlsRef.current = mediaUrls
  }, [mediaUrls])

  const upsertMessage = (incoming: ChatMessage) => {
    setMessages((current) => {
      if (current.some((m) => m.id === incoming.id)) return current
      return [...current, incoming].sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
    })
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let active = true

    const loadMessagesAndSubscribe = async () => {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.replace("/auth")
        return
      }

      setMyUserId(authData.user.id)

      // React dev mode can run effects twice. Supabase forbids adding `.on(...)` after `.subscribe()`,
      // and `.channel(name)` may return an existing subscribed channel. Ensure we remove it first.
      const channelName = `chat:${authData.user.id}:${id}:${instanceId}`

      // Load peer profile (for header name)
      const { data: peer } = await supabase.from("profiles").select("id, name, fitness_level").eq("id", id).maybeSingle()
      if (active) setPeerProfile(peer as ProfileRow | null)

      // blocklist checks
      const { data: myBlocks } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", authData.user.id)
        .eq("blocked_id", id)
        .maybeSingle()
      setBlocked(Boolean(myBlocks))

      const { data: peerBlocks } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", id)
        .eq("blocked_id", authData.user.id)
        .maybeSingle()
      setIsBlockedByPeer(Boolean(peerBlocks))

      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${authData.user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${authData.user.id})`)
        .order("sent_at", { ascending: true })

      const loaded = (data ?? []) as ChatMessage[]
      setMessages(loaded)

      // create signed urls for attachments we can read (best-effort)
      for (const m of loaded) {
        if (m.attachment_path && !mediaUrlsRef.current[m.id]) {
          const { data: signed } = await supabase.storage.from("chat-uploads").createSignedUrl(m.attachment_path, 60 * 10)
          if (signed?.signedUrl) {
            setMediaUrls((cur) => ({ ...cur, [m.id]: signed.signedUrl }))
          }
        }
      }

      if (!active) return
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const msg = payload.new as ChatMessage
            const isCurrentDialog =
              (msg.sender_id === authData.user.id && msg.receiver_id === id) ||
              (msg.sender_id === id && msg.receiver_id === authData.user.id)
            if (isCurrentDialog) {
              upsertMessage(msg)
              if (msg.attachment_path) {
                supabase.storage
                  .from("chat-uploads")
                  .createSignedUrl(msg.attachment_path, 60 * 10)
                  .then(({ data: signed }) => {
                    if (signed?.signedUrl) {
                      setMediaUrls((cur) => ({ ...cur, [msg.id]: signed.signedUrl }))
                    }
                  })
              }
            }
          }
        )
        .subscribe()
    }

    loadMessagesAndSubscribe()

    return () => {
      active = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  // Intentionally not depending on `mediaUrls` here to avoid resubscribing on every signed-url update.
  // Signed URLs are generated on demand when messages load/arrive.
  }, [id, router, instanceId])

  const toggleBlock = async () => {
    if (!myUserId) return
    const supabase = getSupabaseBrowserClient()
    if (blocked) {
      await supabase.from("blocked_users").delete().eq("blocker_id", myUserId).eq("blocked_id", id)
      setBlocked(false)
    } else {
      await supabase.from("blocked_users").insert({ blocker_id: myUserId, blocked_id: id })
      setBlocked(true)
    }
  }

  const sendText = async (text: string) => {
    const supabase = getSupabaseBrowserClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      router.replace("/auth")
      return
    }
    if (blocked || isBlockedByPeer) return

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        sender_id: authData.user.id,
        receiver_id: id,
        content: text,
      })
      .select("*")
      .single()

    if (!error && inserted) {
      upsertMessage(inserted as ChatMessage)
    }
  }

  const handleUploadAndSend = async (file: File) => {
    if (!myUserId) return
    if (blocked || isBlockedByPeer) return
    setUploading(true)
    const supabase = getSupabaseBrowserClient()

    const ext = file.name.split(".").pop() || "bin"
    const path = `${myUserId}/${crypto.randomUUID()}.${ext}`

    const { error: upErr } = await supabase.storage.from("chat-uploads").upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    })

    if (upErr) {
      setUploading(false)
      return
    }

    const kind: ChatMessage["attachment_kind"] =
      file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file"

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        sender_id: myUserId,
        receiver_id: id,
        content: null,
        attachment_path: path,
        attachment_mime: file.type || null,
        attachment_kind: kind,
      })
      .select("*")
      .single()

    if (!error && inserted) {
      upsertMessage(inserted as ChatMessage)
      const { data: signed } = await supabase.storage.from("chat-uploads").createSignedUrl(path, 60 * 10)
      if (signed?.signedUrl) setMediaUrls((cur) => ({ ...cur, [inserted.id]: signed.signedUrl }))
    }

    setUploading(false)
  }

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    await sendText(message.trim())
    setMessage("")
  }

  return (
    <div className="max-w-3xl mx-auto h-screen flex flex-col">
      <div className="border-b p-6 flex items-center justify-between">
        <div>
          <p className="font-semibold">{peerProfile?.name ?? "Пользователь"}</p>
          <p className="text-sm text-muted-foreground">{peerProfile?.fitness_level ?? " "}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/profile/${id}`}>Профиль</Link>
          </Button>
          <Button variant="outline" onClick={toggleBlock}>
            {blocked ? "Разблокировать" : "В чёрный список"}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {messages.map((msg) => {
          const isMe = msg.sender_id === myUserId
          const mediaUrl = mediaUrls[msg.id]
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-3xl px-5 py-3 ${isMe ? "bg-primary text-white" : "bg-muted"}`}>
                {msg.content}
                {msg.attachment_path && mediaUrl && msg.attachment_kind === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl} alt="attachment" className="mt-3 rounded-2xl max-h-80 object-contain" />
                )}
                {msg.attachment_path && mediaUrl && msg.attachment_kind === "video" && (
                  <video src={mediaUrl} controls className="mt-3 rounded-2xl max-h-80 w-full" />
                )}
                {msg.attachment_path && !mediaUrl && <p className="text-xs opacity-80 mt-2">Вложение (нет доступа или ссылка истекла)</p>}
              </div>
            </div>
          )
        })}
      </div>

      <form className="p-6 border-t space-y-3" onSubmit={handleSend}>
        {(blocked || isBlockedByPeer) && (
          <p className="text-sm text-muted-foreground">
            {isBlockedByPeer ? "Пользователь ограничил общение с вами." : "Вы добавили пользователя в чёрный список."}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {emojiQuick.map((e) => (
            <Button key={e} type="button" variant="outline" size="sm" onClick={() => setMessage((m) => `${m}${e}`)}>
              {e}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || blocked || isBlockedByPeer}
          >
            {uploading ? "Загрузка..." : "Фото/видео"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleUploadAndSend(f)
              e.target.value = ""
            }}
          />
        </div>

        <div className="flex gap-3">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Напишите сообщение..."
          className="flex-1"
          disabled={blocked || isBlockedByPeer}
        />
        <Button size="icon" type="submit" disabled={blocked || isBlockedByPeer}>
          <Send className="h-5 w-5" />
        </Button>
        </div>
      </form>
    </div>
  )
}