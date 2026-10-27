'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Mail, Lock, Phone, Gift, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useT } from '@/lib/useT';

function RegisterPageInner() {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refFromUrl = searchParams.get('ref') || '';

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', passwordConfirm: '',
    referralCode: refFromUrl,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (refFromUrl) setForm(p => ({ ...p, referralCode: refFromUrl }));
  }, [refFromUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.passwordConfirm) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName, lastName: form.lastName, email: form.email,
          phone: form.phone, password: form.password,
          referralCode: form.referralCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('auth.networkError'));
        return;
      }
      localStorage.setItem('customerToken', data.token);
      localStorage.setItem('customerData', JSON.stringify(data.customer));
      router.push('/area-clienti?welcome=1');
    } catch (err) {
      setError(t('auth.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/"><img src="/logo.png" alt="Logo" className="h-14 mx-auto" /></Link>
        </div>
        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-display">{t('auth.createAccount')}</CardTitle>
            <CardDescription>{t('auth.signupSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {refFromUrl && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 flex items-center gap-2">
                <Gift className="w-4 h-4 flex-shrink-0" />
                <span>{t('auth.invitedBy')} <strong>{refFromUrl}</strong>!</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">{t('forms.firstName')} *</Label>
                  <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="lastName">{t('forms.lastName')} *</Label>
                  <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label htmlFor="email">{t('forms.email')} *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">{t('forms.phone')} *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className="pl-10" placeholder="+39 333 1234567" />
                </div>
              </div>
              <div>
                <Label htmlFor="password">{t('forms.password')} *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="passwordConfirm">{t('auth.confirmPassword')} *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="passwordConfirm" type="password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} required minLength={6} className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="referralCode">{t('auth.referralCodeOptional')}</Label>
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="referralCode" value={form.referralCode} onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })} className="pl-10 font-mono" placeholder="ABC-1234" />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full bg-ocean-500 hover:bg-ocean-600 h-11">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('auth.registering')}</> : <>{t('auth.createButton')} <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-4">
              {t('auth.hasAccount')} <Link href="/accedi" className="text-ocean-600 font-semibold hover:underline">{t('auth.signIn')}</Link>
            </p>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-gray-400 mt-4">
          {t('auth.legalNote')}
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ocean-500" /></div>}>
      <RegisterPageInner />
    </Suspense>
  );
}
