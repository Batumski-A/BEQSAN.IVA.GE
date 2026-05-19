# BEQSAN — Functional Brief

## რას ემსახურება

ფანჯრების ფაბრიკის საიტი. სტუმარი 1 წუთში თვითონ აწყობს თავის ფანჯარას, ხედავს ფასს, აგზავნის შეკვეთას — ოპერატორის გარეშე.

## ვინ არის user

- ბათუმისა და თბილისის კერძო მფლობელები (₾10,000–50,000 budget)
- ბუტიკ-სასტუმროები + ბინათმშენებლები (B2B, ₾100,000+ orders)

## ენები

- ქართული — primary
- English — SEO + უცხოელი ტურისტი-მფლობელები
- Русский — ბათუმის რუსულენოვანი მფლობელები

## ბრენდი

- **BEQSAN** · ხელოსანი რომან შარაშიძე · სალიბაური, ბათუმი · 1998-დან
- 12 ხელოსანი · 1100 მ² ფაბრიკა · ~620 ობიექტი წელიწადში
- მასალები: Alumil + Profilco (Al) · Rehau (PVC) · Hoppe + G-U (ფურნიტურა) · Low-E ტრიპლექსი
- გარანტია: Al 10წ · PVC 5წ · ფურნიტურა 2წ · მონტაჟი 2წ

---

## რა გვაქვს უკვე (Phase 1 ცოცხალია)

### Public site (`beqsan.iva.ge` / staging `iva.ge:4433`)

- `/` — home (hero + 3 value props + CTA)
- `/about` — სახელოსნოს ისტორია + facts + Roman + values + CTA
- `/process` — 7 ეტაპი: გაზომვა → დიზაინი → პროფილი → ჭრა → აწყობა → მინა+QA → მონტაჟი
- `/materials` — ალუმინი + PVC + მინა-პაკეტი + RAL ფერთა palette + 8-სიტყვიანი ლექსიკონი
- `/warranty` — ცხრილი (5 ელემენტი) + რა არ ფარავს + 3-ნაბიჯიანი პრობლემის flow + ბათუმის კლიმატის შენიშვნა + მოვლის გზამკვლევი
- `/catalog` — 5 პროდუქტი (ფანჯარა · კარი · სლაიდინგი · პანორამა · აივანი) cards-ად
- `/gallery` — stub (Phase 2)
- `/contact` — მისამართი + კოორდინატები + ტელეფონი + WhatsApp + ელფოსტა + სამუშაო საათები + სტილიზებული რუკა

### Configurator (`/configurator`) — 8 ნაბიჯი

| Step | რა აკეთებს |
|---|---|
| 1 | პროდუქტის ტიპის არჩევანი (5 family) |
| 2 | მასალის არჩევანი (Al თერმო / Al art / PVC თეთრი / PVC ლამინი) |
| 3 | ზომები (სიგანე × სიმაღლე სმ, real-time ფასი) |
| 4 | Layout — რამდენი პანელი (1-4) + opening type per pane (ყრუ / გასაღები / დასაკეცი / გასაღება+დასაკეცი / სლაიდინგი) + ფურნიტურის მხარე + ხილ-ბადე |
| 5 | მინა (single/double/triple/quad pane × Low-E · Tinted · Frosted · Tempered) |
| 6 | ფერი (outer + inner outer ≠ inner მხოლოდ PVC-ზე) + RAL ფერი ან custom hex |
| 7 | აქსესუარები — სახელური, საკეტი, რკალური, ცარვი, ბადე, წერო |
| 8 | Review + installation region (Batumi free / Kobuleti +150 ₾ / etc.) + send order |

3D scene ცოცხალია 3-8 ნაბიჯებზე:
- Auto-fit camera ფანჯრის bounding box-ის მიხედვით
- Hinge primitives per openable pane
- Always-on breathing animation (12°/3წ loop) — user-ი ხედავს რომელი პანელი იხსნება
- HTML overlay labels per pane (← მენტეშე მარცხნივ / etc.)
- Open/close toggle button

### Admin (`admin.beqsan.iva.ge` / staging `iva.ge:4435`)

- X-Admin-Token gate (Phase 0)
- Dashboard
- Social: Accounts (Meta connect) · Compose (post drafting) · Inbox (Facebook/Instagram DMs)

