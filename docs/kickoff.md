# BEQSAN — კარფანჯრების ონლაინ პლატფორმა
## Claude Code Kickoff Document

> ეს არის **ერთიანი ინიციალიზაციის დოკუმენტი** ახალი პროექტისთვის.
> ფაილი მიღებულია 2026-05-17 სესიაზე. ბოლო ნაწილი (§13-ის ბოლო skill-ები + §14-§17) მესიჯში truncated-ი იყო — დაკარგული ნაწილი მონიშნულია ქვემოთ TRUNCATION მარკერით.

---

## 1. პროექტის ხედვა (Vision)

**BEQSAN** არის რომან შარაშიძის ბათუმური (სალიბაური) კარფანჯრების სახელოსნოს ციფრული ფრონტი — საქართველოში **პირველი ნამდვილი 3D კონფიგურატორით** კარფანჯრებისთვის, **AI-ფოტო ანალიზით** ზომების შესაფასებლად, და **უ-ავტორიზაციო** შეკვეთის სისტემით. დაიდება IVA-ს ინფრასტრუქტურაზე სუბდომეინად `beqsan.iva.ge`.

**მისია:** მომხმარებელმა ტელეფონშივე იხილოს როგორი იქნება მისი კარი/ფანჯარა, რა ეღირება, რა ვადაში გაკეთდება — ერთი წუთის სიზუსტით, ოპერატორთან დაკავშირების გარეშე.

**კონკურენტული უპირატესობა (Georgia market gaps):**

| ფუნქცია | window.ge | gns.ge | alu.ge | fanjrebi.ge | **BEQSAN** |
|---|---|---|---|---|---|
| ფასების კალკულატორი | ✅ მარტივი | ✅ მარტივი | ✅ 2D | ✅ მარტივი | ✅ **3D realtime** |
| Mobile-first UX | ❌ | ❌ | ⚠️ | ⚠️ | ✅ **PWA** |
| AI ფოტო ანალიზი | ❌ | ❌ | ❌ | ❌ | ✅ **uniqueness** |
| AI vizualizacia (room render) | ❌ | ❌ | ❌ | ❌ | ✅ **uniqueness** |
| შეკვეთა ავტორიზაციის გარეშე | ⚠️ | ⚠️ | ❌ | ⚠️ | ✅ |
| 3D პრევიუ + გაღების ანიმაცია | ❌ | ❌ | ❌ | ❌ | ✅ |
| Canvas-ით ფორმის დახაზვა | ❌ | ❌ | ❌ | ❌ | ✅ |
| შეკვეთის სტატუსის ტრექინგი (SMS) | ❌ | ❌ | ❌ | ❌ | ✅ |
| PDF ტექნიკური ნახაზი | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 2. ბიზნეს კონტექსტი

- **კომპანია:** BEQSAN LTD
- **მფლობელი (კლიენტი):** რომან შარაშიძე
- **დეველოპერი / Hosting:** IVA (Lasha) — პროექტი დაიდება სუბდომეინზე `beqsan.iva.ge`
- **ფილიალი:** ბათუმი, სალიბაური (ერთი, ამ ეტაპზე)
- **სამიზნე რეგიონი:** დასავლეთ საქართველო (ბათუმი, ქობულეთი, ოზურგეთი, ქუთაისი, საჩხერე)

### სტეიკჰოლდერების მატრიცა

| როლი | ვინ | რა საკითხებზე |
|---|---|---|
| Product Owner / Business | რომან შარაშიძე | ფასები, პროდუქცია, გარანტიის პოლიტიკა, შეკვეთის workflow, ბრენდინგი |
| Tech Lead / Developer | Lasha (IVA) | არქიტექტურა, ტექსტეკი, deployment, hosting, infra |
| Brand Voice | რომან + Lasha | tone, ფოტოები, ისტორია, "გვერდით ვისთან მუშაობს" გრაფიკი |
| End users | დას. საქართველოს მცხოვრებლები | mobile-heavy, განცდილია "ცხელი ხაზის" სტრესით, უნდათ მყისიერი პასუხი |

### Subdomain სტრუქტურა

```
iva.ge                 # IVA-ს მთავარი
gps.iva.ge             # GPS tracking (Lasha)
social.iva.ge          # IvaSocManager
beqsan.iva.ge          # ⭐ ეს პროექტი — public site
admin.beqsan.iva.ge    # admin panel (separate app)
api.beqsan.iva.ge      # backend API endpoint
```

- **პროდუქცია:**
  - ალუმინის კარფანჯრები (თერმო + არათერმო)
  - მეტალო-პლასტმასის (PVC) კარფანჯრები (თეთრი + ლამინირებული)
  - სლაიდინგ სისტემები
  - პანორამული შემინვა
  - აივნის შემინვა
  - მინა-ფასადები (Phase 2)
  - მწერების ბადეები, ჟალუზები (აქსესუარები)
- **სამუშაო პროცესი:** ზომების აღება → წარმოება სალიბაურის სახელოსნოში → მონტაჟი ობიექტზე → გარანტია
- **გარანტია:** მინიმუმ 2 წელი ყველა პროდუქტზე (კონფიგურირებადი ადმინიდან)

---

## 3. ტექნოლოგიური სტეკი

### Backend (.NET 8 — Native)

