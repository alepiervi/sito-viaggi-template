'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Edit, Trash2, Eye, ExternalLink, Check, X, Users, Calendar,
  Euro, Image, FileText, MessageCircle, Plane, Heart, Search,
  ClipboardList, Copy, Loader2, Clock
} from 'lucide-react';

const SERVICE_PRESETS = [
  'Volo A/R', 'Tasse aeroportuali', 'Trasferimenti', 'Assistenza H24',
  'Pensione Completa', 'Mezza Pensione', 'All Inclusive', 'Assicurazione medico/bagaglio',
  'Hotel', 'Escursioni', 'Guida turistica', 'Wi-Fi', 'Visto', 'Spa & Wellness',
  'Noleggio auto', 'Parcheggio aeroporto',
];

export default function QuoteManager({ token, quotes, setQuotes, showForm, setShowForm, editing, setEditing, trips, footerSettings }) {
  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

  const emptyForm = {
    title: '', subtitle: '', sourceUrl: '', tripId: '',
    clientName: '', clientEmail: '', clientPhone: '',
    images: [], description: '', itinerary: '',
    hotelName: '', treatment: '', destination: '',
    fullPrice: '', discountedPrice: '', pricePerPerson: true,
    dates: '', duration: '', departure: '',
    adults: [], children: [], services: [],
    clientNotes: '',
    contactWhatsapp: footerSettings?.contactInfo?.whatsappNumber || '',
    contactEmail: footerSettings?.contactInfo?.email || '',
    validUntil: '', status: 'draft',
  };

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tripSearch, setTripSearch] = useState('');
  const [showTripPicker, setShowTripPicker] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [newAdultName, setNewAdultName] = useState('');
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');
  const [newService, setNewService] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const filteredTrips = (trips || []).filter(t =>
    !tripSearch || t.title?.toLowerCase().includes(tripSearch.toLowerCase()) ||
    t.destination?.toLowerCase().includes(tripSearch.toLowerCase()) ||
    t.hotelName?.toLowerCase().includes(tripSearch.toLowerCase())
  );

  const selectTrip = (trip) => {
    setSelectedTrip(trip);
    setShowTripPicker(false);
    setTripSearch('');

    let itineraryText = '';
    if (Array.isArray(trip.itinerary)) {
      itineraryText = trip.itinerary.map(d => `Giorno ${d.day}: ${d.title}\n${d.description}`).join('\n\n');
    } else if (typeof trip.itinerary === 'string') {
      itineraryText = trip.itinerary;
    }

    const services = (trip.included || []).map(s => ({ name: s, icon: 'default' }));
    const allImages = [];
    if (trip.cardImage) allImages.push(trip.cardImage);
    if (trip.images) allImages.push(...trip.images);
    const uniqueImages = [...new Set(allImages)].filter(Boolean);

    setForm(prev => ({
      ...prev,
      tripId: trip.id, title: trip.title || '', subtitle: trip.subtitle || trip.hotelName || '',
      description: trip.description || '', itinerary: itineraryText,
      images: uniqueImages, hotelName: trip.hotelName || '', treatment: trip.treatment || '',
      destination: trip.destination || '', duration: trip.duration || '',
      departure: trip.departureCity || '', services,
      sourceUrl: trip.slug ? `${BASE_URL}/viaggio/${trip.slug}` : '',
    }));
  };

  const handleSave = async () => {
    if (!form.title) { alert('Inserisci un titolo'); return; }
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/admin/quotes/${editing.id}` : '/api/admin/quotes';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        if (editing) setQuotes(prev => prev.map(q => q.id === data.id ? data : q));
        else setQuotes(prev => [data, ...prev]);
        resetForm();
        alert(editing ? 'Preventivo aggiornato!' : 'Preventivo creato!');
      }
    } catch (err) { alert('Errore nel salvataggio'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo preventivo?')) return;
    await fetch(`/api/admin/quotes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setQuotes(prev => prev.filter(q => q.id !== id));
  };

  const resetForm = () => { setForm(emptyForm); setShowForm(false); setEditing(null); setSelectedTrip(null); };
  const startEdit = (quote) => {
    setForm({ ...emptyForm, ...quote, adults: quote.adults || [], children: quote.children || [], services: quote.services || [], images: quote.images || [] });
    if (quote.tripId) { const t = (trips || []).find(tr => tr.id === quote.tripId); if (t) setSelectedTrip(t); }
    setEditing(quote); setShowForm(true);
  };
  const copyLink = (slug) => { navigator.clipboard.writeText(`${BASE_URL}/preventivo/${slug}`); setCopiedId(slug); setTimeout(() => setCopiedId(null), 2000); };
  const addAdult = () => { if (newAdultName.trim()) { setForm(p => ({ ...p, adults: [...p.adults, { name: newAdultName.trim() }] })); setNewAdultName(''); } };
  const addChild = () => { if (newChildName.trim()) { setForm(p => ({ ...p, children: [...p.children, { name: newChildName.trim(), age: parseInt(newChildAge) || 0 }] })); setNewChildName(''); setNewChildAge(''); } };
  const addService = (name) => { if (name && !form.services.find(s => s.name === name)) { setForm(p => ({ ...p, services: [...p.services, { name, icon: 'default' }] })); setNewService(''); } };

  // === LIST VIEW ===
  if (!showForm) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900">Preventivi</h2>
            <p className="text-gray-500 mt-1">Crea preventivi partendo dai viaggi nel catalogo</p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setShowForm(true); setEditing(null); setSelectedTrip(null); }} className="bg-ocean-500 hover:bg-ocean-600">
            <Plus className="w-4 h-4 mr-2" /> Nuovo Preventivo
          </Button>
        </div>
        {quotes.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">Nessun preventivo</h3>
            <p className="text-gray-400 mb-4">Seleziona un viaggio dal catalogo e crea il tuo preventivo</p>
            <Button onClick={() => { setForm(emptyForm); setShowForm(true); }} className="bg-ocean-500 hover:bg-ocean-600">
              <Plus className="w-4 h-4 mr-2" /> Crea Preventivo
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {quotes.map(q => {
              const isExpired = q.validUntil && new Date(q.validUntil) < new Date();
              const statusMap = { draft: { bg: 'bg-gray-100 text-gray-600', l: 'Bozza' }, active: { bg: 'bg-emerald-100 text-emerald-700', l: 'Attivo' }, expired: { bg: 'bg-red-100 text-red-600', l: 'Scaduto' }};
              const st = isExpired ? 'expired' : (q.status || 'draft');
              const totalPax = (q.adults?.length || 0) + (q.children?.length || 0);
              return (
                <Card key={q.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {q.images?.[0] && <img src={q.images[0]} alt="" className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 truncate">{q.title}</h3>
                          <Badge className={statusMap[st]?.bg}>{statusMap[st]?.l}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                          {q.clientName && <span><Users className="w-3 h-3 inline mr-1" />{q.clientName}</span>}
                          {q.discountedPrice && <span className="font-semibold text-ocean-600">€{Number(q.discountedPrice).toLocaleString('it-IT')}</span>}
                          {q.dates && <span><Calendar className="w-3 h-3 inline mr-1" />{q.dates}</span>}
                          {totalPax > 0 && <span>{totalPax} pax ({q.adults?.length || 0}ad + {q.children?.length || 0}bam)</span>}
                          <span><Eye className="w-3 h-3 inline mr-1" />{q.views || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => copyLink(q.slug)} title="Copia link">{copiedId === q.slug ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(`/preventivo/${q.slug}`, '_blank')} title="Anteprima"><ExternalLink className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(q)} title="Modifica"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(q.id)} className="text-red-500" title="Elimina"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // === FORM VIEW ===
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">{editing ? 'Modifica Preventivo' : 'Nuovo Preventivo'}</h3>
        <Button variant="outline" onClick={resetForm}>Torna alla lista</Button>
      </div>

      <div className="space-y-6">
        {/* STEP 1: Select Trip */}
        <Card className={selectedTrip ? 'border-emerald-300 bg-emerald-50/30' : 'border-ocean-300'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plane className="w-5 h-5" /> 1. Seleziona Viaggio / Struttura</CardTitle>
            <CardDescription>Scegli dal catalogo — foto, descrizione e servizi verranno caricati automaticamente</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTrip ? (
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-emerald-200 shadow-sm">
                {selectedTrip.cardImage && <img src={selectedTrip.cardImage} alt="" className="w-24 h-16 rounded-lg object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-lg">{selectedTrip.title}</h4>
                  <p className="text-sm text-gray-500">{selectedTrip.destination} {selectedTrip.hotelName ? `• ${selectedTrip.hotelName}` : ''}</p>
                  <p className="text-xs text-emerald-600 mt-1"><Check className="w-3 h-3 inline mr-1" />Caricati: {form.images.length} foto, {form.services.length} servizi, descrizione e itinerario</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSelectedTrip(null); setShowTripPicker(true); }}>Cambia</Button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input value={tripSearch} onChange={(e) => { setTripSearch(e.target.value); setShowTripPicker(true); }} onFocus={() => setShowTripPicker(true)}
                    placeholder="Cerca viaggio per nome, destinazione o struttura..." className="pl-10 h-12 text-base" />
                </div>
                {showTripPicker && (
                  <div className="mt-2 max-h-[400px] overflow-y-auto rounded-xl border shadow-lg bg-white divide-y">
                    {filteredTrips.length === 0 ? (
                      <p className="p-4 text-gray-400 text-center">Nessun viaggio trovato</p>
                    ) : filteredTrips.map(trip => (
                      <button key={trip.id} onClick={() => selectTrip(trip)} className="w-full flex items-center gap-4 p-3 hover:bg-ocean-50 transition-colors text-left">
                        {trip.cardImage ? <img src={trip.cardImage} alt="" className="w-16 h-12 rounded-lg object-cover flex-shrink-0" /> : <div className="w-16 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><Plane className="w-5 h-5 text-gray-300" /></div>}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{trip.title}</p>
                          <p className="text-xs text-gray-500 truncate">{trip.destination} {trip.hotelName ? `• ${trip.hotelName}` : ''} {trip.duration ? `• ${trip.duration}` : ''}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-ocean-600">{trip.images?.length || 0} foto</p>
                          <p className="text-xs text-gray-400">{trip.included?.length || 0} servizi</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* STEP 2: Client */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> 2. Dati Cliente</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div><Label className="font-bold">Nome Cliente *</Label><Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Es. Famiglia Rossi" /></div>
              <div><Label>Email</Label><Input value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} /></div>
              <div><Label>Telefono</Label><Input value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>

        {/* STEP 3: Period */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> 3. Periodo & Dettagli</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label className="font-bold">Titolo *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Sottotitolo / Struttura</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div><Label className="font-bold">Date / Periodo</Label><Input value={form.dates} onChange={(e) => setForm({ ...form, dates: e.target.value })} placeholder="21-29 Nov 2025" /></div>
              <div><Label>Durata</Label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
              <div><Label>Partenza</Label><Input value={form.departure} onChange={(e) => setForm({ ...form, departure: e.target.value })} /></div>
              <div><Label>Valido fino al</Label><Input type="date" value={form.validUntil ? form.validUntil.substring(0, 10) : ''} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>
            </div>
            <div className="flex gap-3">
              {['draft', 'active'].map(s => (
                <label key={s} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer ${form.status === s ? 'border-ocean-500 bg-ocean-50' : 'border-gray-200'}`}>
                  <input type="radio" name="qstatus" checked={form.status === s} onChange={() => setForm({ ...form, status: s })} className="accent-ocean-500" />
                  <span className="font-medium">{s === 'draft' ? 'Bozza' : 'Attivo'}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* STEP 4: Pricing */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Euro className="w-5 h-5" /> 4. Prezzi</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div><Label>Prezzo Pieno (€)</Label><Input type="number" value={form.fullPrice} onChange={(e) => setForm({ ...form, fullPrice: e.target.value })} placeholder="2500" /></div>
              <div><Label className="font-bold text-emerald-600">Prezzo Scontato (€)</Label><Input type="number" value={form.discountedPrice} onChange={(e) => setForm({ ...form, discountedPrice: e.target.value })} placeholder="1850" className="border-emerald-300" /></div>
              <div className="flex items-end pb-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.pricePerPerson} onChange={(e) => setForm({ ...form, pricePerPerson: e.target.checked })} className="rounded accent-ocean-500" /><span className="font-medium">A persona</span></label></div>
            </div>
            {form.fullPrice && form.discountedPrice && Number(form.fullPrice) > Number(form.discountedPrice) && (
              <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="font-bold text-emerald-700">Risparmio: €{(Number(form.fullPrice) - Number(form.discountedPrice)).toLocaleString('it-IT')} ({Math.round(((Number(form.fullPrice) - Number(form.discountedPrice)) / Number(form.fullPrice)) * 100)}%)</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* STEP 5: Participants */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> 5. Partecipanti ({form.adults.length} adulti, {form.children.length} bambini)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-bold text-ocean-700 mb-2 block">Adulti</Label>
              <div className="flex gap-2 mb-2">
                <Input value={newAdultName} onChange={(e) => setNewAdultName(e.target.value)} placeholder="Nome adulto..." className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAdult(); } }} />
                <Button onClick={addAdult} variant="outline"><Plus className="w-4 h-4 mr-1" /> Aggiungi</Button>
              </div>
              <div className="flex flex-wrap gap-2">{form.adults.map((p, i) => (
                <Badge key={i} variant="secondary" className="gap-1 px-3 py-1.5 bg-ocean-50 text-ocean-700"><Users className="w-3 h-3" /> {p.name} <button onClick={() => setForm(pr => ({ ...pr, adults: pr.adults.filter((_, j) => j !== i) }))}><X className="w-3 h-3 ml-1" /></button></Badge>
              ))}</div>
            </div>
            <div>
              <Label className="font-bold text-amber-700 mb-2 block">Bambini</Label>
              <div className="flex gap-2 mb-2">
                <Input value={newChildName} onChange={(e) => setNewChildName(e.target.value)} placeholder="Nome bambino..." className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChild(); } }} />
                <Input type="number" value={newChildAge} onChange={(e) => setNewChildAge(e.target.value)} placeholder="Età" className="w-20" min="0" max="17" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChild(); } }} />
                <Button onClick={addChild} variant="outline"><Plus className="w-4 h-4 mr-1" /> Aggiungi</Button>
              </div>
              <div className="flex flex-wrap gap-2">{form.children.map((c, i) => (
                <Badge key={i} variant="secondary" className="gap-1 px-3 py-1.5 bg-amber-50 text-amber-700"><Heart className="w-3 h-3" /> {c.name} ({c.age} {c.age === 1 ? 'anno' : 'anni'}) <button onClick={() => setForm(pr => ({ ...pr, children: pr.children.filter((_, j) => j !== i) }))}><X className="w-3 h-3 ml-1" /></button></Badge>
              ))}</div>
            </div>
          </CardContent>
        </Card>

        {/* STEP 6: Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Check className="w-5 h-5" /> 6. Servizi Inclusi ({form.services.length})</CardTitle>
            {selectedTrip && <CardDescription>Caricati dal viaggio — aggiungi o rimuovi</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              {SERVICE_PRESETS.filter(s => !form.services.find(fs => fs.name === s)).map(s => (
                <Button key={s} variant="outline" size="sm" onClick={() => addService(s)} className="text-xs">{s}</Button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <Input value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="Servizio personalizzato..." className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addService(newService); } }} />
              <Button onClick={() => addService(newService)} variant="outline"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">{form.services.map((s, i) => (
              <Badge key={i} className="bg-emerald-100 text-emerald-700 gap-1 px-3 py-1.5"><Check className="w-3 h-3" /> {s.name} <button onClick={() => setForm(pr => ({ ...pr, services: pr.services.filter((_, j) => j !== i) }))}><X className="w-3 h-3" /></button></Badge>
            ))}</div>
          </CardContent>
        </Card>

        {/* STEP 7: Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Image className="w-5 h-5" /> 7. Immagini ({form.images.length})</CardTitle>
            {selectedTrip && <CardDescription>Caricate dal viaggio</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="URL immagine aggiuntiva..." className="flex-1" />
              <Button onClick={() => { if (newImageUrl) { setForm(p => ({ ...p, images: [...p.images, newImageUrl] })); setNewImageUrl(''); } }} variant="outline"><Plus className="w-4 h-4" /></Button>
            </div>
            {form.images.length > 0 && (
              <div className="grid grid-cols-5 md:grid-cols-8 gap-2">
                {form.images.map((img, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border">
                    <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.opacity = '0.3'} />
                    <button onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* STEP 8: Description & Itinerary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> 8. Descrizione & Itinerario</CardTitle>
            {selectedTrip && <CardDescription>Caricati dal viaggio — modificabili</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label className="font-bold">Descrizione</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} /></div>
            <div><Label className="font-bold">Itinerario</Label><Textarea value={form.itinerary} onChange={(e) => setForm({ ...form, itinerary: e.target.value })} rows={6} /></div>
          </CardContent>
        </Card>

        {/* STEP 9: Notes */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5" /> 9. Note & Contatti</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>WhatsApp</Label><Input value={form.contactWhatsapp} onChange={(e) => setForm({ ...form, contactWhatsapp: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
            </div>
            <div><Label>Note per il cliente</Label><Textarea value={form.clientNotes} onChange={(e) => setForm({ ...form, clientNotes: e.target.value })} rows={3} /></div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 pb-8">
          <Button onClick={handleSave} disabled={saving} className="bg-ocean-500 hover:bg-ocean-600 px-8">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvataggio...</> : editing ? 'Aggiorna Preventivo' : 'Crea Preventivo'}
          </Button>
          <Button variant="outline" onClick={resetForm}>Annulla</Button>
          {editing?.slug && <Button variant="outline" onClick={() => window.open(`/preventivo/${editing.slug}`, '_blank')}><ExternalLink className="w-4 h-4 mr-1" /> Anteprima</Button>}
        </div>
      </div>
    </div>
  );
}
