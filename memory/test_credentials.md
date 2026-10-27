# Credenziali

Le password NON vanno salvate in questo file (il repository può essere condiviso).

- Admin del sito master: quella già in uso. Cambiala da `/admin` → Impostazioni.
- Super Admin: definito dalle variabili d'ambiente `SUPERADMIN_EMAIL` e `SUPERADMIN_PASSWORD`
  (usate solo al primo login; poi la password si cambia con `PUT /api/superadmin/password`).
- Admin degli affiliati: creati dal pannello `/superadmin`.
