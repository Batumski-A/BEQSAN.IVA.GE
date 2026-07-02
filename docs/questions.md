# Open Questions

Unresolved domain / infrastructure / business decisions that need Roman or Lasha to weigh in. Update this file as new questions surface and as old ones get answered. Date format: `YYYY-MM-DD (asker → asked)`.

Convention: keep answered questions here for one sprint, then move to `decisions/` (ADR-style) and remove from this list.

---

## 🔴 Blocking (decide before Phase 1 scaffold lands)

_(none currently — all blocking infra calls were delegated to Claude on 2026-05-17. Decisions tracked in `docs/adr/`.)_

---

## 🟡 Should-decide-soon (before Phase 1 polish)

### 12. Real WhatsApp number for the drawing handoff — ✅ ANSWERED 2026-07-02

- 2026-07-02 (Claude → Roman/Lasha): public prices are now off; the configurator CTA sends the customer's drawing + config summary into a WhatsApp chat. Needed the workshop's real WhatsApp-enabled number.
- **Answer (Lasha, 2026-07-02): `+995 593 64 46 73`** — set in `FRONT/apps/web/src/shared/config/contact.ts` and the footer/contact i18n strings (ka/en/ru).

### 5. SMS provider: SMSOffice.ge or Magti?

- 2026-05-17 (Claude → Lasha): both listed. Need API access + tested deliverability before Phase 1 ships.
- Roman likely has a preference based on existing relationship.

### 6. Profile system suppliers (Aluprof, ASAŞ, others)

- 2026-05-17 (Claude → Roman): kickoff §4 lists "Aluprof MB-70, ASAŞ" as examples. Need authoritative list of suppliers + product codes for the `ProfileSystem` table seed data.

### 7. Pricing baselines

- 2026-05-17 (Claude → Roman): the `PricingRule` editor needs starter values for: material × profile per m², color modifiers, glass modifiers, accessory absolute prices, region modifiers. We can seed reasonable placeholders, but real numbers must come from Roman before launch.

### 8. Warranty terms (Markdown content)

- 2026-05-17 (Claude → Roman): the kickoff says "minimum 2 years, configurable from admin". Need the actual legal text — written by Roman or his legal contact.
- 2026-05-18 (Claude → Roman): `/warranty` page now ships with placeholder coverage durations (Al 10y / PVC 5y / IGU 5y / hardware 2y / install 2y) and a 3-step problem-handling flow. The durations are industry-typical for Batumi market but Roman must confirm before launch.

### 8b. Marketing-page placeholder content — needs Roman validation

The Step 9 informational pages (/about, /process, /materials, /warranty, /contact) ship with best-effort placeholder copy that should be reviewed and replaced before launch:

- 2026-05-18 (Claude → Roman): **/about facts** — founding year 1998 (presumed from kickoff), ~620 sites/year, 1100 m² workshop floor, 12-person team. Confirm or supply real numbers.
- 2026-05-18 (Claude → Roman): **/about suppliers** — currently listed as Alumil + Profilco (Al), Rehau (PVC), Hoppe + G-U (hardware), Gori glass facility. If different, supply the real names; they're shown publicly so should not be cost-bearing supplier names that compromise pricing.
- 2026-05-18 (Claude → Roman): **/about founder bio** — Batumi technical college 1995, Roto Frank internship 1996-97, leading workshop since 1998. Pure placeholder — Roman should write 2-3 sentences in first person if preferred.
- 2026-05-18 (Claude → Roman): **/contact phone** — currently placeholder `+995 5XX XX XX XX` everywhere. Real E.164 number needed before launch; affects tel: links, WhatsApp deep links (`wa.me/995XXXXXXXXX`), and Schema.org LocalBusiness JSON-LD.
- 2026-05-18 (Claude → Roman): **/contact email** — `hello@beqsan.ge` placeholder. Confirm or supply alternative; needs MX record set up before launch.
- 2026-05-18 (Claude → Roman): **/contact address** — `სალიბაურის გზა 42, ბათუმი 6000`. Confirm street number + postcode. Coordinates `41.6168 N · 41.6367 E` should also be validated.
- 2026-05-18 (Claude → Roman): **/contact hours** — Mon-Fri 09:00-19:00, Sat 10:00-15:00 by appointment, Sun closed. Confirm.
- 2026-05-18 (Claude → Roman): **/contact directions** — written as "8 km north of central Batumi, blue tin shed with logo". Replace with the way Roman actually gives directions to first-time visitors.
- 2026-05-18 (Claude → Roman): **Real photos** — every page currently uses hand-drawn SVG illustrations because no workshop photos exist. When photos arrive: replace WorkshopIllustrations with `<img>` tags + AVIF/WebP, keep SVGs as fallback for screen readers.
- 2026-05-18 (Lasha decision needed): **interactive map** — `/contact` uses a stylised SVG map with a Google Maps deep link, deliberately avoiding MapLibre/Mapbox (~150 KB JS bundle) to keep per-page budget. If a real embedded map is required, this is a Phase 1.5 decision.

### 9. Admin authentication identity source

- 2026-05-17 (Claude → Roman/Lasha): JWT decided. Question is **who issues the credentials** for Phase 1.
- **Default (decided):** self-contained `Users` table with bcrypt-hashed passwords, seeded with two admins (Lasha + Roman) on first migration. SSO evaluated in Phase 2 if IVA has one.
- 2026-05-18 (Claude → Lasha): the **Social module** (ADR-0003) ships with a `X-Admin-Token` header gate as a Phase-0 interim — needed because the proper JWT flow isn't designed yet. Replace before exposing `admin.beqsan.iva.ge` outside the IVA network.

### 14. Meta App credentials + App Review

- 2026-05-18 (Claude → Roman/Lasha): the Social module needs a registered Meta App on `developers.facebook.com` with `beqsan.iva.ge` as the domain. App Review for `pages_manage_posts`, `pages_messaging`, `instagram_content_publish`, `instagram_manage_messages` is a 1-3 week process and is the **blocker** for everything in ADR-0003 Phase 1.
- Who owns the Meta App identity — BEQSAN LTD (Roman's BIN) or IVA? Probably BEQSAN since the page belongs to BEQSAN; tokens issued under Roman's Business Manager.

### 15. KIE.ai billing account for AI assist

- 2026-05-18 (Claude → Lasha): KIE.ai chat completions endpoint configured at `https://api.kie.ai/v1/chat/completions`, routing to `claude-sonnet-4-6` per ADR-0003. Need a KIE API key (`Social:Ai:ApiKey`). Use the existing IVA-org account, or stand up a BEQSAN-specific one for clean billing?

### 16. Social module: AES-GCM key custody

- 2026-05-18 (Claude → Lasha): `Social:Encryption:Key` (base64 32-byte AES-256) protects all Meta tokens at rest. In dev it'll live in `dotnet user-secrets`; in prod, where? Azure Key Vault, BATUMSKI env var, a file on the host? Lasha to pick before Phase 1 ships outside dev.

---

## 🟢 Background (Phase 2+)

### 10. AI room-visualization provider — Replicate vs Black Forest Labs direct

- Decide closer to Phase 2 based on quality + cost benchmarks against real photos.

### 11. Multi-language launch order: en + ru together, or en first?

- Russian content useful for Batumi tourist-property buyers; English helps SEO. Roman's call.

### 12. PWA install prompt timing

- Show immediately vs. after first configurator completion? UX-test in Phase 2.

### 13. Stripe / TBC integration scope

- Deposits-only? Full price? Pay-on-completion? Phase 3 decision.

---

## ✅ Recently answered

(none yet)
