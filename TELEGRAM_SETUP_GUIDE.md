# 🤖 Ghid Configurare "Centru Decizii AI" - Telegram Bot

## Pas 1: Creează Bot-ul Telegram

1. Deschide Telegram și caută `@BotFather`
2. Trimite comanda `/newbot`
3. Urmează instrucțiunile:
   - **Nume bot:** Centru Decizii AI
   - **Username:** (alege ceva unic, ex: `centru_decizii_ai_bot`)

4. Vei primi un token ca acesta:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
   **⚠️ Păstrează acest token în siguranță!**

## Pas 2: Obține Chat ID-ul Tău

1. Caută `@userinfobot` pe Telegram
2. Trimite orice mesaj
3. Bot-ul îți va răspunde cu ID-ul tău (număr)
4. Copiază acest număr (ex: `123456789`)

## Pas 3: Pornește Conversația cu Bot-ul Tău

1. Caută bot-ul tău (@username_ales_mai_sus)
2. Apasă `Start` sau trimite `/start`
3. Acum bot-ul poate să-ți trimită mesaje!

## Pas 4: Configurează Backend-ul

Editează fișierul `/backend/.env`:

```env
# POC: Centru Decizii AI
GATEKEEPER_ENABLED="true"
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"  # Token-ul de la pas 1
TELEGRAM_ADMIN_CHAT_ID="123456789"  # Chat ID-ul de la pas 2

# Opțional: Personalizează pragurile
GATEKEEPER_MIN_RFQ_VALUE="100000"
GATEKEEPER_HIGH_VALUE_THRESHOLD="2000000"
GATEKEEPER_MIN_REPUTATION="4.0"
```

## Pas 5: Pornește Serverul

```bash
cd backend
npm run dev
```

Ar trebui să vezi:
```
✅ Server running on http://localhost:3001
🤖 Pornire Centru Decizii AI...
✅ Telegram Bot "Centru Decizii AI" inițializat
✅ Comenzi Telegram configurate
✅ Callback handlers configurate
✅ Gatekeeper Service pornit - monitorizez RFQ-uri noi
📅 Daily digest programat pentru: ...
```

## Pas 6: Testează!

### Test 1: Trimite /start la bot

În Telegram, trimite `/start` la bot-ul tău.
**Așteptat:** Mesaj de bun venit + instrucțiuni.

### Test 2: Testează /help

Trimite `/help`
**Așteptat:** Listă cu toate comenzile disponibile.

### Test 3: Testează /stats

Trimite `/stats`
**Așteptat:** Statistici curente (probabil toate 0 dacă e prima rulare).

### Test 4: Creează un RFQ (Demo complet!)

