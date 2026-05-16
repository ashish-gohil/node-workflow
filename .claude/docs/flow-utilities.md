# FLOW custom utility classes

Defined in `apps/frontend/app/globals.css` as `@utility` classes. Use as plain Tailwind classes, no prefix needed.

## Surfaces

| Class             | What it does                                           |
|-------------------|--------------------------------------------------------|
| `card-surface`    | Elevated bg + 1.5px border-stamp + 2px hard shadow     |
| `overlay-surface` | Elevated bg + 1.5px border-stamp + 3px hard shadow     |

## Stamp button states

| Class                   | What it does                            |
|-------------------------|-----------------------------------------|
| `btn-stamp`             | Base Swiss hard-shadow button           |
| `btn-stamp-hover`       | Translate (1,1) + shrink shadow         |
| `btn-stamp-active`      | Translate (2,2) + remove shadow         |
| `btn-stamp-primary`     | Accent background + text                |
| `btn-stamp-primary-hover` | Accent hover background              |
| `btn-stamp-ghost`       | Transparent + no shadow                 |
| `btn-stamp-ghost-hover` | Faint bg + stronger border              |
| `stamp-lg`              | 6px hard shadow (CTA / hero)            |
| `stamp-xl`              | 8px hard shadow (hero highlight)        |

## Layout

| Class                    | What it does                  |
|--------------------------|-------------------------------|
| `section-container`      | Max 1280px centered container |
| `section-container-wide` | Max 1440px centered container |
| `rounded-node`           | 4px radius (workflow nodes only) |

## Marketing / landing

| Class              | What it does                             |
|--------------------|------------------------------------------|
| `bento-card`       | Marketing card with hard-shadow hover    |
| `bento-card-hover` | Lifts card (-1,-1) + expands shadow      |
| `landing-eyebrow`  | Uppercase eyebrow label (brand color)    |
| `terminal-surface` | Dark terminal with mono font             |
| `cta-panel`        | Deep dark bg (dark: near-black, light: forest) |
