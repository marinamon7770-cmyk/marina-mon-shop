import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Stars, StarPicker } from "@/components/site/Stars";

type Review = {
  id: string;
  author_name: string;
  rating: number;
  text: string;
  created_at: string;
};

export function ReviewsSection({ productId }: { productId?: string }) {
  const qc = useQueryClient();
  const key = ["reviews", productId ?? "all"];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase
        .from("reviews")
        .select("id, author_name, rating, text, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50);
      q = productId ? q.eq("product_id", productId) : q.is("product_id", null);
      const { data } = await q;
      return (data ?? []) as Review[];
    },
  });

  const reviews = data ?? [];
  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 1 || text.trim().length < 3) {
      toast.error("Заполните имя и отзыв (минимум 3 символа)");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      product_id: productId ?? null,
      author_name: name.trim(),
      rating,
      text: text.trim(),
      status: "pending",
      source: "site",
    });
    setBusy(false);
    if (error) {
      toast.error("Не удалось отправить отзыв", { description: error.message });
      return;
    }
    toast.success("Спасибо! Отзыв отправлен на модерацию");
    setName(""); setText(""); setRating(5); setOpen(false);
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <section className="mt-24 border-t border-border/60 pt-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="tag-label">отзывы</p>
          <h2 className="font-display mt-6 text-3xl sm:text-4xl">
            {productId ? "Что говорят о работе" : "Отзывы клиентов"}
          </h2>
          {reviews.length > 0 && (
            <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
              <Stars value={Math.round(avg)} />
              <span>{avg.toFixed(1)} · {reviews.length} {pluralize(reviews.length, "отзыв", "отзыва", "отзывов")}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="border border-foreground px-5 py-3 text-xs uppercase tracking-[0.2em] hover:bg-foreground hover:text-background"
        >
          {open ? "Скрыть форму" : "Оставить отзыв"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-8 max-w-2xl space-y-4 border border-border/60 bg-[var(--sand)]/30 p-6">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Ваше имя</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              className="w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Оценка</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Отзыв</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              rows={5}
              required
              className="w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
            />
            <div className="mt-1 text-right text-[10px] text-muted-foreground">{text.length}/2000</div>
          </div>
          <p className="text-xs text-muted-foreground">
            Отзыв будет опубликован после проверки мастером.
          </p>
          <button
            type="submit"
            disabled={busy}
            className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Отправляем…" : "Отправить отзыв"}
          </button>
        </form>
      )}

      <div className="mt-12 space-y-8">
        {isLoading && <div className="text-sm text-muted-foreground">Загружаем…</div>}
        {!isLoading && reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Пока нет отзывов — будьте первым.
          </p>
        )}
        {reviews.map((r) => (
          <article key={r.id} className="border-b border-border/40 pb-8 last:border-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="font-display text-lg">{r.author_name}</div>
              <Stars value={r.rating} />
              <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{r.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function pluralize(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
