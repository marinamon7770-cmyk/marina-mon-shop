import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyNewQuestion } from "@/lib/telegram.functions";

export function QuestionForm({ productSlug, compact = false }: { productSlug?: string; compact?: boolean }) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim() || null,
      phone: String(fd.get("phone") ?? "").trim() || null,
      message: String(fd.get("message") ?? "").trim(),
      product_slug: productSlug ?? null,
    };
    if (!payload.name || !payload.message) {
      toast.error("Заполните имя и сообщение");
      return;
    }
    if (payload.name.length > 200) {
      toast.error("Имя слишком длинное (макс. 200 символов)");
      return;
    }
    if (payload.message.length > 5000) {
      toast.error("Сообщение слишком длинное (макс. 5000 символов)");
      return;
    }
    if (payload.email && payload.email.length > 254) {
      toast.error("Email слишком длинный");
      return;
    }
    if (payload.phone && payload.phone.length > 40) {
      toast.error("Телефон слишком длинный");
      return;
    }
    setSending(true);
    const { data: inserted, error } = await supabase.from("questions").insert(payload).select("id").single();
    setSending(false);
    if (error) {
      toast.error("Не удалось отправить. Попробуйте ещё раз.");
      return;
    }
    if (inserted?.id) {
      notifyNewQuestion({ data: { questionId: inserted.id } }).catch(() => {});
    }
    toast.success("Спасибо! Марина свяжется с вами в ближайшее время.");
    setDone(true);
    e.currentTarget.reset();
  }

  if (done && !compact) {
    return (
      <div className="border border-gold/40 bg-[var(--linen)] p-10 text-center">
        <p className="tag-label mx-auto">сообщение отправлено</p>
        <h3 className="font-display mt-6 text-3xl">Спасибо за обращение</h3>
        <p className="mt-3 text-sm text-muted-foreground">
          Марина прочитает и ответит лично — обычно в течение дня.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Как к вам обращаться" required />
        <Field name="phone" label="Телефон" type="tel" />
      </div>
      <Field name="email" label="Email (по желанию)" type="email" />
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Ваш вопрос<span className="text-primary">*</span>
        </label>
        <textarea
          name="message"
          required
          rows={5}
          maxLength={5000}
          className="w-full border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-foreground"
          placeholder={
            productSlug
              ? "Расскажите, что хотите узнать об этом изделии"
              : "Опишите, о чём вы хотели бы спросить"
          }
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="w-full bg-primary px-6 py-4 text-sm uppercase tracking-[0.2em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
      >
        {sending ? "Отправляем…" : "Отправить сообщение"}
      </button>
    </form>
  );
}

function Field({
  name, label, type = "text", required,
}: { name: string; label: string; type?: string; required?: boolean }) {
  const maxLength = name === "message" ? 5000 : name === "email" ? 254 : name === "phone" ? 40 : 200;
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}{required && <span className="text-primary">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        className="w-full border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-foreground"
      />
    </div>
  );
}
