import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Stars, StarPicker } from "@/components/site/Stars";

type AdminReview = {
  id: string;
  product_id: string | null;
  author_name: string;
  rating: number;
  text: string;
  status: "pending" | "approved" | "rejected";
  source: "site" | "admin";
  created_at: string;
};

type Product = { id: string; name: string };

export function AdminReviews() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

  const reviews = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as AdminReview[];
    },
  });

  const products = useQuery({
    queryKey: ["admin-products-min"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name").order("name");
      return (data ?? []) as Product[];
    },
  });

  const productName = (id: string | null) =>
    id ? products.data?.find((p) => p.id === id)?.name ?? "—" : "Общий отзыв о мастерской";

  async function setStatus(id: string, status: AdminReview["status"]) {
    const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Опубликовано" : status === "rejected" ? "Отклонено" : "Возвращено");
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    qc.invalidateQueries({ queryKey: ["reviews"] });
  }

  async function remove(id: string) {
    if (!confirm("Удалить отзыв?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Удалено");
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    qc.invalidateQueries({ queryKey: ["reviews"] });
  }

  const list = (reviews.data ?? []).filter((r) => r.status === tab);
  const counts = {
    pending: (reviews.data ?? []).filter((r) => r.status === "pending").length,
    approved: (reviews.data ?? []).filter((r) => r.status === "approved").length,
    rejected: (reviews.data ?? []).filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-8">
      <AddReviewForm products={products.data ?? []} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-reviews"] })} />

      <div className="flex gap-2 border-b border-border">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2 text-xs uppercase tracking-[0.2em] ${
              tab === s ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            {s === "pending" ? "На модерации" : s === "approved" ? "Опубликованы" : "Отклонены"}
            {counts[s] > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {counts[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      {reviews.isLoading && <div className="text-sm text-muted-foreground">Загрузка…</div>}
      {!reviews.isLoading && list.length === 0 && (
        <p className="text-sm text-muted-foreground">Пусто.</p>
      )}

      <div className="space-y-4">
        {list.map((r) => (
          <article key={r.id} className="border border-border/60 bg-background p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="font-display text-lg">{r.author_name}</div>
                <Stars value={r.rating} />
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("ru-RU")}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {r.source === "admin" ? "добавлен вручную" : "с сайта"}
                </span>
              </div>
              <div className="flex gap-2">
                {r.status !== "approved" && (
                  <button
                    onClick={() => setStatus(r.id, "approved")}
                    className="inline-flex items-center gap-1 border border-emerald-600/40 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
                  >
                    <Check className="h-3 w-3" /> Опубликовать
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    onClick={() => setStatus(r.id, "rejected")}
                    className="inline-flex items-center gap-1 border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" /> Отклонить
                  </button>
                )}
                <button
                  onClick={() => remove(r.id)}
                  className="inline-flex items-center gap-1 border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" /> Удалить
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Товар: {productName(r.product_id)}</div>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{r.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function AddReviewForm({ products, onSaved }: { products: Product[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || text.trim().length < 3) {
      toast.error("Имя и отзыв обязательны");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      author_name: name.trim(),
      rating,
      text: text.trim(),
      product_id: productId || null,
      status: "approved",
      source: "admin",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Отзыв добавлен и опубликован");
    setName(""); setText(""); setRating(5); setProductId(""); setOpen(false);
    onSaved();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-foreground px-5 py-3 text-xs uppercase tracking-[0.2em] hover:bg-foreground hover:text-background"
      >
        <Plus className="h-3 w-3" /> Добавить отзыв вручную
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 border border-border/60 bg-[var(--sand)]/30 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Имя клиента</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required
            className="w-full border border-border bg-background px-3 py-3 text-sm outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Товар (необязательно)</label>
          <select
            value={productId} onChange={(e) => setProductId(e.target.value)}
            className="w-full border border-border bg-background px-3 py-3 text-sm outline-none"
          >
            <option value="">— общий отзыв о мастерской —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Оценка</label>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Текст отзыва</label>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={2000} required
          className="w-full border border-border bg-background px-3 py-3 text-sm outline-none"
        />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60">
          {busy ? "…" : "Опубликовать"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-6 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Отмена
        </button>
      </div>
    </form>
  );
}
