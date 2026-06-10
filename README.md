# HuddleFinder 🏟️

> **Find your venue. Show up. Join the chant.**

HuddleFinder is Canada's live sports discovery platform — connecting sports fans with the best venues to watch the game, and giving venue owners the tools to sell tickets, promote events and manage check-ins.


---

## What is HuddleFinder?

Finding a great place to watch live sport in Canada shouldn't be hard. HuddleFinder solves that by letting fans discover bars, pubs and restaurants showing their favourite sport — and letting venue owners turn match days into real revenue.

**For fans:**
Browse upcoming events near you, RSVP for free or buy tickets, and show up with a QR code on your phone.

**For venue owners:**
List your venue, create match day events, sell tickets directly to fans, and scan QR codes at the door — all from one dashboard.

---

## Features

### Fan Experience
- 🔍 **Discover venues** by city or near me (geolocation)
- 📅 **Browse upcoming events** filtered by sport, city and date range
- 🎟️ **Buy tickets** with group quantity selection (1–10 people)
- 📱 **QR ticket** — one code admits your whole group
- ✅ **RSVP** to free events instantly
- 📊 **Fan dashboard** — upcoming events, past events, my tickets
- 🔒 **Secure auth** — email/password + Google sign-in

### Venue Owner Experience
- 🏟️ **Claim your venue** with SMS verification
- 📋 **Create events** — free or paid, with ticket pricing and capacity
- 🎫 **Sell tickets** directly to fans via Stripe
- 📸 **QR scanner** — scan fan tickets at the door, supports partial group entry
- 📣 **Event promotions** — feature events in search and homepage
- 📊 **Dashboard** — RSVPs, ticket sales, check-in stats
- ⚙️ **Venue profile** — photos, sports, hours, amenities, contact



### Payments & Billing
- 💳 **Stripe subscriptions** — upgrade, downgrade, cancel, reactivate
- 🔗 **Stripe Connect** — venue payouts go directly to their bank
- 💰 **Commission split** — automatic on every ticket sale
- 🔄 **Billing cycle respect** — downgrade/cancel keeps benefits until period end

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Payments | Stripe (Subscriptions + Connect) |
| SMS | Twilio |
| Maps | Google Places API |
| Hosting | Vercel |
| QR Scanning | html5-qrcode |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project (Blaze plan)
- Stripe account
- Twilio account
- Google Places API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/huddlefinder.git
cd huddlefinder

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Running Locally

```bash
# Start the development server
npm run dev

# In a separate terminal — forward Stripe webhooks locally
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
huddlefinder/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Homepage
│   │   ├── search/                     # Search venues + events
│   │   ├── venues/[slug]/              # Venue profile
│   │   ├── events/[eventId]/           # Fan event detail
│   │   ├── dashboard/                  # Fan dashboard
│   │   ├── auth/                       # Login, signup, forgot password
│   │   ├── checkout/[eventId]/         # Ticket checkout
│   │   ├── tickets/                    # QR ticket + success page
│   │   ├── onboarding/                 # Venue claim + setup
│   │   ├── venue-dashboard/            # Venue owner dashboard
│   │   │   ├── events/                 # Event management
│   │   │   ├── scanner/                # QR ticket scanner
│   │   │   ├── upgrade/                # Plan management
│   │   │   └── stripe/                 # Connect onboarding
│   │   └── api/
│   │       ├── stripe/                 # Webhooks, checkout, subscriptions
│   │       ├── tickets/                # Check-in API
│   │       └── venues/                 # Venue search + verification
│   ├── components/
│   │   ├── cards/                      # VenueCard, EventCard
│   │   ├── layout/                     # Navbar, Footer
│   │   └── ui/                         # Button, Input, Toast, Modal etc
│   ├── context/                        # AuthContext
│   ├── hooks/                          # useAuth, useToast, useIdleTimeout
│   ├── lib/                            # Firebase, Stripe, Twilio clients
│   ├── types/                          # TypeScript interfaces
│   └── utils/                          # Helpers, formatters, strings
├── firestore.rules
├── firestore.indexes.json
└── firebase.json
```

---

## Key Flows

### Fan buying a ticket
```
Browse event → Select quantity → Stripe Checkout
→ Payment → QR ticket generated → Show at door
```

### Venue owner selling tickets
```
Create paid event → Fan buys ticket → Payout via Stripe Connect
→ Staff scans QR at door → Partial group check-in supported
```

### Venue subscription
```
Sign up free → Upgrade to Starter/Pro via Stripe Checkout
→ Downgrade/cancel keeps benefits until billing cycle ends
→ Webhook updates Firebase on billing date
```

---

## Deployment

Deployed on **Vercel** with **Cloudflare DNS**.

```bash
# Build for production
npm run build

# Vercel deploys automatically on push to main
git push origin main
```

See [Vercel Documentation](https://vercel.com/docs) for full deployment guide.

---

## Stripe Webhook Events

The following Stripe events are handled:

| Event | Action |
|---|---|
| `checkout.session.completed` | New subscription, ticket purchase, promotion |
| `invoice.payment_succeeded` | Applies Pro → Starter downgrade |
| `customer.subscription.updated` | Syncs subscription changes |
| `customer.subscription.deleted` | Applies cancellation, reverts plan to free |
| `account.updated` | Marks Stripe Connect onboarding complete |

---

## Firestore Collections

| Collection | Description |
|---|---|
| `users` | Fan and venue owner profiles |
| `venues` | Venue listings with plan and Stripe data |
| `events` | Match day events |
| `rsvps` | Free event RSVPs |
| `tickets` | Paid ticket purchases with QR data |

---

## Roadmap

- [ ] SendGrid email confirmations
- [ ] Venue approval flow (admin review)
- [ ] Push notifications
- [ ] Analytics dashboard (Basic + Advanced)
- [ ] $5 one-time event promotions
- [ ] Multi-venue support
- [ ] Admin dashboard
- [ ] Facebook auth

---

## License

Private — All rights reserved © 2026 HuddleFinder Inc.

---

## Contact

**Website:** [www.huddlefinder.ca](https://www.huddlefinder.ca)
**Email:** hello@huddlefinder.com

---

*Built for match day. Every day.*