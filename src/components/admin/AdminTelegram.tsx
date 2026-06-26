import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, RefreshCw, Check, AlertCircle, Copy } from "lucide-react";
import {
  getTelegramAdminConfig,
  fetchTelegramRecentChats,
  saveTelegramAdminChatId,
  sendTelegramTest,
} from "@/lib/telegram.functions";

type Bot = { ok: boolean; username?: string; first_name?: string; error?: string };
type RecentChat = { chat_id: string; title: string; from: string };

export function AdminTelegram() {
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [bot, setBot] = useState<Bot | null>(null);
  const [manual, setManual] = useState("");
  const [chats, setChats] = useState<RecentChat[]>([]);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const cfg = await getTelegramAdminConfig();
      setChatId(cfg.chatId);
      setBot(cfg.bot);
      setManual(cfg.chatId ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function pollUpdates() {
    setPolling(true);
    try {
      const res = await fetchTelegramRecentChats();
      setChats(res.chats);
      if (res.chats.length === 0) {
        toast("Нет новых сообщений", {
          description: "Сначала напишите боту /start в Telegram, затем нажмите «Обновить».",
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPolling(false);
    }
  }

  async function save(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return toast.error("Укажите Chat ID");
    setBusy(true);
    try {
      await saveTelegramAdminChatId({ data: { chatId: trimmed } });
      setChatId(trimmed);
      toast.success("Chat ID сохранён");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const res = await sendTelegramTest();
      if (res.ok) toast.success("Тестовое сообщение отправлено");
      else toast.error(res.error ?? "Не удалось отправить");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Загружаем настройки Telegram…</div>;
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="tag-label">telegram-бот</p>
        <h2 className="font-display mt-4 text-3xl">Уведомления в Telegram</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Бот будет присылать сюда новые заявки с сайта, вопросы, заявки из чата и эскалации. Подключите свой Telegram —
          один раз.
        </p>
      </div>

      <section className="border border-border bg-card p-6">
        <h3 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Бот</h3>
        {bot?.ok ? (
          <div className="mt-3 flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium">{bot.first_name}</div>
              {bot.username && (
                <a
                  href={`https://t.me/${bot.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline-offset-2 hover:underline"
                >
                  @{bot.username}
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-start gap-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              Не удалось подключиться к Telegram-боту.
              {bot?.error && <div className="mt-1 text-xs opacity-70">{bot.error}</div>}
            </div>
          </div>
        )}
      </section>

      <section className="border border-border bg-card p-6">
        <h3 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Куда отправлять уведомления</h3>
        {chatId ? (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <Check className="h-4 w-4 text-green-600" />
            <span>Уведомления отправляются в чат</span>
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{chatId}</code>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Получатель ещё не выбран — выберите ниже.
          </div>
        )}

        <ol className="mt-6 space-y-3 text-sm">
          <li>
            <span className="font-medium">1.</span>{" "}
            Откройте бота{" "}
            {bot?.username ? (
              <a
                href={`https://t.me/${bot.username}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                @{bot.username}
              </a>
            ) : (
              "в Telegram"
            )}{" "}
            и нажмите <b>Start</b> (или напишите ему любое сообщение).
          </li>
          <li>
            <span className="font-medium">2.</span> Нажмите кнопку «Обновить список» ниже — здесь появятся все, кто
            писал боту.
          </li>
          <li>
            <span className="font-medium">3.</span> Нажмите «Выбрать» рядом со своим чатом.
          </li>
        </ol>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={pollUpdates}
            disabled={polling}
            className="inline-flex items-center gap-2 border border-foreground/30 px-4 py-2 text-xs uppercase tracking-widest hover:border-foreground disabled:opacity-60"
          >
            <RefreshCw className={`h-3 w-3 ${polling ? "animate-spin" : ""}`} /> Обновить список
          </button>
          {chatId && (
            <button
              type="button"
              onClick={test}
              disabled={busy}
              className="inline-flex items-center gap-2 bg-primary px-4 py-2 text-xs uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Send className="h-3 w-3" /> Отправить тест
            </button>
          )}
        </div>

        {chats.length > 0 && (
          <ul className="mt-6 divide-y divide-border border border-border">
            {chats.map((c) => (
              <li key={c.chat_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.from || "—"} · ID {c.chat_id}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => save(c.chat_id)}
                  disabled={busy}
                  className={`inline-flex items-center gap-1 border px-3 py-1.5 text-xs uppercase tracking-widest ${
                    chatId === c.chat_id
                      ? "border-green-600 text-green-700"
                      : "border-foreground/30 hover:border-foreground"
                  }`}
                >
                  {chatId === c.chat_id ? <><Check className="h-3 w-3" /> Выбрано</> : "Выбрать"}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 border-t border-border pt-6">
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Или укажите Chat ID вручную
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="напр. 123456789"
              className="flex-1 min-w-[200px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <button
              type="button"
              onClick={() => save(manual)}
              disabled={busy}
              className="border border-foreground/30 px-4 py-2 text-xs uppercase tracking-widest hover:border-foreground disabled:opacity-60"
            >
              <Copy className="mr-1 inline h-3 w-3" /> Сохранить
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
