'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Users, Gift, Ticket, Mail, Phone, Calendar, Plus, RefreshCw, Search, X, Check,
  TrendingUp, AlertCircle, Sparkles, ArrowRight, Trash2, ExternalLink, Loader2
} from 'lucide-react';

export default function CustomersManager({ token }) {
  const [tab, setTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [issueDialog, setIssueDialog] = useState(false);
  const [issueForm, setIssueForm] = useState({ customerId: '', amount: 50, note: '' });

  const loadAll = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [c, r, v] = await Promise.all([
        fetch('/api/admin/customers', { headers }).then(x => x.json()),
        fetch('/api/admin/referrals', { headers }).then(x => x.json()),
        fetch('/api/admin/vouchers', { headers }).then(x => x.json()),
      ]);
      setCustomers(Array.isArray(c) ? c : []);
      setReferrals(Array.isArray(r) ? r : []);
      setVouchers(Array.isArray(v) ? v : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const filteredCustomers = customers.filter(c =>
    !search ||
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.referralCode?.includes(search.toUpperCase())
  );

  const issueVoucher = async () => {
    if (!issueForm.customerId) return alert('Seleziona un cliente');
    const res = await fetch('/api/admin/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ customerId: issueForm.customerId, amount: Number(issueForm.amount), note: issueForm.note }),
    });
    if (res.ok) {
      setIssueDialog(false);
      setIssueForm({ customerId: '', amount: 50, note: '' });
      await loadAll();
      alert('Buono emesso!');
    } else {
      alert('Errore emissione');
    }
  };

  const cancelVoucher = async (id) => {
    if (!confirm('Annullare questo buono? L\'azione è reversibile solo manualmente.')) return;
    await fetch(`/api/admin/vouchers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await loadAll();
  };

  const stats = {
    totalCustomers: customers.length,
    totalReferrals: referrals.length,
    convertedReferrals: referrals.filter(r => r.status === 'converted').length,
    activeVouchers: vouchers.filter(v => v.status === 'active').reduce((s, v) => s + v.amount, 0),
    usedVouchers: vouchers.filter(v => v.status === 'used').reduce((s, v) => s + v.amount, 0),
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Clienti & Referral</h2>
          <p className="text-gray-500 mt-1">Gestisci registrati, sistema referral e buoni sconto</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAll} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Aggiorna
          </Button>
          <Button onClick={() => setIssueDialog(true)} className="bg-ocean-500 hover:bg-ocean-600">
            <Plus className="w-4 h-4 mr-2" /> Emetti buono
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard icon={Users} label="Clienti" value={stats.totalCustomers} color="ocean" />
        <StatCard icon={Sparkles} label="Inviti totali" value={stats.totalReferrals} color="amber" />
        <StatCard icon={Check} label="Inviti convertiti" value={stats.convertedReferrals} color="emerald" />
        <StatCard icon={Ticket} label="Buoni attivi" value={`€${stats.activeVouchers}`} color="purple" />
        <StatCard icon={TrendingUp} label="Buoni usati" value={`€${stats.usedVouchers}`} color="gray" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b">
        {[
          { id: 'customers', label: `Clienti (${customers.length})`, icon: Users },
          { id: 'referrals', label: `Referral (${referrals.length})`, icon: Sparkles },
          { id: 'vouchers', label: `Buoni (${vouchers.length})`, icon: Ticket },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-ocean-500 text-ocean-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* CUSTOMERS TAB */}
      {tab === 'customers' && (
        <Card>
          <CardHeader>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca per nome, email, telefono, codice referral..." className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCustomers.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nessun cliente {search ? 'trovato' : 'registrato ancora'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wider">
                      <th className="pb-2">Cliente</th>
                      <th className="pb-2">Contatti</th>
                      <th className="pb-2">Codice</th>
                      <th className="pb-2 text-center">Referral</th>
                      <th className="pb-2 text-center">Buoni</th>
                      <th className="pb-2">Iscritto il</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCustomers.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <p className="font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
                          {c.referredByCode && <p className="text-[10px] text-gray-400">Invitato da {c.referredByCode}</p>}
                        </td>
                        <td className="py-3 text-xs text-gray-600">
                          <p>{c.email}</p>
                          <p>{c.phone}</p>
                        </td>
                        <td className="py-3"><code className="bg-ocean-50 text-ocean-700 px-2 py-0.5 rounded font-mono text-xs">{c.referralCode}</code></td>
                        <td className="py-3 text-center font-semibold">{c.referralCount}</td>
                        <td className="py-3 text-center font-semibold">{c.voucherCount}</td>
                        <td className="py-3 text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString('it-IT')}</td>
                        <td className="py-3">
                          <Button size="sm" variant="outline" onClick={() => setSelectedCustomer(c)}>Vedi</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* REFERRALS TAB */}
      {tab === 'referrals' && (
        <Card>
          <CardContent className="pt-6">
            {referrals.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nessun referral ancora</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wider">
                      <th className="pb-2">Presentatore</th>
                      <th className="pb-2">Invitato</th>
                      <th className="pb-2">Codice usato</th>
                      <th className="pb-2">Stato</th>
                      <th className="pb-2">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {referrals.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <p className="font-semibold">{r.referrerName}</p>
                          <p className="text-[10px] text-gray-400">{r.referrerEmail}</p>
                        </td>
                        <td className="py-3">
                          <p>{r.referredName}</p>
                          <p className="text-[10px] text-gray-400">{r.referredEmail}</p>
                        </td>
                        <td className="py-3"><code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">{r.referralCodeUsed}</code></td>
                        <td className="py-3">
                          {r.status === 'pending' && <Badge className="bg-amber-100 text-amber-700">In attesa</Badge>}
                          {r.status === 'converted' && <Badge className="bg-emerald-100 text-emerald-700">Convertito ✓</Badge>}
                          {r.status === 'cancelled' && <Badge className="bg-gray-100 text-gray-600">Annullato</Badge>}
                          {r.status === 'expired' && <Badge className="bg-red-100 text-red-600">Scaduto</Badge>}
                        </td>
                        <td className="py-3 text-xs text-gray-500">
                          <p>{new Date(r.createdAt).toLocaleDateString('it-IT')}</p>
                          {r.convertedAt && <p className="text-emerald-600">→ {new Date(r.convertedAt).toLocaleDateString('it-IT')}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* VOUCHERS TAB */}
      {tab === 'vouchers' && (
        <Card>
          <CardContent className="pt-6">
            {vouchers.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nessun buono emesso</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wider">
                      <th className="pb-2">Codice</th>
                      <th className="pb-2">Cliente</th>
                      <th className="pb-2">Importo</th>
                      <th className="pb-2">Fonte</th>
                      <th className="pb-2">Stato</th>
                      <th className="pb-2">Emesso</th>
                      <th className="pb-2">Scade</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {vouchers.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="py-3"><code className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono text-xs font-bold">{v.code}</code></td>
                        <td className="py-3">
                          <p className="font-semibold">{v.customerName}</p>
                          <p className="text-[10px] text-gray-400">{v.customerEmail}</p>
                        </td>
                        <td className="py-3 font-bold text-emerald-600">€{v.amount}</td>
                        <td className="py-3">
                          {v.source === 'referral' && <Badge className="bg-amber-100 text-amber-700">Referral</Badge>}
                          {v.source === 'manual' && <Badge className="bg-blue-100 text-blue-700">Manuale</Badge>}
                          {v.source === 'promo' && <Badge className="bg-purple-100 text-purple-700">Promo</Badge>}
                        </td>
                        <td className="py-3">
                          {v.status === 'active' && <Badge className="bg-emerald-100 text-emerald-700">Attivo</Badge>}
                          {v.status === 'used' && <Badge className="bg-gray-200 text-gray-700">Usato</Badge>}
                          {v.status === 'expired' && <Badge className="bg-red-100 text-red-600">Scaduto</Badge>}
                          {v.status === 'cancelled' && <Badge className="bg-gray-100 text-gray-500">Annullato</Badge>}
                        </td>
                        <td className="py-3 text-xs text-gray-500">{new Date(v.issuedAt).toLocaleDateString('it-IT')}</td>
                        <td className="py-3 text-xs text-gray-500">{new Date(v.expiresAt).toLocaleDateString('it-IT')}</td>
                        <td className="py-3">
                          {v.status === 'active' && (
                            <Button size="sm" variant="outline" onClick={() => cancelVoucher(v.id)} className="text-red-500 hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Issue voucher dialog */}
      <Dialog open={issueDialog} onOpenChange={setIssueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emetti buono sconto</DialogTitle>
            <DialogDescription>Crea manualmente un buono sconto per un cliente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <select value={issueForm.customerId} onChange={(e) => setIssueForm({ ...issueForm, customerId: e.target.value })} className="w-full border rounded-md p-2">
                <option value="">— Seleziona cliente —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Importo (€)</Label>
              <Input type="number" value={issueForm.amount} onChange={(e) => setIssueForm({ ...issueForm, amount: e.target.value })} />
            </div>
            <div>
              <Label>Note (opzionale)</Label>
              <Textarea value={issueForm.note} onChange={(e) => setIssueForm({ ...issueForm, note: e.target.value })} placeholder="Motivo dell'emissione manuale..." rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIssueDialog(false)}>Annulla</Button>
              <Button onClick={issueVoucher} className="bg-ocean-500 hover:bg-ocean-600">Emetti buono</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer detail dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(o) => !o && setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCustomer.firstName} {selectedCustomer.lastName}</DialogTitle>
                <DialogDescription>
                  {selectedCustomer.email} • {selectedCustomer.phone}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-ocean-50 rounded-lg">
                    <p className="text-2xl font-bold text-ocean-600">{selectedCustomer.referralCount}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Referral</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-600">{selectedCustomer.voucherCount}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Buoni</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm font-mono font-bold text-amber-700">{selectedCustomer.referralCode}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Codice</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1 p-3 bg-gray-50 rounded-lg">
                  <p>📅 Iscritto: {new Date(selectedCustomer.createdAt).toLocaleString('it-IT')}</p>
                  {selectedCustomer.referredByCode && <p>👥 Invitato da codice: <code className="bg-white px-1.5 py-0.5 rounded">{selectedCustomer.referredByCode}</code></p>}
                </div>
                <Button onClick={() => { setIssueForm({ ...issueForm, customerId: selectedCustomer.id }); setSelectedCustomer(null); setIssueDialog(true); }} className="w-full bg-ocean-500 hover:bg-ocean-600">
                  <Gift className="w-4 h-4 mr-2" /> Emetti buono per questo cliente
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    ocean: 'from-ocean-500 to-ocean-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
    gray: 'from-gray-500 to-gray-600',
  };
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
