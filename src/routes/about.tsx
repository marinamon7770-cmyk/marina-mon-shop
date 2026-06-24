import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import heroImg from "@/assets/hero-weaving.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "О мастерской — Марина Моненок, Тольятти" },
      { name: "description", content: "О Марине Моненок и её мастерской плетёных изделий и кожи в Тольятти." },
      { property: "og:title", content: "Мастерская Марины Моненок" },
      { property: "og:description", content: "История мастера и философия мастерской." },
      { property: "og:image", content: heroImg },
    ],
  }),
  component: About,
});

function About() {
  return (
    <SiteLayout>
      <section className="mx-auto grid max-w-7xl gap-16 px-6 py-16 lg:grid-cols-12 lg:px-10 lg:py-24">
        <div className="lg:col-span-5">
          <p className="tag-label">мастерская</p>
          <h1 className="font-display mt-6 text-5xl leading-tight sm:text-6xl">
            Марина
            <br />
            <span className="italic">Моненок</span>
          </h1>
          <div className="thread-divider mt-8 w-16 mx-0" />
          <p className="mt-8 text-lg leading-relaxed text-foreground/85">
            Мастер по плетению из лозы, ротанга и работе с натуральной кожей. Живу и работаю в
            Тольятти. Веду небольшую мастерскую, где каждое изделие проживает свой путь — от первого
            прута до фирменной коробки.
          </p>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            В работе мне важно две вещи: красота формы и честность материала. Я не использую краски и
            искусственные пропитки — только то, что подарила природа.
          </p>
        </div>
        <div className="relative lg:col-span-7">
          <div className="aspect-[5/6] overflow-hidden">
            <img src={heroImg} alt="Мастерская" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-[var(--sand)]/40">
        <div className="mx-auto grid max-w-5xl gap-12 px-6 py-20 md:grid-cols-2 lg:px-10">
          <div>
            <p className="tag-label">философия</p>
            <h2 className="font-display mt-6 text-3xl">Медленное ремесло</h2>
            <p className="mt-4 text-foreground/85 leading-relaxed">
              Каждая корзина, сумка или органайзер — это десятки часов кропотливой работы. Здесь
              нельзя торопиться. И именно поэтому изделие, сделанное так, проживёт с вами десятки
              лет.
            </p>
          </div>
          <div>
            <p className="tag-label">материалы</p>
            <h2 className="font-display mt-6 text-3xl">Природный круг</h2>
            <p className="mt-4 text-foreground/85 leading-relaxed">
              Ива и лоза — собираются и обрабатываются вручную. Ротанг — закупается у проверенных
              поставщиков. Кожа — растительного дубления, без хрома и тяжёлых металлов.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center lg:px-10">
        <blockquote className="font-display text-3xl italic leading-snug">
          «Хорошее изделие — это когда хочется к нему возвращаться руками.»
        </blockquote>
        <div className="mt-6 text-xs uppercase tracking-[0.3em] text-muted-foreground">— Марина</div>
        <Link to="/catalog" className="mt-12 inline-block bg-primary px-7 py-4 text-sm uppercase tracking-[0.22em] text-primary-foreground">
          посмотреть изделия
        </Link>
      </section>
    </SiteLayout>
  );
}
