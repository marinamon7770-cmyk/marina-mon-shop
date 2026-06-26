// Server-only Telegram helpers (gateway calls + admin chat ID lookup).
// Never import this file from client-reachable modules at top level.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function gatewayFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const tgKey = process.env.TELEGRAM_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!tgKey) throw new Error("Telegram не подключён (нет TELEGRAM_API_KEY)");
  return fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": tgKey,
      "Content-Type": "application/json",
    },
  });
}

export async function getAdminChatId(): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("admin_settings")
    .select("value")
    .eq("key", "telegram_admin_chat_id")
    .maybeSingle();
  return data?.value ?? null;
}

export async function sendTelegramMessage(text: string, chatIdOverride?: string): Promise<{ ok: boolean; error?: string }> {
  const chatId = chatIdOverride ?? (await getAdminChatId());
  if (!chatId) return { ok: false, error: "Telegram chat ID не настроен" };
  const res = await gatewayFetch("/sendMessage", {
    method: "POST",
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) {
    return { ok: false, error: `Telegram API ${res.status}: ${JSON.stringify(body)}` };
  }
  return { ok: true };
}

export async function getBotInfo(): Promise<{ ok: boolean; username?: string; first_name?: string; error?: string }> {
  try {
    const res = await gatewayFetch("/getMe", { method: "POST", body: "{}" });
    const body = await res.json();
    if (!res.ok || !body?.ok) return { ok: false, error: JSON.stringify(body) };
    return { ok: true, username: body.result?.username, first_name: body.result?.first_name };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getRecentChats(): Promise<Array<{ chat_id: string; title: string; from: string }>> {
  const res = await gatewayFetch("/getUpdates", {
    method: "POST",
    body: JSON.stringify({ limit: 50, allowed_updates: ["message"] }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) return [];
  const seen = new Map<string, { chat_id: string; title: string; from: string }>();
  for (const upd of body.result ?? []) {
    const msg = upd.message ?? upd.edited_message;
    const chat = msg?.chat;
    if (!chat?.id) continue;
    const id = String(chat.id);
    if (seen.has(id)) continue;
    const title: string =
      chat.title ||
      [chat.first_name, chat.last_name].filter(Boolean).join(" ") ||
      chat.username ||
      id;
    const from = msg?.from
      ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") ||
        msg.from.username ||
        ""
      : "";
    seen.set(id, { chat_id: id, title, from });
  }
  return Array.from(seen.values());
}

export function formatOrderMessage(order: {
  customer_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  address: string | null;
  delivery_method: string | null;
  comment: string | null;
  total: number;
}, items: Array<{ product_name: string; price: number; quantity: number }>): string {
  const lines: string[] = [];
  lines.push(`🛒 <b>Новая заявка с сайта</b>`);
  lines.push("");
  lines.push(`👤 <b>${escapeHtml(order.customer_name)}</b>`);
  lines.push(`📞 ${escapeHtml(order.phone)}`);
  if (order.email) lines.push(`✉️ ${escapeHtml(order.email)}`);
  if (order.city) lines.push(`🏙 ${escapeHtml(order.city)}`);
  if (order.address) lines.push(`📍 ${escapeHtml(order.address)}`);
  if (order.delivery_method) lines.push(`🚚 ${escapeHtml(order.delivery_method)}`);
  if (order.comment) lines.push(`💬 ${escapeHtml(order.comment)}`);
  lines.push("");
  lines.push(`<b>Товары:</b>`);
  for (const i of items) {
    lines.push(`• ${escapeHtml(i.product_name)} × ${i.quantity} — ${Math.round(i.price * i.quantity)} ₽`);
  }
  lines.push("");
  lines.push(`<b>Итого: ${Math.round(order.total)} ₽</b>`);
  return lines.join("\n");
}

export function formatQuestionMessage(q: {
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  product_slug: string | null;
}): string {
  const lines: string[] = [];
  lines.push(`❓ <b>Новый вопрос с сайта</b>`);
  lines.push("");
  lines.push(`👤 <b>${escapeHtml(q.name)}</b>`);
  if (q.phone) lines.push(`📞 ${escapeHtml(q.phone)}`);
  if (q.email) lines.push(`✉️ ${escapeHtml(q.email)}`);
  if (q.product_slug) lines.push(`📦 Товар: ${escapeHtml(q.product_slug)}`);
  lines.push("");
  lines.push(escapeHtml(q.message));
  return lines.join("\n");
}

export function formatChatTicketMessage(args: {
  customer_name: string;
  customer_phone: string;
  items: Array<{ product_name: string; quantity: number; note?: string }>;
  notes: string | null;
}): string {
  const lines: string[] = [];
  lines.push(`💬 <b>Заявка из чата (ИИ-помощник)</b>`);
  lines.push("");
  lines.push(`👤 <b>${escapeHtml(args.customer_name)}</b>`);
  lines.push(`📞 ${escapeHtml(args.customer_phone)}`);
  lines.push("");
  lines.push(`<b>Товары:</b>`);
  for (const i of args.items) {
    lines.push(`• ${escapeHtml(i.product_name)} × ${i.quantity}${i.note ? ` — ${escapeHtml(i.note)}` : ""}`);
  }
  if (args.notes) {
    lines.push("");
    lines.push(`💬 ${escapeHtml(args.notes)}`);
  }
  return lines.join("\n");
}

export function formatEscalationMessage(args: {
  customer_name: string;
  customer_phone: string;
  reason?: string;
}): string {
  const lines: string[] = [];
  lines.push(`🚨 <b>Чат передан оператору</b>`);
  lines.push("");
  lines.push(`👤 <b>${escapeHtml(args.customer_name)}</b>`);
  lines.push(`📞 ${escapeHtml(args.customer_phone)}`);
  if (args.reason) {
    lines.push("");
    lines.push(`Причина: ${escapeHtml(args.reason)}`);
  }
  return lines.join("\n");
}
