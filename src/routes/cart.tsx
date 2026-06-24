import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Корзина — Марина Моненок" },
      { name: "description", content: "Оформление заказа в мастерской Марины Моненок." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cart.items.length === 0) return;
    const fd = new FormData(e.currentTarget);
    setSending(true);
    const { data: order, error } = await supabase.from("orders").insert({
      customer_name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim() || null,
      city: String(fd.get("city") ?? "").trim() || null,
      address: String(fd.get("address") ?? "").trim() || null,
      delivery_method: String(fd.get("delivery") ?? "").trim() || null,
      comment: String(fd.get("comment") ?? "").trim() || null,
      total: cart.total,
      status: "new",
    }).select().single();
    if (error || !order) {
      setSending(false);
      toast.error("Не получилось отправить заказ. Попробуйте ещё раз.");
      return;
    }
    const itemsErr = await supabase.from("order_items").insert(
      cart.items.map((i) => ({
        order_id: order.id,
        product_id: i.id,
        product_name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
    );
    setSending(false);
    if (itemsErr.error) {
      toast.error("Заказ создан, но не все позиции сохранились. Марина свяжется с вами.");
    } else {
      toast.success("Заказ отправлен! Марина свяжется с вами в ближайшее время.");
    }
    cart.clear();
    navigate({ to: "/" });
  }

  return (
    <SiteLayout>
      <PageHeader eyebrow="корзина" title="Ваш заказ" />

      <div className="mx-auto grid max-w-6xl gap-16 px-6 py-16 lg:grid-cols-5 lg:px-10">
        <div className="lg:col-span-3">
          {cart.items.length === 0 ? (
            <div className="border border-dashed border-border bg-[var(--linen)] py-24 text-center">
              <p className="tag-label mx-auto">пусто</p>
              <h2 className="font-display mt-6 text-3xl">В корзине пока ничего нет</h2>
              <Link to="/catalog" className="mt-8 inline-block bg-primary px-6 py-3 text-sm uppercase tracking-[0.2em] text-primary-foreground">
                В каталог
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {cart.items.map((i) => (
                <li key={i.id} className="flex gap-5 py-6">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden bg-[var(--sand)]/60">
                    {i.image ? (
                      <img src={i.image} alt={i.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-display italic text-muted-foreground/60">M.M.</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Link to="/product/$slug" params={{ slug: i.slug }} className="font-display text-lg hover:text-primary">
                      {i.name}
                    </Link>
                    <div className="mt-1 text-sm text-primary">{formatPrice(i.price)}</div>
                    <div className="mt-3 inline-flex items-center border border-border">
                      <button onClick={() => cart.setQty(i.id, i.quantity - 1)} className="p-2 hover:bg-secondary"><Minus className="h-3 w-3" /></button>
                      <span className="min-w-8 text-center text-sm">{i.quantity}</span>
                      <button onClick={() => cart.setQty(i.id, i.quantity + 1)} className="p-2 hover:bg-secondary"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg">{formatPrice(i.price * i.quantity)}</div>
                    <button onClick={() => cart.remove(i.id)} className="mt-2 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
                      <Trash2 className="h-3 w-3" /> убрать
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {cart.items.length > 0 && (
            <div className="mt-8 flex items-center justify-between">
              <Link to="/catalog" className="text-sm uppercase tracking-[0.2em] text-muted-foreground hover:text-primary">← продолжить</Link>
              <div className="font-display text-2xl">Итого: <span className="text-primary">{formatPrice(cart.total)}</span></div>
            </div>
          )}
        </div>

        {cart.items.length > 0 && (
          <form onSubmit={onSubmit} className="lg:col-span-2 border border-border bg-[var(--linen)] p-8">
            <p className="tag-label">оформление</p>
            <h2 className="font-display mt-4 text-2xl">Ваши данные</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Это заявка — Марина свяжется с вами для подтверждения и оплаты.
            </p>

            <div className="mt-6 space-y-4">
              <Field name="name" label="Имя" required />
              <Field name="phone" label="Телефон" type="tel" required />
              <Field name="email" label="Email" type="email" />
              <Field name="city" label="Город" />
              <Field name="address" label="Адрес / отделение" />
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Доставка</label>
                <select name="delivery" className="w-full border border-border bg-background px-4 py-3 text-sm">
                  <option value="cdek">СДЭК</option>
                  <option value="post">Почта России</option>
                  <option value="pickup">Самовывоз в Тольятти</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Комментарий</label>
                <textarea name="comment" rows={3} className="w-full border border-border bg-background px-4 py-3 text-sm" />
              </div>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="mt-8 w-full bg-primary px-6 py-4 text-sm uppercase tracking-[0.2em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {sending ? "Отправляем…" : "Отправить заявку"}
            </button>
            <p className="mt-4 text-[10px] text-muted-foreground">
              Отправляя заявку, вы соглашаетесь с{" "}
              <Link to="/privacy" className="underline">политикой конфиденциальности</Link> и{" "}
              <Link to="/offer" className="underline">офертой</Link>.
            </p>
          </form>
        )}
      </div>
    </SiteLayout>
  );
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}{required && <span className="text-primary">*</span>}
      </label>
      <input name={name} type={type} required={required}
        className="w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground" />
    </div>
  );
}
