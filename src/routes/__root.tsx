import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/lib/cart";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="tag-label mx-auto">страница 404</p>
        <h1 className="font-display mt-6 text-6xl text-foreground">Нить оборвалась</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Этой страницы больше нет, или её никогда не существовало.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-primary px-6 py-3 text-sm uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="tag-label mx-auto">ошибка</p>
        <h1 className="font-display mt-6 text-4xl text-foreground">Страница не загрузилась</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Попробуйте обновить или вернуться на главную.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center bg-primary px-6 py-3 text-sm uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Попробовать ещё
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center border border-foreground px-6 py-3 text-sm uppercase tracking-widest text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Мастерская Марины Моненок — плетёные изделия и кожа, Тольятти" },
      {
        name: "description",
        content:
          "Авторские плетёные сумки, корзины, системы хранения и изделия из кожи ручной работы. Мастерская Марины Моненок, Тольятти.",
      },
      { property: "og:title", content: "Мастерская Марины Моненок" },
      {
        property: "og:description",
        content: "Плетёные изделия и кожа ручной работы. Тольятти.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Montserrat:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <Outlet />
        <Toaster position="top-center" />
      </CartProvider>
    </QueryClientProvider>
  );
}
