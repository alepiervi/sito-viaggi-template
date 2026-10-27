/**
 * WhatsApp Business + ChatGPT Bot logic
 * - Handles incoming WhatsApp messages via Meta Cloud API webhook
 * - Generates AI responses with OpenAI/Emergent LLM (GPT-4o)
 * - Extracts leads (name/email/phone) using function calling
 * - Persists conversations & messages in MongoDB
 */

import OpenAI from 'openai';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '@/lib/mongodb';
import { currentTenant } from '@/lib/tenantContext';

// ============ OpenAI (Emergent) client ============
const EMERGENT_KEY = process.env.EMERGENT_LLM_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Choose source: prefer user OpenAI key, else Emergent universal key
const useEmergent = !OPENAI_KEY && !!EMERGENT_KEY;

const openai = new OpenAI({
  apiKey: useEmergent ? EMERGENT_KEY : OPENAI_KEY,
  baseURL: useEmergent
    ? (process.env.EMERGENT_BASE_URL || 'https://integrations.emergentagent.com/llm')
    : undefined,
});

const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini';

// ============ WhatsApp config ============
const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WA_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WA_APP_SECRET = process.env.WHATSAPP_APP_SECRET;
const WA_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'tribu_whatsapp_verify_2026';
const WA_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

// ============ Verification ============
export function verifyWebhook(searchParams) {
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === WA_VERIFY_TOKEN) {
    return { ok: true, challenge };
  }
  return { ok: false };
}

export function validateSignature(rawBody, signatureHeader) {
  if (!WA_APP_SECRET) return true; // permissive in dev when no secret configured
  if (!signatureHeader) return false;
  const [algo, hash] = String(signatureHeader).split('=');
  if (algo !== 'sha256' || !hash) return false;
  const expected = crypto.createHmac('sha256', WA_APP_SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// ============ Send message back to WhatsApp ============
export async function sendWhatsAppText(to, body) {
  if (!WA_PHONE_NUMBER_ID || !WA_ACCESS_TOKEN) {
    console.warn('[WA] Missing credentials — message not sent:', body?.slice(0, 80));
    return { skipped: true };
  }
  const url = `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { preview_url: true, body },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[WA] Send error:', JSON.stringify(data));
      return { error: data };
    }
    return data;
  } catch (err) {
    console.error('[WA] Send fatal:', err);
    return { error: err.message };
  }
}

// ============ System prompt builder (Italian) ============
async function buildSystemPrompt() {
  const db = await getDatabase();
  const [trips, footer] = await Promise.all([
    db.collection('trips').find({ status: 'published' }).limit(40).toArray(),
    db.collection('site_settings').findOne({ key: 'footer_settings' }),
  ]);

  // Compact trip catalog
  const catalog = trips.map(t => {
    const price = t.price ? `da €${t.price}` : '';
    const dest = t.destination || '';
    const dur = t.duration || '';
    return `- ${t.title} | ${dest} | ${dur} | ${price} | slug:${t.slug || ''}`;
  }).join('\n');

  const contact = footer?.settings?.contactInfo || {};
  const tenant = currentTenant();
  const agencyName = tenant?.branding?.siteName || tenant?.name || 'Tribù in Viaggio';
  const baseUrl = tenant?.domains?.[0] ? `https://${tenant.domains[0]}` : (process.env.NEXT_PUBLIC_BASE_URL || '');

  return `Sei l'assistente virtuale di **${agencyName}**, agenzia di viaggi italiana specializzata in viaggi su misura, crociere, tour, vacanze mare e weekend romantici.

# RUOLO
1. Rispondere a domande generiche (orari, sede, info azienda) in modo amichevole e professionale.
2. Consigliare viaggi dal nostro catalogo in base a interessi, destinazione, budget, periodo.
3. Raccogliere i contatti del cliente (NOME, EMAIL, TELEFONO) per inoltrare la richiesta al consulente umano.

# INFO AZIENDA
- Nome: ${agencyName}
- Orari: Lun-Ven 9:00-19:00, Sab 9:30-13:00
- WhatsApp: ${contact.whatsappNumber || ''}
- Email: ${contact.email || ''}
- Sito web: ${baseUrl}

# CATALOGO VIAGGI ATTUALI
${catalog || '(nessun viaggio disponibile al momento)'}

Quando consigli un viaggio includi SEMPRE il link: ${baseUrl}/viaggio/[slug]

# COMPORTAMENTO
- Rispondi SEMPRE in italiano.
- Tono: caloroso, professionale, conciso (max 4-5 frasi per risposta su WhatsApp).
- Usa emoji con moderazione (🌴 ✈️ 🏝️ ⭐).
- Se il cliente mostra interesse REALE per un viaggio o chiede un preventivo, chiedi cortesemente nome + email + telefono per fissare un contatto con un consulente.
- Quando hai raccolto ALMENO nome e (email O telefono), USA la function "save_lead" per memorizzarli. NON dire al cliente "ho salvato" — di' invece "Perfetto! Un nostro consulente ti contatterà al più presto".
- Se la domanda è fuori dal contesto viaggi/agenzia, riporta gentilmente la conversazione al tema.
- NON inventare prezzi, date o promozioni non presenti nel catalogo. Se mancano dati, di' che farai sapere appena possibile.`;
}

// ============ OpenAI tools (function calling) ============
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'save_lead',
      description: 'Salva nel CRM un nuovo lead/cliente interessato. Usa solo quando hai raccolto almeno nome e (email o telefono).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome completo del cliente' },
          email: { type: 'string', description: 'Email del cliente (se fornita)' },
          phone: { type: 'string', description: 'Telefono del cliente (se diverso da quello WhatsApp)' },
          interest: { type: 'string', description: 'Breve descrizione dell\'interesse: destinazione/viaggio/periodo/budget' },
          tripSlug: { type: 'string', description: 'Slug del viaggio di interesse se identificato' },
        },
        required: ['name'],
      },
    },
  },
];