```
ASP.NET 8 Web API
Clean Architecture (4 layers: Api, Application, Domain, Infrastructure)
EF Core 8 + Dapper (hybrid: EF for admin CRUD, Dapper for public catalog reads)
MediatR (CQRS)
Result pattern (FluentResults or custom)
FluentValidation
Serilog + centralized logging middleware (გადატანა Lasha-ს Cloud9.ge BATUMSKI სერვერზე)
JWT Bearer (მხოლოდ admin-ისთვის; permissions DB-დან ყოველ request-ზე)
Swagger / Scalar UI (dev only)
Health checks
PostgreSQL (Citus optional Phase 3) ან MS SQL Server (Lasha-ს არჩევანი)
SignalR (admin live dashboard for new orders)
Hangfire ან BackgroundService (SMS-ის queue, PDF-ის generation, AI requests)
MinIO / S3-compatible storage (ფოტოები, 3D models, generated renders)
Docker + docker-compose
```

### Frontend (React 18 — Native SPA, არ Next.js)

```
Vite + React 18 + TypeScript (strict mode)
TailwindCSS 3 + shadcn/ui
React Three Fiber + Three.js + Drei + Leva (3D configurator)
Konva.js (2D canvas drawing — ფორმის დახაზვა, ფოტოზე reference marking)
Zustand (UI state) + TanStack Query v5 (server state)
React Hook Form + Zod (ფორმები + validation)
React Router v6
i18next + react-i18next (ka, en, ru)
Framer Motion (micro-interactions)
Lucide React (icons)
date-fns
react-helmet-async (SEO)
PWA via vite-plugin-pwa (installable, offline cache for catalog)
MediaDevices API (camera access for AI photo measurement)
```

### Admin Panel (separate React app ან monorepo workspace)

```
Vite + React 18 + TypeScript
TailwindCSS + shadcn/ui (dashboard variant)
TanStack Table + TanStack Query
Recharts (analytics)
React Hook Form + Zod
```

### AI & ინტეგრაციები

- **AI Image Generation:** Anthropic-ის API (Claude vision for analysis) + OpenAI DALL-E 3 ან Stable Diffusion XL via Replicate API (room visualization)
- **AI Photo Measurement:** Claude 3.5 Sonnet vision API რომელიც აანალიზებს ფოტოს + reference object-ს და უბრუნებს მიახლოებით ზომებს
- **SMS:** SMSOffice.ge ან Magti SMS API (ქართულ ბაზარზე ყველაზე საიმედო)
- **Email:** SendGrid ან Mailgun
- **Maps:** MapLibre GL JS + OSM tiles (free) ან Google Maps Embed
- **Analytics:** Plausible ან Umami (self-hosted, privacy-first)
- **Push notifications:** Web Push API (PWA-ში)
- **PDF Generation:** QuestPDF (.NET ბიბლიოთეკა — beautiful, fluent API)

---

## 4. არქიტექტურა — Backend

> ⚠️ **Workspace override:** ფაქტობრივი ფაილური სტრუქტურა ამ პროექტში არის flat split — `BACK/` და `FRONT/` ცალკე საქაღალდეები ერთი workspace root-ის ქვეშ. ქვემოთ მოცემული `/BEQSAN/...` ჩანაცვლდება `BACK/...`-ით.

### Solution Structure (effective layout for this workspace)

```
e:\BEQSAN.IVA.GE\
├── BACK/                              # .NET solution root
│   ├── BEQSAN.sln
│   ├── src/
│   │   ├── BEQSAN.Api/                # Controllers, Middleware, DI, Program.cs
│   │   ├── BEQSAN.Application/        # CQRS handlers, DTOs, Validators, Interfaces
│   │   ├── BEQSAN.Domain/             # Entities, Value Objects, Domain Events, Enums
│   │   ├── BEQSAN.Infrastructure/     # EF DbContext, Dapper, Repositories, External (SMS, Email, AI, Storage)
│   │   └── BEQSAN.Worker/             # Hangfire jobs, BackgroundServices
│   ├── tests/
│   │   ├── BEQSAN.UnitTests/
│   │   └── BEQSAN.IntegrationTests/
│   └── docker-compose.yml
├── FRONT/                             # React + Vite SPA root (and admin later)
├── docs/                              # ADR, schema, API docs, kickoff
├── .claude/                           # skills + slash commands
└── CLAUDE.md
```

### Domain Entities (high-level)

```
User (admin only)
Permission, RolePermission

ProductType         (window, door, sliding, panoramic, balcony_glazing)
Material            (aluminum_thermal, aluminum_basic, pvc_white, pvc_laminated)
ProfileSystem       (Aluprof MB-70, ASAŞ, etc. — Lasha-ს ფაქტობრივი მომწოდებლები)
ColorPalette        (RAL codes + standard whites/browns/anthracites/wood)
GlassType           (single, double, quadruple, low-e, tempered, frosted, tinted)
Accessory           (handles, locks, mosquito_net, blinds, sills) + Price
PricingRule         (per m² for material+profile combo, modifiers per accessory/glass/color)

Configuration       (snapshot of user's choice — material, profile, dims, layout, panes, color, glass, accessories)
ConfigurationPane   (each pane in layout: position, openable, opening_type [tilt|swing|sliding|fixed])

Customer            (phone PK or surrogate; name?, email?)
Order               (configurations[], status, totalPrice, materialCost, profit, warranty_start, warranty_end, region)
OrderStatusHistory  (status, timestamp, changedBy, note)
OrderAttachment     (photos uploaded by customer, AI analysis results)

GalleryProject      (showcase of completed work — photos, location, description, before/after)
WarrantyClaim       (orderId, claimDate, description, status)
PageContent         (CMS: about, warranty terms, services — editable from admin)
ContactRequest      (any inquiry not tied to an order)
```

### Status Workflow

```
new → contacted → measuring → in_production → ready → installing → installed → completed
                                                                            ↘ warranty_active
                                                                            ↘ cancelled (any stage)
```

### API Versioning

```
/api/v1/catalog/*       # public
/api/v1/configurator/*  # public — calculate-price, save-draft, submit-order
/api/v1/orders/*        # public read by phone+code, admin full
/api/v1/admin/*         # JWT required
/api/v1/ai/*            # rate-limited public (photo analysis, render generation)
```

