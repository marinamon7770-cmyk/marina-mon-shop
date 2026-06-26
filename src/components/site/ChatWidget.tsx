import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { startChatSession, getChatMessages, sendChatMessage } from "@/lib/chat.functions";

type ChatMessage = { id?: string; role: "user" | "assistant"; content: string };

type StoredIdentity = {
  sessionId: string;
  name: string;
  phone: string;
};

const STORAGE_KEY = "mm_chat_identity_v1";

function loadIdentity(): StoredIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredIdentity;
  } catch {
    return null;
  }
}

function saveIdentity(v: StoredIdentity) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

function clearIdentity() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState<StoredIdentity | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [escalated, setEscalated] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const startFn = useServerFn(startChatSession);
  const getMessagesFn = useServerFn(getChatMessages);
  const sendFn = useServerFn(sendChatMessage);

  useEffect(() => {
    setIdentity(loadIdentity());
  }, []);

  useEffect(() => {
    if (!open || !identity) return;
    setLoading(true);
    getMessagesFn({ data: { sessionId: identity.sessionId, phone: identity.phone } })
      .then((res) => {
        setMessages(res.messages as ChatMessage[]);
        setEscalated(res.escalated);
        setHasTicket(res.hasTicket);
      })
      .catch(() => {
        // Identity stale — clear
        clearIdentity();
        setIdentity(null);
      })
      .finally(() => setLoading(false));
  }, [open, identity, getMessagesFn]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  useEffect(() => {
    if (open && identity && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, identity, sending]);

  async function onStart(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const consent = fd.get("consent") === "on";
    if (!name || !phone) return toast.error("Заполните имя и телефон");
    if (!consent) return toast.error("Нужно согласие с политикой конфиденциальности");
    if (phone.replace(/\D+/g, "").length < 10)
      return toast.error("Введите корректный телефон");
    setLoading(true);
    try {
      const { sessionId } = await startFn({ data: { name, phone } });
      const id = { sessionId, name, phone };
      saveIdentity(id);
      setIdentity(id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Не удалось начать чат");
    } finally {
      setLoading(false);
    }
  }

  async function onSend() {
    const text = input.trim();
    if (!text || !identity || sending) return;
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    try {
      const res = await sendFn({
        data: { sessionId: identity.sessionId, phone: identity.phone, text },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      setEscalated(res.escalated);
      const prevTicket = hasTicket;
      setHasTicket(res.hasTicket);
      if (res.hasTicket && !prevTicket) {
        toast.success("Заявка оформлена! Оператор скоро свяжется.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Ошибка отправки");
      setMessages((m) => m.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function resetIdentity() {
    clearIdentity();
    setIdentity(null);
    setMessages([]);
    setEscalated(false);
    setHasTicket(false);
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        aria-label={open ? "Закрыть чат" : "Открыть чат"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">помощник</p>
              <p className="font-display text-base">Марина — онлайн</p>
            </div>
            {identity && (
              <button
                onClick={resetIdentity}
                className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Сменить
              </button>
            )}
          </div>

          {!identity ? (
            <form onSubmit={onStart} className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
              <p className="text-sm text-muted-foreground">
                Подберём изделие и оформим предварительную заявку. Оставьте контакты — мы свяжемся, если потребуется.
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Имя</span>
                <input
                  name="name"
                  required
                  maxLength={100}
                  className="border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Телефон</span>
                <input
                  name="phone"
                  required
                  type="tel"
                  placeholder="+7 ___ ___ __ __"
                  className="border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="mt-1 flex items-start gap-2 text-xs text-muted-foreground">
                <input name="consent" type="checkbox" className="mt-0.5" />
                <span>
                  Согласен(на) с{" "}
                  <a href="/privacy" target="_blank" className="underline hover:text-primary">
                    политикой конфиденциальности
                  </a>{" "}
                  и обработкой персональных данных.
                </span>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex items-center justify-center gap-2 bg-primary px-5 py-3 text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Начать чат
              </button>
            </form>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {loading && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загружаем...
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div
                      key={m.id ?? i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-muted px-3.5 py-2 text-sm text-muted-foreground">
                      печатает…
                    </div>
                  </div>
                )}
              </div>

              {(escalated || hasTicket) && (
                <div className="border-t border-border bg-amber-50 px-4 py-2 text-[12px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  {hasTicket && <div>✓ Предварительная заявка отправлена оператору.</div>}
                  {escalated && <div>✓ Подключаем живого оператора — он скоро ответит.</div>}
                </div>
              )}

              <div className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSend();
                      }
                    }}
                    rows={1}
                    placeholder="Ваше сообщение…"
                    maxLength={2000}
                    className="max-h-32 min-h-[42px] flex-1 resize-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={onSend}
                    disabled={sending || !input.trim()}
                    aria-label="Отправить"
                    className="inline-flex h-[42px] w-[42px] items-center justify-center bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
