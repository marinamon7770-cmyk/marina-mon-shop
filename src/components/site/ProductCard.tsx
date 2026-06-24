import { Link } from "@tanstack/react-router";
import { formatPrice, normalizeImageUrl } from "@/lib/format";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: number | string;
  cover_url?: string | null;
  short_description?: string | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link to="/product/$slug" params={{ slug: product.slug }} className="group block">
      <div className="aspect-[4/5] overflow-hidden bg-[var(--sand)]/50">
        {product.cover_url ? (
          <img
            src={product.cover_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-4xl italic text-muted-foreground/60">
            M.M.
          </div>
        )}
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl leading-tight">{product.name}</h3>
          {product.short_description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{product.short_description}</p>
          )}
        </div>
        <div className="font-display whitespace-nowrap text-base text-primary">
          {formatPrice(product.price as number)}
        </div>
      </div>
    </Link>
  );
}
