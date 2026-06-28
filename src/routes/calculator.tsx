import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { CalculatorForm } from "@/features/calculator/CalculatorForm";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Рассчитать стоимость — Марина Моненок" },
      {
        name: "description",
        content:
          "Онлайн-калькулятор ориентировочной стоимости плетёных корзин и коробов. Укажите размеры и узоры — узнайте примерную цену.",
      },
    ],
  }),
  component: CalculatorPage,
});

function CalculatorPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="калькулятор"
        title="Рассчитать стоимость"
        lead="Выберите форму изделия, укажите размеры в сантиметрах и узоры — калькулятор покажет ориентировочную цену. Точная стоимость зависит от деталей и обсуждается с мастером."
      />
      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-24">
        <CalculatorForm />
      </section>
    </SiteLayout>
  );
}
