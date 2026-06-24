import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Политика конфиденциальности — Марина Моненок" },
      { name: "description", content: "Политика обработки персональных данных мастерской Марины Моненок." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <SiteLayout>
      <PageHeader eyebrow="документы" title="Политика конфиденциальности" />
      <article className="mx-auto max-w-3xl px-6 py-16 lg:px-10 space-y-8 text-foreground/85 leading-relaxed">
        <p className="text-sm text-muted-foreground">Дата вступления в силу: {new Date().toLocaleDateString("ru-RU")}</p>

        <Block title="1. Общие положения">
          Настоящая Политика описывает, как мастерская «Марина Моненок» (далее — «Мастерская»),
          расположенная в г. Тольятти, обрабатывает персональные данные посетителей сайта.
          Связаться: {SITE.email}.
        </Block>
        <Block title="2. Какие данные мы собираем">
          При оформлении заявки или отправке вопроса вы передаёте: имя, телефон, email (по желанию),
          город и адрес доставки, текст сообщения. Также сайт может собирать обезличенные технические
          данные (cookies, IP, тип браузера) для корректной работы.
        </Block>
        <Block title="3. Цели обработки">
          Данные используются исключительно для связи с вами, оформления и доставки заказа, а также
          ответа на ваши вопросы. Мы не передаём ваши данные третьим лицам, кроме служб доставки, и
          только в объёме, необходимом для отправки.
        </Block>
        <Block title="4. Срок и условия хранения">
          Данные хранятся в защищённой базе на сервере Мастерской до момента завершения общения или
          выполнения заказа, после чего могут быть удалены по вашему запросу на {SITE.email}.
        </Block>
        <Block title="5. Ваши права">
          Вы можете запросить уточнение, изменение или удаление своих данных, отправив письмо на{" "}
          {SITE.email}. Мы ответим в течение 10 рабочих дней.
        </Block>
        <Block title="6. Изменения политики">
          Мастерская оставляет за собой право вносить изменения в политику. Актуальная версия всегда
          размещена на этой странице.
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
