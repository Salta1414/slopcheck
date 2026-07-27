# Scoring Rubric — AI Slop UI

Ziel: **nachvollziehbare**, wiederholbare Bewertung. Nicht „vibes only“.

Score: **0–100** (höher = mehr Slop).

## Dimensions (gewichtet)

| Dimension | Gewicht | Was wir checken |
|-----------|---------|-----------------|
| **Generic Visual Language** | 25% | Purple/indigo gradients, Inter-look, soft blur cards, glow, identical SaaS chrome |
| **Hero / First Viewport** | 20% | Vague headline, stock-feeling illustration, chip-spam, no brand presence |
| **Layout Patterns** | 15% | 3-card feature grid, logo cloud, fake metrics row, testimonial carousel template |
| **Typography & Hierarchy** | 15% | Flat hierarchy, same weight everywhere, no character |
| **Color & Atmosphere** | 10% | Flat single-color OR default AI gradient soup; no intentional palette |
| **Imagery** | 10% | Abstract blobs as „product“, inset rounded media cards, no real context |
| **Interaction Affordance** | 5% | Everything looks clickable/nothing does; decorative pills |

## Score Bands

| Score | Label | Bedeutung |
|-------|-------|-----------|
| 0–20 | Fresh | Stark branded, intentional, human taste |
| 21–40 | Mostly original | Kleine Template-Spuren |
| 41–60 | Mixed | Teilweise generisch |
| 61–80 | Likely Slop | Klassische AI-UI Patterns |
| 81–100 | Peak Slop | Copy-paste AI landing |

## Red Flag Catalog (Beispiele)

- Hero könnte zu jeder anderen Marke gehören
- „Build faster with AI“-Energy ohne konkreten Offer
- Feature-Section als 3 gleiche Cards mit Lucide-Icons
- Stat strip: `10x` / `99%` / `24/7` ohne Kontext
- Testimonial avatars + generische Quotes
- Excessive border-radius + multi-shadow stacks
- Purple→indigo mesh background
- Pill badge: „New“ / „AI-powered“ über allem

## Fairness Rules

1. **Design systems ≠ Slop.** Sauberes shadcn allein ist kein Fail — **Generizität + fehlende Brand-Stimme** schon.
2. **Minimalism ≠ Slop.** Sparse kann intentional sein.
3. **Preeval = Estimate.** Full Review darf ±15 Punkte abweichen; UI kommuniziert das.
4. Immer **Evidence** nennen (was auf dem Screenshot sichtbar ist).

## Output Contract

Jeder Finding braucht:

- `area` (hero / nav / features / typography / color / imagery)
- `severity` (low / medium / high)
- `issue` (kurz)
- `whyItFeelsAi` (1 Satz)
- `fixHint` (konkret)

Prompts erst in **Full Review** — Preeval spoiler-frei halten.
