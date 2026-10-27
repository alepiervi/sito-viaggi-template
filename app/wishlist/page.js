'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Heart, Trash2, MessageCircle, Mail, Clock, Hotel, MapPin, 
  Compass, ArrowLeft, ChevronRight, Check, Phone
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useT, useTranslatedArray } from '@/lib/useT';

export default function WishlistPage() {
  const { t } = useT();
  const [wishlist, setWishlist] = useState([]);
  const [trips, setTrips] = useState([]);
  const { items: tTrips } = useTranslatedArray(trips, ['title', 'destination', 'duration', 'treatment']);
  const [loading, setLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    participants: '',
    notes: '',
    privacy: false
  });

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const savedWishlist = localStorage.getItem('tribuWishlist');
      const wishlistIds = savedWishlist ? JSON.parse(savedWishlist) : [];
      setWishlist(wishlistIds);

      if (wishlistIds.length > 0) {
        const response = await fetch('/api/trips');
        const allTrips = await response.json();
        const wishlistedTrips = allTrips.filter(trip => wishlistIds.includes(trip.id));
        setTrips(wishlistedTrips);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = (tripId) => {
    const newWishlist = wishlist.filter(id => id !== tripId);
    setWishlist(newWishlist);
    localStorage.setItem('tribuWishlist', JSON.stringify(newWishlist));
    setTrips(trips.filter(trip => trip.id !== tripId));
  };

  const clearWishlist = () => {
    setWishlist([]);
    setTrips([]);
    localStorage.removeItem('tribuWishlist');
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.privacy) return;
    
    setFormSubmitting(true);
    try {
      const tripTitles = trips.map(t => t.title).join(', ');
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactForm,
          tripTitle: `Wishlist: ${tripTitles}`,
          source: 'wishlist',
          notes: `Viaggi preferiti:\n${trips.map(t => `- ${t.title} (€${t.priceFrom})`).join('\n')}\n\nNote: ${contactForm.notes}`
        })
      });
      
      if (response.ok) {
        setFormSuccess(true);
        setTimeout(() => {
          setShowContactForm(false);
          setFormSuccess(false);
          setContactForm({
            firstName: '', lastName: '', email: '', phone: '',
            participants: '', notes: '', privacy: false
          });
        }, 3000);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const generateWhatsAppLink = () => {
    const tripsList = trips.map(t => `• ${t.title} - €${t.priceFrom}`).join('\n');
    const message = encodeURIComponent(
      `Ciao! Sono interessato a questi viaggi:\n\n${tripsList}\n\nVorrei ricevere maggiori informazioni.\n\nGrazie!`
    );
    return `https://wa.me/39XXXXXXXXXX?text=${message}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-ocean-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-ocean-500 hover:text-ocean-600">
              <ArrowLeft className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900 flex items-center gap-3">
              <Heart className="w-8 h-8 text-coral-500 fill-current" />
              {t('home.yourFavorites')}
            </h1>
            <p className="text-gray-600 mt-1">{trips.length} {t('home.tripsSaved')}</p>
          </div>
          {trips.length > 0 && (
            <Button variant="outline" onClick={clearWishlist} className="text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              {t('home.clearAll')}
            </Button>
          )}
        </div>

        {trips.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('home.noTripSaved')}</h2>
              <p className="text-gray-500 mb-6">{t('home.startExploring')}</p>
              <Link href="/#viaggi">
                <Button className="bg-ocean-500 hover:bg-ocean-700">
                  {t('home.exploreTrips')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Trip Cards */}
            <div className="space-y-4 mb-8">
              {trips.map((trip, idx) => {
                const dt = tTrips[idx] || trip;
                return (
                <Card key={trip.id} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-48 h-32 sm:h-auto flex-shrink-0">
                      <img 
                        src={trip.cardImage} 
                        alt={dt.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="flex-1 p-4 flex flex-col sm:flex-row justify-between">
                      <div>
                        <p className="text-sm text-ocean-500">{dt.destination}</p>
                        <h3 className="font-semibold text-lg mb-1">{dt.title}</h3>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {dt.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Hotel className="w-4 h-4" /> {dt.treatment}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-4 sm:mt-0">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{t('home.fromShort')}</p>
                          <p className="text-2xl font-bold text-ocean-600">€{trip.priceFrom}</p>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/viaggio/${trip.slug}`}>
                            <Button size="sm" variant="outline">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => removeFromWishlist(trip.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
                );
              })}
            </div>

            {/* Total and CTA */}
            <Card className="bg-gradient-to-r from-ocean-50 to-teal-50 border-ocean-200">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <p className="text-gray-600">{t('home.estimatedTotal')} {trips.length} {t('home.tripsWord')}</p>
                    <p className="text-3xl font-bold text-ocean-600">
                      {t('home.fromShort')} €{trips.reduce((sum, t2) => sum + t2.priceFrom, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">{t('home.indicativePrice')}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      size="lg"
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => window.open(generateWhatsAppLink(), '_blank')}
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      {t('home.requestInfoWhatsapp')}
                    </Button>
                    <Button 
                      size="lg"
                      className="bg-coral-500 hover:bg-coral-600"
                      onClick={() => setShowContactForm(true)}
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      {t('home.requestQuoteShort')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Contact Form Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">{t('home.requestQuote')}</DialogTitle>
            <DialogDescription>
              {t('home.requestInfoSaved')}
            </DialogDescription>
          </DialogHeader>

          {formSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('home.requestSent')}</h3>
              <p className="text-gray-600">{t('home.contactSoon')}</p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="bg-sand-50 p-3 rounded-lg text-sm">
                <p className="font-medium mb-1">{t('home.selectedTrips')}</p>
                <ul className="text-gray-600">
                  {trips.map(t2 => (
                    <li key={t2.id}>• {t2.title}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('home.firstName')} *</Label>
                  <Input 
                    required
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('home.lastName')} *</Label>
                  <Input 
                    required
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>{t('home.emailLabel')} *</Label>
                <Input 
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                />
              </div>

              <div>
                <Label>{t('home.phone')} *</Label>
                <Input 
                  type="tel"
                  required
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                />
              </div>

              <div>
                <Label>{t('home.participants')}</Label>
                <Select 
                  value={contactForm.participants} 
                  onValueChange={(value) => setContactForm({ ...contactForm, participants: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('home.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, '6+'].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('home.notesLabel')}</Label>
                <Textarea 
                  placeholder={t('home.notesPh')}
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox 
                  id="privacy"
                  checked={contactForm.privacy}
                  onCheckedChange={(checked) => setContactForm({ ...contactForm, privacy: checked })}
                />
                <Label htmlFor="privacy" className="text-sm text-gray-600">
                  {t('home.gdprShort')} *
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-coral-500 hover:bg-coral-600"
                disabled={formSubmitting || !contactForm.privacy}
              >
                {formSubmitting ? t('home.sending2') : t('home.sendRequest')}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
