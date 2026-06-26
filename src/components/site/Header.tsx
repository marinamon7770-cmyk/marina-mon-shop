import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import logo from "@/assets/logo.png.asset.json";

const NAV = [
  { to: "/catalog", label: "Каталог" },
  { to: "/about", label: "Мастерская" },
  { to: "/reviews", label: "Отзывы" },
  { to: "/delivery", label: "Доставка" },
  { to: "/contacts", label: "Контакты" },
] as const;

export function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
        <Link to="/" className="flex items-center gap-3" aria-label="На главную">
          <img src={logo.url} alt="" className="h-12 w-12 object-contain" />
          <div className="leading-tight">
            <div className="font-display text-lg text-foreground">Марина Моненок</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              мастерская · Тольятти
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm uppercase tracking-[0.18em] text-foreground/80 transition-colors hover:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/cart"
            className="relative inline-flex items-center gap-2 border border-foreground/20 px-4 py-2 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline uppercase tracking-widest text-xs">Корзина</span>
            {count > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Меню"
            className="inline-flex items-center justify-center border border-foreground/20 p-2 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border/60 bg-background lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col px-6 py-4">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="border-b border-border/40 py-3 text-sm uppercase tracking-[0.18em] text-foreground/80"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
