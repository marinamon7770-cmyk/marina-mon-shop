import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FIELDS: { key: string; label: string; placeholder: string }[] = [
  {
    key: "delivery_pickup",
    label: "Самовывоз в Тольятти",
    placeholder: "Адрес, часы работы, как договориться о встрече…",
  },
  {
    key: "delivery_terms",
    label: "Условия заказа",
    placeholder: "Сроки изготовления, предоплата, что входит в стоимость, как согласуется индивидуальный заказ…",
  },
  {
    key: "delivery_warranty",
    label: "Гарантия и уход",
    placeholder: "На что распространяется гарантия, срок, как ухаживать за изделием, что не считается дефектом…",
  },
];

export function AdminContent() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["site-settings", "content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", FIELDS.map((f) => f.key));
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = r.value ?? ""; });
      return map;
    },
  });

  if (settings.isLoading) return <div className="text-muted-foreground">Загрузка…</div>;

  return (
    <div className="space-y-10">
      <div>
        <p className="tag-label">страница «Доставка»</p>
        <h2 className="font-display mt-4 text-2xl">Условия, самовывоз и гарантия</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Что заполните здесь — появится отдельными разделами на странице «Доставка». Поддерживается простая разметка:
          пустая строка — новый абзац, <code>**жирный**</code>, <code>*курсив*</code>, маркированный список через <code>-</code>.
          Пустое поле — раздел не показывается.
        </p>
      </div>

      {FIELDS.map((f) => (
        <Editor
          key={f.key}
          label={f.label}
          placeholder={f.placeholder}
          initial={settings.data?.[f.key] ?? ""}
          onSave={async (value) => {
            const { error } = await supabase
              .from("site_settings")
              .upsert({ key: f.key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
            if (error) { toast.error(error.message); return; }
            toast.success("Сохранено");
            qc.invalidateQueries({ queryKey: ["site-settings"] });
          }}
        />
      ))}
    </div>
  );
}

function Editor({
  label,
  placeholder,
  initial,
  onSave,
}: {
  label: string;
  placeholder: string;
  initial: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [val, setVal] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setVal(initial); }, [initial]);
  const dirty = val !== initial;

  return (
    <div className="border border-border p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-display text-lg">{label}</div>
        {dirty && <span className="text-[10px] uppercase tracking-widest text-primary">не сохранено</span>}
      </div>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="w-full resize-y border border-border bg-background p-3 text-sm leading-relaxed outline-none focus:border-primary"
      />
      <div className="mt-3 flex justify-end gap-2">
        {dirty && (
          <button
            type="button"
            onClick={() => setVal(initial)}
            className="border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Отменить
          </button>
        )}
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={async () => {
            setBusy(true);
            try { await onSave(val); } finally { setBusy(false); }
          }}
          className="bg-primary px-5 py-2 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