// ============ DB helpers ============
export async function getOrCreateConversation(phoneNumber, contactName) {
  const db = await getDatabase();
  let conv = await db.collection('wa_conversations').findOne({ phoneNumber });
  if (!conv) {
    conv = {
      id: uuidv4(),
      phoneNumber,
      contactName: contactName || '',
      status: 'active',
      createdAt: new Date(),
      lastMessageAt: new Date(),
      messageCount: 0,
      leadCreated: false,
    };
    await db.collection('wa_conversations').insertOne(conv);
  }
  return conv;
}

async function saveMessage(conversationId, phoneNumber, direction, content, meta = {}) {
  const db = await getDatabase();
  const msg = {
    id: uuidv4(),
    conversationId,
    phoneNumber,
    direction, // 'in' | 'out'
    content,
    createdAt: new Date(),
    ...meta,
  };
  await db.collection('wa_messages').insertOne(msg);
  await db.collection('wa_conversations').updateOne(
    { id: conversationId },
    { $set: { lastMessageAt: new Date() }, $inc: { messageCount: 1 } }
  );
  return msg;
}

async function getRecentHistory(conversationId, limit = 12) {
  const db = await getDatabase();
  const msgs = await db.collection('wa_messages')
    .find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return msgs.reverse().map(m => ({
    role: m.direction === 'in' ? 'user' : 'assistant',
    content: m.content,
  }));
}

async function saveLead(args, phoneNumber, conversationId) {
  const db = await getDatabase();
  const lead = {
    id: uuidv4(),
    name: args.name || 'Cliente WhatsApp',
    email: args.email || '',
    phone: args.phone || phoneNumber,
    message: args.interest || '',
    tripSlug: args.tripSlug || '',
    source: 'whatsapp-bot',
    status: 'new',
    createdAt: new Date(),
    conversationId,
    phoneNumber,
  };
  await db.collection('leads').insertOne(lead);
  await db.collection('wa_conversations').updateOne(
    { id: conversationId },
    { $set: { leadCreated: true, leadId: lead.id, contactName: lead.name } }
  );
  return lead;
}

// ============ Generate AI reply ============
export async function generateReply(conversationId, phoneNumber, userText) {
  const systemPrompt = await buildSystemPrompt();
  const history = await getRecentHistory(conversationId, 12);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userText },
  ];

  try {
    let completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 500,
    });

    let choice = completion.choices[0];

    // Handle tool call (save_lead) in a loop (max 2 iterations)
    let safety = 0;
    while (choice.message.tool_calls && safety < 2) {
      const toolCalls = choice.message.tool_calls;
      messages.push(choice.message);

      for (const tc of toolCalls) {
        let result = { ok: false };
        if (tc.function.name === 'save_lead') {
          try {
            const args = JSON.parse(tc.function.arguments || '{}');
            const lead = await saveLead(args, phoneNumber, conversationId);
            result = { ok: true, leadId: lead.id };
          } catch (e) {
            result = { ok: false, error: e.message };
          }
        }
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      completion = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 500,
      });
      choice = completion.choices[0];
      safety += 1;
    }

    return choice.message.content || 'Mi scusi, può ripetere la richiesta? 🙂';
  } catch (err) {
    console.error('[BOT] OpenAI error:', err?.message, err?.response?.data);
    return 'Mi scuso, sto avendo un problema tecnico in questo momento. Riprovi tra qualche minuto, oppure scriva a info@tribuinviaggio.it 🙏';
  }
}

// ============ Main: handle incoming webhook payload ============
export async function handleIncomingWebhook(payload) {
  if (payload?.object !== 'whatsapp_business_account') return { handled: false };

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};
      const contacts = value.contacts || [];
      const messages = value.messages || [];

      for (const msg of messages) {
        const from = msg.from; // phone number
        const contactName = contacts[0]?.profile?.name || '';
        const messageId = msg.id;

        // Idempotency: skip if already processed
        const db = await getDatabase();
        const exists = await db.collection('wa_messages').findOne({ whatsappMessageId: messageId });
        if (exists) continue;

        // Extract text body (support text, button, interactive replies)
        let userText = '';
        if (msg.type === 'text') userText = msg.text?.body || '';
        else if (msg.type === 'button') userText = msg.button?.text || '';
        else if (msg.type === 'interactive') {
          userText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
        } else {
          // Non-text message — reply with generic prompt
          userText = '[messaggio non testuale]';
        }

        // Persist incoming
        const conv = await getOrCreateConversation(from, contactName);
        await saveMessage(conv.id, from, 'in', userText, { whatsappMessageId: messageId, type: msg.type });

        // If non-text, send a polite reply asking for text
        if (msg.type !== 'text' && msg.type !== 'button' && msg.type !== 'interactive') {
          const reply = 'Ciao! 👋 Al momento riesco a leggere solo messaggi di testo. Scrivimi cosa stai cercando e ti aiuto subito! 🌴';
          await sendWhatsAppText(from, reply);
          await saveMessage(conv.id, from, 'out', reply, { auto: true });
          continue;
        }

        // Generate AI reply
        const reply = await generateReply(conv.id, from, userText);
        await sendWhatsAppText(from, reply);
        await saveMessage(conv.id, from, 'out', reply, { ai: true });
      }
    }
  }
  return { handled: true };
}
