/**
 * AI Translation service (with MongoDB cache).
 * Uses OpenAI/Emergent LLM (gpt-4o-mini) for high-quality translation.
 */

import OpenAI from 'openai';
import crypto from 'crypto';
import { getDatabase } from './mongodb';

const EMERGENT_KEY = process.env.EMERGENT_LLM_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const useEmergent = !OPENAI_KEY && !!EMERGENT_KEY;

const client = new OpenAI({
  apiKey: useEmergent ? EMERGENT_KEY : OPENAI_KEY,
  baseURL: useEmergent
    ? (process.env.EMERGENT_BASE_URL || 'https://integrations.emergentagent.com/llm')
    : undefined,
});

const TRANSLATE_MODEL = process.env.TRANSLATE_MODEL || 'gpt-4o-mini';

function hashText(text, target, source = 'it') {
  return crypto.createHash('sha256').update(`${source}|${target}|${text}`).digest('hex');
}

/**
 * Translate a single string. Cache in DB. Override (admin manual override) wins.
 */
export async function translateText(text, target, source = 'it', context = '') {
  if (!text || typeof text !== 'string') return '';
  if (target === source) return text;
  if (text.trim().length === 0) return text;

  const db = await getDatabase();
  const hash = hashText(text, target, source);

  // 1) Check cache + admin override
  const cached = await db.collection('translations').findOne({ hash });
  if (cached) {
    return cached.override || cached.translated || text;
  }

  // 2) Call AI
  try {
    const system = `You are a deterministic translation function. Translate FAITHFULLY from ${source.toUpperCase()} to ${target.toUpperCase()}.

STRICT RULES:
- Output ONLY the translated string. No prefix, suffix, quotes, explanations, conversation, or apology.
- If input is already in the target language, return it UNCHANGED.
- If input is empty, only whitespace, only numbers/symbols, or untranslatable → return input UNCHANGED.
- NEVER respond with phrases like "I'm ready", "Please provide", "Sure", "Of course", "Here is the translation". These are forbidden.
- Keep brand names ("Tribù in Viaggio"), proper nouns, hotel names, destinations as-is (e.g. "Sharm El Sheikh", "Rixos", "Maldives").
- Currency stays in EUR (€). Phone numbers, emails, URLs stay as-is.
- Match register: travel-friendly, warm, professional.
- Preserve HTML tags and markdown if present.
- For lists/itineraries keep structure.
${context ? `Context: ${context}` : ''}

Translate the next user message and output ONLY the translation.`;

    const completion = await client.chat.completions.create({
      model: TRANSLATE_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
      max_tokens: Math.min(2000, Math.ceil(text.length * 2.5)),
    });

    const translated = (completion.choices[0]?.message?.content || '').trim();
    if (!translated) return text;
    // Safety: if AI returned a conversational response (model not following instructions), keep original
    const bad = /^(I'm|I am|I can'?t|I cannot|Sure|Of course|Please provide|Here is|Here's|Certainly|Apolog|Sorry)/i;
    if (bad.test(translated) && translated.length > text.length * 2) {
      console.warn('[Translate] suspicious AI reply, keeping original:', translated.substring(0, 50));
      return text;
    }

    // 3) Save in cache
    await db.collection('translations').insertOne({
      hash,
      source,
      target,
      original: text,
      translated,
      override: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).catch(() => { /* race condition: ok */ });

    return translated;
  } catch (err) {
    console.error('[Translate] error:', err?.message);
    return text;
  }
}

/**
 * Translate batch — group all texts in one AI call when possible for speed.
 */
export async function translateBatch(items, target, source = 'it') {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (target === source) return items.map(it => ({ id: it.id, translated: it.text }));

  const db = await getDatabase();
  const results = new Array(items.length);

  // 1) Cache lookup
  const toTranslate = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.text || typeof it.text !== 'string' || it.text.trim().length === 0) {
      results[i] = { id: it.id, translated: it.text };
      continue;
    }
    const hash = hashText(it.text, target, source);
    const cached = await db.collection('translations').findOne({ hash });
    if (cached) {
      results[i] = { id: it.id, translated: cached.override || cached.translated };
    } else {
      toTranslate.push({ index: i, id: it.id, text: it.text, hash });
    }
  }

  if (toTranslate.length === 0) return results;

  // 2) Translate uncached items individually (parallel)
  await Promise.all(toTranslate.map(async (it) => {
    const translated = await translateText(it.text, target, source);
    results[it.index] = { id: it.id, translated };
  }));

  return results;
}
