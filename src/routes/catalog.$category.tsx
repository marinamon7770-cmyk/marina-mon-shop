import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductGridSkeleton, EmptyState } from "./catalog.index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/catalog/$category")({
  head: ({ params }) => ({
    meta: [
      { title: `${prettyName(params.category)} — Каталог · Марина Моненок` },
      { name: "description", content: `Раздел каталога: ${prettyName(params.category).toLowerCase()} ручной работы.` },
    ],
  }),
  component: CategoryPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="font-display text-4xl">Категория не найдена</h1>
        <Link to="/catalog" className="mt-8 inline-block text-sm uppercase tracking-[0.2em] text-primary">
          ← в каталог
        </Link>
      </div>
    </SiteLayout>
  ),
});

const PRETTY: Record<string, string> = {
  bags: "Сумки",
  storage: "Системы хранения",
  baskets: "Корзины",
  leather: "Кожа",
  special: "Особое",
};
function prettyName(slug: string) { return PRETTY[slug] ?? slug; }

function CategoryPage() {
  const { category } = Route.useParams();

  const categoryQuery = useQuery({
    queryKey: ["category", category],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("slug", category).maybeSingle();
      return data;
    },
  });

  const products = useQuery({
    queryKey: ["products", category],
    queryFn: async () => {
      const cat = await supabase.from("categories").select("id").eq("slug", category).maybeSingle();
      if (!cat.data) return [];
      const { data } = await supabase
        .from("products")
        .select("id, slug, name, price, cover_url, short_description")
        .eq("is_published", true)
        .eq("category_id", cat.data.id)
        .order("sort_order");
      return data ?? [];
    },
  });

  if (categoryQuery.isSuccess && !categoryQuery.data) throw notFound();

  const name = categoryQuery.data?.name ?? prettyName(category);
  const desc = categoryQuery.data?.description;

  return (
    <SiteLayout>
      <PageHeader eyebrow="каталог" title={name} lead={desc ?? undefined} />
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <Link to="/catalog" className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary">
          ← все категории
        </Link>
        <div className="mt-10">
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
