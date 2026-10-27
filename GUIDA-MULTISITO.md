# Tribù in Viaggio – versione multi-sito e "un sito per installazione"

> Lo stesso codice funziona in due modi: **multi-sito** (sotto) oppure **un sito per installazione** (in fondo alla guida, `SITE_MODE=single`).

Un solo codice e un solo database servono il tuo sito (master) e tutti i siti degli affiliati.
Ogni dominio porta al proprio affiliato, che vede e gestisce **solo i propri dati**.
Tu, come Super Admin, decidi quali funzioni del backend ogni affiliato può usare.

## Cosa è cambiato

| Area | Prima | Ora |
|---|---|---|
| Dati | un solo sito | ogni documento ha un `tenantId`; il filtro è automatico in `lib/tenantDb.js` |
| Backend `/admin` | tutte le voci | solo le voci dei moduli attivi per quell'affiliato (bloccati anche lato server) |
| Super Admin | – | nuovo pannello `/superadmin` |
| Logo e colori | fissi | per affiliato (`/logo.png` e le scale colore `ocean`/`coral` cambiano in base al dominio) |
| SEO | il tab SEO non arrivava nell'HTML | titolo, descrizione, immagine social e dati strutturati generati sul server per viaggi, blog, pagine, promo |
| Sitemap / robots | unici | per dominio; i siti "in preparazione" non vengono indicizzati |
| Sicurezza | password admin di default nel codice, `/api/seed` pubblico | nessuna password di default, `/api/seed` solo per admin, token legati al sito |

Il tuo sito resta identico: al primo avvio viene creato il sito **master** con tutti i moduli attivi
e tutti i dati esistenti gli vengono assegnati automaticamente.

## 1. Prima di pubblicare

1. **Fai un backup del database MongoDB** (Atlas: "Backup" o `mongodump`). La migrazione aggiunge il campo `tenantId` a tutti i documenti esistenti.
2. Aggiungi le variabili d'ambiente (vedi `.env.example`):
   - `JWT_SECRET` – obbligatoria, stringa casuale lunga
   - `MASTER_DOMAINS` – i domini del tuo sito, es. `tribuinviaggio.com,tribuinviaggio.it`
   - `SUPERADMIN_EMAIL` e `SUPERADMIN_PASSWORD` – il tuo accesso al pannello Super Admin
3. Pubblica. Al primo accesso al sito la migrazione parte da sola (una sola volta).
4. Vai su `https://tuodominio/superadmin` ed entra con le credenziali Super Admin.
5. Cambia la password del vecchio admin del sito (`/admin` → Impostazioni): quella precedente era scritta nel codice.

## 2. Creare un affiliato

`/superadmin` → **Nuovo affiliato**:

- **Generale**: nome, domini (uno per riga, il primo è il principale), stato.
- **Moduli**: scegli un piano (Base, Plus, Completo) e attiva o disattiva le singole funzioni.
- **Aspetto**: nome visualizzato, URL del logo, colore principale e di accento.
- **Contatti e SEO**: contatti del footer, titolo e descrizione della homepage.
- **Accesso**: email e password iniziale del titolare.

Il sito nasce con categorie e footer di partenza (e, se vuoi, alcuni viaggi di esempio in bozza).
Lascialo **In preparazione** finché l'affiliato non ha caricato i suoi contenuti: è visibile, ma non indicizzato.

