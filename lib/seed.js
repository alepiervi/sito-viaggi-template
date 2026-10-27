import { getDatabase } from './mongodb';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';

const demoTrips = [
  {
    id: uuidv4(),
    title: 'Crociera Mediterraneo 7 Notti',
    slug: 'crociera-mediterraneo-7-notti',
    subtitle: 'Scopri le meraviglie del Mediterraneo a bordo di navi da sogno',
    shortDescription: 'Un viaggio indimenticabile attraverso le coste più belle del Mediterraneo: Italia, Grecia, Croazia e molto altro.',
    description: `<p>Parti per un\'avventura straordinaria nel cuore del Mediterraneo. Questa crociera di 7 notti ti porterà attraverso alcune delle destinazioni più affascinanti d\'Europa.</p>
<p>A bordo di una nave di ultima generazione, potrai goderti il massimo del comfort mentre navighi verso porti iconici come Dubrovnik, Santorini, e la Costa Amalfitana.</p>
<p>Include tutti i pasti a bordo, intrattenimento serale, e escursioni guidate nelle principali destinazioni.</p>`,
    destination: 'Mediterraneo',
    country: 'Multi-destinazione',
    city: 'Varie',
    category: 'crociere',
    tags: ['mare', 'relax', 'all-inclusive', 'famiglia'],
    priceFrom: 899,
    fullPrice: 1299,
    discountPercent: 30,
    duration: '8 giorni / 7 notti',
    period: 'Giugno - Settembre 2025',
    departureCity: 'Civitavecchia (Roma)',
    treatment: 'Pensione Completa',
    transport: 'Nave da crociera',
    hotelName: 'MSC Fantasia',
    included: ['Cabina con vista mare', 'Tutti i pasti a bordo', 'Intrattenimento serale', 'Accesso piscine e spa', 'Escursioni guidate'],
    excluded: ['Bevande extra', 'Mance', 'Trasferimenti aeroporto'],
    itinerary: [
      { day: 1, title: 'Civitavecchia', description: 'Imbarco e partenza' },
      { day: 2, title: 'Navigazione', description: 'Giornata in mare, relax a bordo' },
      { day: 3, title: 'Dubrovnik', description: 'Visita alla perla dell\'Adriatico' },
      { day: 4, title: 'Santorini', description: 'Tramonto sull\'isola più romantica' },
      { day: 5, title: 'Mykonos', description: 'Shopping e spiagge da sogno' },
      { day: 6, title: 'Navigazione', description: 'Relax e attività a bordo' },
      { day: 7, title: 'Napoli', description: 'Escursione Pompei e Costiera' },
      { day: 8, title: 'Civitavecchia', description: 'Sbarco e rientro' }
    ],
    faqs: [
      { question: 'È adatta alle famiglie?', answer: 'Sì, ci sono attività dedicate ai bambini e cabine familiari.' },
      { question: 'Cosa devo portare?', answer: 'Documenti, abbigliamento casual e elegante per le serate a tema.' }
    ],
    images: [
      'https://images.unsplash.com/photo-1544536871-6e891baa163f?w=1200',
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200'
    ],
    cardImage: 'https://images.unsplash.com/photo-1544536871-6e891baa163f?w=800',
    featured: true,
    isPromo: true,
    isBestSeller: true,
    isLastMinute: false,
    isNew: false,
    order: 1,
    seoTitle: 'Crociera Mediterraneo 7 Notti | Tribù in Viaggio',
    seoDescription: 'Prenota la tua crociera nel Mediterraneo. 7 notti, partenza da Civitavecchia. Offerta speciale -30%.',
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    title: 'Weekend Romantico a Parigi',
    slug: 'weekend-romantico-parigi',
    subtitle: 'La città dell\'amore ti aspetta per un fine settimana indimenticabile',
    shortDescription: 'Vivi la magia di Parigi: Tour Eiffel, Louvre, Montmartre e cene romantiche.',
    description: `<p>Parigi, la città dell\'amore, ti aspetta per un weekend da sogno. Questo pacchetto include tutto il necessario per vivere un\'esperienza romantica e indimenticabile.</p>
<p>Alloggerai in un elegante hotel nel cuore della città, a pochi passi dagli Champs-Élysées. Il pacchetto include biglietti per la Torre Eiffel, una crociera sulla Senna al tramonto, e una cena gourmet in un ristorante stellato.</p>`,
    destination: 'Parigi',
    country: 'Francia',
    city: 'Parigi',
    category: 'weekend',
    tags: ['romantico', 'città', 'cultura', 'coppia'],
    priceFrom: 449,
    fullPrice: 599,
    discountPercent: 25,
    duration: '3 giorni / 2 notti',
    period: 'Tutto l\'anno',
    departureCity: 'Milano / Roma',
    treatment: 'Pernottamento e colazione',
    transport: 'Volo incluso',
    hotelName: 'Hotel Le Marais 4*',
    included: ['Volo A/R', 'Hotel 4* centrale', 'Colazione', 'Biglietto Torre Eiffel', 'Crociera Senna'],
    excluded: ['Pasti extra', 'Trasferimenti', 'Assicurazione viaggio'],
    itinerary: [
      { day: 1, title: 'Arrivo a Parigi', description: 'Check-in e passeggiata Champs-Élysées' },
      { day: 2, title: 'Parigi Romantica', description: 'Torre Eiffel, Louvre, crociera serale' },
      { day: 3, title: 'Montmartre', description: 'Visita Sacré-Cœur e rientro' }
    ],
    faqs: [
      { question: 'Qual è il periodo migliore?', answer: 'Parigi è bella tutto l\'anno, ma primavera e autunno sono ideali.' },
      { question: 'L\'hotel è centrale?', answer: 'Sì, nel quartiere Le Marais, a 10 minuti a piedi dal Louvre.' }
    ],
    images: [
      'https://images.unsplash.com/photo-1583217214659-8c2195525e25?w=1200',
      'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1200'
    ],
    cardImage: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800',
    featured: true,
    isPromo: true,
    isBestSeller: false,
    isLastMinute: false,
    isNew: true,
    order: 2,
    seoTitle: 'Weekend Romantico Parigi | Tribù in Viaggio',
    seoDescription: 'Weekend romantico a Parigi con volo, hotel 4* e esperienze esclusive. Offerta speciale.',
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    title: 'Sharm El Sheikh All Inclusive',
    slug: 'sharm-el-sheikh-all-inclusive',
    subtitle: 'Mare cristallino e relax totale nel Mar Rosso',
    shortDescription: 'Vacanza da sogno a Sharm: spiagge paradisiache, snorkeling e resort 5 stelle.',
    description: `<p>Immergiti nelle acque cristalline del Mar Rosso e vivi una vacanza di puro relax a Sharm El Sheikh. Il nostro resort 5 stelle offre tutto ciò di cui hai bisogno per una vacanza perfetta.</p>
<p>Spiaggia privata, piscine, ristoranti gourmet, e la possibilità di esplorare i fondali più belli del mondo con escursioni snorkeling incluse.</p>`,
    destination: 'Sharm El Sheikh',
    country: 'Egitto',
    city: 'Sharm El Sheikh',
    category: 'mare',
    tags: ['mare', 'relax', 'all-inclusive', 'snorkeling', 'famiglia'],
    priceFrom: 699,
    fullPrice: 999,
    discountPercent: 30,
    duration: '8 giorni / 7 notti',
    period: 'Maggio - Ottobre 2025',
    departureCity: 'Milano / Roma / Napoli',
    treatment: 'All Inclusive',
    transport: 'Volo incluso',
    hotelName: 'Rixos Premium Seagate 5*',
    included: ['Volo A/R', 'Trasferimenti', 'Resort 5*', 'All Inclusive', 'Escursione snorkeling', 'Wi-Fi'],
    excluded: ['Escursioni extra', 'Visto Egitto (25$)', 'Mance'],
    itinerary: [
      { day: 1, title: 'Arrivo', description: 'Volo e trasferimento al resort' },
      { day: '2-6', title: 'Relax & Mare', description: 'Giornate libere, spiaggia, piscina, escursioni' },
      { day: 7, title: 'Escursione', description: 'Snorkeling a Ras Mohammed' },
      { day: 8, title: 'Rientro', description: 'Trasferimento e volo di rientro' }
    ],
    faqs: [
      { question: 'Serve il visto?', answer: 'Sì, si ottiene all\'arrivo (25$ circa).' },
      { question: 'È sicura Sharm?', answer: 'Sì, la zona turistica è molto sicura e controllata.' }
    ],
    images: [
      'https://images.unsplash.com/photo-1520454974749-611b7248ffdb?w=1200',
      'https://images.unsplash.com/photo-1544536871-6e891baa163f?w=1200'
    ],
    cardImage: 'https://images.unsplash.com/photo-1520454974749-611b7248ffdb?w=800',
    featured: true,
    isPromo: false,
    isBestSeller: true,
    isLastMinute: true,
    isNew: false,
    order: 3,
    seoTitle: 'Sharm El Sheikh All Inclusive | Tribù in Viaggio',
    seoDescription: 'Vacanza All Inclusive a Sharm El Sheikh. Resort 5*, volo incluso. Offerta Last Minute.',
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    title: 'Disneyland Paris Family Experience',
    slug: 'disneyland-paris-family',
    subtitle: 'La magia Disney per tutta la famiglia',
    shortDescription: 'Vivi la magia di Disneyland Paris: parchi, hotel a tema e incontri con i personaggi.',
    description: `<p>Regala alla tua famiglia un\'esperienza magica a Disneyland Paris! Questo pacchetto include tutto per vivere al meglio la magia Disney.</p>
<p>Soggiorno in hotel a tema Disney, biglietti per entrambi i parchi, fast pass inclusi per le attrazioni principali, e la possibilità di incontrare i personaggi preferiti dei tuoi bambini.</p>`,
    destination: 'Disneyland Paris',
    country: 'Francia',
    city: 'Marne-la-Vallée',
    category: 'parchi',
    tags: ['famiglia', 'bambini', 'parco divertimenti', 'disney'],
    priceFrom: 599,
    fullPrice: 799,
    discountPercent: 25,
    duration: '4 giorni / 3 notti',
    period: 'Tutto l\'anno',
    departureCity: 'Milano / Roma / Venezia',
    treatment: 'Mezza Pensione',
    transport: 'Volo o treno incluso',
    hotelName: 'Disney Hotel Santa Fe',
    included: ['Trasporto A/R', 'Hotel Disney 3 notti', 'Mezza pensione', 'Biglietti 2 parchi 3 giorni', 'Fast Pass'],
    excluded: ['Pasti extra', 'Souvenir', 'Assicurazione'],
    itinerary: [
      { day: 1, title: 'Arrivo', description: 'Check-in e prima serata al parco' },
      { day: 2, title: 'Disneyland Park', description: 'Giornata completa nel parco principale' },
      { day: 3, title: 'Walt Disney Studios', description: 'Avventure e attrazioni' },
      { day: 4, title: 'Rientro', description: 'Ultime ore e viaggio di ritorno' }
    ],
    faqs: [
      { question: 'Qual è l\'età consigliata?', answer: 'Ideale per bambini dai 3 ai 12 anni, ma divertente per tutti!' },
      { question: 'Si possono incontrare i personaggi?', answer: 'Sì, ci sono punti dedicati in tutto il parco.' }
    ],
    images: [
      'https://images.unsplash.com/photo-1528566401806-917f86c1fc2d?w=1200',
      'https://images.unsplash.com/photo-1595182084742-abd9ecc0f0c8?w=1200'
    ],
    cardImage: 'https://images.unsplash.com/photo-1528566401806-917f86c1fc2d?w=800',
    featured: true,
    isPromo: true,
    isBestSeller: false,
    isLastMinute: false,
    isNew: true,
    order: 4,
    seoTitle: 'Disneyland Paris Family | Tribù in Viaggio',
    seoDescription: 'Pacchetto famiglia Disneyland Paris: hotel, biglietti e trasporto inclusi. Magia garantita!',
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    title: 'Tour Giappone: Primavera tra i Ciliegi',
    slug: 'tour-giappone-primavera',
    subtitle: 'Hanami e tradizione nel paese del Sol Levante',
    shortDescription: 'Viaggio esclusivo in Giappone durante la fioritura dei ciliegi: Tokyo, Kyoto, Osaka.',
    description: `<p>Vivi l\'esperienza unica dell\'Hanami, la tradizionale contemplazione dei ciliegi in fiore, in un tour esclusivo che ti porterà alla scoperta del Giappone più autentico.</p>
<p>Da Tokyo a Kyoto, passando per Osaka e Nara, questo viaggio combina modernità e tradizione, templi antichi e grattacieli futuristici, in un\'esperienza indimenticabile.</p>`,
    destination: 'Giappone',
    country: 'Giappone',
    city: 'Tokyo - Kyoto - Osaka',
    category: 'tour',
    tags: ['cultura', 'tour guidato', 'asia', 'esclusivo'],
    priceFrom: 2899,
    fullPrice: 3499,
    discountPercent: 17,
    duration: '12 giorni / 10 notti',
    period: 'Marzo - Aprile 2025',
    departureCity: 'Milano / Roma',
    treatment: 'Pernottamento e colazione',
    transport: 'Volo + JR Pass',
    hotelName: 'Hotel 4* selezionati',
    included: ['Volo intercontinentale', 'Hotel 4*', 'Colazione', 'JR Pass 7 giorni', 'Guida italiana', 'Escursioni'],
    excluded: ['Pranzi e cene', 'Ingressi templi', 'Mance', 'Assicurazione'],
    itinerary: [
      { day: 1, title: 'Volo Italia - Tokyo', description: 'Partenza dall\'Italia' },
      { day: 2, title: 'Arrivo Tokyo', description: 'Trasferimento e riposo' },
      { day: 3, title: 'Tokyo', description: 'Shibuya, Harajuku, Meiji Jingu' },
      { day: 4, title: 'Tokyo', description: 'Asakusa, Senso-ji, Akihabara' },
      { day: 5, title: 'Hakone', description: 'Monte Fuji e onsen tradizionali' },
      { day: 6, title: 'Kyoto', description: 'Treno Shinkansen, arrivo Kyoto' },
      { day: 7, title: 'Kyoto', description: 'Fushimi Inari, Kinkaku-ji' },
      { day: 8, title: 'Kyoto', description: 'Arashiyama, foresta di bambù' },
      { day: 9, title: 'Nara - Osaka', description: 'Cervi di Nara, Osaka by night' },
      { day: 10, title: 'Osaka', description: 'Castello, Dotonbori' },
      { day: 11, title: 'Volo Osaka - Italia', description: 'Rientro' },
      { day: 12, title: 'Arrivo Italia', description: 'Fine del viaggio' }
    ],
    faqs: [
      { question: 'Quando fioriscono i ciliegi?', answer: 'Generalmente tra fine marzo e metà aprile.' },
      { question: 'Il tour è adatto a tutti?', answer: 'Sì, il ritmo è equilibrato con tempo libero.' }
    ],
    images: [
      'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1200',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200'
    ],
    cardImage: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800',
    featured: true,
    isPromo: false,
    isBestSeller: false,
    isLastMinute: false,
    isNew: true,
    order: 5,
    seoTitle: 'Tour Giappone Primavera Ciliegi | Tribù in Viaggio',
    seoDescription: 'Tour esclusivo Giappone durante la fioritura dei ciliegi. Tokyo, Kyoto, Osaka. Guida italiana.',
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    title: 'Villaggio a Rodi - Grecia',
    slug: 'villaggio-rodi-grecia',
    subtitle: 'Mare greco e villaggi bianchi per una vacanza perfetta',
    shortDescription: 'Vacanza in villaggio a Rodi: spiagge dorate, acque cristalline e tradizione greca.',
    description: `<p>Rodi, la perla del Dodecaneso, ti aspetta per una vacanza all\'insegna del relax e della bellezza greca. Il nostro villaggio 4 stelle offre comfort moderno in un contesto naturale mozzafiato.</p>
<p>Spiaggia privata, piscine, animazione per adulti e bambini, ristoranti con cucina greca e internazionale. A pochi chilometri, la città medievale di Rodi ti aspetta per esplorazioni culturali.</p>`,
    destination: 'Rodi',
    country: 'Grecia',
    city: 'Rodi',
    category: 'villaggi',
    tags: ['mare', 'villaggio', 'famiglia', 'grecia', 'relax'],
    priceFrom: 549,
    fullPrice: 749,
    discountPercent: 27,
    duration: '8 giorni / 7 notti',
    period: 'Giugno - Settembre 2025',
    departureCity: 'Milano / Roma / Bologna',
    treatment: 'All Inclusive',
    transport: 'Volo incluso',
    hotelName: 'Lindos Royal Resort 4*',
    included: ['Volo A/R', 'Trasferimenti', 'Villaggio 4*', 'All Inclusive', 'Animazione', 'Wi-Fi'],
    excluded: ['Escursioni extra', 'Bevande premium', 'Spa'],
    itinerary: [
      { day: 1, title: 'Arrivo', description: 'Volo e trasferimento al villaggio' },
      { day: '2-6', title: 'Relax', description: 'Mare, piscina, animazione, escursioni facoltative' },
      { day: 7, title: 'Escursione', description: 'Visita Rodi città e Lindos' },
      { day: 8, title: 'Rientro', description: 'Trasferimento e volo' }
    ],
    faqs: [
      { question: 'Il villaggio è adatto ai bambini?', answer: 'Sì, c\'è mini club e animazione dedicata.' },
      { question: 'Ci sono escursioni disponibili?', answer: 'Sì, è possibile prenotare in loco.' }
    ],
    images: [
      'https://images.unsplash.com/photo-1544536871-6e891baa163f?w=1200',
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200'
    ],
    cardImage: 'https://images.unsplash.com/photo-1544536871-6e891baa163f?w=800',
    featured: false,
    isPromo: true,
    isBestSeller: false,
    isLastMinute: false,
    isNew: false,
    order: 6,
    seoTitle: 'Villaggio Rodi Grecia All Inclusive | Tribù in Viaggio',
    seoDescription: 'Vacanza villaggio a Rodi, Grecia. All Inclusive, volo incluso. Offerta speciale famiglia.',
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const categories = [
  { id: uuidv4(), name: 'Crociere', slug: 'crociere', icon: 'Ship', description: 'Viaggia per mare in tutto comfort', order: 1 },
  { id: uuidv4(), name: 'Mare', slug: 'mare', icon: 'Waves', description: 'Le spiagge più belle del mondo', order: 2 },
  { id: uuidv4(), name: 'Villaggi', slug: 'villaggi', icon: 'Hotel', description: 'Relax in villaggi all inclusive', order: 3 },
  { id: uuidv4(), name: 'Weekend', slug: 'weekend', icon: 'Calendar', description: 'Fughe romantiche e city break', order: 4 },
  { id: uuidv4(), name: 'Tour', slug: 'tour', icon: 'Map', description: 'Viaggi organizzati con guida', order: 5 },
  { id: uuidv4(), name: 'Parchi', slug: 'parchi', icon: 'Sparkles', description: 'Divertimento per tutta la famiglia', order: 6 }
];

const testimonials = [
  {
    id: uuidv4(),
    name: 'Marco e Giulia',
    location: 'Milano',
    trip: 'Crociera Mediterraneo',
    rating: 5,
    text: 'Un\'esperienza indimenticabile! Organizzazione impeccabile e assistenza sempre disponibile. Torneremo sicuramente.',
    avatar: 'MG',
    createdAt: new Date()
  },
  {
    id: uuidv4(),
    name: 'Famiglia Rossi',
    location: 'Roma',
    trip: 'Disneyland Paris',
    rating: 5,
    text: 'I bambini erano al settimo cielo! Tutto perfetto, dall\'hotel ai biglietti fast pass. Consigliatissimi!',
    avatar: 'FR',
    createdAt: new Date()
  },
  {
    id: uuidv4(),
    name: 'Alessandra',
    location: 'Napoli',
    trip: 'Weekend Parigi',
    rating: 5,
    text: 'Il weekend perfetto per festeggiare il nostro anniversario. Grazie Tribù in Viaggio per i consigli e la cura dei dettagli!',
    avatar: 'A',
    createdAt: new Date()
  }
];

/**
 * Contenuti iniziali per un nuovo affiliato. Ogni chiamata genera ID nuovi,
 * così i contenuti appartengono solo a quell'affiliato e non sono collegati
 * al sito master.
 */
export function buildTenantStarterContent({ siteName, withDemoTrips = false }) {
  const fresh = (list) => list.map((item) => ({ ...item, id: uuidv4(), createdAt: new Date() }));
  const out = { categories: fresh(categories), testimonials: [], trips: [] };
  if (withDemoTrips) {
    out.trips = demoTrips.map((t) => ({
      ...t,
      id: uuidv4(),
      seoTitle: (t.seoTitle || '').replace(/Tribù in Viaggio/g, siteName || ''),
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }
  return out;
}

export async function seedDatabase() {
  const db = await getDatabase();
  
  // Check if already seeded
  const existingTrips = await db.collection('trips').countDocuments();
  if (existingTrips > 0) {
    console.log('Database already seeded');
    return { message: 'Database already seeded' };
  }
  
  // Insert trips
  await db.collection('trips').insertMany(demoTrips);
  console.log('Inserted demo trips');
  
  // Insert categories
  await db.collection('categories').insertMany(categories);
  console.log('Inserted categories');
  
  // Insert testimonials
  await db.collection('testimonials').insertMany(testimonials);
  console.log('Inserted testimonials');
  
  return { message: 'Database seeded successfully' };
}
