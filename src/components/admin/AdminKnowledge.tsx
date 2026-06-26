import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type QA = { q: string; a: string; enabled: boolean };
type LinkItem = { title: string; url: string; description?: string };

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function AdminKnowledge() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["site-settings", "kb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["kb_notes", "kb_qa", "kb_links"]);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = r.value ?? ""; });
      return map;
    },
  });

  async function save(key: string, value: string) {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) { toast.error(error.message); return false; }
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    return true;
  }

  if (settings.isLoading) return <div className="text-muted-foreground">Загрузка…</div>;

  return (
    <div className="space-y-12">
      <div>
        <p className="tag-label">база знаний бота</p>
        <h2 className="font-display mt-4 text-2xl">Что должен знать ИИ-помощник</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Эти материалы автоматически передаются боту в каждом диалоге. Чем подробнее заполните — тем точнее ответы.
          Карточки товаров (название, описание, материалы, размеры, срок) бот уже видит сам — здесь добавьте всё, что
          не относится к конкретному товару.
        </p>
      </div>

      <NotesEditor
        initial={settings.data?.kb_notes ?? ""}
        onSave={(v) => save("kb_notes", v)}
      />

      <QAEditor
        initial={parseJson<QA[]>(settings.data?.kb_qa, [])}
        onSave={(items) => save("kb_qa", JSON.stringify(items))}
      />

      <LinksEditor
        initial={parseJson<LinkItem[]>(settings.data?.kb_links, [])}
        onSave={(items) => save("kb_links", JSON.stringify(items))}
      />
    </div>
  );
}

function NotesEditor({ initial, onSave }: { initial: string; onSave: (v: string) => Promise<boolean> }) {
  const [val, setVal] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setVal(initial); }, [initial]);
  const dirty = val !== initial;

  return (
    <div className="border border-border p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-lg">Общая заметка</div>
        {dirty && <span className="text-[10px] uppercase tracking-widest text-primary">не сохранено</span>}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Пишите свободно: о мастерской, о материалах, об индивидуальных заказах, о сроках, о доставке — всё, что бот
        должен знать как фон.
      </p>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Например: «Все короба плетутся под размер клиента. Срок изготовления — от 14 дней. Базовая цена — от 2500 ₽ за дм³, точный расчёт по таблице…»"
        rows={10}
        className="w-full resize-y border border-border bg-background p-3 text-sm leading-relaxed outline-none focus:border-primary"
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={async () => { setBusy(true); try { if (await onSave(val)) toast.success("Сохранено"); } finally { setBusy(false); } }}
          className="bg-primary px-5 py-2 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

function QAEditor({ initial, onSave }: { initial: QA[]; onSave: (items: QA[]) => Promise<boolean> }) {
  const [items, setItems] = useState<QA[]>(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setItems(initial); }, [initial]);
  const dirty = JSON.stringify(items) !== JSON.stringify(initial);

  return (
    <div className="border border-border p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-lg">Вопрос → Ответ</div>
        {dirty && <span className="text-[10px] uppercase tracking-widest text-primary">не сохранено</span>}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Готовые ответы на частые вопросы. Бот будет использовать их дословно, если вопрос совпадает по смыслу.
      </p>

      <div className="space-y-4">
        {items.map((qa, i) => (
          <div key={i} className="border border-border/60 bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={qa.enabled}
                  onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, enabled: e.target.checked } : x))}
                />
                Включён
              </label>
              <button
                type="button"
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <input
              value={qa.q}
              onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, q: e.target.value } : x))}
              placeholder="Вопрос (например, «Сколько ждать изготовления?»)"
              className="mb-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <textarea
              value={qa.a}
              onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, a: e.target.value } : x))}
              placeholder="Ответ"
              rows={3}
              className="w-full resize-y border border-border bg-background p-3 text-sm leading-relaxed outline-none focus:border-primary"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setItems([...items, { q: "", a: "", enabled: true }])}
        className="mt-4 inline-flex items-center gap-2 border border-dashed border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="h-3 w-3" /> Добавить Q&A
      </button>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={async () => { setBusy(true); try { if (await onSave(items)) toast.success("Сохранено"); } finally { setBusy(false); } }}
          className="bg-primary px-5 py-2 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

function LinksEditor({ initial, onSave }: { initial: LinkItem[]; onSave: (items: LinkItem[]) => Promise<boolean> }) {
  const [items, setItems] = useState<LinkItem[]>(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setItems(initial); }, [initial]);
  const dirty = JSON.stringify(items) !== JSON.stringify(initial);

  return (
    <div className="border border-border p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-lg">Полезные ссылки</div>
        {dirty && <span className="text-[10px] uppercase tracking-widest text-primary">не сохранено</span>}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Калькулятор стоимости (Google Таблица), прайс, видео по уходу и т.п. Бот будет давать ссылку клиенту, когда
        вопрос совпадает по теме. Совет: для калькулятора в Google Таблицах откройте доступ «по ссылке — читатель».
      </p>

      <div className="space-y-3">
        {items.map((link, i) => (
          <div key={i} className="border border-border/60 bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <input
              value={link.title}
              onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
              placeholder="Название (например, «Калькулятор стоимости короба»)"
              className="mb-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              value={link.url}
              onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x))}
              placeholder="https://docs.google.com/spreadsheets/…"
              className="mb-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              value={link.description ?? ""}
              onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
              placeholder="Когда давать клиенту эту ссылку (например, «когда спрашивает о расчёте стоимости короба»)"
              className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setItems([...items, { title: "", url: "", description: "" }])}
        className="mt-4 inline-flex items-center gap-2 border border-dashed border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="h-3 w-3" /> Добавить ссылку
      </button>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={async () => { setBusy(true); try { if (await onSave(items)) toast.success("Сохранено"); } finally { setBusy(false); } }}
          className="bg-primary px-5 py-2 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
