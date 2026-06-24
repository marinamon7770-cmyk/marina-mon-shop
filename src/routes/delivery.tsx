import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Доставка и оплата — Марина Моненок" },
      { name: "description", content: "Условия доставки и оплаты в мастерской Марины Моненок. СДЭК, Почта России, самовывоз в Тольятти." },
      { property: "og:title", content: "Доставка и оплата" },
      { property: "og:description", content: "Доставка по России и самовывоз в Тольятти." },
    ],
  }),
  component: Delivery,
});

function Delivery() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="доставка и оплата"
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
        <Section title="Оплата">
          <p>После оформления заявки Марина свяжется с вами для подтверждения. Оплата — переводом
          на карту или СБП. Полная или с предоплатой 50% при изготовлении на заказ.</p>
        </Section>
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