1. **Deschide aplicația web** (http://localhost:5173)

2. **Login ca client mock:**
   - Username: `startup_tech`
   - Password: `client123`

3. **Creează un RFQ:**
   - Titlu: "Test RFQ pentru Telegram"
   - Descriere: "RFQ de test pentru Centru Decizii AI"
   - Cerințe: "Trebuie să funcționeze notificarea Telegram"
   - Deadline: Data viitoare
   - **Buget: 850000 RON** (startup_tech are reputație 3.7, sub pragul de 4.0)

4. **Salvează RFQ-ul**

5. **Verifică Telegram în maxim 10 secunde!**

**Așteptat:**
- ⚠️ Notificare HIGH-RISK (client cu reputație scăzută + buget mediu)
- Mesaj detaliat cu scoring AI
- Butoane interactive: Publică / Respinge / Negociază

6. **Click pe un buton** (ex: "Publică")

**Așteptat:**
- Mesaj de confirmare
- RFQ-ul se actualizează în baza de date

---

## 🎯 Scenarii de Test

### Scenario A: Auto-Aprobat (Normal)

**Client:** `premium_corp` (5★)
**Buget:** 500,000 RON
**Așteptat:** 🟢 Notificare normală, aprobat automat

**Pași:**
1. Login: `premium_corp` / `client123`
2. Creează RFQ cu buget 500,000 RON
3. Telegram: Notificare verde cu opțiuni Publică/Respinge

---

### Scenario B: High-Value (Client Premium + Buget Mare)

**Client:** `mega_construct` (4.6★)
**Buget:** 5,000,000 RON
**Așteptat:** 🟡 Notificare high-value, aprobat dar cu alertă

**Pași:**
1. Login: `mega_construct` / `client123`
2. Creează RFQ cu buget 5,000,000 RON
3. Telegram: Notificare galbenă, marcat ca oportunitate mare

---

### Scenario C: High-Risk (Buget Mare + Reputație Scăzută)

**Client:** `high_value_client` (3.4★)
**Buget:** 3,500,000 RON
**Așteptat:** 🔴 Alertă risc ridicat, necesită aprobare manuală

**Pași:**
1. Login: `high_value_client` / `client123`
2. Creează RFQ cu buget 3,500,000 RON
3. Telegram: Alertă roșie, 3 butoane (Publică Oricum / Respinge / Negociază)

---

### Scenario D: Auto-Respins (Client Slab)

**Client:** `risky_ventures` (2.9★)
**Buget:** 150,000 RON
**Așteptat:** ❌ Auto-respins, doar notificare informativă

**Pași:**
1. Login: `risky_ventures` / `client123`
2. Creează RFQ cu buget 150,000 RON
3. Telegram: Notificare de respingere cu explicație AI

---

## 🔧 Troubleshooting

### Bot-ul nu trimite mesaje

**Verifică:**
1. Ai apăsat "Start" în conversația cu bot-ul?
2. Chat ID-ul e corect în `.env`?
3. Token-ul e corect?
4. Server-ul rulează și arată `✅ Telegram Bot ... inițializat`?

**Test rapid:**
```bash
curl https://api.telegram.org/bot<TOKEN>/getMe
```
Ar trebui să returneze info despre bot.

---

### RFQ-urile nu sunt procesate

**Verifică:**
1. `GATEKEEPER_ENABLED="true"` în `.env`
2. RFQ-ul e în status `draft` (normal după creare)
3. Server-ul arată: `🔍 Procesez X RFQ-uri noi...` la fiecare 10 sec
4. Verifică logs în consolă

---

### "Polling error" în consolă

**Cauză:** Alt proces folosește același bot sau token greșit.

**Soluție:**
1. Oprește toate procesele care folosesc bot-ul
2. Verifică token-ul
3. Restart server

---

## 📱 Comenzi Telegram Disponibile

| Comandă | Descriere |
|---------|-----------|
| `/start` | Pornește bot-ul, primești mesaj de bun venit |
| `/help` | Afișează toate comenzile și funcționalitățile |
| `/stats` | Statistici zilnice (totale și ultimele 24h) |
| `/pending` | Listează RFQ-uri în așteptare |
| `/risks` | Listează doar RFQ-uri cu risc ridicat |
| `/digest` | Raport rezumativ zilnic (trimis automat la 9 AM) |

---

## 🎨 Notificări Telegram

### 🟢 RFQ Normal Aprobat
```
🟢 Cerere RFQ Nouă Eligibilă

📋 Titlu: ...
💰 Valoare: ... RON
🏢 Client: ...
⭐ Reputație: 4.5★ / 5
📊 Scor Financiar: 85/100
🤖 Încredere AI: 92%

Decizie AI: Aprobat automat - client de încredere.

[Publică] [Respinge]
[Detalii Complete]
```

### 🟡 RFQ High-Value
```
🟡 RFQ Valoare Mare

✨ OPORTUNITATE IMPORTANTĂ ✨

📋 Titlu: ...
💰 Valoare: 5,000,000 RON 💎
...
Recomandare: Acest RFQ are potențial ridicat.

[Publică] [Negociază Direct]
[Detalii Complete]
```

### 🔴 RFQ High-Risk
```
🔴 ALERTĂ: RFQ Risc Ridicat

⚠️ NECESITĂ ATENȚIE MANUALĂ ⚠️

📋 Titlu: ...
💰 Valoare: 3,500,000 RON ⚠️
⭐ Reputație: 3.2★ ⚠️
...

Analiză AI:
[Explicație detaliată de ce e risc...]

[Publică Oricum] [Respinge] [Negociază]
[Detalii Complete]
```

### ❌ RFQ Auto-Respins
```
❌ RFQ Auto-Respins (Doar informare)

Motiv Respingere:
[Explicație AI]

ℹ️ RFQ-ul a fost arhivat în "Auto-Respinse".
```

---

## 🚀 Ești Gata!

Acum ai un asistent AI care:
- ✅ Analizează automat toate RFQ-urile
- ✅ Aprobă clienții de încredere
- ✅ Detectează RFQ-uri cu risc ridicat
- ✅ Îți trimite alerte în Telegram
- ✅ Te lasă să administrezi totul fără să intri pe platformă
- ✅ Îți trimite rapoarte zilnice

**Enjoy! 🎉**
