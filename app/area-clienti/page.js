'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Gift, Users, Mail, Phone, User, LogOut, Copy, Check, Share2, MessageCircle,
  Loader2, Plane, Calendar, Euro, Ticket, Sparkles, TrendingUp, Clock, X, AlertCircle,
  Send, ExternalLink, Edit, Save
} from 'lucide-react';
import { useT } from '@/lib/useT';

export default function CustomerDashboard() {
  const { t, lang } = useT();
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '', password: '' });

  useEffect(() => {
    const t = localStorage.getItem('customerToken');
    if (!t) {
      router.replace('/accedi');
      return;
    }
    setToken(t);
    loadDashboard(t);
  }, [router]);

  const loadDashboard = async (t) => {
    setLoading(true);
    try {
      const res = await fetch('/api/customer/dashboard', { headers: { Authorization: `Bearer ${t}` } });
      if (res.status === 401) {
        localStorage.removeItem('customerToken');
        router.replace('/accedi');
        return;
      }
      const d = await res.json();
      setData(d);
      setProfileForm({ firstName: d.customer.firstName, lastName: d.customer.lastName, phone: d.customer.phone, password: '' });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerData');
    router.push('/');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data?.referralLink || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsapp = () => {
    const text = `${t('clienti.shareWaText')} ${data.referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareEmail = () => {
    const subject = t('clienti.shareEmailSubject');
    const body = `${t('clienti.shareEmailBody')}\n${data.referralLink}\n\n${lang === 'en' ? 'See you soon!' : 'A presto!'}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const saveProfile = async () => {
    const body = { firstName: profileForm.firstName, lastName: profileForm.lastName, phone: profileForm.phone };
    if (profileForm.password) body.password = profileForm.password;
    const res = await fetch('/api/customer/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditingProfile(false);
      setProfileForm(p => ({ ...p, password: '' }));
      await loadDashboard(token);
      alert(t('clienti.profileUpdated'));
    } else {
      alert(t('clienti.updateError'));
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-ocean-500" /></div>;
  }
  if (!data) return null;

  const c = data.customer;
  const initials = `${c.firstName?.charAt(0) || ''}${c.lastName?.charAt(0) || ''}`.toUpperCase();
  const locale = lang === 'en' ? 'en-GB' : 'it-IT';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-9" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-700 text-white flex items-center justify-center font-bold text-sm">{initials}</div>
              <div className="leading-tight">
                <p className="font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
                <p className="text-xs text-gray-500">{c.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={logout}><LogOut className="w-4 h-4 mr-1" /> {t('clienti.logout')}</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900">{t('clienti.hello')} {c.firstName}! 👋</h1>
          <p className="text-gray-500 mt-1">{t('clienti.welcomeMsg')}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Ticket} label={t('clienti.activeVouchers')} value={`€${data.stats.activeVouchers}`} color="emerald" />
          <StatCard icon={TrendingUp} label={t('clienti.usedVouchers')} value={`€${data.stats.usedVouchers}`} color="ocean" />
          <StatCard icon={Users} label={t('clienti.friendsInvited')} value={data.stats.totalReferrals} color="amber" />
          <StatCard icon={Sparkles} label={t('clienti.booked')} value={data.stats.convertedReferrals} color="purple" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: t('clienti.overview'), icon: TrendingUp },
            { id: 'referral', label: t('clienti.inviteFriends'), icon: Share2 },
            { id: 'vouchers', label: t('clienti.myVouchers'), icon: Ticket },
            { id: 'requests', label: t('clienti.myRequests'), icon: Plane },
            { id: 'profile', label: t('clienti.profile'), icon: User },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${tab === t.id ? 'bg-ocean-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* TAB: OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Featured referral CTA */}
            <Card className="bg-gradient-to-r from-ocean-500 to-ocean-700 text-white border-0 overflow-hidden relative">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full" />
              <CardContent className="p-6 relative">
                <Gift className="w-10 h-10 mb-3 opacity-90" />
                <h2 className="text-2xl font-display font-bold mb-1">{t('clienti.inviteEarn')}</h2>
                <p className="text-white/90 mb-4 text-sm">{t('clienti.inviteEarnDesc')}</p>
                <Button variant="secondary" onClick={() => setTab('referral')} className="bg-white text-ocean-600 hover:bg-gray-100">
                  {t('clienti.shareMyLink')} <ArrowRightIcon />
                </Button>
              </CardContent>
            </Card>

            {/* Recent activity */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Ticket className="w-4 h-4" /> {t('clienti.latestVouchers')}</CardTitle></CardHeader>
                <CardContent>
                  {data.wallet.vouchers.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">{t('clienti.noVouchersYet')}</p>
                  ) : (
                    <div className="space-y-2">
                      {data.wallet.vouchers.slice(0, 3).map(v => <VoucherRow key={v.id} v={v} />)}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> {t('clienti.latestInvited')}</CardTitle></CardHeader>
                <CardContent>
                  {data.referrals.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">{t('clienti.noOneInvited')}</p>
                  ) : (
                    <div className="space-y-2">
                      {data.referrals.slice(0, 3).map(r => <ReferralRow key={r.id} r={r} />)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TAB: REFERRAL */}
        {tab === 'referral' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center flex-shrink-0">
                    <Gift className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-display font-bold text-gray-900 mb-1">{t('clienti.howItWorks')}</h2>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li>{t('clienti.step1')}</li>
                      <li>{t('clienti.step2')}</li>
                      <li>{t('clienti.step3a')} <strong>{t('clienti.step3b')}</strong></li>
                      <li>{t('clienti.step4')}</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('clienti.yourReferralLink')}</CardTitle>
                <CardDescription>{t('clienti.shareWithFriends')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">{t('clienti.yourPersonalCode')}</p>
                  <p className="text-3xl font-bold text-ocean-600 font-mono tracking-wider">{c.referralCode}</p>
                </div>
                <div>
                  <Label>{t('clienti.linkToShare')}</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={data.referralLink} readOnly className="font-mono text-xs bg-gray-50" />
                    <Button variant="outline" onClick={copyLink}>
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Button onClick={shareWhatsapp} className="bg-green-500 hover:bg-green-600">
                    <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                  </Button>
                  <Button onClick={shareEmail} variant="outline">
                    <Mail className="w-4 h-4 mr-2" /> Email
                  </Button>
                  <Button onClick={copyLink} variant="outline">
                    <Copy className="w-4 h-4 mr-2" /> {t('clienti.copyLink')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Invited list */}
            <Card>
              <CardHeader>
                <CardTitle>{t('clienti.friendsInvitedCount')} ({data.referrals.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {data.referrals.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">{t('clienti.startSharing')}</p>
                ) : (
                  <div className="space-y-2">
                    {data.referrals.map(r => <ReferralRow key={r.id} r={r} />)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB: VOUCHERS */}
        {tab === 'vouchers' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('clienti.myDiscountVouchers')}</CardTitle>
              <CardDescription>{t('clienti.showCodeDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.wallet.vouchers.length === 0 ? (
                <div className="text-center py-12">
                  <Ticket className="w-16 h-16 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-500 font-semibold mb-1">{t('clienti.noVouchers')}</p>
                  <p className="text-sm text-gray-400 mb-4">{t('clienti.noVouchersDesc')}</p>
                  <Button onClick={() => setTab('referral')} className="bg-ocean-500 hover:bg-ocean-600">
                    <Share2 className="w-4 h-4 mr-2" /> {t('clienti.startInviting')}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {data.wallet.vouchers.map(v => <VoucherCard key={v.id} v={v} />)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB: REQUESTS */}
        {tab === 'requests' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('clienti.myRequests')}</CardTitle>
              <CardDescription>{t('clienti.requestsHistory')}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.leads.length === 0 ? (
                <div className="text-center py-12">
                  <Plane className="w-16 h-16 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-500 font-semibold mb-1">{t('clienti.noRequests')}</p>
                  <p className="text-sm text-gray-400 mb-4">{t('clienti.noRequestsDesc')}</p>
                  <Link href="/#viaggi"><Button className="bg-ocean-500 hover:bg-ocean-600">{t('clienti.goToCatalog')}</Button></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.leads.map(l => (
                    <div key={l.id} className="flex items-center gap-4 p-4 border rounded-xl hover:shadow-md transition-shadow">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        l.confirmed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {l.confirmed ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{l.destination || l.tripTitle || t('clienti.requestWord')}</p>
                        <p className="text-xs text-gray-500 truncate">{l.message}</p>
                        <p className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <Badge className={l.confirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                        {l.confirmed ? t('clienti.confirmed') : t('clienti.pending')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB: PROFILE */}
        {tab === 'profile' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('clienti.myData')}</CardTitle>
                <CardDescription>{t('clienti.manageInfo')}</CardDescription>
              </div>
              {!editingProfile ? (
                <Button variant="outline" onClick={() => setEditingProfile(true)}><Edit className="w-4 h-4 mr-2" /> {t('clienti.editBtn')}</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingProfile(false)}><X className="w-4 h-4" /></Button>
                  <Button onClick={saveProfile} className="bg-ocean-500 hover:bg-ocean-600"><Save className="w-4 h-4 mr-2" /> {t('clienti.saveBtn')}</Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('forms.firstName')}</Label>
                  <Input value={profileForm.firstName} disabled={!editingProfile} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} />
                </div>
                <div>
                  <Label>{t('forms.lastName')}</Label>
                  <Input value={profileForm.lastName} disabled={!editingProfile} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('clienti.emailReadonly')}</Label>
                  <Input value={c.email} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label>{t('forms.phone')}</Label>
                  <Input value={profileForm.phone} disabled={!editingProfile} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                </div>
              </div>
              {editingProfile && (
                <div>
                  <Label>{t('clienti.newPasswordLabel')}</Label>
                  <Input type="password" value={profileForm.password} onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })} placeholder={t('clienti.min6Chars')} />
                </div>
              )}
              <div className="pt-3 border-t text-xs text-gray-400">
                {t('clienti.accountCreated')} {new Date(c.createdAt).toLocaleDateString(locale)}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    ocean: 'from-ocean-500 to-ocean-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VoucherRow({ v }) {
  const { t } = useT();
  const isActive = v.status === 'active';
  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg ${isActive ? 'bg-emerald-50' : 'bg-gray-50'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
        <Ticket className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs font-bold truncate">{v.code}</p>
        <p className="text-[10px] text-gray-500">€{v.amount} • {v.status === 'active' ? t('clienti.statusActive') : v.status === 'used' ? t('clienti.statusUsed') : v.status === 'expired' ? t('clienti.statusExpired') : t('clienti.statusCancelled')}</p>
      </div>
    </div>
  );
}

function VoucherCard({ v }) {
  const { t, lang } = useT();
  const locale = lang === 'en' ? 'en-GB' : 'it-IT';
  const statusConfig = {
    active: { bg: 'from-emerald-500 to-emerald-700', label: t('clienti.statusActive'), icon: Check },
    used: { bg: 'from-gray-400 to-gray-600', label: t('clienti.statusUsed'), icon: Check },
    expired: { bg: 'from-red-400 to-red-600', label: t('clienti.statusExpired'), icon: X },
    cancelled: { bg: 'from-gray-400 to-gray-500', label: t('clienti.statusCancelled'), icon: X },
  }[v.status] || { bg: 'from-gray-400 to-gray-500', label: v.status, icon: Clock };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${statusConfig.bg} text-white p-5 shadow-lg`}>
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
      <div className="absolute -right-3 -bottom-3 w-20 h-20 bg-white/5 rounded-full" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="w-5 h-5" />
            <Badge className="bg-white/20 text-white border-white/30">{statusConfig.label}</Badge>
            {v.source === 'referral' && <Badge className="bg-white/20 text-white border-white/30">{t('clienti.referralBadge')}</Badge>}
          </div>
          <p className="text-4xl font-bold mb-2">€{v.amount}</p>
          <p className="font-mono text-sm tracking-widest bg-white/15 inline-block px-3 py-1 rounded-lg">{v.code}</p>
          {v.note && <p className="text-xs text-white/80 mt-2">{v.note}</p>}
          <div className="text-[10px] mt-2 text-white/70 space-y-0.5">
            <p>{t('clienti.issuedLabel')} {new Date(v.issuedAt).toLocaleDateString(locale)}</p>
            <p>{t('clienti.expiryLabel')} {new Date(v.expiresAt).toLocaleDateString(locale)}</p>
            {v.rules?.excludeLastMinute && <p>{t('clienti.notValidLastMinute')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReferralRow({ r }) {
  const { t, lang } = useT();
  const locale = lang === 'en' ? 'en-GB' : 'it-IT';
  const statusConfig = {
    pending: { color: 'bg-amber-100 text-amber-700', label: t('clienti.refPending') },
    converted: { color: 'bg-emerald-100 text-emerald-700', label: t('clienti.refConverted') },
    cancelled: { color: 'bg-gray-100 text-gray-600', label: t('clienti.refCancelled') },
    expired: { color: 'bg-gray-100 text-gray-600', label: t('clienti.refExpired') },
  }[r.status] || { color: 'bg-gray-100', label: r.status };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
        {(r.referredName || r.referredEmail).charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{r.referredName || r.referredEmail}</p>
        <p className="text-[10px] text-gray-500">{new Date(r.createdAt).toLocaleDateString(locale)}</p>
      </div>
      <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
    </div>
  );
}

function ArrowRightIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
}
