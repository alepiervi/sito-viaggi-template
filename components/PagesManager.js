'use client';

import ImageUploadButton from '@/components/ImageUploadButton';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Edit, Trash2, Copy, ExternalLink, FileText, Plane, Check, Search,
  Globe, ChevronDown, ChevronUp, Link2,
} from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';

// Page type presets. layout decides content vs trips listing.
const TYPE_OPTIONS = [
  { group: 'Pagine testuali', items: [
    { id: 'privacy', label: 'Privacy Policy', layout: 'content', title: 'Privacy Policy', slug: 'privacy-policy' },
    { id: 'cookie', label: 'Cookie Policy', layout: 'content', title: 'Cookie Policy', slug: 'cookie-policy' },
    { id: 'terms', label: 'Termini e Condizioni', layout: 'content', title: 'Termini e Condizioni', slug: 'termini-e-condizioni' },
    { id: 'about', label: 'Chi siamo', layout: 'content', title: 'Chi siamo', slug: 'chi-siamo' },
    { id: 'legal', label: 'Note legali', layout: 'content', title: 'Note legali', slug: 'note-legali' },
    { id: 'faq', label: 'Domande frequenti (FAQ)', layout: 'content', title: 'Domande frequenti', slug: 'faq' },
    { id: 'custom', label: 'Pagina libera (testo)', layout: 'content', title: '', slug: '' },
  ] },
  { group: 'Pagine viaggi', items: [
    { id: 'trips', label: 'Sezione viaggi (card)', layout: 'trips', title: '', slug: '' },
  ] },
];

const TYPE_LABELS = TYPE_OPTIONS.flatMap((g) => g.items).reduce((acc, x) => { acc[x.id] = x.label; return acc; }, {});

const slugify = (s) => (s || '')
  .toLowerCase().trim()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const blankForm = () => ({
  title: '', slug: '', layout: 'content', pageType: 'custom', status: 'draft',
  content: '', subtitle: '', heroImage: '', intro: '',
  tripSource: 'all', tripCategory: '', tripIds: [],
  metaTitle: '', metaDescription: '',
});

