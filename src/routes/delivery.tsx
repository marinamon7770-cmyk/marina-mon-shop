import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Доставка, оплата, гарантия — Марина Моненок" },
      { name: "description", content: "Условия доставки, оплаты, самовывоз в Тольятти, гарантия и уход за изделиями мастерской Марины Моненок." },
      { property: "og:title", content: "Доставка, оплата и гарантия" },
      { property: "og:description", content: "Доставка по России, самовывоз, условия заказа и гарантия." },
    ],
  }),
  component: Delivery,
});

function Delivery() {
  const settings = useQuery({
    queryKey: ["site-settings", "delivery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["delivery_pickup", "delivery_terms", "delivery_warranty"]);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { if (r.value) map[r.key] = r.value; });
      return map;
    },
  });

  const pickup = settings.data?.delivery_pickup?.trim();
  const terms = settings.data?.delivery_terms?.trim();
  const warranty = settings.data?.delivery_warranty?.trim();

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="доставка · условия · гарантия"
        title="Как изделие приедет к вам"
        lead="Каждое изделие упаковывается вручную — в крафт-бумагу и фирменную коробку. Доставка по всей России."
      />
      <article className="mx-auto max-w-3xl px-6 py-16 lg:px-10 space-y-12">
        <Section title="Сроки">
          <p>Если изделие готово — отправляем в течение 1–2 рабочих дней после оплаты.</p>
          <p>Если изготавливается под заказ — срок согласовываем индивидуально, обычно от 7 до 21 дня.</p>
        </Section>

        <Section title="Способы доставки">
          <ul className="space-y-2 list-disc pl-5">
            <li><b>СДЭК</b> — до пункта выдачи или курьером по адресу. По тарифам перевозчика.</li>
            <li><b>Почта России</b> — отправка 1 классом, посылка с трек-номером.</li>
            <li><b>Самовывоз в Тольятти</b> — бесплатно, по предварительной договорённости.</li>
          </ul>
        </Section>

        {pickup && (
          <Section title="Самовывоз в Тольятти">
            <Markdown>{pickup}</Markdown>
          </Section>
        )}

        <Section title="Оплата">
          <p>После оформления заявки Марина свяжется с вами для подтверждения. Оплата — переводом
          на карту или СБП. Полная или с предоплатой 50% при изготовлении на заказ.</p>
        </Section>

        {terms && (
          <Section title="Условия заказа">
            <Markdown>{terms}</Markdown>
          </Section>
        )}

        {warranty && (
          <Section title="Гарантия и уход">
            <Markdown>{warranty}</Markdown>
          </Section>
        )}

        <Section title="Возврат и обмен">
          <p>Изделия ручной работы возврату и обмену не подлежат согласно п.4 Постановления
          Правительства РФ № 2463. Если изделие пришло повреждённым по вине доставки — напишите
          нам с фотографиями, мы решим вопрос.</p>
        </Section>
      </article>
    </SiteLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="thread-divider w-10 mx-0" />
      <h2 className="font-display mt-6 text-3xl">{title}</h2>
      <div className="mt-4 space-y-3 text-base text-foreground/85 leading-relaxed">{children}</div>
    </section>
  );
}

function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-display prose-a:text-primary prose-a:underline-offset-4 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
