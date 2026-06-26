import { createServerFn } from "@tanstack/react-start";
import { generateText, tool, stepCountIs, type ModelMessage } from "ai";
import { z } from "zod";

function normalizePhone(raw: string): string {
  return raw.replace(/\D+/g, "");
}

function validatePhone(raw: string): string {
  const n = normalizePhone(raw);
  if (n.length < 10 || n.length > 15) throw new Error("Некорректный номер телефона");
  return n;
}

const SYSTEM_PROMPT = `Ты — Марина, виртуальный помощник интернет-магазина «Мастерская Марины Моненок» (плетёные изделия и кожа ручной работы, Тольятти). Отвечай тепло, по-человечески, кратко и на русском.

Что ты делаешь:
- Помогаешь выбрать товар: уточняешь, для чего нужен (сумка/корзина/хранение/подарок), стиль, размер, цвет.
- Используй инструмент search_products для поиска и get_product для подробностей. Не выдумывай товары, цены или размеры — только из инструментов.
- Если клиент хочет купить конкретный товар из каталога — уточни количество и используй create_preorder_ticket, чтобы оформить предварительную заявку. Сообщи клиенту, что заявка отправлена и оператор скоро свяжется.
- Если клиент хочет товар нестандартного размера/цвета, спрашивает о скидке, индивидуальной цене, доставке/возврате/жалобе — предупреди, что переключаешь на живого оператора, и вызови escalate_to_operator с причиной.
- Если клиент явно просит человека/оператора — сразу вызови escalate_to_operator.
- Никогда не обещай скидок, индивидуальных цен, гарантий возврата. Это решает оператор.
- Не запрашивай и не подтверждай платежи. Только формирование предварительной заявки.

Пиши коротко, дружелюбно, без лишнего официоза. В одном ответе — одна мысль. Если нужны несколько уточнений — задавай по одному.`;

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function makeTools(supabase: Awaited<ReturnType<typeof loadAdmin>>, sessionId: string) {
  return {
    search_products: tool({
      description: "Ищет товары в каталоге по ключевым словам или категории. Возвращает до 8 товаров.",
      inputSchema: z.object({
        query: z.string().describe("Поисковый запрос — название, материал, назначение"),
        limit: z.number().int().min(1).max(8).optional(),
      }),
      execute: async ({ query, limit }) => {
        const lim = limit ?? 5;
        const { data, error } = await supabase
          .from("products")
          .select("id,slug,name,short_description,price,materials,dimensions,lead_time")
          .eq("is_published", true)
          .or(
            `name.ilike.%${query}%,short_description.ilike.%${query}%,description.ilike.%${query}%,materials.ilike.%${query}%`,
          )
          .limit(lim);
        if (error) return { error: error.message };
        return { products: data ?? [] };
      },
    }),
    get_product: tool({
      description: "Подробности о конкретном товаре по slug или id.",
      inputSchema: z.object({
        slug: z.string().optional(),
        id: z.string().uuid().optional(),
      }),
      execute: async ({ slug, id }) => {
        if (!slug && !id) return { error: "Нужен slug или id" };
        let q = supabase.from("products").select("*").eq("is_published", true).limit(1);
        if (slug) q = q.eq("slug", slug);
        if (id) q = q.eq("id", id);
        const { data, error } = await q;
        if (error) return { error: error.message };
        return { product: data?.[0] ?? null };
      },
    }),
    create_preorder_ticket: tool({
      description:
        "Оформить предварительную заявку: список товаров и заметка для оператора. Используй только когда клиент явно согласился оформить.",
      inputSchema: z.object({
        items: z
          .array(
            z.object({
              product_id: z.string().uuid(),
              product_name: z.string(),
              quantity: z.number().int().min(1).max(20),
              note: z.string().optional().describe("Размер, цвет, особые пожелания"),
            }),
          )
          .min(1),
        notes: z.string().optional().describe("Общая заметка для оператора"),
      }),
      execute: async ({ items, notes }) => {
        const { data, error } = await supabase
          .from("chat_tickets")
          .insert({ session_id: sessionId, items, notes: notes ?? null })
          .select("id")
          .single();
        if (error) return { error: error.message };
        await supabase.from("chat_sessions").update({ has_ticket: true }).eq("id", sessionId);
        // Telegram notification (best-effort)
        try {
          const { data: sess } = await supabase
            .from("chat_sessions")
            .select("customer_name, customer_phone")
            .eq("id", sessionId)
            .maybeSingle();
          const tg = await import("@/lib/telegram.server");
          await tg.sendTelegramMessage(
            tg.formatChatTicketMessage({
              customer_name: sess?.customer_name ?? "—",
              customer_phone: sess?.customer_phone ?? "—",
              items,
              notes: notes ?? null,
            }),
          );
        } catch {
          // ignore
        }
        return { ok: true, ticket_id: data.id };
      },
    }),
    escalate_to_operator: tool({
      description:
        "Переключить разговор на живого оператора. Использовать при вопросах о цене/скидках/нестандарте/жалобах/возврате или по просьбе клиента.",
      inputSchema: z.object({
        reason: z.string().describe("Кратко: почему нужен оператор"),
      }),
      execute: async ({ reason }) => {
        await supabase.from("chat_sessions").update({ escalated: true }).eq("id", sessionId);
        try {
          const { data: sess } = await supabase
            .from("chat_sessions")
            .select("customer_name, customer_phone")
            .eq("id", sessionId)
            .maybeSingle();
          const tg = await import("@/lib/telegram.server");
          await tg.sendTelegramMessage(
            tg.formatEscalationMessage({
              customer_name: sess?.customer_name ?? "—",
              customer_phone: sess?.customer_phone ?? "—",
              reason,
            }),
          );
        } catch {
          // ignore
        }
        return { ok: true, reason };
      },
    }),
  };
}