export default function PagesManager({ token, trips = [], categories = [] }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = none, 'new' = create, else id
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [tripSearch, setTripSearch] = useState('');
  const [showSeo, setShowSeo] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => { if (typeof window !== 'undefined') setOrigin(window.location.origin); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pages', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPages(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openNew = () => { setForm(blankForm()); setEditingId('new'); setSlugTouched(false); setShowSeo(false); setTripSearch(''); setShowForm(true); };
  const openEdit = (p) => {
    setForm({ ...blankForm(), ...p, tripIds: Array.isArray(p.tripIds) ? p.tripIds : [] });
    setEditingId(p.id); setSlugTouched(true); setShowSeo(false); setTripSearch(''); setShowForm(true);
  };

  const onTypeChange = (typeId) => {
    const opt = TYPE_OPTIONS.flatMap((g) => g.items).find((x) => x.id === typeId);
    if (!opt) return;
    setForm((prev) => {
      const next = { ...prev, pageType: opt.id, layout: opt.layout };
      // Prefill title/slug only when empty or untouched
      if (!prev.title || !slugTouched) {
        if (opt.title) { next.title = opt.title; next.slug = opt.slug; }
      }
      return next;
    });
  };

  const onTitleChange = (val) => {
    setForm((prev) => ({ ...prev, title: val, slug: slugTouched ? prev.slug : slugify(val) }));
  };

  const toggleTrip = (id) => {
    setForm((prev) => {
      const has = prev.tripIds.includes(id);
      return { ...prev, tripIds: has ? prev.tripIds.filter((x) => x !== id) : [...prev.tripIds, id] };
    });
  };

  const save = async () => {
    if (!form.title.trim()) { alert('Inserisci un titolo per la pagina'); return; }
    setSaving(true);
    try {
      const isEdit = editingId && editingId !== 'new';
      const url = isEdit ? `/api/admin/pages/${editingId}` : '/api/admin/pages';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('save failed');
      setShowForm(false); setEditingId(null);
      await load();
    } catch (e) { alert('Errore nel salvataggio della pagina'); } finally { setSaving(false); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Eliminare la pagina "${p.title}"?`)) return;
    try {
      await fetch(`/api/admin/pages/${p.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      await load();
    } catch (e) { alert('Errore eliminazione'); }
  };

  const pageUrl = (p) => `${origin}/pagina/${p.slug}`;
  const copyUrl = async (p) => {
    try { await navigator.clipboard.writeText(pageUrl(p)); alert('URL copiato negli appunti:\n' + pageUrl(p)); }
    catch (e) { window.prompt('Copia questo URL:', pageUrl(p)); }
  };

  const filteredTrips = trips.filter((t) => !tripSearch || (t.title || '').toLowerCase().includes(tripSearch.toLowerCase()) || (t.destination || '').toLowerCase().includes(tripSearch.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Pagine</h2>
          <p className="text-gray-500 text-sm mt-1">Crea e gestisci pagine testuali (Privacy, Cookie, Termini...) e sezioni viaggi con le card.</p>
        </div>
        <Button onClick={openNew} className="bg-ocean-500 hover:bg-ocean-600"><Plus className="w-4 h-4 mr-2" /> Nuova pagina</Button>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="w-10 h-10 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : pages.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          Nessuna pagina creata. Clicca "Nuova pagina" per iniziare.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {pages.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${p.layout === 'trips' ? 'bg-teal-50 text-teal-600' : 'bg-ocean-50 text-ocean-600'}`}>
                  {p.layout === 'trips' ? <Plane className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">{p.title}</span>
                    <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[p.pageType] || p.pageType}</Badge>
                    <Badge className={`text-[10px] ${p.status === 'published' ? 'bg-green-500' : 'bg-gray-400'}`}>{p.status === 'published' ? 'Pubblicata' : 'Bozza'}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Link2 className="w-3 h-3" /> <span className="truncate">/pagina/{p.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => copyUrl(p)} title="Copia URL"><Copy className="w-4 h-4 mr-1" /> Copia URL</Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(pageUrl(p), '_blank')} title="Apri"><ExternalLink className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)} title="Modifica"><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => remove(p)} title="Elimina"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== FORM DIALOG ===== */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId === 'new' ? 'Nuova pagina' : 'Modifica pagina'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tipologia */}
            <div>
              <Label className="text-sm font-semibold">Tipologia di pagina</Label>
              <select
                value={form.pageType}
                onChange={(e) => onTypeChange(e.target.value)}
                className="mt-1 w-full text-sm border rounded-md h-10 px-2 bg-white"
              >
                {TYPE_OPTIONS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map((it) => <option key={it.id} value={it.id}>{it.label}</option>)}
                  </optgroup>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                {form.layout === 'trips'
                  ? 'Questa pagina mostrerà le card dei viaggi (es. "Crociere").'
                  : 'Questa pagina mostrerà testo formattato (Privacy, Cookie, Termini, Chi siamo, ecc.).'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Titolo</Label>
                <Input value={form.title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Es. Privacy Policy" />
              </div>
              <div>
                <Label className="text-sm">URL (slug)</Label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 whitespace-nowrap">/pagina/</span>
                  <Input value={form.slug} onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: slugify(e.target.value) }); }} placeholder="privacy-policy" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Switch checked={form.status === 'published'} onCheckedChange={(v) => setForm({ ...form, status: v ? 'published' : 'draft' })} />
              <div>
                <p className="text-sm font-medium">{form.status === 'published' ? 'Pubblicata (visibile sul sito)' : 'Bozza (non visibile)'}</p>
                {['privacy', 'cookie', 'terms'].includes(form.pageType) && (
                  <p className="text-[11px] text-gray-500">Se pubblicata, il link nel footer verrà aggiornato automaticamente.</p>
                )}
              </div>
            </div>

            {/* CONTENT LAYOUT */}
            {form.layout === 'content' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Sottotitolo (opzionale)</Label>
                  <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Breve descrizione mostrata sotto al titolo" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Contenuto della pagina</Label>
                  <div className="mt-1">
                    <RichTextEditor value={form.content} onChange={(html) => setForm((prev) => ({ ...prev, content: html }))} placeholder="Scrivi qui il testo della pagina (usa la barra per grassetto, titoli, elenchi, link...)" />
                  </div>
                </div>
              </div>
            )}

            {/* TRIPS LAYOUT */}
            {form.layout === 'trips' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Sottotitolo / claim</Label>
                    <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Es. Viaggia per mare in tutto comfort" />
                  </div>
                  <div>
                    <Label className="text-sm">Immagine di copertina (URL)</Label>
                    <div className="flex gap-2"><Input value={form.heroImage} onChange={(e) => setForm({ ...form, heroImage: e.target.value })} placeholder="https://..." /><ImageUploadButton folder="pagine" onUploaded={(url) => setForm((f) => ({ ...f, heroImage: url }))} /></div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Testo introduttivo (opzionale)</Label>
                  <Textarea value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} rows={2} placeholder="Breve testo mostrato sopra le card dei viaggi" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Quali viaggi mostrare?</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {[
                      ['all', 'Tutti i viaggi'],
                      ['category', 'Per categoria'],
                      ['manual', 'Selezione manuale'],
                    ].map(([val, lbl]) => (
                      <button key={val} type="button" onClick={() => setForm({ ...form, tripSource: val })}
                        className={`px-3 py-1.5 rounded-lg text-xs border-2 transition-all ${form.tripSource === val ? 'border-ocean-500 bg-ocean-50 text-ocean-600' : 'border-gray-200 text-gray-600'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {form.tripSource === 'category' && (
                  <div>
                    <Label className="text-sm">Categoria</Label>
                    <select value={form.tripCategory} onChange={(e) => setForm({ ...form, tripCategory: e.target.value })} className="mt-1 w-full text-sm border rounded-md h-10 px-2 bg-white">
                      <option value="">— Seleziona categoria —</option>
                      {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {form.tripSource === 'manual' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-sm">Seleziona i viaggi ({form.tripIds.length} selezionati)</Label>
                    </div>
                    <div className="relative mb-2">
                      <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                      <Input value={tripSearch} onChange={(e) => setTripSearch(e.target.value)} placeholder="Cerca viaggio..." className="pl-8 h-9" />
                    </div>
                    <div className="border rounded-lg max-h-56 overflow-y-auto divide-y">
                      {filteredTrips.length === 0 ? (
                        <p className="text-xs text-gray-400 p-3 text-center">Nessun viaggio trovato</p>
                      ) : filteredTrips.map((t) => {
                        const sel = form.tripIds.includes(t.id);
                        return (
                          <button key={t.id} type="button" onClick={() => toggleTrip(t.id)} className="w-full flex items-center gap-3 p-2 text-left hover:bg-gray-50">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-ocean-500 border-ocean-500' : 'border-gray-300'}`}>
                              {sel && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            {t.cardImage && <img src={t.cardImage} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{t.title}</p>
                              <p className="text-[11px] text-gray-400 truncate">{t.destination} · €{t.priceFrom}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SEO */}
            <div className="border-t pt-3">
              <button type="button" onClick={() => setShowSeo(!showSeo)} className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                <Globe className="w-4 h-4" /> SEO (opzionale) {showSeo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showSeo && (
                <div className="space-y-2 mt-2">
                  <div><Label className="text-xs">Meta Title</Label><Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} placeholder="Titolo per i motori di ricerca" /></div>
                  <div><Label className="text-xs">Meta Description</Label><Textarea value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} rows={2} placeholder="Descrizione per i motori di ricerca" /></div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Annulla</Button>
              <Button onClick={save} disabled={saving} className="bg-ocean-500 hover:bg-ocean-600">{saving ? 'Salvataggio...' : 'Salva pagina'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
