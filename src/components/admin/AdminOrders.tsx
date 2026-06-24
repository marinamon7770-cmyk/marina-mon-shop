import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

type OrderItem = { id: string; product_name: string; price: number; quantity: number };
type Order = {
  id: string; created_at: string; customer_name: string; phone: string; email: string | null;
  city: string | null; address: string | null; delivery_method: string | null; comment: string | null;
  total: number; status: string;
  order_items: OrderItem[];
};

export function AdminOrders() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Статус обновлён");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }
  async function remove(id: string) {
    if (!confirm("Удалить заявку?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  if (q.isLoading) return <div className="text-muted-foreground">Загрузка…</div>;
  if (!q.data || q.data.length === 0) return <Empty text="Заявок пока нет." />;

  return (
    <div className="space-y-3">
      {q.data.map((o) => (
        <div key={o.id} className="border border-border bg-card">
          <button onClick={() => setOpenId(openId === o.id ? null : o.id)} className="grid w-full grid-cols-2 items-center gap-4 px-5 py-4 text-left md:grid-cols-6">
            <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ru-RU")}</div>
            <div className="font-display">{o.customer_name}</div>
            <div className="text-sm">{o.phone}</div>
            <div className="text-sm text-muted-foreground hidden md:block">{o.city ?? "—"}</div>
            <div className="text-sm text-primary font-display">{formatPrice(o.total)}</div>
            <StatusPill status={o.status} />
          </button>
          {openId === o.id && (
            <div className="border-t border-border bg-background p-5 text-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <Info label="Email" value={o.email} />
                <Info label="Адрес" value={[o.city, o.address].filter(Boolean).join(", ") || "—"} />
                <Info label="Доставка" value={o.delivery_method} />
                <Info label="Комментарий" value={o.comment} />
              </div>
              <table className="mt-6 w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr><th className="pb-2">Изделие</th><th className="pb-2">Цена</th><th className="pb-2">Кол-во</th><th className="pb-2 text-right">Сумма</th></tr>
                </thead>
                <tbody>
                  {o.order_items.map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="py-2">{i.product_name}</td>
                      <td className="py-2">{formatPrice(i.price)}</td>
                      <td className="py-2">{i.quantity}</td>
                      <td className="py-2 text-right">{formatPrice(i.price * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-6 flex flex-wrap gap-2">
                {["new", "in_progress", "done", "cancelled"].map((s) => (
                  <button key={s} onClick={() => updateStatus(o.id, s)}
                    className={`border px-3 py-1.5 text-[10px] uppercase tracking-widest ${o.status === s ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {STATUS_LABELS[s] ?? s}
                  </button>
                ))}
                <button onClick={() => remove(o.id)} className="ml-auto text-[10px] uppercase tracking-widest text-destructive hover:underline">удалить</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  done: "Выполнена",
  cancelled: "Отменена",
};
function StatusPill({ status }: { status: string }) {
  return <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{STATUS_LABELS[status] ?? status}</div>;
}
function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1">{value || "—"}</div>
    </div>
  );
}
export function Empty({ text }: { text: string }) {
  return <div className="border border-dashed border-border bg-[var(--linen)] py-16 text-center text-muted-foreground">{text}</div>;
}
