'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, Lock, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { useT } from '@/lib/useT';

export default function LoginPage() {
  const { t } = useT();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('auth.networkError'));
        return;
      }
      localStorage.setItem('customerToken', data.token);
      localStorage.setItem('customerData', JSON.stringify(data.customer));
      router.push('/area-clienti');
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
            <CardTitle className="text-2xl font-display">{t('auth.welcomeBack')}</CardTitle>
            <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">{t('forms.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="password">{t('forms.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="pl-10" />
                </div>
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full bg-ocean-500 hover:bg-ocean-600 h-11">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('auth.loggingIn')}</> : <>{t('auth.signIn')} <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-4">
              {t('auth.noAccount')} <Link href="/registrati" className="text-ocean-600 font-semibold hover:underline">{t('auth.signUp')}</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
