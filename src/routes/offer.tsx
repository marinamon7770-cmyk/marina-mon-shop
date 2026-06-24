import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/offer")({
  head: () => ({
    meta: [
      { title: "Публичная оферта — Марина Моненок" },
      { name: "description", content: "Публичная оферта на изготовление и продажу изделий ручной работы." },
    ],
  }),
  component: Offer,
});

function Offer() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="документы" title="Публичная оферта" />
      <article className="mx-auto max-w-3xl px-6 py-16 lg:px-10 space-y-8 text-foreground/85 leading-relaxed">
        <p className="text-sm text-muted-foreground">Редакция от {new Date().toLocaleDateString("ru-RU")}</p>

        <Block title="1. Предмет оферты">
          Мастерская «Марина Моненок» (далее — Исполнитель) предлагает любому физическому лицу
          (Заказчику) приобрести изделия ручной работы, представленные на сайте, или заказать
          индивидуальное изготовление на согласованных условиях.
        </Block>
        <Block title="2. Порядок оформления">
          Заказчик оставляет заявку через корзину сайта или связывается напрямую (email{" "}
          {SITE.email}, Telegram {SITE.telegramHandle}). Исполнитель связывается для подтверждения
          состава, стоимости, сроков и условий доставки.
        </Block>
        <Block title="3. Стоимость и оплата">
          Стоимость каждого изделия указана в карточке товара. Оплата производится переводом на
          карту или СБП после подтверждения заказа. При индивидуальном изготовлении возможна
          предоплата 50%.
        </Block>
        <Block title="4. Доставка">
          Доставка осуществляется службами СДЭК, Почта России или самовывозом из Тольятти. Стоимость
          и сроки доставки рассчитываются индивидуально и подтверждаются с Заказчиком до отправки.
        </Block>
        <Block title="5. Возврат">
          Изделия ручной работы относятся к товарам, не подлежащим возврату/обмену надлежащего
          качества (Постановление Правительства РФ № 2463). При обнаружении производственного брака
          или повреждения при доставке — Исполнитель компенсирует ущерб по согласованию.
        </Block>
        <Block title="6. Реквизиты">
          ИП/Самозанятый: Моненок Марина, г. Тольятти. Контакты: {SITE.email}, {SITE.telegramHandle}.
        </Block>
      </article>
    </SiteLayout>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-foreground">{title}</h2>
      <p className="mt-3">{children}</p>
    </section>
  );
}
