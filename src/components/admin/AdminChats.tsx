import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageCircle, Phone, Ticket, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

type Session = {
  id: string;
  customer_name: string;
  customer_phone: string;
  escalated: boolean;
  has_ticket: boolean;
  status: string;
  last_message_at: string;
  created_at: string;
};

type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

type Ticket = {
  id: string;
  status: string;
  items: Array<{ product_name: string; quantity: number; note?: string }>;
  notes: string | null;
  created_at: string;
};

export function AdminChats() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  async function refreshSessions() {
    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(200);
    setSessions((data ?? []) as Session[]);
    setLoading(false);
  }

  useEffect(() => {
    refreshSessions();
    const ch = supabase
      .channel("admin-chats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        () => refreshSessions(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMsg = payload.new as Message & { session_id: string };
          if (newMsg.session_id === activeId) {
            setMessages((prev) => [...prev, newMsg]);
          }
          refreshSessions();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setTickets([]);
      return;
    }
    setLoadingThread(true);
    Promise.all([
      supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", activeId)
        .order("created_at", { ascending: true }),
      supabase
        .from("chat_tickets")
        .select("*")
        .eq("session_id", activeId)
        .order("created_at", { ascending: false }),
    ])
      .then(([m, t]) => {
        setMessages((m.data ?? []) as Message[]);
        setTickets((t.data ?? []) as Ticket[]);
      })
      .finally(() => setLoadingThread(false));
  }, [activeId]);

  async function markTicketStatus(id: string, status: string) {
    await supabase.from("chat_tickets").update({ status }).eq("id", id);
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  async function markSessionClosed(id: string) {
    await supabase.from("chat_sessions").update({ status: "closed" }).eq("id", id);
    refreshSessions();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Загружаем чаты…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded border border-dashed border-border p-12 text-center text-muted-foreground">
        Пока нет ни одного чата.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Sessions list */}
      <div className="max-h-[70vh] overflow-y-auto border border-border">
        {sessions.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`flex w-full flex-col gap-1 border-b border-border px-3 py-3 text-left text-sm transition ${
                active ? "bg-primary/10" : "hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{s.customer_name}</span>
                <div className="flex items-center gap-1">
                  {s.has_ticket && (
                    <Ticket className="h-3.5 w-3.5 text-primary" aria-label="заявка" />
                  )}
                  {s.escalated && (
                    <AlertCircle
                      className="h-3.5 w-3.5 text-amber-600"
                      aria-label="оператор"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{s.customer_phone}</span>
              </div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {formatDistanceToNow(new Date(s.last_message_at), { addSuffix: true, locale: ru })}
                {s.status === "closed" && " · закрыт"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Thread */}
      <div className="flex max-h-[70vh] flex-col border border-border">
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <MessageCircle className="mr-2 h-5 w-5" /> Выберите чат слева
          </div>
        ) : loadingThread ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Загружаем…
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2 text-xs">
              <span className="text-muted-foreground">{messages.length} сообщений</span>
              <button
                onClick={() => activeId && markSessionClosed(activeId)}
                className="uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Закрыть чат
              </button>
            </div>

            {tickets.length > 0 && (
              <div className="border-b border-border bg-primary/5 px-4 py-3">
                <p className="mb-2 text-xs uppercase tracking-widest text-primary">Заявки</p>
                <div className="space-y-2">
                  {tickets.map((t) => (
                    <div key={t.id} className="border border-border bg-background p-3 text-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">
                          {new Date(t.created_at).toLocaleString("ru-RU")}
                        </span>
                        <select
                          value={t.status}
                          onChange={(e) => markTicketStatus(t.id, e.target.value)}
                          className="border border-border bg-background px-2 py-1 text-xs"
                        >
                          <option value="new">Новая</option>
                          <option value="in_progress">В работе</option>
                          <option value="done">Готово</option>
                          <option value="cancelled">Отменено</option>
                        </select>
                      </div>
                      <ul className="space-y-1">
                        {t.items.map((it, i) => (
                          <li key={i}>
                            • {it.product_name} ×{it.quantity}
                            {it.note ? ` — ${it.note}` : ""}
                          </li>
                        ))}
                      </ul>
                      {t.notes && (
                        <p className="mt-2 text-xs text-muted-foreground">Заметка: {t.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                    <div className="mt-1 text-[10px] opacity-60">
                      {new Date(m.created_at).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
