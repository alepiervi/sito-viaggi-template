/**
 * Contesto del tenant per la richiesta corrente.
 *
 * Usa AsyncLocalStorage: tutto il codice eseguito durante una richiesta
 * (route API, lib/referralEngine, lib/whatsappBot, ...) può sapere a quale
 * affiliato appartiene la richiesta senza doverlo passare come parametro.
 *
 * Il singleton è salvato su globalThis perché Next.js può caricare il modulo
 * più volte in bundle diversi.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

const KEY = '__tribuTenantALS';
if (!globalThis[KEY]) globalThis[KEY] = new AsyncLocalStorage();
const als = globalThis[KEY];

export function runWithTenant(tenant, fn) {
  return als.run({ tenant }, fn);
}

export function currentTenant() {
  return als.getStore()?.tenant || null;
}
