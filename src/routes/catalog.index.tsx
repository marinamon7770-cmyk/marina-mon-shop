import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { ProductCard } from "@/components/site/ProductCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/catalog/")({
  head: () => ({
    meta: [
      { title: "Каталог — Мастерская Марины Моненок" },
      { name: "description", content: "Полный каталог: плетёные сумки, корзины, системы хранения и изделия из кожи." },
      { property: "og:title", content: "Каталог — Мастерская Марины Моненок" },
      { property: "og:description", content: "Сумки, корзины, системы хранения и кожа ручной работы." },
    ],
  }),
  component: CatalogIndex,
});

function CatalogIndex() {
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const products = useQuery({
    queryKey: ["products-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, slug, name, price, cover_url, short_description, category_id")
        .eq("is_published", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="каталог"
        title="Изделия мастерской"
        lead="Сумки, корзины, системы хранения и изделия из кожи. Выберите раздел или посмотрите всё."
      />

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="flex flex-wrap gap-3">
          <Link
            to="/catalog"
            className="border border-foreground bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-background"
          >
            Все
          </Link>
          {categories.data?.map((c) => (
            <Link
              key={c.id}
              to="/catalog/$category"
              params={{ category: c.slug }}
              className="border border-foreground/30 px-5 py-2 text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:border-foreground"
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="mt-14">
          {products.isLoading ? (
            <ProductGridSkeleton />
          ) : products.data && products.data.length > 0 ? (
            <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {products.data.map((p) => (
                <ProductCard key={p.id} product={p as never} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] animate-pulse bg-[var(--sand)]/60" />
          <div className="mt-4 h-4 w-1/2 animate-pulse bg-[var(--sand)]/60" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="border border-dashed border-border bg-[var(--linen)] py-24 text-center">
      <p className="tag-label mx-auto">скоро здесь будут изделия</p>
      <h3 className="font-display mt-6 text-3xl">Каталог наполняется</h3>
      <p className="mt-3 text-sm text-muted-foreground">
        Марина добавит новые работы в ближайшее время.
      </p>
    </div>
  );
}