export const startChatSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(100),
        phone: z.string().min(5).max(40),
        existingSessionId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const phone = validatePhone(data.phone);
    const supabase = await loadAdmin();

    // If existing session id provided, validate ownership
    if (data.existingSessionId) {
      const { data: existing } = await supabase
        .from("chat_sessions")
        .select("id, phone_normalized")
        .eq("id", data.existingSessionId)
        .maybeSingle();
      if (existing && existing.phone_normalized === phone) {
        return { sessionId: existing.id };
      }
    }

    // Try find latest active by phone
    const { data: byPhone } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("phone_normalized", phone)
      .order("last_message_at", { ascending: false })
      .limit(1);
    if (byPhone && byPhone.length > 0) {
      // Update name in case it changed
      await supabase
        .from("chat_sessions")
        .update({ customer_name: data.name, customer_phone: data.phone })
        .eq("id", byPhone[0].id);
      return { sessionId: byPhone[0].id };
    }

    const { data: created, error } = await supabase
      .from("chat_sessions")
      .insert({
        customer_name: data.name,
        customer_phone: data.phone,
        phone_normalized: phone,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Greeting
    await supabase.from("chat_messages").insert({
      session_id: created.id,
      role: "assistant",
      content: `Здравствуйте, ${data.name}! Я помогу подобрать изделие — плетёные сумки, корзины, кожа. Расскажите, что ищете?`,
    });

    return { sessionId: created.id };
  });