---

## 5. არქიტექტურა — Frontend

### Folder Structure

```
FRONT/
├── public/
│   ├── 3d/                  # base GLTF models for window/door types
│   ├── textures/            # aluminum, PVC, glass textures
│   └── manifest.webmanifest
├── src/
│   ├── app/                 # routes, layouts, providers
│   ├── features/
│   │   ├── configurator/    # the big feature
│   │   │   ├── 3d/          # R3F scene, lighting, camera
│   │   │   ├── steps/       # step components (type, material, dims, layout, glass, color, accessories, review)
│   │   │   ├── canvas/      # Konva drawing for custom shapes
│   │   │   ├── photo-ai/    # camera, upload, AI dimension estimation
│   │   │   ├── pricing/     # realtime price calc client-side mirror
│   │   │   └── store.ts     # Zustand store
│   │   ├── catalog/
│   │   ├── gallery/
│   │   ├── order-tracking/  # enter phone → see your orders
│   │   ├── contact/
│   │   └── home/
│   ├── shared/
│   │   ├── ui/              # shadcn components
│   │   ├── api/             # TanStack Query hooks, axios client
│   │   ├── hooks/
│   │   ├── lib/             # cn(), formatters, georgian number utils
│   │   └── types/
│   ├── i18n/
│   │   ├── ka.json          # primary
│   │   ├── en.json
│   │   └── ru.json
│   └── main.tsx
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

### Routes

```
/                           hero, services, featured projects, CTA → configurator
/configurator               the main funnel (steps 1-8)
/catalog                    browse product types
/catalog/:type              specific type page
/gallery                    completed projects with filters
/gallery/:slug              single project case study
/order/:phone/:code         tracking page (link sent via SMS)
/about                      company story, workshop photos, team
/warranty                   terms editable from admin
/contact                    form + map of Salibauri + working hours + phone
/blog                       Phase 2 (SEO)
```

---

## 6. ⭐ კონფიგურატორის დეტალური ფლოუ (THE CORE FEATURE)

ეს არის პროექტის გული. დეტალურად ვაგებთ ნაბიჯ-ნაბიჯ.

### Step 1 — პროდუქტის ტიპის არჩევა

- დიდი ბარათები: ფანჯარა, კარი, სლაიდინგი, პანორამული, აივნის შემინვა
- თითო ბარათზე — 3D preview იწყება ერთიდან (ფონზე ნელი ბრუნი)
- mobile: 2 column grid; desktop: 5 column row

### Step 2 — მასალის არჩევა

- ალუმინი თერმო / ალუმინი არათერმო / PVC თეთრი / PVC ლამინირებული
- თითო ვარიანტთან: მცირე info ღილაკი ("რა განსხვავებაა?") modal-ით
- realtime preview: 3D მოდელი ცვლის ფერს/მასალას

### Step 3 — ზომების შეყვანა (THE SMART PART)

სამი მეთოდი მომხმარებლის არჩევანის მიხედვით:

**3a. ხელით შეყვანა** (default)

- სიგანე (სმ) + სიმაღლე (სმ) inputs
- რეალურ დროში 3D მოდელი იცვლის პროპორციებს
- min/max validation (e.g. 30-400 cm)

**3b. ფოტოს ატვირთვა + AI ანალიზი** ⭐

- "გადაიღე ფოტო ან ატვირთე გალერეიდან"
- მომხმარებელი ჩასვამს reference ობიექტს ჩარჩოში (კარის სიმაღლე ~ 200 სმ, A4 ფურცელი 21x29.7 სმ, საკრედიტო ბარათი 8.56 x 5.4 სმ)
- Konva canvas overlay-ზე იხაზავს 2 ხაზს: reference + opening
- backend → Claude 3.5 Sonnet vision API → ანალიზი → მიახლოებითი ზომები
- ალგორითმი:

  ```
  1. ფოტო + reference type + 2 line coordinates → POST /api/v1/ai/estimate-dimensions
  2. Claude vision prompt: "Given a photo with a reference object of known size X cm
     marked from (x1,y1) to (x2,y2) in pixels, and an opening marked from (x3,y3) to
     (x4,y4), estimate the opening's real dimensions. Account for perspective."
  3. Response: { width_cm, height_cm, confidence, notes }
  4. UI: "შეფასებული ზომა: 120 x 145 სმ — გადაამოწმე და დაარედაქტირე საჭიროების შემთხვევაში"
  ```

**3c. Canvas-ით დახაზვა** (custom shapes)

- ტრაპეცია, თაღოვანი, არასწორი — მომხმარებელი ხატავს ფორმას Konva-ში
- შემდეგ ანიშნებს თითო გვერდის სიგრძეს
- 3D მოდელი ცდილობს მისადაგებას (basic Phase 1: bounding box-ით; Phase 2: სრული მესის გენერაცია)

### Step 4 — Layout / პანელების კონფიგურაცია

- 1 / 2 / 3 / 4 პანელი
- თითო პანელზე dropdown: ყრუ / გასაღები / დასაკეცი / სლაიდინგი
- პანელის ფარდობითი სიგანე drag-ით (3D-ში პროპორცია ეცვლება ცოცხლად)
- გასაღების მხარე (მარცხნივ/მარჯვნივ) icons-ით

### Step 5 — მინის ტიპი

- ერთმაგი / ორმაგი / სამმაგი / ოთხმაგი
- დამატებითი: low-E coating, tempered, frosted, tinted
- თითო ვარიანტი ფასს ცვლის რეალურ დროში

### Step 6 — ფერი

- სტანდარტული swatches: თეთრი, ყავისფერი, ანტრაციტი, შავი, ხის ფაქტურა (oak/wenge)
- RAL palette button → modal სრული პალიტრით
- 3D მოდელის ფერი ცოცხლად იცვლება
- "ლამინაცია გარედან + თეთრი შიგნით" ოფცია (PVC-სთვის)

### Step 7 — აქსესუარები

- სახელურის სტილი (3-4 ვარიანტი, ფოტოებით)
- საკეტი (basic / multi-point / smart)
- მწერების ბადე (yes/no, ფერი)
- შიდა/გარე ფერთულა / sill (yes/no, სიგრძე)
- ჟალუზი (yes/no, ფერი, ცალკე ფასი)

### Step 8 — გადახედვა + 3D Showcase

- სრული 3D სცენა: კარი/ფანჯარა ხის ფაქტურის კედელში
- ღილაკი "გახსენი/დახურე" — გაღების ანიმაცია
- ფასების breakdown:
  - მასალა: ___ ₾
  - მინა: ___ ₾
  - აქსესუარები: ___ ₾
  - **სულ: ___ ₾** (დღგ-თი)
  - + მონტაჟი (Batumi-ში უფასო, რეგიონებში დათვლა)
- გარანტიის ხანგრძლივობა, წარმოების ვადა

### Step 9 — შეკვეთა (ULTRA-LOW FRICTION)

- **მხოლოდ ერთი სავალდებულო ველი: ტელეფონის ნომერი** (+995 prefix-ით)
- არასავალდებულო: სახელი, ელფოსტა, მისამართი/ქალაქი
- "სად გნებავთ მონტაჟი?" — ბათუმი / ქობულეთი / სხვა (text)
- დიდი ღილაკი: **"გავაგზავნოთ შეკვეთა"**
- სუბმიტი → SMS კოდი ვერიფიკაციისთვის (anti-spam) → შენახული შეკვეთა
- მომხმარებელი იღებს SMS-ს: "შეკვეთა #1234 მიღებულია. სტატუსის სანახავად: link"
- ბმული → /order/{phone}/{code} — შეუძლია სტატუსის ნახვა, ისტორია, შენიშვნების დატოვება

---

## 7. AI ფიჩერების სრული აღწერა

### 7a. AI Photo Measurement (აღწერილია Step 3b-ში)

- **Backend endpoint:** `POST /api/v1/ai/estimate-dimensions`
- **Provider:** Claude 3.5 Sonnet vision (anthropic-sdk-csharp)
- **Rate limit:** 5 requests / phone / day (anonymous), unlimited for verified
- **Caching:** ფოტო hash-ით — იგივე ფოტო არ ედინება ხელახლა

### 7b. AI Room Visualization

- მომხმარებელი ატვირთავს თავისი სახლის/ფასადის ფოტოს
- ირჩევს კონფიგურირებულ კარს/ფანჯარას
- AI გენერირებს რენდერს რომელშიც ჩასმულია
- **Provider:** Replicate API (Stable Diffusion XL + ControlNet) ან Black Forest Labs FLUX
- **Backend endpoint:** `POST /api/v1/ai/visualize-in-room`
- Queue-ში (Hangfire) — ცოტა დრო სჭირდება (10-30 წმ)
- Push notification / SMS როცა მზადაა

### 7c. AI Assistant (chatbot) — Phase 2

- ფლოატინგი წრიული ღილაკი → ჩათ
- "გამარჯობა, რომელი ფანჯარა მირჩევთ აბაზანისთვის?"
- Claude API + RAG საიტის კონტენტზე
- შემოთავაზებები პრიორიტეტული ფლოუებში

---

## 8. ადმინ პანელი (სრული სიხშირე)

### Dashboard

- შეკვეთები დღეს / კვირაში / თვეში (cards + sparkline)
- შემოსავალი vs წინა პერიოდი
- კონვერსიის რეიტი (visits → configurations → orders)
- Active warranties expiring soon
- Live "ვინც ახლა კონფიგურირებს" — SignalR
- რეგიონების მიხედვით heatmap (Batumi-ცენტრი)

### Orders

- ცხრილი: status, customer phone, total, region, date
- ფილტრები: status, date range, region, material type
- სტატუსის შეცვლა — automatic SMS to customer
- შეკვეთის PDF-ის ჩამოტვირთვა (ტექნიკური ნახაზი + სპეცი)
- შენიშვნები ხელოსნებისთვის (internal, არ ჩანს მომხმარებლისთვის)
- ფოტოები მონტაჟის შემდეგ (drop into completed projects gallery with one click)

### Pricing Engine (THE BUSINESS HEART)

- **PricingRule editor:**
  - ფასი / მ² თითო Material × Profile კომბინაციისთვის
  - Color modifier (%): ლამინაცია +X%, RAL color +Y₾/მ²
  - Glass modifier: double = base, quadruple = +Z₾/მ²
  - Accessory absolute prices
  - Region modifier: Batumi free install, რეგიონები +ფასი / კმ
- **Material cost tracker:**
  - მომწოდებლის ფასი / მ² (აქ მხოლოდ admin-ი ხედავს)
  - ავტომატური profit margin გამოთვლა შეკვეთებზე
  - ანგარიში: გასული თვის სუფთა მოგება ✔

### Catalog Management

- Product types, materials, profiles, colors, glass types, accessories — CRUD
- Drag-and-drop ordering
- Image upload (auto webp + multiple sizes)
- Hide/show toggle (out of stock)

### Gallery / Completed Projects

- ფოტოების ატვირთვა (drag-and-drop, multiple)
- Before / After slider configuration
- ლოკაცია, აღწერა, რა ტიპის სამუშაო

### Warranty Management

- Warranty terms editor (Markdown)
- Warranty claims inbox
- შეხსენებები expiring warranties-ისთვის

### Content Management

- გვერდები: about, services, warranty (Markdown editor)
- Hero slides
- Featured projects ordering
- Translations (ka, en, ru) tabs

### Users & Permissions (admin-ი მხოლოდ)

- მფლობელი (Lasha) — full
- მენეჯერი — orders + customers
- ხელოსანი — assigned orders only (mobile-friendly)
- სტატისტიკოსი — read-only analytics

### Reports

- გასული თვის შემოსავალი/მოგება
- მასალის გახარჯვა (kg ალუმინი, m PVC, etc.)
- ყველაზე გაყიდვადი კონფიგურაცია
- რეგიონების მიხედვით breakdown
- CSV / Excel ექსპორტი

---

## 9. ⭐ Design System — "Industrial Elegance" (Superpower Edition)

ეს არის პროექტის **ვიზუალური ფილოსოფია**. დიზაინი არ არის გადმოწერილი თემა — ის არის **ფაბრიკული ჭეშმარიტება**, რომელიც ცოცხალდება ეკრანზე. BEQSAN ამზადებს მძიმე ალუმინს და მინას ხელით ბათუმის ფაბრიკაში — საიტმაც იგივე ხელოვნური სიდუმე უნდა იქონიოს.

### 9.1 Aesthetic Direction (ერთი წინადადებით)

**"Swiss precision meets Black Sea moody light meets Bauhaus material honesty."**

Reference touchpoints (არა კოპირებისთვის, განწყობისთვის):
- Apple Vision Pro product page (precision-machined photography, deliberate spacing)
- Bottega Veneta — restrained luxury, single signature gesture
- Aēsop — copy-as-art, generous negative space
- Studio Daniel Libeskind (architecture) — drama through geometry
- New York Times "T Brand Studio" longform layouts — editorial confidence
- Werner Aisslinger industrial design portfolios

❌ რასაც **ვერიდებით**:
- Tropical კოლორიტი (გადასაშლელი ეგზოტიკა — ჩვენ ჩრდილოელი ვართ)
- ცარიელი glassmorphism და უსაზრო blur-ები
- Generic purple/pink gradients (AI slop ვიზიტ-ბარათი)
- Disney-like rounded corners ყველგან (`rounded-2xl` ყველგან = ლექსიკონის ერთი სიტყვა)
- ცარიელი "tech bro" დაშბორდი ფერად სქემაში
- Lorem ipsum — ვერასდროს

### 9.2 ფერების სისტემა (Tokens)

**Primary palette** — monochromatic ფონდი + ერთი ხელისმოწერა:

```css
/* Background layers — depth through value, not hue */
--bg-base:        oklch(15% 0.01 250);  /* #0A0E14 — deep ink */
--bg-elevated:    oklch(19% 0.012 250); /* #131925 — surface 1 */
--bg-raised:      oklch(23% 0.014 250); /* #1C2333 — surface 2 (cards) */
--bg-overlay:     oklch(27% 0.016 250); /* #252D40 — modals */

