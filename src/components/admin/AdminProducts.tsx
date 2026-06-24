import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, slugify } from "@/lib/format";
import { Empty } from "./AdminOrders";

type Category = { id: string; slug: string; name: string };
type Product = {
  id: string; slug: string; name: string; price: number; category_id: string | null;
  short_description: string | null; description: string | null; materials: string | null;
  dimensions: string | null; lead_time: string | null; cover_url: string | null;
  is_published: boolean; sort_order: number;
};

export function AdminProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
  const cats = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, slug, name").order("sort_order");
      return (data ?? []) as Category[];
    },
  });

  async function remove(id: string) {
    if (!confirm("Удалить товар?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Всего: {products.data?.length ?? 0}</div>
        <button onClick={() => setEditing({ is_published: true, price: 0, sort_order: 0 })}
          className="inline-flex items-center gap-2 bg-primary px-4 py-2 text-xs uppercase tracking-widest text-primary-foreground">
          <Plus className="h-4 w-4" /> Новый товар
        </button>
      </div>

      {products.isLoading ? <div className="text-muted-foreground">Загрузка…</div>
        : !products.data || products.data.length === 0 ? <Empty text="Товаров пока нет. Добавьте первый." />
        : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/30 text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Название</th>
                  <th className="px-4 py-3">Категория</th>
                  <th className="px-4 py-3">Цена</th>
                  <th className="px-4 py-3">Опубликован</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.data.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.cover_url && <img src={p.cover_url} alt="" className="h-10 w-10 object-cover" />}
                        <div>
                          <div className="font-display">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">/{p.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{cats.data?.find((c) => c.id === p.category_id)?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-primary font-display">{formatPrice(p.price)}</td>
                    <td className="px-4 py-3 text-xs">{p.is_published ? "Да" : "Нет"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditing(p)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-primary"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => remove(p.id)} className="ml-1 inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {editing && (
        <ProductEditor
          initial={editing}
          categories={cats.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={(keepOpen, saved) => {
            qc.invalidateQueries({ queryKey: ["admin-products"] });
            if (keepOpen && saved) setEditing(saved);
            else setEditing(null);
          }}
        />
      )}
    </div>
  );
}

const SIGNED_TTL = 60 * 60 * 24 * 365 * 10; // 10 years

async function uploadToBucket(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "31536000", upsert: false, contentType: file.type,
  });
  if (up.error) throw up.error;
  const signed = await supabase.storage.from("product-images").createSignedUrl(path, SIGNED_TTL);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

function ProductEditor({ initial, categories, onClose, onSaved }: {
  initial: Partial<Product>;
  categories: Category[];
  onClose: () => void;
  onSaved: (keepOpen?: boolean, saved?: Partial<Product>) => void;
}) {
  const [form, setForm] = useState<Partial<Product>>(initial);
  const [busy, setBusy] = useState(false);
  const isNew = !initial.id;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return toast.error("Укажите название");
    const slug = form.slug?.trim() || slugify(form.name);
    const payload = {
      slug,
      name: form.name,
      price: Number(form.price ?? 0),
      category_id: form.category_id || null,
      short_description: form.short_description || null,
      description: form.description || null,
      materials: form.materials || null,
      dimensions: form.dimensions || null,
      lead_time: form.lead_time || null,
      cover_url: form.cover_url || null,
      is_published: !!form.is_published,
      sort_order: Number(form.sort_order ?? 0),
    };
    setBusy(true);
    const res = isNew
      ? await supabase.from("products").insert(payload).select().single()
      : await supabase.from("products").update(payload).eq("id", initial.id!).select().single();
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(isNew ? "Товар создан — теперь можно добавить фото галереи" : "Сохранено");
    if (isNew) onSaved(true, res.data as Product);
    else onSaved(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4">
      <form onSubmit={save} className="w-full max-w-2xl bg-background p-8 my-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="tag-label">{isNew ? "новый товар" : "редактирование"}</p>
            <h3 className="font-display mt-2 text-2xl">{form.name || "Без названия"}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-6 space-y-4">
          <F label="Название*"><input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} required /></F>
          <F label="Slug (URL)"><input value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={form.name ? slugify(form.name) : ""} className={inp} /></F>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Цена ₽*"><input type="number" min={0} value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className={inp} required /></F>
            <F label="Категория">
              <select value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })} className={inp}>
                <option value="">— без категории —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
          </div>
          <F label="Фото обложки">
            <ImageUpload value={form.cover_url ?? ""} onChange={(url) => setForm({ ...form, cover_url: url })} />
          </F>
          {!isNew && initial.id && (
            <F label="Галерея (дополнительные фото)">
              <GalleryEditor productId={initial.id} />
            </F>
          )}
          {isNew && (
            <p className="text-xs text-muted-foreground">
              После сохранения товара появится возможность добавить галерею фото.
            </p>
          )}
          <F label="Краткое описание"><input value={form.short_description ?? ""} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className={inp} /></F>
          <F label="Описание"><textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} className={inp} /></F>
          <div className="grid gap-4 sm:grid-cols-3">
            <F label="Материалы"><input value={form.materials ?? ""} onChange={(e) => setForm({ ...form, materials: e.target.value })} className={inp} /></F>
            <F label="Размеры"><input value={form.dimensions ?? ""} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} className={inp} /></F>
            <F label="Срок изготовления"><input value={form.lead_time ?? ""} onChange={(e) => setForm({ ...form, lead_time: e.target.value })} className={inp} /></F>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Порядок (меньше — выше)"><input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className={inp} /></F>
            <label className="flex items-center gap-3 pt-7">
              <input type="checkbox" checked={!!form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
              <span className="text-sm">Опубликовать на сайте</span>
            </label>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button type="submit" disabled={busy} className="flex-1 bg-primary px-6 py-3 text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-60">
            {busy ? "..." : "Сохранить"}
          </button>
          <button type="button" onClick={onClose} className="border border-foreground px-6 py-3 text-sm uppercase tracking-widest">Отмена</button>
        </div>
      </form>
    </div>
  );
}

const inp = "w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Можно загрузить только изображение");
    if (file.size > 8 * 1024 * 1024) return toast.error("Файл больше 8 МБ");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    onChange(data.publicUrl);
    toast.success("Фото загружено");
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-8 text-center text-xs transition ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-secondary/20 hover:border-foreground/40"
        }`}
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <div className="text-muted-foreground">
          {uploading ? "Загрузка…" : "Перетащите фото сюда или нажмите, чтобы выбрать"}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">JPG · PNG · WEBP · до 8 МБ</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {value && (
        <div className="flex items-start gap-3">
          <img src={value} alt="" className="h-24 w-24 border border-border object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-destructive"
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}
