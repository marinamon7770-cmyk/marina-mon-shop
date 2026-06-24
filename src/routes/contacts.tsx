import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Send } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { QuestionForm } from "@/components/site/QuestionForm";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [
      { title: "Контакты — Мастерская Марины Моненок" },
      { name: "description", content: "Связаться с мастерской: email, Telegram, ВКонтакте. Тольятти." },
      { property: "og:title", content: "Контакты мастерской Марины Моненок" },
      { property: "og:description", content: "Связаться: email, Telegram, ВКонтакте." },
    ],
  }),
  component: Contacts,
});

function Contacts() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="контакты"
        title="Напишите Марине"
        lead="На все сообщения отвечает мастер лично. Обычно — в течение дня."
      />
      <section className="mx-auto grid max-w-6xl gap-16 px-6 py-16 lg:grid-cols-2 lg:px-10">
        <div className="space-y-8">
          <ContactBlock icon={<Mail className="h-4 w-4" />} label="Email" value={SITE.email} href={`mailto:${SITE.email}`} />
          <ContactBlock icon={<Send className="h-4 w-4" />} label="Telegram" value={SITE.telegramHandle} href={SITE.telegram} />
          <ContactBlock icon={<span className="text-[10px] font-bold">VK</span>} label="ВКонтакте" value={SITE.vkHandle} href={SITE.vk} />
          <ContactBlock icon={<MapPin className="h-4 w-4" />} label="Город" value="Тольятти, Россия" />
        </div>
        <div>
          <QuestionForm />
        </div>
      </section>
    </SiteLayout>
  );
}

function ContactBlock({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const Tag: "a" | "div" = href ? "a" : "div";
  return (
    <Tag {...(href ? { href, target: href.startsWith("http") ? "_blank" : undefined, rel: "noopener noreferrer" } : {})}
      className="group block border-b border-border pb-6">
      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="mt-3 flex items-center gap-3 font-display text-2xl group-hover:text-primary">
        <span className="inline-flex h-9 w-9 items-center justify-center border border-current">{icon}</span>
        {value}
      </div>
    </Tag>
  );
}