/* Foreground — type and structure */
--fg-primary:     oklch(96% 0.005 95);  /* #F4F2EE — warm white (paper) */
--fg-secondary:   oklch(78% 0.008 95);  /* #C3BFB8 — muted ink */
--fg-tertiary:    oklch(56% 0.01 250);  /* #7E869C — captions */
--fg-disabled:    oklch(38% 0.01 250);

/* Material — brushed aluminum surfaces */
--mat-aluminum:   oklch(72% 0.015 240); /* #A8B3C4 — primary metal */
--mat-aluminum-h: oklch(82% 0.015 240); /* hover */
--mat-aluminum-d: oklch(55% 0.015 240); /* shadow side */

/* Signature accent — Batumi amber (used SPARINGLY, ONE accent per view) */
--accent-amber:   oklch(74% 0.16 65);   /* #F5B342 — Black Sea sunset */
--accent-amber-h: oklch(82% 0.16 65);
--accent-glow:    oklch(74% 0.16 65 / 0.35);

/* System */
--success:        oklch(72% 0.16 145);  /* #4ADE80 */
--warning:        oklch(78% 0.15 75);
--danger:         oklch(63% 0.22 25);   /* #EF4444 */
--info:           oklch(70% 0.13 230);

/* Borders — hairlines, never thick */
--hairline:       oklch(96% 0 0 / 0.08);
--hairline-strong:oklch(96% 0 0 / 0.14);
```

**წესები:**
- ერთ ეკრანზე **მაქს 1 აქცენტური ფერი** ერთდროულად. Amber გამოიყენება მხოლოდ CTA-ზე, აქტიური სტატუსზე, ან კრიტიკულ reveal-ზე.
- ფერი ვერ ცვლის ფუნქციას — danger ყოველთვის წითელია, success მწვანე. სხვა შემთხვევაში — neutral.
- ფონი არასდროს არ არის "ცარიელი დიდი ფერი" — ყოველთვის გვაქვს subtle gradient ან noise texture (1-2% opacity grain).

### 9.3 ტიპოგრაფია

**Pairing** (ფიქსირებული — ნუ შეცვლი ექსპერიმენტისთვის):

```
Display (HERO):     "BPG Mrgvlovani Caps" ან "BPG Glaho Sans Caps"
                    — uppercase only, tracking -2%, line-height 0.95

