'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, X, MapPin, Clock, Hotel, Euro, Plane, Check, MessageCircle,
  Plus, Star
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useT, useTranslatedArray } from '@/lib/useT';

export default function ConfrontaPage() {
  const { t } = useT();
  const [allTrips, setAllTrips] = useState([]);
  const [compareIds, setCompareIds] = useState([]);
  const [compareTrips, setCompareTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [slotIndex, setSlotIndex] = useState(null);

  const { items: tCompare } = useTranslatedArray(compareTrips, ['title', 'destination', 'duration', 'treatment', 'transport', 'departureCity', 'period', 'included']);
  const { items: tAll } = useTranslatedArray(allTrips, ['title', 'destination', 'duration']);
  const tAllMap = useMemo(() => {
    const m = {};
    tAll.forEach((x) => { if (x?.id) m[x.id] = x; });
    return m;
  }, [tAll]);

  useEffect(() => {
    const loadTrips = async () => {
      try {
        const saved = localStorage.getItem('tribuCompare');
        const ids = saved ? JSON.parse(saved) : [];
        setCompareIds(ids);

        const res = await fetch('/api/trips');
        const data = await res.json();
        setAllTrips(Array.isArray(data) ? data : []);

        if (ids.length > 0) {
          setCompareTrips(ids.map(id => data.find(t => t.id === id)).filter(Boolean));
        }
      } catch (e) {
        console.error('Error:', e);
      } finally {
        setLoading(false);
      }
    };
    loadTrips();
  }, []);

  const addTrip = (trip) => {
    let newIds = [...compareIds];
    if (slotIndex !== null && slotIndex < newIds.length) {
      newIds[slotIndex] = trip.id;
    } else {
      if (newIds.length >= 3) return;
      newIds.push(trip.id);
    }
    setCompareIds(newIds);
    setCompareTrips(newIds.map(id => allTrips.find(t => t.id === id)).filter(Boolean));
    localStorage.setItem('tribuCompare', JSON.stringify(newIds));
    setShowSelector(false);
    setSlotIndex(null);
  };

  const removeTrip = (tripId) => {
    const newIds = compareIds.filter(id => id !== tripId);
    setCompareIds(newIds);
    setCompareTrips(newIds.map(id => allTrips.find(t => t.id === id)).filter(Boolean));
    localStorage.setItem('tribuCompare', JSON.stringify(newIds));
  };

  const generateWhatsAppLink = () => {
    const list = compareTrips.map(t => `- ${t.title} (da €${t.priceFrom})`).join('\n');
    const msg = encodeURIComponent(`Ciao! Vorrei confrontare questi viaggi:\n\n${list}\n\nQuale mi consigliate?`);
    return `https://wa.me/39XXXXXXXXXX?text=${msg}`;
  };

  // Use translated trip for slot i (keeps prices/images/booleans from raw)
  const dispTrip = (i) => tCompare[i] || compareTrips[i];

  const fields = [
    { key: 'destination', labelKey: 'home.destination', icon: MapPin },
    { key: 'duration', labelKey: 'home.duration', icon: Clock },
    { key: 'treatment', labelKey: 'home.treatment', icon: Hotel },
    { key: 'transport', labelKey: 'home.transportLabel', icon: Plane },
    { key: 'departureCity', labelKey: 'home.departureFrom', icon: MapPin },
    { key: 'period', labelKey: 'home.period', icon: Clock },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-ocean-500 hover:text-ocean-600">
            <ArrowLeft className="w-5 h-5" />
            <span>Home</span>
          </Link>
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="Logo" className="h-14 w-auto" />
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-ocean-900 mb-2">{t('home.compareTrips')}</h1>
          <p className="text-gray-600">{t('home.compareSubtitle')}</p>
        </div>

        {compareTrips.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('home.noTripsCompare')}</h2>
              <p className="text-gray-500 mb-6">{t('home.goCatalogSelect')}</p>
              <Link href="/#viaggi">
                <Button className="bg-ocean-500 hover:bg-ocean-600">{t('home.exploreTrips')}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[0, 1, 2].map((i) => {
                const trip = compareTrips[i];
                const dt = dispTrip(i);
                if (!trip) {
                  return (
                    <Card key={i} className="border-dashed border-2 border-gray-300 hover:border-ocean-400 transition-colors cursor-pointer" onClick={() => { setSlotIndex(i); setShowSelector(true); }}>
                      <CardContent className="p-6 text-center">
                        <Plus className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">{t('home.addTripSlot')}</p>
                      </CardContent>
                    </Card>
                  );
                }
                return (
                  <Card key={trip.id} className="overflow-hidden">
                    <div className="relative h-40">
                      <img src={trip.cardImage} alt={dt.title} className="w-full h-full object-cover" />
                      <button onClick={() => removeTrip(trip.id)} className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors">
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                      {trip.isPromo && <Badge className="absolute top-2 left-2 bg-coral-500 border-0">-{trip.discountPercent}%</Badge>}
                    </div>
                    <CardContent className="p-4">
                      <p className="text-xs text-ocean-500 font-semibold">{dt.destination}</p>
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2">{dt.title}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-gray-400">{t('home.fromShort')}</span>
                        {trip.fullPrice > trip.priceFrom && <span className="text-xs text-gray-400 line-through">€{trip.fullPrice}</span>}
                        <span className="text-xl font-bold text-ocean-600">€{trip.priceFrom}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Comparison Table */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    {fields.map(({ key, labelKey, icon: Icon }) => (
                      <tr key={key} className="border-b last:border-b-0">
                        <td className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700 w-40">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-ocean-500" />
                            {t(labelKey)}
                          </div>
                        </td>
                        {[0, 1, 2].map((i) => {
                          const dt = dispTrip(i);
                          return (
                            <td key={i} className="px-4 py-3 text-sm text-center border-l">
                              {dt ? (dt[key] || '-') : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="border-b">
                      <td className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          {t('home.includeLabel')}
                        </div>
                      </td>
                      {[0, 1, 2].map((i) => {
                        const dt = dispTrip(i);
                        return (
                          <td key={i} className="px-4 py-3 text-xs border-l">
                            {dt ? (
                              <ul className="space-y-1">
                                {(dt.included || []).map((item, j) => (
                                  <li key={j} className="flex items-start gap-1">
                                    <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            ) : ''}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="bg-ocean-50">
                      <td className="px-4 py-4 font-semibold text-ocean-900">
                        <div className="flex items-center gap-2">
                          <Euro className="w-4 h-4 text-ocean-500" />
                          {t('home.priceLabel')}
                        </div>
                      </td>
                      {[0, 1, 2].map((i) => {
                        const trip = compareTrips[i];
                        return (
                          <td key={i} className="px-4 py-4 text-center border-l">
                            {trip ? (
                              <div>
                                {trip.fullPrice > trip.priceFrom && (
                                  <span className="text-sm text-gray-400 line-through block">€{trip.fullPrice}</span>
                                )}
                                <span className="text-2xl font-bold text-ocean-600">€{trip.priceFrom}</span>
                              </div>
                            ) : ''}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 mb-4">{t('home.cantDecide')}</p>
              <div className="flex justify-center gap-4">
                <Button size="lg" className="bg-green-500 hover:bg-green-600 rounded-full" onClick={() => window.open(generateWhatsAppLink(), '_blank')}>
                  <MessageCircle className="w-5 h-5 mr-2" /> {t('home.askWhatsapp')}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Trip Selector Modal */}
      {showSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSelector(false)}>
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{t('home.selectTrip')}</h3>
                <button onClick={() => setShowSelector(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {allTrips.filter(t => !compareIds.includes(t.id)).map((trip) => {
                  const dt = tAllMap[trip.id] || trip;
                  return (
                  <button key={trip.id} onClick={() => addTrip(trip)} className="w-full flex items-center gap-4 p-3 hover:bg-ocean-50 rounded-xl transition-colors text-left">
                    <img src={trip.cardImage} alt={dt.title} className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{dt.title}</p>
                      <p className="text-xs text-gray-500">{dt.destination} • {dt.duration}</p>
                    </div>
                    <span className="text-ocean-600 font-bold">€{trip.priceFrom}</span>
                  </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