### Backend (`api.beqsan.iva.ge` / staging `iva.ge:5299`)

- .NET 8 · Clean Architecture · MediatR · Result envelope
- SQLite (file) + Dapper (reads) + EF Core (writes)
- Configurator pricing endpoint (canary verified at 7 specific configs)
- Catalog endpoints (product types · materials · glass · colors · accessories)
- Health endpoint
- Hangfire (background jobs ready, no jobs yet)
- Serilog (file + console)
- Social module (Meta OAuth + Graph + AES-GCM token cipher + KIE.ai for AI assist)

---

## რა გვინდა მაგრამ ჯერ არ გვაქვს (Phase 1.5+)

### Critical (Phase 1 launch-ისთვის)

- **შეკვეთის placement flow** (Step 9) — phone-ი + name + address + SMS confirmation
- **Order tracking** გვერდი — `/order/:phone/:code` — sms-ით მიგიწევს ბმული
- **SMS provider** integration (SMSOffice.ge ან Magti — გადასაწყვეტი)
- **Admin · Orders** — order list + status workflow (received → measured → in production → ready → installed → closed)
- **Admin · Pricing** — PricingRule editor (Roman-ის რეალური ფასები ცარიელია)
- **Real photos** — ფაბრიკის, ხელოსნების, დასრულებული ობიექტების (placeholder SVG illustrations ცოცხალია)
- **Roman-ის რეალური phone + email + ზუსტი მისამართი** (placeholder ცოცხალია)

### Important (Phase 1.5)

- **Catalog detail page** (`/catalog/:slug`) — ერთი პროდუქტის სრული ფურცელი ფოტოებით
- **Gallery** — ფინიშურ პროექტებზე filter + carousel
- **Admin · Quotes/Leads** — შემოსული შეკვეთების workflow
- **Admin · Catalog editor** — Roman თვითონ ცვლის ფასებს/მასალებს/აქსესუარებს
- **Order amendments** — შემდგომი ცვლილებები შეკვეთის placement-ის შემდეგ

### Phase 2

- **AI room visualization** — user-ი atvirtos სახლის ფოტოს ცეცი, AI აყენებს ფანჯარას მის ფოტოში
- **AI photo measurement** — user-ი იძახებს ფანჯრის ფოტოს, AI იცავს მიახლოებით ზომებს
- **Live measurement booking** — calendar slot-ი ხელოსნისთვის სახლზე გასვლისთვის
- **Stripe / TBC payment** — depositi-ად ან სრული თანხის გადახდა online
- **Admin · Analytics** — შეკვეთის funnel, drop-off ცარეცი, conversion rate
- **PWA install prompt** + offline catalog mode
- **B2B portal** — separate flow developers-ისთვის (bulk pricing, multi-site, contractor accounts)

### Phase 3

- **TBC bank financing** integration (განცალკეიოს ფასი — bank loan ფანჯრებზე)
- **Logistics/delivery tracking** — installation team-ის ETA
- **Customer support chat** (Facebook Messenger / Instagram DM unified inbox-ი უკვე ცოცხალია — extend)
- **Reviews module** — დასრულებული ობიექტების შემდეგ NPS + photo upload-ი

---

## Tech stack (reference for design tool)

- **Frontend**: React 18 + TypeScript strict + Vite + Tailwind CSS + Framer Motion + React Three Fiber (3D scene) + Zustand + TanStack Query + react-i18next + react-helmet-async
- **Mobile breakpoints**: 390px (iPhone-class), 768px (tablet), 1440px (desktop max-content)
- **Hosting**: IIS on `iva.ge` (staging) → BATUMSKI server later
- **Lighthouse target**: 95+ per page
- **Bundle target**: <60 KB gzip per page

## Information hierarchy reference (for any new design)

- **Header** items: logo · language switcher · Studio dropdown (about/process/materials) · Configurator · Catalog · Gallery · Warranty · Contact · primary CTA "აწყვე შენი ფანჯარა"
- **Footer** items: brand + tagline · address + coords · Explore (configurator/catalog/gallery/warranty) · Studio (about/process/materials/contact) · Reach (phone/email/hours) · credit line
- **CTA priority** order (user can do these from anywhere): აწყვე შენი ფანჯარა (configurator) → დარეკე (tel:) → WhatsApp → ელფოსტა → სტუმრობა (visit address)
