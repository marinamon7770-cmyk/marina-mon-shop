import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { QuestionForm } from "@/components/site/QuestionForm";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatPrice, normalizeImageUrl } from "@/lib/format";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Изделие — Марина Моненок` },
      { name: "description", content: `Авторское изделие мастерской Марины Моненок: ${params.slug}` },
    ],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="font-display text-4xl">Изделие не найдено</h1>
        <Link to="/catalog" className="mt-8 inline-block text-sm uppercase tracking-[0.2em] text-primary">
          ← в каталог
        </Link>
      </div>
    </SiteLayout>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const cart = useCart();
  const [active, setActive] = useState(0);

  const productQ = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, product_images(*)")
        .eq("slug", slug)
        .maybeSingle();
      return data;
    },
  });

  if (productQ.isSuccess && !productQ.data) throw notFound();
  if (productQ.isLoading || !productQ.data) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="aspect-square animate-pulse bg-[var(--sand)]/60" />
            <div className="space-y-4">
              <div className="h-10 w-2/3 animate-pulse bg-[var(--sand)]/60" />
              <div className="h-6 w-1/3 animate-pulse bg-[var(--sand)]/60" />
            </div>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const p = productQ.data;
  type ImgRow = { id: string; url: string; alt: string | null; sort_order: number };
  const images: { url: string; alt: string | null }[] = [];
  if (p.cover_url) images.push({ url: p.cover_url, alt: p.name });
  for (const img of ((p.product_images as ImgRow[] | null) ?? []).sort((a, b) => a.sort_order - b.sort_order)) {
    if (img.url !== p.cover_url) images.push({ url: img.url, alt: img.alt });
  }

  const addToCart = () => {
    cart.add({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: Number(p.price),
      image: p.cover_url ?? undefined,
    });
    toast.success("Добавлено в корзину");
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-20">
        <nav className="mb-10 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Link to="/" className="hover:text-primary">главная</Link>
          <span className="mx-2">·</span>
          <Link to="/catalog" className="hover:text-primary">каталог</Link>
          <span className="mx-2">·</span>
          <span className="text-foreground">{p.name}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="aspect-square overflow-hidden bg-[var(--sand)]/60">
              {images[active] ? (
                <img src={images[active].url} alt={images[active].alt ?? p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center font-display text-6xl italic text-muted-foreground/60">M.M.</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`aspect-square overflow-hidden border ${i === active ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="tag-label">авторское изделие</p>
            <h1 className="font-display mt-6 text-4xl leading-tight sm:text-5xl">{p.name}</h1>
            <div className="font-display mt-5 text-3xl text-primary">{formatPrice(Number(p.price))}</div>

            {p.short_description && (
              <p className="mt-6 text-base leading-relaxed text-foreground/85">{p.short_description}</p>
            )}

            <dl className="mt-8 divide-y divide-border border-y border-border">
              {p.materials && <Row label="Материалы" value={p.materials} />}
              {p.dimensions && <Row label="Размеры" value={p.dimensions} />}
              {p.lead_time && <Row label="Срок изготовления" value={p.lead_time} />}
            </dl>

            <div className="mt-10 flex flex-wrap gap-3">
              <button
                onClick={addToCart}
                className="flex-1 bg-primary px-6 py-4 text-sm uppercase tracking-[0.2em] text-primary-foreground transition-colors hover:bg-primary/90 sm:flex-none sm:px-12"
              >
                В корзину
              </button>
              <a
                href="#question"
                className="flex-1 border border-foreground px-6 py-4 text-center text-sm uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground hover:text-background sm:flex-none sm:px-12"
              >
                Задать вопрос
              </a>
            </div>

            {p.description && (
              <div className="mt-12">
                <div className="thread-divider w-12 mx-0" />
                <p className="mt-8 whitespace-pre-line text-base leading-relaxed text-foreground/85">
                  {p.description}
                </p>
              </div>
            )}
          </div>
        </div>

        <section id="question" className="mt-32 border-t border-border/60 pt-16">
          <p className="tag-label">вопрос об этом изделии</p>
          <h2 className="font-display mt-6 text-3xl sm:text-4xl">Хотите узнать больше?</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Марина расскажет про материалы, поможет с выбором размера и сделает фото с разных
            ракурсов.
          </p>
          <div className="mt-10 max-w-2xl">
            <QuestionForm productSlug={p.slug} />
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-4 text-sm">
      <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-foreground">{value}</dd>
    </div>
  );
}