Headlines (h1-h3):  "BPG Glaho Sans"
                    — title case, tracking -1%, line-height 1.1

Body & UI:          "FiraGO"
                    — ქართულ/ლათინ ერთიანი მეტრიკით, line-height 1.55

Mono / Specs:       "JetBrains Mono" (technical drawings, dimensions, prices)
                    — line-height 1.4, tabular-nums

Editorial (Phase 2 blog): "PP Editorial New" Latin + "BPG Excelsior Caps" ქართულ
```

**Scale** (modular, ratio 1.25):

```
Display 1:   72px / 80px line-height — hero only
Display 2:   56px / 64px              — major reveal
H1:          40px / 48px
H2:          32px / 40px
H3:          24px / 32px
H4:          20px / 28px
Body lg:     18px / 28px              — long-form
Body:        16px / 24px              — default
Body sm:     14px / 20px              — UI
Caption:     12px / 16px              — meta
Mono spec:   13px / 18px tabular-nums
```

**Loading strategy:**
- Display ფონტი = `font-display: optional` (FOUT prevention, native fallback OK)
- Body = `font-display: swap` + preload via `<link rel="preload">`
- Subset მხოლოდ ქართულ + ლათინ ხელნაწერ ნიშნებად (`unicode-range`) — 60-70% size წამოღება
- Variable fonts სადაც შესაძლებელია (FiraGO has VF version)

**Typographic detail rules:**
- ქართულ ციფრებს ვერ ვწერთ (`ერთი ათასი`) — მხოლოდ არაბული: `1 200 ₾`
- ფასი ყოველთვის tabular-nums, equal-width digits — table-ში არ "ცეკვავს"
- სათაურები — case sensitive, lowercase სათაური *მცირე ნიშნოვან* only as creative choice, არასდროს default-ად
- ქართულ ბრჭყალები: `„გამარჯობა"` (low-9 + high-6), არა `"hello"`
- ერთეულები სუფთად: `მ²`, `მმ`, `კმ` — true unicode unit, არ `m^2`

