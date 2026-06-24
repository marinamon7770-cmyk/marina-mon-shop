import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Mail, Lock } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminQuestions } from "@/components/admin/AdminQuestions";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminHome } from "@/components/admin/AdminHome";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Админка — Марина Моненок" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type Tab = "orders" | "questions" | "products";

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("orders");

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

        <div className="mt-10 flex flex-wrap gap-2 border-b border-border">
          {([
            ["orders", "Заявки"],
            ["questions", "Вопросы"],
            ["products", "Товары"],
          ] as [Tab, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-5 py-3 text-xs uppercase tracking-[0.2em] ${
                tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-10">
          {tab === "orders" && <AdminOrders />}
          {tab === "questions" && <AdminQuestions />}
          {tab === "products" && <AdminProducts />}
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
        Учётная запись marinamon7770@gmail.com автоматически получит права администратора при первой регистрации.
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
