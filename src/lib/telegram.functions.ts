import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public: called from cart after order insert. We re-fetch the order via
// admin client and send to admin Telegram. Safe because we only echo data
// that an admin would see in the dashboard.
export const notifyNewOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tg = await import("@/lib/telegram.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("customer_name,phone,email,city,address,delivery_method,comment,total")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { ok: false, error: "order not found" };
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_name,price,quantity")
      .eq("order_id", data.orderId);
    const text = tg.formatOrderMessage(order, items ?? []);
    return await tg.sendTelegramMessage(text);
  });

export const notifyNewQuestion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ questionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tg = await import("@/lib/telegram.server");
    const { data: q } = await supabaseAdmin
      .from("questions")
      .select("name,email,phone,message,product_slug")
      .eq("id", data.questionId)
      .maybeSingle();
    if (!q) return { ok: false, error: "question not found" };
    return await tg.sendTelegramMessage(tg.formatQuestionMessage(q));
  });

// --- Admin-only configuration ---

async function assertAdmin(context: unknown): Promise<void> {
  const ctx = context as {
    supabase: { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> } } } } };
    userId: string;
  };
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const getTelegramAdminConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tg = await import("@/lib/telegram.server");
    const { data: row } = await supabaseAdmin
      .from("admin_settings")
      .select("value")
      .eq("key", "telegram_admin_chat_id")
      .maybeSingle();
    const bot = await tg.getBotInfo();
    return {
      chatId: row?.value ?? null,
      bot,
    };
  });

export const fetchTelegramRecentChats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const tg = await import("@/lib/telegram.server");
    return { chats: await tg.getRecentChats() };
  });

export const saveTelegramAdminChatId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ chatId: z.string().trim().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .upsert({ key: "telegram_admin_chat_id", value: data.chatId, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTelegramTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const tg = await import("@/lib/telegram.server");
    return await tg.sendTelegramMessage(
      "✅ <b>Тест уведомлений</b>\nЕсли вы видите это сообщение — бот настроен корректно.",
    );
  });