### 9.4 Spacing & Grid

**Spatial system** — 4px base, modular:
`4  8  12  16  24  32  48  64  96  128  192`

**Grid:**
- Mobile: 4-col, 16px gutter, 16px margin
- Tablet: 8-col, 20px gutter, 32px margin
- Desktop: 12-col, 24px gutter, 64px margin
- Max content width: **1440px** (NOT 1920+ — readability over showoff)
- "Generous" sections: 96-128px vertical padding
- "Dense" sections (admin): 48px vertical padding

**Composition principles:**
- **Asymmetry by design** — hero text never centered if it can be left-aligned with intent
- **One break per page** — diagonal element, oversized number, full-bleed image რომელიც გრიდს ანგრევს — *ერთხელ*
- **Negative space is content** — landing page hero-ში 60%+ უნდა იყოს რესპირაცია

### 9.5 Motion Language

**Philosophy:** "Weight, not bounce." ჩვენ ვამუშავებთ მძიმე ფანჯრებს — ანიმაცია უნდა ჰქონდეთ ფიზიკურ მეხსიერებას.

**Easing curves** (CSS custom + Framer Motion presets):

```ts
// Standard — UI transitions
ease.standard = cubic-bezier(0.32, 0.72, 0, 1)   // 240ms duration

// Decelerate — element entering
ease.enter    = cubic-bezier(0, 0, 0.2, 1)        // 320ms

// Accelerate — element leaving
ease.exit     = cubic-bezier(0.4, 0, 1, 1)        // 200ms

// Heavy — large surfaces (modal, sheet, drawer)
ease.heavy    = cubic-bezier(0.16, 1, 0.3, 1)     // 480ms

// Mechanical — door/window opening in 3D
ease.mechanical = spring({ stiffness: 80, damping: 18, mass: 1.4 })
```

**Choreography rules:**
- **Stagger:** 40-60ms between siblings on entrance (never simultaneous unless intentional)
- **One hero animation per page** — გადატვირთვა spoils-ს ვიზუალს
- **Hover responses:** მაქს 120ms ვადით, არ უნდა გაცდეს cursor-ს გადასვლა
- **Page transitions:** crossfade 240ms ან slide-in for modal routes
- **Loading:** მუდამ skeleton, ვერასდროს spinner ცარიელ ეკრანზე
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` — ყველა motion → opacity-fade only, transition ≤ 100ms

**Signature micro-interactions:**
- ღილაკზე დაჭერა — 1px push down + 80ms scale 0.98 + haptic feedback (mobile)
- დიდი ფასი counter-up animation submit-ის შემდეგ (1.2s, ease-out)
- კონფიგურატორის ნაბიჯის გადასვლა — current step slides out top, next slides in bottom (stagger children)
- 3D ფანჯრის გახსნა — spring physics, არა linear (`mechanical` easing)

### 9.6 Material Honesty (ფოტო/ფაქტურა)

**Photography direction:**
- Workshop photos: **black & white**, high contrast, ფაქტიური — process shots (welding sparks, aluminum cuts, hands measuring)
- Product photos: color, **single-source lighting** (workshop window light), no studio sterility — საფეხუროვანი თეთრი ფონები ❌
- Hero shots: **environmental** — installed window in real Batumi home, ისეთი მზის სხივი რომელიც მინიდან გადადის
- Before/After: side-by-side, mute palette except the new window which catches light

**Texture overlays:**
- ფონებზე subtle **grain noise** (SVG turbulence ან noise PNG @ 2-3% opacity) — სრულად ბრტყელი არასდროს
- "Material swatch" elements — ფერების და მინების შერჩევაში ფიზიკური ფაქტურები: brushed aluminum has actual brushed texture, wood has actual oak/wenge grain, არა plain swatch

**Decorative elements** (use sparingly, with intent):
- ტექნიკური ნახაზის ხაზები — გვერდის კიდეებზე, dimension arrows, callouts. As pure decoration (low opacity), they reinforce "we make real things"
- RAL color codes ფერების გვერდით (Mono font, small, secondary color) — "ფერი № RAL 7016" — როგორც დაკრედიტება
- Workshop coordinates badge somewhere on contact page: `41.6168° N, 41.6367° E — სალიბაური, ბათუმი` — geographic honesty

### 9.7 Component Voice (signature pieces)

**Hero section:**
- სრულეკრანიანი დარკ ფონი, ცენტრში დიდი black & white workshop ვიდეო loop (15s, muted, autoplay) — ხელით ვიყურები ალუმინს
- ვიდეოს ზემოდან Display 1 ტიპით ერთი წინადადება: `„ხელით აწყობილი ფანჯრები ბათუმის ფაბრიკაში."`
- ქვემოდან ერთი CTA: `→ აწყვე შენი ფანჯარა` (amber accent, oversized button, mono `01`-badge)
- გარდა scroll-ისა და CTA-ისა, არაფერი. ერთი იდეა.

