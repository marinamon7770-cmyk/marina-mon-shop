import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Empty } from "./AdminOrders";

type Q = {
  id: string; created_at: string; name: string; email: string | null; phone: string | null;
  message: string; product_slug: string | null; status: string;
};

export function AdminQuestions() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Q[];
    },
  });

  async function markRead(id: string) {
    const { error } = await supabase.from("questions").update({ status: "read" }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-questions"] });
  }
  async function remove(id: string) {
    if (!confirm("Удалить вопрос?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-questions"] });
  }

  if (q.isLoading) return <div className="text-muted-foreground">Загрузка…</div>;
  if (!q.data || q.data.length === 0) return <Empty text="Вопросов пока нет." />;

  return (
    <div className="space-y-4">
      {q.data.map((m) => (
        <div key={m.id} className={`border ${m.status === "new" ? "border-primary/50 bg-[var(--linen)]" : "border-border bg-card"} p-5`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-display text-lg">{m.name}</div>
            <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("ru-RU")}</div>
          </div>
          <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {m.email && <a href={`mailto:${m.email}`} className="hover:text-primary">{m.email}</a>}
            {m.phone && <a href={`tel:${m.phone}`} className="hover:text-primary">{m.phone}</a>}
            {m.product_slug && <span>по изделию: {m.product_slug}</span>}
          </div>
          <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
          <div className="mt-4 flex gap-3">
            {m.status === "new" && (
              <button onClick={() => markRead(m.id)} className="text-[10px] uppercase tracking-widest text-primary hover:underline">отметить прочитанным</button>
            )}
            <button onClick={() => remove(m.id)} className="ml-auto text-[10px] uppercase tracking-widest text-destructive hover:underline">удалить</button>
          </div>
        </div>
      ))}
    </div>
  );
}