export const getChatMessages = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        phone: z.string().min(5).max(40),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const phone = validatePhone(data.phone);
    const supabase = await loadAdmin();
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("id, customer_name, phone_normalized, escalated, has_ticket")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.phone_normalized !== phone) throw new Error("Сессия не найдена");

    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", data.sessionId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);

    return {
      messages: messages ?? [],
      escalated: session.escalated,
      hasTicket: session.has_ticket,
    };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        phone: z.string().min(5).max(40),
        text: z.string().trim().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const phone = validatePhone(data.phone);
    const supabase = await loadAdmin();

    const { data: session } = await supabase
      .from("chat_sessions")
      .select("id, customer_name, phone_normalized, escalated, has_ticket")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.phone_normalized !== phone) throw new Error("Сессия не найдена");

    // Save user message
    const now = new Date().toISOString();
    await supabase
      .from("chat_messages")
      .insert({ session_id: session.id, role: "user", content: data.text });
    await supabase.from("chat_sessions").update({ last_message_at: now }).eq("id", session.id);

    // Load recent history (last 30 user/assistant messages)
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", session.id)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(30);
    const recent = (history ?? []).reverse();

    const modelMessages: ModelMessage[] = recent.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    // Load knowledge base + content settings to enrich system prompt
    const { data: kbRows } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["kb_notes", "kb_qa", "kb_links", "delivery_pickup", "delivery_terms", "delivery_warranty"]);
    const kb: Record<string, string> = {};
    (kbRows ?? []).forEach((r: { key: string; value: string | null }) => { if (r.value) kb[r.key] = r.value; });

    const kbSections: string[] = [];
    if (kb.kb_notes) kbSections.push(`Общая информация о мастерской:\n${kb.kb_notes}`);
    if (kb.delivery_pickup) kbSections.push(`Самовывоз в Тольятти:\n${kb.delivery_pickup}`);
    if (kb.delivery_terms) kbSections.push(`Условия заказа:\n${kb.delivery_terms}`);
    if (kb.delivery_warranty) kbSections.push(`Гарантия и уход:\n${kb.delivery_warranty}`);
    try {
      const qa = JSON.parse(kb.kb_qa || "[]") as { q: string; a: string; enabled: boolean }[];
      const active = qa.filter((x) => x?.enabled && x.q && x.a);
      if (active.length) {
        kbSections.push(
          "Готовые ответы на частые вопросы (используй дословно, если вопрос совпадает по смыслу):\n" +
            active.map((x, i) => `${i + 1}. В: ${x.q}\n   О: ${x.a}`).join("\n"),
        );
      }
    } catch {}
    try {
      const links = JSON.parse(kb.kb_links || "[]") as { title: string; url: string; description?: string }[];
      const active = links.filter((x) => x?.title && x.url);
      if (active.length) {
        kbSections.push(
          "Полезные ссылки (давай клиенту, когда тема совпадает; пиши URL целиком):\n" +
            active.map((x) => `- ${x.title} — ${x.url}${x.description ? ` (когда: ${x.description})` : ""}`).join("\n"),
        );
      }
    } catch {}

    const fullSystem = kbSections.length
      ? `${SYSTEM_PROMPT}\n\n=== БАЗА ЗНАНИЙ МАСТЕРСКОЙ ===\n${kbSections.join("\n\n")}`
      : SYSTEM_PROMPT;

    let assistantText = "";
    try {
      const result = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: fullSystem,
        messages: modelMessages,
        tools: makeTools(supabase, session.id),
        stopWhen: stepCountIs(50),
      });
      assistantText = result.text?.trim() || "";
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка ИИ";
      console.error("[chat] AI error", msg);
      // Escalate on AI failure
      await supabase.from("chat_sessions").update({ escalated: true }).eq("id", session.id);
      assistantText =
        "Извините, у меня сбой. Я передаю чат живому оператору — он скоро ответит.";
    }

    if (!assistantText) {
      assistantText = "Я передаю запрос оператору — он скоро ответит.";
      await supabase.from("chat_sessions").update({ escalated: true }).eq("id", session.id);
    }

    await supabase
      .from("chat_messages")
      .insert({ session_id: session.id, role: "assistant", content: assistantText });
    await supabase
      .from("chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", session.id);

    // Re-fetch flags
    const { data: updated } = await supabase
      .from("chat_sessions")
      .select("escalated, has_ticket")
      .eq("id", session.id)
      .single();

    return {
      reply: assistantText,
      escalated: updated?.escalated ?? false,
      hasTicket: updated?.has_ticket ?? false,
    };
  });