**Product card:**
- ფონი: `--bg-raised`, hairline border
- ზემოდან: 3D model preview (slow auto-rotate on hover, 4s rotation)
- შუაში: product name Display 2, ერთი წინადადება Body
- ქვემოდან: სპეცი 3 ცალი Mono ფონტში (e.g. `MATERIAL · ALUMINUM 70mm`, `U-VALUE · 1.2 W/m²K`, `STARTING · 280 ₾/m²`)
- კარდი hover-ზე — translateY(-2px), shadow-on, label fade-in

**Configurator step indicator:**
- არა dots/progress bar. იყოს **vertical ticker** მარცხნივ (desktop) ან horizontal mini-rail (mobile)
- Active step: amber + numeric (`01`, `02`...), inactive: hairline + secondary
- მცირე ანიმაცია transition-ში: ხაზი იხატება next step-მდე

**Pricing breakdown:**
- Receipt-like — Mono ფონტი, dashed hairline between rows
- სრული ფასი: oversized Display 2, amber underline (1px)
- "₾ 1 240" formatting — Georgian space thousand separator

**Order status timeline:**
- Vertical timeline, milestones როგორც technical drawing markers (small circles + lines)
- Active stage pulse animation (slow, breathe-like, 2.4s)
- Completed: filled checkmark, hairline through to next
- Mono labels with timestamps

**3D scene art direction:**
- Camera: 35mm equivalent, slight off-axis (architectural photography rule of thirds)
- Lighting: 3-point — key from upper-left (warm 4500K, ~85% intensity), fill from right (cool 6500K, 25%), rim from behind for material edge highlight
- Ground: subtle reflective surface (not mirror — 4-6% glossiness)
- Background: neutral fog gradient `--bg-elevated` → `--bg-base`
- Material settings (PBR):
  - Aluminum: metallic 1.0, roughness 0.25, anisotropy 0.4 (brushed direction horizontal)
  - PVC: metallic 0.05, roughness 0.55, slight subsurface
  - Glass: transmission 0.95, IOR 1.52, thickness 0.01, dispersion 0.02
- Camera controls: limited orbit (no 360° gimbal flip — vertical clamp -30° to +60°)
- Performance budget: 60fps on iPhone 12, Draco-compressed GLTF ≤ 800KB per model

### 9.8 Accessibility (non-negotiable)

- **WCAG 2.2 AA minimum, AAA where feasible** — color contrast checked with each token
- Keyboard: სრული navigability კონფიგურატორში (Tab/Shift+Tab + Enter + Space + Arrows for sliders)
- Focus rings: 2px amber outline + 2px offset, always visible — არასოდეს `outline:none` მონაცვლეობის გარეშე
- Screen reader: ALL 3D interactions ALSO available as text controls (radio buttons under the canvas)
- Touch targets: 44×44 px minimum, 48×48 preferred
- Form errors: inline + announced (`aria-live="polite"`), არ მხოლოდ red border
- Skip-links to main content
- Respect `prefers-reduced-motion`, `prefers-color-scheme`, `prefers-contrast`
- ALT text რეალური — "ალუმინის შავი ფანჯარა ბათუმის ბინაში, საღამოს მზე" not "image123.jpg"

### 9.9 Performance Budget (per page)

| Metric | Target | Hard fail |
|---|---|---|
| LCP | < 2.0s | 2.5s |
| INP | < 150ms | 200ms |
| CLS | 0 | 0.05 |
| TTI | < 3.0s | 4.0s |
| JS bundle (initial) | < 180kb gzip | 250kb |
| Image weight (per page) | < 800kb | 1.2mb |
| 3D model | < 800kb Draco | 1.5mb |

**Tools:** Lighthouse CI on every PR, bundle-analyzer report on every release, custom RUM in production.

### 9.10 Voice & Copy (Georgian UX writing)

**Tone:** მშვიდი, თავდაჯერებული, ხელოსნური. არ ვყვირით, არ ვიყენებთ "გრანდიოზული!!!" ან "უმარტივესი ფასი ბაზარზე!!!". ვართ ფაბრიკა — ვაკეთებთ.

**Lexicon:**
- ✅ "შენ" / "თქვენ" — ვინც აწერს (default თქვენ, კონფიგურატორში შენ — ინტიმური)
- ✅ "შენი ფანჯარა" კი არა "თქვენი შეკვეთა"
- ❌ "შეცდომა მოხდა, კიდევ სცადეთ" → ✅ "გავიდა მცირე ხარვეზი. შევეცადოთ თავიდან?"
- ❌ "შეიყვანეთ ნომერი" → ✅ "ტელეფონის ნომერი"
- ❌ "Submit" / "Send" buttons → ✅ "გავაგზავნოთ", "შემოვედი", "მზად ვარ"

