import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LogOut, Mail, Lock, Bell } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminQuestions } from "@/components/admin/AdminQuestions";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminHome } from "@/components/admin/AdminHome";
import { AdminChats } from "@/components/admin/AdminChats";
import { AdminTelegram } from "@/components/admin/AdminTelegram";
import { AdminReviews } from "@/components/admin/AdminReviews";
import { AdminContent } from "@/components/admin/AdminContent";
import { AdminKnowledge } from "@/components/admin/AdminKnowledge";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Админка — Марина Моненок" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type Tab = "orders" | "questions" | "chats" | "reviews" | "products" | "home" | "content" | "knowledge" | "telegram";

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("orders");
  const [newOrders, setNewOrders] = useState(0);
  const [newQuestions, setNewQuestions] = useState(0);
  const [newChats, setNewChats] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  // Подсчёт новых заявок/вопросов + realtime-уведомления
  useEffect(() => {
    if (!isAdmin) return;
    const refresh = async () => {
      const [o, q, c] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("chat_tickets").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);
      setNewOrders(o.count ?? 0);
      setNewQuestions(q.count ?? 0);
      setNewChats(c.count ?? 0);
      initialized.current = true;
    };
    refresh();
    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        setNewOrders((n) => n + 1);
        if (initialized.current) {
          const name = (payload.new as { customer_name?: string })?.customer_name ?? "клиент";
          toast.success("Новая заявка!", { description: `${name} оформил(а) заказ`, duration: 10000 });
          try { new Audio("data:audio/wav;base64,UklGRkQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA=").play().catch(() => {}); } catch {}
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "questions" }, (payload) => {
        setNewQuestions((n) => n + 1);
        if (initialized.current) {
          const name = (payload.new as { name?: string })?.name ?? "посетитель";
          toast("Новый вопрос", { description: `${name} задал(а) вопрос`, duration: 10000 });
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_tickets" }, () => {
        setNewChats((n) => n + 1);
        if (initialized.current) {
          toast.success("Новая заявка из чата!", { description: "Клиент оформил предварительную заявку через ИИ-помощник", duration: 10000 });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_sessions" }, (payload) => {
        const row = payload.new as { escalated?: boolean };
        const old = payload.old as { escalated?: boolean };
        if (initialized.current && row?.escalated && !old?.escalated) {
          toast("Чат передан оператору", { description: "Клиент в чате запросил живого оператора", duration: 10000 });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "questions" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_tickets" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  if (!session) return <SiteLayout><LoginForm /></SiteLayout>;

  if (isAdmin === null) {
    return <SiteLayout><div className="mx-auto max-w-3xl px-6 py-32 text-center text-muted-foreground">Проверяем доступ…</div></SiteLayout>;
  }
  if (!isAdmin) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-6 py-32 text-center">
          <p className="tag-label mx-auto">доступ ограничен</p>
          <h1 className="font-display mt-6 text-3xl">Эта учётная запись не является администратором.</h1>
          <p className="mt-3 text-sm text-muted-foreground">Войдите под учётной записью мастерской.</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-8 inline-flex items-center gap-2 border border-foreground px-5 py-2 text-sm uppercase tracking-widest"
          >
            <LogOut className="h-4 w-4" /> Выйти
          </button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="tag-label">админка</p>
            <h1 className="font-display mt-4 text-4xl">Управление мастерской</h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="inline-flex items-center gap-2 border border-foreground/30 px-4 py-2 text-xs uppercase tracking-widest hover:border-foreground"
          >
            <LogOut className="h-3 w-3" /> Выйти
          </button>
        </div>

        {(newOrders > 0 || newQuestions > 0) && (
          <div className="mt-8 flex flex-wrap items-center gap-3 border border-primary/30 bg-primary/5 px-5 py-4 text-sm">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-medium">Новое:</span>
            {newOrders > 0 && (
              <button onClick={() => setTab("orders")} className="underline-offset-2 hover:underline">
                {newOrders} {newOrders === 1 ? "заявка" : newOrders < 5 ? "заявки" : "заявок"}
              </button>
            )}
            {newQuestions > 0 && (
              <button onClick={() => setTab("questions")} className="underline-offset-2 hover:underline">
                {newQuestions} {newQuestions === 1 ? "вопрос" : newQuestions < 5 ? "вопроса" : "вопросов"}
              </button>
            )}
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-2 border-b border-border">
          {([
            ["orders", "Заявки", newOrders],
            ["questions", "Вопросы", newQuestions],
            ["chats", "Чаты", newChats],
            ["reviews", "Отзывы", 0],
            ["products", "Товары", 0],
            ["home", "Главная", 0],
            ["content", "Условия", 0],
            ["knowledge", "База знаний", 0],
            ["telegram", "Telegram", 0],
          ] as [Tab, string, number][]).map(([k, label, count]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-5 py-3 text-xs uppercase tracking-[0.2em] ${
                tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {count > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-10">
          {tab === "orders" && <AdminOrders />}
          {tab === "questions" && <AdminQuestions />}
          {tab === "chats" && <AdminChats />}
          {tab === "reviews" && <AdminReviews />}
          {tab === "products" && <AdminProducts />}
          {tab === "home" && <AdminHome />}
          {tab === "content" && <AdminContent />}
          {tab === "knowledge" && <AdminKnowledge />}
          {tab === "telegram" && <AdminTelegram />}
        </div>
      </div>
    </SiteLayout>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    setBusy(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Аккаунт создан. Войдите.");
      setMode("login");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error("Неверный email или пароль");
    toast.success("Добро пожаловать");
    navigate({ to: "/admin" });
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <p className="tag-label">вход в админку</p>
      <h1 className="font-display mt-6 text-4xl">{mode === "login" ? "Войти" : "Регистрация"}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Войдите учётной записью владельца магазина.
      </p>
      <form onSubmit={onSubmit} className="mt-10 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</label>
          <div className="flex items-center border border-border bg-background">
            <Mail className="ml-3 h-4 w-4 text-muted-foreground" />
            <input name="email" type="email" required className="flex-1 bg-transparent px-3 py-3 text-sm outline-none" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Пароль</label>
          <div className="flex items-center border border-border bg-background">
            <Lock className="ml-3 h-4 w-4 text-muted-foreground" />
            <input name="password" type="password" required minLength={6} className="flex-1 bg-transparent px-3 py-3 text-sm outline-none" />
          </div>
        </div>
        <button type="submit" disabled={busy} className="w-full bg-primary px-6 py-4 text-sm uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60">
          {busy ? "..." : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>
      </form>
      <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="mt-6 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
        {mode === "login" ? "Создать аккаунт →" : "← У меня уже есть аккаунт"}
      </button>
    </div>
  );
}
