# Product

## One-liner

Leute geben eine Website-URL ein. Wir bewerten, ob die **UI wie AI-Slop** aussieht — und verkaufen danach Hilfe (Prompts + konkrete Fixes) für **€5**.

## Selling Point

Nicht nur „ja, das ist Slop“. Sondern:

- klarer **Slop-Score** (0–100)
- konkrete **Red Flags** (was genau fake/generic wirkt)
- **Copy-paste Prompts** für Cursor / v0 / Lovable / Claude, um es zu fixen

## User Journey

1. Landing (comic, squishy) — **Hero = Test** (URL-Feld oben)
2. URL rein **ohne Account** → Preeval → Score in **localStorage**
3. Result: großer UI-Score + Teaser-Flags + **blurred** Findings
4. CTA: Sign up / Log in (Clerk) → Guest-Scan wird nach Convex **geclaimt/überschrieben**
5. CTA: „Full Review für €5“
6. Stripe Checkout (hosted)
7. Zurück → Full Report unlocked (Convex)
8. History unter dem Account

## Pricing

| Item | Preis |
|------|-------|
| Preeval (Homepage, 1 Viewport) | gratis |
| Full UI Review + Fix-Prompts | **€5 einmalig** |

Später optional: Packs (5 Scans), Team, Re-scan nach Fix.

## Scope (MVP)

**In:**
- Desktop Homepage Screenshot (+ optional Mobile)
- UI-fokussierte Bewertung (Layout, Typo, Farbe, Cards, Hero, generische Patterns)
- DE/EN Output

**Out (erstmal):**
- SEO / Content-Qualität / Performance-Audit
- Multi-Page Crawl der ganzen Site
- Automatisches Redesign (wir geben Prompts, bauen nicht um)

## Success Metric

- Preeval → Pay Conversion
- „Fühlt sich fair an“ Feedback zur Rubrik
- Report wird geteilt / nochmal genutzt
