'use client';

/**
 * Rende disponibili nel browser i dati dell'affiliato corrente
 * (nome, logo, colori, contatti, moduli attivi).
 * Il layout li calcola sul server e li passa qui, quindi non serve
 * nessuna chiamata API extra e il rendering server/browser coincide.
 */
import { createContext, useContext, useMemo } from 'react';
import { effectiveHomeLayout } from '@/lib/homeSections';

const FALLBACK = {
  slug: 'tribuinviaggio',
  name: 'Tribù in Viaggio',
  isMaster: true,
  status: 'active',
  modules: [],
  branding: { siteName: 'Tribù in Viaggio', logoUrl: '/brand/tribu-logo.png', primaryColor: '', accentColor: '', tagline: '' },
  contacts: {},
};

const TenantContext = createContext(FALLBACK);

export default function TenantProvider({ tenant, children }) {
  return <TenantContext.Provider value={tenant || FALLBACK}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}

/** Ordine e visibilità delle sezioni homepage: home.show(id), home.order(id). */
export function useHomeLayout() {
  const t = useContext(TenantContext);
  return useMemo(() => {
    const layout = effectiveHomeLayout(t.homeSections, t.modules || []);
    const byId = Object.fromEntries(layout.map((s) => [s.id, s]));
    return {
      layout,
      show: (id) => (byId[id] ? byId[id].show : true),
      order: (id) => (byId[id] ? byId[id].order : 0),
    };
  }, [t.homeSections, t.modules]);
}

/** true se il modulo è attivo per l'affiliato corrente. */
export function useModule(code) {
  const t = useContext(TenantContext);
  return Array.isArray(t.modules) && t.modules.includes(code);
}