**Copy patterns** (use everywhere):
- Empty states have personality: "ჯერ შეკვეთა არ გაქვს — დროა აიწყო პირველი."
- Error messages name the cause AND suggest action
- Confirmation messages name what specifically happened: "შეკვეთა №1234 მიღებულია. რომან 1 საათში დარეკავს."
- ფასი ყოველთვის ცხადია: "სრული, დღგ-ით" ან "მონტაჟის გარეშე"

---

## 10. SEO & Marketing

- **SSG-style prerendering** mainstream გვერდებისთვის (vite-plugin-prerender ან migrate to TanStack Start Phase 2)
- ქართულ ენაზე canonical, hreflang ka/en/ru
- Schema.org: `LocalBusiness`, `Product`, `Offer`, `Review`
- Open Graph + Twitter Card პროდუქტებზე
- Sitemap.xml + robots.txt
- Google Business Profile ინტეგრაცია
- Facebook Pixel + Google Ads conversion tracking (admin-დან გასაშვები/გასათიში — GDPR/cookie banner)
- Blog Phase 2 (SEO content: "როგორ ავირჩიო ფანჯარა?", "ალუმინი თუ PVC?")

---

## 11. უსაფრთხოება, Privacy, Compliance

- Rate limiting (AspNetCoreRateLimit)
- CORS strict
- CSP headers
- Input sanitization (everywhere, especially admin Markdown editor → DOMPurify on render)
- Secrets via .env / Azure Key Vault / dotnet user-secrets (dev)
- DB connection encrypted
- Backups: nightly to Cloud9.ge BATUMSKI ან offsite S3
- GDPR-ready: cookie banner, data export by phone, account deletion request flow
- ფოტოები მომხმარებლისგან: 30 დღის retention, შემდეგ auto-delete (გარდა იმ შემთხვევისა, თუ შეუერთდა შეკვეთას)

---

## 12. Phase Plan

### 🟢 Phase 1 — MVP (8-10 კვირა)

- [x] Project scaffold (backend + frontend)
- [ ] Domain entities + EF migrations
- [ ] Basic public catalog (read-only)
- [ ] Configurator steps 1-4 (type, material, dims manual, basic layout)
- [ ] Simple 2D preview (ცოცხალი 3D Phase 1.5)
- [ ] Pricing calculator (server-side)
- [ ] Order submission + SMS verification
- [ ] Order tracking by phone
- [ ] Admin: orders list, status changes, pricing rules editor
- [ ] Basic warranty page
- [ ] Contact page + map
- [ ] PWA + Georgian-first UX

### 🟡 Phase 1.5 — 3D & AI

- [ ] React Three Fiber integration
- [ ] GLTF models for each product type
- [ ] Color/material switching in 3D
- [ ] Opening animation
- [ ] AI photo dimension estimation (Claude Vision)
- [ ] PDF technical drawing generation (QuestPDF)

### 🟠 Phase 2 — Marketing & Scale

- [ ] AI room visualization (Replicate)
- [ ] Gallery / completed projects CMS
- [ ] Blog
- [ ] Full analytics dashboard
- [ ] Reports + Excel export
- [ ] Multi-language (en, ru)
- [ ] Floating AI assistant chat

### 🔴 Phase 3 — Expansion

- [ ] Second branch (ქუთაისი?) routing logic
- [ ] B2B portal (architects, contractors with bulk pricing)
- [ ] Stripe/TBC integration (deposits)
- [ ] Installer mobile app (assigned orders, photo proof)
- [ ] Loyalty / referral program

---

## 13. Claude Code Project Skills (Superpower Skill Library)

ეს არ არის უბრალო კონვენციების ცხრილი — ეს არის **სრულფასოვანი skill-ბიბლიოთეკა** რომელიც აქცევს Claude Code-ს BEQSAN-ის ექსპერტ თანამშრომლად.

ფაქტობრივი ფაილური სტრუქტურა workspace root-ში:

```
e:\BEQSAN.IVA.GE\
├── CLAUDE.md                          # მთავარი ოპერაციული წესები
├── .claude/
│   └── skills/
│       ├── INDEX.md                   # skill router
│       ├── design-system/SKILL.md
│       ├── configurator-architecture/SKILL.md
│       ├── 3d-scene-design/SKILL.md
│       ├── dotnet-clean-arch/SKILL.md
│       ├── frontend-patterns/SKILL.md
│       ├── georgian-ux/SKILL.md
│       ├── ai-integration/SKILL.md
│       ├── performance-optimization/SKILL.md
│       ├── accessibility/SKILL.md
│       ├── content-voice/SKILL.md
│       ├── testing-strategy/SKILL.md
│       └── deployment-ops/SKILL.md
└── docs/
    ├── kickoff.md                     # ეს დოკუმენტი
    ├── architecture/...
    └── adr/...
```

თითო skill-ფაილის სრული შინაარსი მატერიალიზებულია `.claude/skills/` ქვეშ — ეს დოკუმენტი მათი წყაროა, არა მათი დუბლიკატი.

---

<!-- TRUNCATION MARKER -->
<!--
სესიის შესახებ: კიკოფ მესიჯი truncated-ი იყო 50,000 სიმბოლოს ლიმიტზე §13-ის
performance-optimization skill-ის შუაში. დაკარგული ნაწილი მოიცავდა (სავარაუდოდ):
  - performance-optimization SKILL.md-ის დასასრული
  - accessibility/SKILL.md
  - content-voice/SKILL.md
  - testing-strategy/SKILL.md
  - deployment-ops/SKILL.md
  - .claude/commands/ slash command-ები
  - §14-§17 (სავარაუდოდ: kickoff prompt for Claude Code, glossary, references, etc.)

ეს skill-ფაილები ნაგებია მინიმუმ რაც დოკუმენტში ციტირებულია — როცა Lasha
სრულ ვერსიას მიგვაწოდებს, ჩავცვალოთ.
-->
