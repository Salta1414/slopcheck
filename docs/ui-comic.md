# UI Style — Comic (rund & squishy)

## Direction

**Comic / cartoon SaaS** — freundlich, rund, leicht „drückbar“ (squishy), nicht corporate, nicht purple-gradient AI-default.

Die Ironie: Wir verkaufen Anti-AI-Slop, unser eigenes UI darf **bewusst charactervoll** sein — nicht generic AI-template.

## Principles

1. **One composition** auf dem Hero — Brand groß, eine Headline, ein Satz, ein CTA, eine dominante Illustration
2. **Keine Cards im Hero**
3. **Runde Formen** überall: große Radii, blob-shapes, dicke Outlines
4. **Squishy Motion** — Buttons/Inputs federn leicht (scale + squash), nicht Glow-Spam
5. **Klare Farben**, wenig Gradienten-Brei

## Visual Tokens (Vorschlag)

```css
:root {
  /* Base — warm comic paper, nicht cream-terracotta-Klischee */
  --bg: #FFF8F0;
  --ink: #1A1523;
  --panel: #FFFFFF;

  /* Accent — electric mint + punchy coral (comic, nicht purple) */
  --accent: #2EE6A6;
  --accent-2: #FF5A7A;
  --accent-3: #FFE566;

  /* Shape */
  --radius-sm: 16px;
  --radius-md: 28px;
  --radius-lg: 40px;
  --radius-pill: 999px;

  /* Outline (comic ink) */
  --stroke: 3px solid var(--ink);
  --shadow-squish: 4px 6px 0 var(--ink);
}
```

## Typography

- Display: etwas Expressives (z.B. **Nunito**, **Fredoka**, **Softie**-ähnliche Rounded Sans) — **nicht** Inter/Roboto/Arial
- Body: lesbare rounded sans
- Headlines dürfen leicht „bouncy“ wirken (tracking, weight 800)

## Components

| Element | Look |
|---------|------|
| Buttons | Dicke Outline, Offset-Shadow, hover: translateY(2px) + shadow schrumpft (press) |
| Inputs | Großer Radius, dicke Border, focus = Accent-Ring squish |
| Score Meter | Comic-Thermometer / Blob-Gauge, nicht flat progress bar |
| Report | Sprechblasen / „Panel“-Blöcke statt Card-Grid |
| Empty / Loading | Charakter-Mascot (optional später) |

## Motion Budget (min. 2–3)

1. Hero CTA: idle micro-bounce
2. Score Reveal: count-up + squash-in
3. Page transitions / result panels: slide-squish

## Anti-Patterns (bewusst vermeiden)

- Purple-on-white / indigo gradients
- Glassmorphism + multi-layer shadows
- Pill-chip-Spam, Stat-Strips im Hero
- Generisches „AI SaaS Dashboard“-Feeling
- Inset Hero-Images in rounded Media-Cards

## Brand Test

Wenn man die Nav entfernt: muss klar **Slopcheck** sein — Name/Logo hero-level, nicht nur Eyebrow.
