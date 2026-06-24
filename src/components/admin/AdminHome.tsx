import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "./AdminProducts";
import heroImg from "@/assets/hero-weaving.jpg";
import bagsImg from "@/assets/collection-bags.jpg";
import storageImg from "@/assets/collection-storage.jpg";
import basketsImg from "@/assets/collection-baskets.jpg";
import leatherImg from "@/assets/collection-leather.jpg";

const SLOTS: { key: string; label: string; fallback: string }[] = [
  { key: "home_hero", label: "Главное фото (hero)", fallback: heroImg },
  { key: "home_collection_bags", label: "Коллекция: Сумки", fallback: bagsImg },
  { key: "home_collection_storage", label: "Коллекция: Системы хранения", fallback: storageImg },
  { key: "home_collection_baskets", label: "Коллекция: Корзины", fallback: basketsImg },
  { key: "home_collection_leather", label: "Коллекция: Кожа", fallback: leatherImg },
];

export function AdminHome() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { if (r.value) map[r.key] = r.value; });
      return map;
    },
  });

  async function setValue(key: string, value: string | null) {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success("Сохранено");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    qc.invalidateQueries({ queryKey: ["home-settings"] });
  }

  if (settings.isLoading) return <div className="text-muted-foreground">Загрузка…</div>;

  return (
    <div className="space-y-10">
      <div>
        <p className="tag-label">главная страница</p>
        <h2 className="font-display mt-4 text-2xl">Фото на главной</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Загрузите новое фото — оно сразу заменит изображение на сайте. Кнопка «Вернуть стандартное» убирает замену.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {SLOTS.map((s) => {
          const current = settings.data?.[s.key];
          const shown = current || s.fallback;
          return (
            <div key={s.key} className="border border-border p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="font-display text-lg">{s.label}</div>
                {current && (
                  <button
                    type="button"
                    onClick={() => setValue(s.key, null)}
                    className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
                  >
                    Вернуть стандартное
                  </button>
                )}
              </div>
              <div className="mb-4 aspect-[4/3] overflow-hidden bg-secondary/30">
                <img src={shown} alt="" className="h-full w-full object-cover" />
              </div>
              <ImageUpload value="" onChange={(url) => url && setValue(s.key, url)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
