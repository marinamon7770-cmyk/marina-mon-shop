import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { QuestionForm } from "@/components/site/QuestionForm";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import heroImg from "@/assets/hero-weaving.jpg";
import bagsImg from "@/assets/collection-bags.jpg";
import storageImg from "@/assets/collection-storage.jpg";
import leatherImg from "@/assets/collection-leather.jpg";
import basketsImg from "@/assets/collection-baskets.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Мастерская Марины Моненок — плетёные изделия и кожа, Тольятti" },
      {
        name: "description",
        content:
          "Авторские плетёные сумки, корзины, системы хранения и изделия из кожи ручной работы из Тольятти. Доставка по России.",
      },
      { property: "og:title", content: "Мастерская Марины Моненок" },
      { property: "og:description", content: "Плетёные изделия и кожа ручной работы. Тольятти." },
      { property: "og:image", content: heroImg },
    ],
  }),
  component: Home,
});

const COLLECTIONS = [
  { slug: "bags", title: "Сумки", key: "home_collection_bags", img: bagsImg, sub: "плетёное с кожей" },
  { slug: "storage", title: "Системы хранения", key: "home_collection_storage", img: storageImg, sub: "для дома и быта" },
  { slug: "baskets", title: "Корзины", key: "home_collection_baskets", img: basketsImg, sub: "для пикника и декора" },
  { slug: "leather", title: "Кожа", key: "home_collection_leather", img: leatherImg, sub: "ремни и аксессуары" },
];

function Home() {
  const settings = useQuery({
    queryKey: ["home-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["home_hero", ...COLLECTIONS.map((c) => c.key)]);
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { if (r.value) map[r.key] = r.value; });
      return map;
    },
  });
  const heroSrc = settings.data?.home_hero || heroImg;

  const featured = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, slug, name, price, cover_url, short_description")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .limit(4);
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      {/* Hero — асимметричный, без шаблонной центральной композиции */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:py-28">
          <div className="lg:col-span-6 lg:pt-12">
            <p className="tag-label">мастерская · Тольятти</p>
            <h1 className="font-display mt-8 text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Сплетено
              <br />
              <span className="italic text-primary">руками,</span>
              <br />
              сшито
              <br />
              для жизни.
            </h1>
            <p className="mt-8 max-w-md text-base leading-relaxed text-muted-foreground">
              Сумки, корзины и аксессуары из лозы, ротанга и натуральной кожи.
              Каждая вещь делается в одной паре рук — Марины Моненок — и хранит тепло этой работы.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-3 bg-primary px-7 py-4 text-sm uppercase tracking-[0.22em] text-primary-foreground transition-colors hover:bg-primary/90"
              >
                В каталог <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/about"
                className="text-sm uppercase tracking-[0.22em] text-foreground underline-offset-8 hover:underline"
              >
                История мастерской
              </Link>
            </div>
          </div>

          <div className="relative lg:col-span-6">
            <div className="aspect-[4/5] overflow-hidden">
              <img
              <img
                src={heroSrc}
                alt="Руки мастера плетут корзину"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden bg-background p-6 shadow-[var(--shadow-warm)] sm:block lg:-left-12">
              <div className="font-display text-3xl italic text-primary">«нить за нитью»</div>
              <div className="mt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                — принцип мастерской
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Манифест */}
      <section className="border-y border-border/60 bg-[var(--sand)]/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-3 lg:px-10">
          {[
            { n: "01", t: "Натуральные материалы", d: "Ива, ротанг, лоза и кожа растительного дубления." },
            { n: "02", t: "Только ручная работа", d: "Никаких станков и тиражей. Партия равна одному изделию." },
            { n: "03", t: "Сделано в Тольятти", d: "Изготовление, упаковка и отправка — из мастерской." },
          ].map((b) => (
            <div key={b.n}>
              <div className="font-display text-5xl text-[var(--gold)]">{b.n}</div>
              <div className="thread-divider mt-4 w-12 mx-0" />
              <h3 className="font-display mt-6 text-2xl">{b.t}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Коллекции — журнальная сетка */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="tag-label">коллекции</p>
            <h2 className="font-display mt-6 text-4xl sm:text-5xl">Что в мастерской</h2>
          </div>
          <Link
            to="/catalog"
            className="hidden text-sm uppercase tracking-[0.2em] text-foreground hover:text-primary sm:inline"
          >
            Весь каталог →
          </Link>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {COLLECTIONS.map((c, i) => (
            <Link
              key={c.slug}
              to="/catalog/$category"
              params={{ category: c.slug }}
              className={`group block hover-lift ${i % 2 === 0 ? "lg:mt-0" : "lg:mt-12"}`}
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={c.img}
                  alt={c.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--gold)]">{c.sub}</div>
                <div className="font-display mt-1 text-2xl">{c.title}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products from DB */}
      {featured.data && featured.data.length > 0 && (
        <section className="border-t border-border/60 bg-[var(--linen)]">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
            <p className="tag-label">избранное</p>
            <h2 className="font-display mt-6 text-4xl sm:text-5xl">Новые изделия</h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {featured.data.map((p) => (
                <Link
                  key={p.id}
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  className="group block"
                >
                  <div className="aspect-square overflow-hidden bg-[var(--sand)]/60">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-display text-3xl text-muted-foreground/60">
                        M.M.
                      </div>
                    )}
                  </div>
                  <h3 className="font-display mt-4 text-xl">{p.name}</h3>
                  <div className="mt-1 text-sm text-primary">{formatPrice(p.price as unknown as number)}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Цитата */}
      <section className="mx-auto max-w-4xl px-6 py-28 text-center lg:px-10">
        <div className="thread-divider mx-auto w-16" />
        <blockquote className="font-display mt-10 text-3xl italic leading-snug sm:text-4xl">
          «Плетение — это разговор между рукой и материалом.<br />
          Главное — никуда не торопиться.»
        </blockquote>
        <div className="mt-8 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Марина Моненок
        </div>
      </section>

      {/* Question form */}
      <section className="border-t border-border/60 bg-[var(--sand)]/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:px-10">
          <div>
            <p className="tag-label">напишите</p>
            <h2 className="font-display mt-6 text-4xl sm:text-5xl">
              Хочется
              <br />
              <span className="italic text-primary">особенное?</span>
            </h2>
            <p className="mt-6 max-w-md text-muted-foreground">
              Расскажите, что задумали — размер, цвет, материал. Сделаю изделие под вас или
              подскажу, что есть в готовых. Отвечаю лично, обычно в течение дня.
            </p>
          </div>
          <div>
            <QuestionForm />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
