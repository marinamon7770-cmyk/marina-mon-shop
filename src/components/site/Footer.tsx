import { Link } from "@tanstack/react-router";
import { Mail, Send } from "lucide-react";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border/60 bg-[var(--sand)]/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-4 lg:px-10">
        <div className="lg:col-span-2">
          <div className="font-display text-3xl text-foreground">Марина Моненок</div>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Мастерская плетёных вещей и кожи. Короба, корзины, сумки и аксессуары — вручную, в Тольятти.
          </p>
          <div className="thread-divider mt-8 w-32" />
        </div>

        <div>
          <div className="tag-label">Навигация</div>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/" className="hover:text-primary">Главная</Link></li>
            <li><Link to="/catalog" className="hover:text-primary">Каталог</Link></li>
            <li><Link to="/calculator" className="hover:text-primary">Калькулятор</Link></li>
            <li><Link to="/about" className="hover:text-primary">О мастерской</Link></li>
            <li><Link to="/reviews" className="hover:text-primary">Отзывы</Link></li>
            <li><Link to="/delivery" className="hover:text-primary">Доставка и оплата</Link></li>
            <li><Link to="/contacts" className="hover:text-primary">Контакты</Link></li>
            <li><Link to="/cart" className="hover:text-primary">Корзина</Link></li>
          </ul>
        </div>

        <div>
          <div className="tag-label">Связь</div>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 hover:text-primary">
                <Mail className="h-4 w-4" /> {SITE.email}
              </a>
            </li>
            <li>
              <a href={SITE.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-primary">
                <Send className="h-4 w-4" /> Telegram {SITE.telegramHandle}
              </a>
            </li>
            <li>
              <a href={SITE.vk} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-primary">
                <span className="inline-block h-4 w-4 text-center text-[10px] font-bold leading-4 border border-current">VK</span>
                {SITE.vkHandle}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-muted-foreground lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>© {new Date().getFullYear()} Мастерская Марины Моненок · Тольятти</div>
          <div className="flex flex-wrap gap-5">
            <Link to="/privacy" className="hover:text-primary">Политика конфиденциальности</Link>
            <Link to="/offer" className="hover:text-primary">Публичная оферта</Link>
            <Link to="/admin" className="hover:text-primary">Вход в админку</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
