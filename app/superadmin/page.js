'use client';

/**
 * Pannello Super Admin: gestione degli affiliati della piattaforma.
 * - crea un affiliato (dominio, piano, utente titolare, contenuti iniziali)
 * - accende/spegne i moduli del backend per ogni affiliato
 * - nome, logo e colori del sito
 * - stato: in preparazione / attivo / sospeso
 * - "Accedi come affiliato" per l'assistenza
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2, Plus, LogOut, ExternalLink, LogIn, Pencil, Globe, Shield, Search,
  CheckCircle2, PauseCircle, Clock, Loader2, KeyRound, History,
} from 'lucide-react';

const TOKEN_KEY = 'superadminToken';

const STATUS = {
  active: { label: 'Attivo', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  draft: { label: 'In preparazione', className: 'bg-amber-100 text-amber-700', icon: Clock },
  suspended: { label: 'Sospeso', className: 'bg-red-100 text-red-700', icon: PauseCircle },
};

function api(path, { method = 'GET', body, token } = {}) {
  return fetch(`/api/superadmin/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || `Errore ${r.status}`), { status: r.status });
    return data;
  });
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.draft;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
      <Icon className="w-3.5 h-3.5" /> {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api('login', { method: 'POST', body: { email, password } });
      localStorage.setItem(TOKEN_KEY, r.token);
      onLogin(r.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-900 to-ocean-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-ocean-50 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7 text-ocean-500" />
          </div>
          <CardTitle className="text-2xl font-display text-ocean-900">Area Sviluppatore</CardTitle>
          <CardDescription>Accesso riservato: funzioni e piani dei siti</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div><Label htmlFor="sa-email">Email</Label><Input id="sa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label htmlFor="sa-pass">Password</Label><Input id="sa-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full bg-ocean-500 hover:bg-ocean-600">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accedi'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selettore moduli
// ---------------------------------------------------------------------------
function ModulesPicker({ catalog, plans, value, onChange, plan, onPlanChange }) {
  const optional = catalog.filter((m) => !m.core);
  const core = catalog.filter((m) => m.core);
  const toggle = (code, on) => onChange(on ? [...new Set([...value, code])] : value.filter((c) => c !== code));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <Label>Piano</Label>
          <Select value={plan} onValueChange={onPlanChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(plans).map(([k, p]) => <SelectItem key={k} value={k}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...(plans[plan]?.modules || [])])}>
          Applica moduli del piano
        </Button>
        <span className="text-xs text-gray-500 pb-2">{value.length} di {optional.length} moduli attivi</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {optional.map((m) => {
          const on = value.includes(m.code);
          return (
            <label key={m.code} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${on ? 'border-ocean-300 bg-ocean-50/60' : 'border-gray-200 hover:bg-gray-50'}`}>
              <Switch checked={on} onCheckedChange={(v) => toggle(m.code, v)} className="mt-0.5" />
              <span>
                <span className="block text-sm font-medium text-gray-900">{m.label}</span>
                {m.description && <span className="block text-xs text-gray-500 mt-0.5">{m.description}</span>}
              </span>
            </label>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        Sempre inclusi: {core.map((m) => m.label).join(', ')}.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form affiliato (creazione e modifica)
// ---------------------------------------------------------------------------
const EMPTY = {
  name: '', slug: '', domains: '', status: 'draft', plan: 'base', modules: null,
  ownerName: '', ownerEmail: '', ownerPassword: '', withDemoTrips: false, crmCode: '',
  branding: { siteName: '', logoUrl: '', primaryColor: '', accentColor: '', tagline: '' },
  contacts: { phone: '', email: '', whatsapp: '', address: '' },
  seo: { title: '', description: '' },
};

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#00A0E9'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded-md border border-gray-200 cursor-pointer bg-white"
          aria-label={label}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Predefinito" />
      </div>
    </div>
  );
}

function TenantDialog({ open, onClose, token, catalog, plans, tenant, onSaved, single = false }) {
  const isNew = !tenant;
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [owner, setOwner] = useState({ email: '', password: '' });
  const [ownerMsg, setOwnerMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    setError(''); setOwnerMsg(''); setOwner({ email: tenant?.admins?.[0]?.email || '', password: '' });
    if (tenant) {
      setForm({
        ...EMPTY,
        ...tenant,
        domains: (tenant.domains || []).join('\n'),
        modules: tenant.modules || [],
        branding: { ...EMPTY.branding, ...(tenant.branding || {}) },
        contacts: { ...EMPTY.contacts, ...(tenant.contacts || {}) },
        seo: { ...EMPTY.seo, ...(tenant.seo || {}) },
      });
    } else {
      setForm({ ...EMPTY, modules: [...(plans.base?.modules || [])] });
    }
  }, [open, tenant, plans]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setIn = (group, k, v) => setForm((f) => ({ ...f, [group]: { ...f[group], [k]: v } }));

  const save = async () => {
    setBusy(true); setError('');
    try {
      const body = {
        name: form.name, domains: form.domains, status: form.status, plan: form.plan, modules: form.modules,
        branding: form.branding, contacts: form.contacts, seo: form.seo, crmCode: form.crmCode,
      };
      let saved;
      if (isNew) {
        saved = await api('tenants', {
          method: 'POST', token,
          body: { ...body, slug: form.slug, ownerName: form.ownerName, ownerEmail: form.ownerEmail, ownerPassword: form.ownerPassword, withDemoTrips: form.withDemoTrips },
        });
      } else {
        saved = await api(`tenants/${tenant.id}`, { method: 'PUT', token, body });
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveOwner = async () => {
    setOwnerMsg('');
    try {
      const r = await api(`tenants/${tenant.id}/owner`, { method: 'POST', token, body: owner });
      setOwnerMsg(r.created ? `Utente ${r.email} creato.` : `Password aggiornata per ${r.email}.`);
      setOwner((o) => ({ ...o, password: '' }));
    } catch (err) {
      setOwnerMsg(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isNew ? 'Nuovo affiliato' : `Modifica ${tenant.name}`}</DialogTitle>
          <DialogDescription>
            {isNew ? 'Il sito viene creato subito con categorie e footer di partenza. Lascialo "In preparazione" finché non è pronto.' : 'Le modifiche ai moduli e all\'aspetto sono visibili sul sito entro 30 secondi.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="generale" className="mt-2">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="generale">Generale</TabsTrigger>
            <TabsTrigger value="moduli">Moduli</TabsTrigger>
            <TabsTrigger value="aspetto">Aspetto</TabsTrigger>
            <TabsTrigger value="contatti">Contatti e SEO</TabsTrigger>
            <TabsTrigger value="accesso">Accesso</TabsTrigger>
          </TabsList>

          <TabsContent value="generale" className="space-y-4 mt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nome affiliato *</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Tribù in Viaggio Ostia" /></div>
              <div>
                <Label>Identificativo (slug)</Label>
                <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="ostia" disabled={!isNew} />
                <p className="text-xs text-gray-500 mt-1">Usato per l'anteprima e le cartelle immagini. Non modificabile.</p>
              </div>
            </div>
            {!single && <div>
              <Label>Domini *</Label>
              <Textarea rows={3} value={form.domains} onChange={(e) => set('domains', e.target.value)} placeholder={'ostia.tribuinviaggio.com\nviaggiostia.it'} />
              <p className="text-xs text-gray-500 mt-1">Uno per riga, senza https:// e senza www. Il primo è il dominio principale.</p>
            </div>}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Stato</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v)} disabled={tenant?.isMaster}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">In preparazione (non indicizzato)</SelectItem>
                    <SelectItem value="active">Attivo</SelectItem>
                    {!tenant?.isMaster && <SelectItem value="suspended">Sospeso</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Codice CRM</Label><Input value={form.crmCode} onChange={(e) => set('crmCode', e.target.value)} placeholder="es. RM-OSTIA" /></div>
            </div>
            {isNew && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <Checkbox checked={form.withDemoTrips} onCheckedChange={(v) => set('withDemoTrips', !!v)} />
                Aggiungi viaggi di esempio (in bozza) per partire più velocemente
              </label>
            )}
          </TabsContent>

          <TabsContent value="moduli" className="mt-4">
            <ModulesPicker
              catalog={catalog} plans={plans}
              value={form.modules || []} onChange={(m) => set('modules', m)}
              plan={form.plan} onPlanChange={(p) => setForm((f) => ({ ...f, plan: p, modules: isNew ? [...(plans[p]?.modules || [])] : f.modules }))}
            />
          </TabsContent>

          <TabsContent value="aspetto" className="space-y-4 mt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nome visualizzato</Label><Input value={form.branding.siteName} onChange={(e) => setIn('branding', 'siteName', e.target.value)} placeholder={form.name} /></div>
              <div><Label>Slogan</Label><Input value={form.branding.tagline} onChange={(e) => setIn('branding', 'tagline', e.target.value)} placeholder="La tua agenzia di fiducia" /></div>
            </div>
            <div>
              <Label>URL del logo</Label>
              <Input value={form.branding.logoUrl} onChange={(e) => setIn('branding', 'logoUrl', e.target.value)} placeholder="https://res.cloudinary.com/..." />
              <p className="text-xs text-gray-500 mt-1">Lascia vuoto per usare il logo di default. Consigliato PNG con sfondo trasparente.</p>
              {form.branding.logoUrl && <img src={form.branding.logoUrl} alt="Anteprima logo" className="h-14 mt-2 rounded border bg-white p-1" />}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <ColorField label="Colore principale" value={form.branding.primaryColor} onChange={(v) => setIn('branding', 'primaryColor', v)} />
              <ColorField label="Colore di accento" value={form.branding.accentColor} onChange={(v) => setIn('branding', 'accentColor', v)} />
            </div>
            <p className="text-xs text-gray-500">Vuoto = colori originali (azzurro e arancione). Da un colore vengono generate tutte le sfumature del tema.</p>
          </TabsContent>

          <TabsContent value="contatti" className="space-y-4 mt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Telefono</Label><Input value={form.contacts.phone} onChange={(e) => setIn('contacts', 'phone', e.target.value)} /></div>
              <div><Label>Email</Label><Input value={form.contacts.email} onChange={(e) => setIn('contacts', 'email', e.target.value)} /></div>
              <div><Label>WhatsApp</Label><Input value={form.contacts.whatsapp} onChange={(e) => setIn('contacts', 'whatsapp', e.target.value)} placeholder="+39..." /></div>
              <div><Label>Indirizzo</Label><Input value={form.contacts.address} onChange={(e) => setIn('contacts', 'address', e.target.value)} /></div>
            </div>
            <div><Label>Titolo SEO della homepage</Label><Input value={form.seo.title} onChange={(e) => setIn('seo', 'title', e.target.value)} placeholder={`${form.name || 'Nome'} | Agenzia Viaggi`} /></div>
            <div>
              <Label>Descrizione SEO della homepage</Label>
              <Textarea rows={3} value={form.seo.description} onChange={(e) => setIn('seo', 'description', e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">{form.seo.description.length}/160 caratteri consigliati</p>
            </div>
          </TabsContent>

          <TabsContent value="accesso" className="space-y-4 mt-4">
            {isNew ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Nome titolare</Label><Input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} /></div>
                <div><Label>Email titolare *</Label><Input type="email" value={form.ownerEmail} onChange={(e) => set('ownerEmail', e.target.value)} /></div>
                <div className="sm:col-span-2">
                  <Label>Password iniziale *</Label>
                  <Input type="text" value={form.ownerPassword} onChange={(e) => set('ownerPassword', e.target.value)} placeholder="Minimo 8 caratteri" />
                  <p className="text-xs text-gray-500 mt-1">Comunicala all'affiliato: potrà cambiarla da Impostazioni nel suo backend.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Utenti del backend</p>
                  {(tenant.admins || []).length === 0
                    ? <p className="text-sm text-gray-500">Nessun utente.</p>
                    : <ul className="text-sm text-gray-700 space-y-1">{tenant.admins.map((a) => <li key={a.id}>{a.name} · {a.email} <span className="text-gray-400">({a.role || 'owner'})</span></li>)}</ul>}
                </div>
                <div className="rounded-xl border p-4 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2"><KeyRound className="w-4 h-4" /> Reimposta password o crea utente</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input type="email" placeholder="Email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} />
                    <Input type="text" placeholder="Nuova password (min 8)" value={owner.password} onChange={(e) => setOwner({ ...owner, password: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button type="button" size="sm" variant="outline" onClick={saveOwner}>Salva accesso</Button>
                    {ownerMsg && <span className="text-sm text-gray-600">{ownerMsg}</span>}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={save} disabled={busy} className="bg-ocean-500 hover:bg-ocean-600">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isNew ? 'Crea affiliato' : 'Salva modifiche'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------
export default function SuperAdminPage() {
  const [token, setToken] = useState(null);
  const [checking, setChecking] = useState(true);
  const [me, setMe] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState({ open: false, tenant: null });
  const [view, setView] = useState('affiliati');
  const [audit, setAudit] = useState([]);
  const [notice, setNotice] = useState('');
  const single = me?.mode === 'single';

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null); setMe(null);
  }, []);

  const load = useCallback(async (tk) => {
    setLoading(true);
    try {
      const [profile, list, mods] = await Promise.all([api('me', { token: tk }), api('tenants', { token: tk }), api('modules', { token: tk })]);
      setMe(profile); setTenants(list); setCatalog(mods.modules); setPlans(mods.plans);
    } catch (err) {
      if (err.status === 401) logout();
      else setNotice(err.message);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const tk = localStorage.getItem(TOKEN_KEY);
    if (tk) { setToken(tk); load(tk).finally(() => setChecking(false)); } else setChecking(false);
  }, [load]);

  useEffect(() => {
    if (view === 'registro' && token) api('audit', { token }).then(setAudit).catch(() => {});
  }, [view, token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) => [t.name, t.slug, ...(t.domains || [])].some((v) => String(v).toLowerCase().includes(q)));
  }, [tenants, query]);

  const counts = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter((t) => t.status === 'active').length,
    draft: tenants.filter((t) => t.status === 'draft').length,
    newLeads: tenants.reduce((n, t) => n + (t.stats?.newLeads || 0), 0),
  }), [tenants]);

  const impersonate = async (t) => {
    try {
      const r = await api(`tenants/${t.id}/impersonate`, { method: 'POST', token });
      // un sito per installazione: il backend è su questo stesso dominio
      const url = single ? `${window.location.origin}/admin#impersonate=${encodeURIComponent(r.token)}` : r.url;
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setNotice(err.message);
    }
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-ocean-500" /></div>;
  }
  if (!token) return <LoginScreen onLogin={(tk) => { setToken(tk); load(tk); }} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-ocean-500 flex items-center justify-center shrink-0"><Shield className="w-5 h-5 text-white" /></div>
            <div className="min-w-0">
              <p className="font-display font-bold text-ocean-900 leading-tight">{single ? 'Sviluppatore' : 'Super Admin'}</p>
              <p className="text-xs text-gray-500 truncate">{me?.email}</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className={view === 'affiliati' ? 'bg-ocean-50 text-ocean-600' : ''} onClick={() => setView('affiliati')}><Building2 className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">{single ? 'Il sito' : 'Affiliati'}</span></Button>
            <Button variant="ghost" size="sm" className={view === 'registro' ? 'bg-ocean-50 text-ocean-600' : ''} onClick={() => setView('registro')}><History className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Registro</span></Button>
            <Button variant="ghost" size="sm" onClick={logout} className="text-red-600"><LogOut className="w-4 h-4" /></Button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {notice && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex justify-between gap-4">
            <span>{notice}</span><button onClick={() => setNotice('')} className="font-medium">Chiudi</button>
          </div>
        )}

        {view === 'affiliati' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-display font-bold text-gray-900">{single ? 'Il sito' : 'Affiliati'}</h1>
                <p className="text-gray-500 mt-1">{single
                  ? "Scegli quali funzioni l'admin del sito può usare. L'admin non può attivare quelle che spegni qui."
                  : 'Ogni affiliato ha un sito indipendente con le funzioni che attivi tu.'}</p>
              </div>
              {!single && <Button onClick={() => setDialog({ open: true, tenant: null })} className="bg-ocean-500 hover:bg-ocean-600">
                <Plus className="w-4 h-4 mr-1.5" /> Nuovo affiliato
              </Button>}
            </div>

            {!single && <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Siti totali', value: counts.total },
                { label: 'Attivi', value: counts.active },
                { label: 'In preparazione', value: counts.draft },
                { label: 'Richieste nuove', value: counts.newLeads },
              ].map((s) => (
                <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-gray-500">{s.label}</p><p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p></CardContent></Card>
              ))}
            </div>

            <div className="relative mb-4 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input className="pl-9" placeholder="Cerca per nome o dominio" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            </>}

            {loading && tenants.length === 0 ? (
              <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-ocean-500" /></div>
            ) : (
              <div className="space-y-3">
                {filtered.map((t) => (
                  <Card key={t.id} className="overflow-hidden">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-xl border bg-white flex items-center justify-center overflow-hidden shrink-0" style={t.branding?.primaryColor ? { borderColor: t.branding.primaryColor } : undefined}>
                            {t.branding?.logoUrl
                              ? <img src={t.branding.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
                              : <Building2 className="w-5 h-5 text-gray-400" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                              {t.isMaster && <Badge variant="outline" className="text-ocean-600 border-ocean-200">Master</Badge>}
                              <StatusBadge status={t.status} />
                            </div>
                            <p className={`text-sm text-gray-500 flex items-center gap-1 truncate ${single ? 'hidden' : ''}`}><Globe className="w-3.5 h-3.5 shrink-0" />{(t.domains || []).join(' · ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div><span className="font-semibold text-gray-900 tabular-nums">{t.stats?.trips ?? 0}</span> viaggi</div>
                          <div><span className="font-semibold text-gray-900 tabular-nums">{t.stats?.newLeads ?? 0}</span>/<span className="tabular-nums">{t.stats?.leads ?? 0}</span> richieste</div>
                          <div className="hidden md:block"><span className="font-semibold text-gray-900">{plans[t.plan]?.label || t.plan}</span> · {(t.modules || []).length} moduli</div>
                        </div>
                        <div className="flex items-center gap-2 lg:justify-end">
                          <Button size="sm" variant="outline" onClick={() => setDialog({ open: true, tenant: t })}><Pencil className="w-4 h-4 mr-1" /> Gestisci</Button>
                          <Button size="sm" variant="outline" title={single ? "Apri il backend dell'admin" : 'Accedi al backend come affiliato'} onClick={() => impersonate(t)}><LogIn className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" title="Apri il sito" asChild>
                            <a href={single ? '/' : `https://${t.domains?.[0]}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filtered.length === 0 && <p className="text-center text-gray-500 py-12">Nessun affiliato trovato.</p>}
              </div>
            )}
          </>
        )}

        {view === 'registro' && (
          <>
            <h1 className="text-3xl font-display font-bold text-gray-900 mb-6">Registro attività</h1>
            <Card>
              <CardContent className="p-0 divide-y">
                {audit.length === 0 && <p className="p-6 text-sm text-gray-500">Nessuna attività registrata.</p>}
                {audit.map((a) => (
                  <div key={a.id} className="px-5 py-3 text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span className="text-gray-400 tabular-nums w-40 shrink-0">{new Date(a.at).toLocaleString('it-IT')}</span>
                    <span className="font-medium text-gray-900">{a.action.replace(/_/g, ' ')}</span>
                    <span className="text-gray-500 truncate">{a.actor}{a.details?.slug ? ` · ${a.details.slug}` : ''}{a.details?.adminEmail ? ` · ${a.details.adminEmail}` : ''}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <TenantDialog
        open={dialog.open}
        tenant={dialog.tenant}
        onClose={() => setDialog({ open: false, tenant: null })}
        token={token}
        catalog={catalog}
        plans={plans}
        onSaved={() => load(token)}
        single={single}
      />
    </div>
  );
}
