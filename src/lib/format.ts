export function formatPrice(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export function slugify(input: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return input
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Преобразует ссылки Google Drive в прямые URL изображений.
 * Поддерживает форматы:
 *  - https://drive.google.com/file/d/<ID>/view?...
 *  - https://drive.google.com/open?id=<ID>
 *  - https://drive.google.com/uc?id=<ID>&export=...
 * Возвращает URL вида https://lh3.googleusercontent.com/d/<ID>=w1200,
 * который надёжно работает для hotlink'а в <img>.
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const u = url.trim();
  if (!u) return "";

  // /file/d/<ID>/
  const m1 = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m1) return `https://lh3.googleusercontent.com/d/${m1[1]}=w1600`;

  // ?id=<ID> или &id=<ID>
  const m2 = u.match(/drive\.google\.com\/[^?]*\?(?:.*&)?id=([a-zA-Z0-9_-]{20,})/);
  if (m2) return `https://lh3.googleusercontent.com/d/${m2[1]}=w1600`;

  // открытая ссылка вида https://drive.google.com/open?id=...
  const m3 = u.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m3 && u.includes("google")) return `https://lh3.googleusercontent.com/d/${m3[1]}=w1600`;

  return u;
}
