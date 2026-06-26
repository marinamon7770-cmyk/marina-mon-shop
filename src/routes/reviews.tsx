import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { ReviewsSection } from "@/components/site/ReviewsSection";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Отзывы — Мастерская Марины Моненок" },
      { name: "description", content: "Отзывы клиентов о плетёных изделиях и кожаных аксессуарах мастерской Марины Моненок." },
      { property: "og:title", content: "Отзывы клиентов — Марина Моненок" },
      { property: "og:description", content: "Что говорят клиенты о работе мастерской." },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="отзывы"
        title="Что говорят о мастерской"
        lead="Отзывы клиентов о работах Марины — с сайта, из личных сообщений и социальных сетей. Все отзывы проходят модерацию мастера."
      />
      <div className="mx-auto max-w-4xl px-6 pb-24 lg:px-10">
        <ReviewsSection />
      </div>
    </SiteLayout>
  );
}