Con l'icona **Accedi** entri nel backend dell'affiliato per un'ora, per l'assistenza (l'accesso viene registrato).

### Moduli disponibili

Sempre attivi: Dashboard, Viaggi e Categorie, Richieste, Footer, Impostazioni.

Attivabili: Hero Banner, Homepage a schede, Slider Promo, Blog, Pagine personalizzate, Recensioni,
Newsletter, Landing Promo, Preventivi, Preventivo rapido, Area clienti/Inviti/Buoni, Creatività Social,
Multilingua (traduzione AI), WhatsApp Bot.

Se spegni un modulo i contenuti **non vengono cancellati**: tornano visibili quando lo riattivi.

## 3. Mettere online il dominio di un affiliato

Il server deve rispondere a tutti i domini degli affiliati con HTTPS.

**Opzione consigliata – server tuo (VPS) con Caddy**
1. Avvia il sito sul server (`yarn build && yarn start`, porta 3000).
2. Installa Caddy e usa il file `deploy/Caddyfile`.
3. Per ogni affiliato: aggiungi il dominio nel Super Admin, poi l'affiliato crea un record DNS
   **A** verso l'IP del server (e `www` come CNAME verso il dominio).
4. Al primo accesso Caddy verifica il dominio su `/api/platform/domain-check` e genera il certificato da solo.
5. Quando tutto funziona imposta `UNKNOWN_HOST=404`.

**Sottodomini tuoi** (es. `ostia.tribuinviaggio.com`): basta un record DNS jolly `*.tribuinviaggio.com` verso il server, poi nessun DNS da toccare per i nuovi affiliati.

**Hosting di Emergent**: verifica se la tua app può rispondere a più domini personalizzati. Se no, usa l'opzione con server tuo.

## 4. Anteprima senza DNS

Con `TENANT_OVERRIDE=true` (solo sviluppo o anteprima) visita `https://anteprima/?tenant=slug-affiliato`:
il browser resta su quell'affiliato finché non visiti `?tenant=reset`. In produzione lascia `false`.

## 5. Creare affiliati dal CRM

Imposta `PLATFORM_API_KEY` (almeno 24 caratteri) e chiama:

```bash
curl -X POST https://tribuinviaggio.com/api/superadmin/tenants \
  -H "Content-Type: application/json" \
  -H "X-Platform-Key: LA_TUA_CHIAVE" \
  -d '{
    "name": "Tribù in Viaggio Ostia",
    "domains": ["ostia.tribuinviaggio.com"],
    "plan": "plus",
    "status": "draft",
    "ownerEmail": "titolare@esempio.it",
    "ownerPassword": "PasswordIniziale1",
    "contacts": { "phone": "06 0000000", "email": "ostia@esempio.it" },
    "crmCode": "RM-OSTIA"
  }'
```

## 6. Per chi sviluppa

- `lib/tenantContext.js` – tenant della richiesta (AsyncLocalStorage)
- `lib/tenantDb.js` – filtro automatico per `tenantId`; i metodi non previsti generano errore
- `lib/tenant.js` – riconoscimento dominio, migrazione, creazione affiliati
- `lib/modules.js` – registro moduli e piani: **per aggiungere un modulo** aggiungi una voce con `code`, `adminTabs` e prefissi `api`; il blocco nelle API è automatico
- `lib/superadminRoutes.js` – API `/api/superadmin/*`
- `components/TenantProvider.js` – `useTenant()` e `useModule('codice')` nelle pagine
- Le nuove collezioni di contenuto vanno aggiunte a `TENANT_COLLECTIONS` in `lib/tenantDb.js`

## Limiti noti e prossimi passi

- **WhatsApp Bot**: usa ancora il numero configurato sul server; attivalo solo sul master finché ogni affiliato non avrà le proprie credenziali.
- **Google Analytics / Meta Pixel**: gli ID delle variabili d'ambiente valgono solo per il master; per gli affiliati servirà un campo nel Super Admin.
- **Ruoli**: ogni affiliato ha utenti "titolare"; un ruolo "editor" con permessi ridotti si può aggiungere.
- Le modifiche fatte dal Super Admin arrivano entro 30 secondi se l'app gira su più server.

---

# Modalità "un sito per installazione" (stesso codice su ogni progetto Emergent)

Se preferisci **non** usare il multi-sito, lo stesso identico codice funziona anche così:
ogni affiliato ha il **suo progetto Emergent** con il **suo database**, e tutto ciò che cambia
da un sito all'altro sta nelle variabili d'ambiente e nel database, mai nel codice.
Quindi per un nuovo affiliato non si tocca nulla: si copia il progetto e si impostano le variabili.

## Le due modalità a confronto

| | Multi-sito | Un sito per installazione |
|---|---|---|
| Installazioni | una per tutti | una per affiliato |
| Database | uno condiviso | uno per affiliato |
| Variabile | (nessuna) | `SITE_MODE=single` |
| Pannello | `/superadmin` gestisce tutti i siti | `/sviluppatore` gestisce quel sito |
| Aggiornare il codice | una volta | su ogni progetto (vedi sotto) |

## I due livelli di modifica

**Livello 1 – Sviluppatore** (`/sviluppatore`, credenziali `DEVELOPER_EMAIL` / `DEVELOPER_PASSWORD`)
- accende e spegne le funzioni (moduli) e sceglie il piano
- decide se l'admin può cambiare **colori e logo** (modulo "Personalizza colori e logo")
  e **l'ordine delle sezioni** (modulo "Ordine sezioni homepage")
- imposta nome del sito, SEO della homepage, stato, utenti admin

**Livello 2 – Admin** (`/admin`, credenziali create da `ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- gestisce tutti i contenuti come oggi (viaggi, banner, pagine, richieste...)
- nella nuova voce **Aspetto**: colore principale e di accento con anteprima, caricamento del logo,
  slogan, ordine e visibilità delle sezioni della homepage
- **non può** attivare le funzioni spente dallo sviluppatore: non le vede nel menu e il server
  rifiuta comunque le richieste. Le sezioni di moduli spenti compaiono con il lucchetto.

## Foto: il Cloudinary di ogni admin

Ogni admin usa il **proprio** account Cloudinary, collegato dal backend senza entrare in Emergent:
`/admin` → **Impostazioni** → **Foto e Cloudinary** → Cloud name + Upload preset di tipo *Unsigned*
(la scheda spiega dove trovarli e ha un pulsante "Prova caricamento").

Da quel momento accanto ai campi immagine (viaggi, galleria, banner, blog, pagine, landing, logo)
c'è il pulsante **Carica**: la foto va sul Cloudinary dell'admin e il link si inserisce da solo.
Incollare a mano il link di una foto continua a funzionare ovunque.
Se l'admin non collega nulla e tu hai impostato le chiavi `CLOUDINARY_*` nel progetto, si usa il tuo account.

## Creare il sito di un nuovo affiliato

1. In Emergent duplica il progetto (o crea un nuovo progetto collegato allo stesso repository GitHub).
2. Crea un database nuovo (es. un nuovo `DB_NAME` sullo stesso cluster Atlas).
3. Imposta le variabili d'ambiente:

```
SITE_MODE=single
SITE_NAME=Viaggi Rossi
SITE_PLAN=base            # base | plus | completo: funzioni attive al primo avvio
MONGO_URL=...
DB_NAME=viaggi_rossi
JWT_SECRET=una-stringa-casuale-diversa-per-ogni-sito
DEVELOPER_EMAIL=tuaemail@esempio.it
DEVELOPER_PASSWORD=...
ADMIN_EMAIL=titolare@viaggirossi.it
ADMIN_PASSWORD=password-iniziale-del-titolare
```

4. Pubblica e collega il dominio dell'affiliato al progetto.
5. Al primo avvio il sito nasce già con nome, categorie, footer e utente admin.
   Entra in `/sviluppatore` per rifinire le funzioni, poi consegna `/admin` all'affiliato.

## Aggiornare tutti i siti

Il codice è uguale ovunque, quindi un aggiornamento si fa **una volta** sul repository GitHub
e poi si ripubblica ogni progetto. Il modo più comodo è che tutti i progetti Emergent puntino
allo stesso repository e allo stesso ramo (`main`): dopo una modifica basta ripubblicarli.
Verifica in Emergent come funziona la sincronizzazione GitHub per i tuoi progetti; in alternativa
lo stesso codice si può pubblicare su un tuo server o su Vercel, una volta per affiliato.

I dati (viaggi, colori, moduli) stanno nel database di ogni sito, quindi un aggiornamento del
codice non tocca mai i contenuti degli affiliati.
