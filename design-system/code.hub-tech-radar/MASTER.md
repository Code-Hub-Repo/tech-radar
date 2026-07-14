# Code.Hub Tech Radar — Design System

> Visual source of truth for all UI work on this project. Page-specific deviations,
> if ever needed, live in `design-system/pages/[page-name].md` and override this file.

---

**Project:** Code.Hub Tech Radar
**Author:** Giorgos Vergidis
**Last updated:** 2026-07-14
**Category:** Developer Tools / Data Visualization

---

## Global Rules

### Color Palette

Brand constraint (non-negotiable, from the Code.Hub implementation plan): primary accent `#f97316`, dark base `#1a1a1a`. Warm neutral darks — never slate/blue-tinted grays.

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background | `#1a1a1a` | `--color-background` |
| Surface (cards, panels) | `#232323` | `--color-surface` |
| Surface raised (modals, popovers) | `#2c2c2c` | `--color-surface-raised` |
| Foreground | `#fafafa` | `--color-foreground` |
| Muted text | `#a1a1aa` | `--color-muted` |
| Border | `#3a3a3a` | `--color-border` |
| Accent / CTA | `#f97316` | `--color-accent` |
| Accent hover | `#ea580c` | `--color-accent-hover` |
| On Accent | `#1a1a1a` | `--color-on-accent` |
| Destructive | `#ef4444` | `--color-destructive` |
| Success | `#22c55e` | `--color-success` |
| Focus ring | `#f97316` | `--color-ring` |

**On-accent is near-black, not white:** `#1a1a1a` on `#f97316` ≈ 6.6:1 (AA pass); white on orange fails contrast.

### Radar Semantic Colors (ring verdicts)

Blips are colored by **ring** (the adoption verdict). Orange is reserved for Adopt — the brand literally marks what Code.Hub backs. Hold is dimmest by design.

| Ring | Hex | CSS Variable | Contrast on #1a1a1a |
|------|-----|--------------|---------------------|
| Adopt | `#f97316` | `--ring-adopt` | ≈ 6.6:1 |
| Trial | `#38bdf8` | `--ring-trial` | ≈ 8.1:1 |
| Assess | `#a78bfa` | `--ring-assess` | ≈ 6.2:1 |
| Hold | `#9ca3af` | `--ring-hold` | ≈ 6.6:1 |

Hold stays the *least saturated* color (semantic de-emphasis comes from grayness, not low contrast — it must survive the dimmed filter state below).

Ring guide circles on the radar: `#2e2e2e` strokes (subtle, gridline-level). Quadrant labels: muted text. Never rely on color alone — ring is also encoded by radial position, legend, and text labels.

### Typography

- **Headings / body:** Fira Sans (300–700)
- **Data / labels / nav / blip numbers / code:** Fira Code (400–700) — monospace accents are on-brand for "Code".Hub
- **Mood:** dashboard, data, technical, precise
- **Google Fonts:** [Fira Code + Fira Sans](https://fonts.google.com/share?selection.family=Fira+Code:wght@400;500;600;700|Fira+Sans:wght@300;400;500;600;700)
- Base size 16px, line-height 1.5–1.75 body, tabular figures for data columns.

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

Dark theme: elevation communicated mostly via surface lightness steps (`#1a1a1a → #232323 → #2c2c2c`) + subtle shadows.

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` | Subtle lift |
| `--shadow-md` | `0 4px 8px rgba(0,0,0,0.45)` | Cards, dropdowns |
| `--shadow-lg` | `0 10px 20px rgba(0,0,0,0.5)` | Modals, side panel |
| `--glow-accent` | `0 0 12px rgba(249,115,22,0.35)` | isNew blip halo, focus emphasis |

---

## Component Specs

### Buttons

```css
.btn-primary {
  background: #f97316;
  color: #1a1a1a;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: background-color 200ms ease, transform 150ms ease;
  cursor: pointer;
}
.btn-primary:hover { background: #ea580c; }
.btn-primary:active { transform: scale(0.98); }

.btn-secondary {
  background: transparent;
  color: #fafafa;
  border: 1px solid #3a3a3a;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: border-color 200ms ease, background-color 200ms ease;
  cursor: pointer;
}
.btn-secondary:hover { border-color: #f97316; background: rgba(249,115,22,0.08); }
```

### Cards

```css
.card {
  background: #232323;
  border: 1px solid #3a3a3a;
  border-radius: 12px;
  padding: 24px;
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
.card:hover { border-color: rgba(249,115,22,0.5); box-shadow: var(--shadow-md); }
```

### Inputs

```css
.input {
  background: #232323;
  color: #fafafa;
  padding: 12px 16px;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
.input::placeholder { color: #a1a1aa; }
.input:focus {
  border-color: #f97316;
  outline: none;
  box-shadow: 0 0 0 3px rgba(249,115,22,0.25);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}
.modal {
  background: #2c2c2c;
  border: 1px solid #3a3a3a;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-lg);
  max-width: 500px;
  width: 90%;
}
```

### Radar Blips

```css
.blip {
  /* SVG circle, r=9 desktop; hit area extended to >=22px radius via transparent overlay circle */
  cursor: pointer;
  transition: opacity 200ms ease;
}
.blip--dimmed { opacity: 0.35; }          /* when filtered out — 0.25 made Hold labels illegible; verify contrast in the DIMMED state, not just resting */
.blip--new { filter: drop-shadow(var(--glow-accent)); } /* plus animated pulse ring, disabled under prefers-reduced-motion */
.blip:focus-visible { outline: none; stroke: #f97316; stroke-width: 2.5; }
```

### Movement indicators (ring changes)

An entry whose ring changed within the movement window (90 days) renders a small directional notch on the blip: pointing **toward center** = moved in (toward Adopt), **away from center** = moved out. `isNew` takes precedence — a new entry never also shows a movement notch. Never color-only: the legend explains both markers, and the detail panel/list state it in text ("Moved in from Trial · May 2026").

```css
.blip__notch--in  { fill: currentColor; }  /* triangle apex toward radar center */
.blip__notch--out { fill: currentColor; }  /* triangle apex away from center */
```

---

## Style Guidelines

**Style:** Dark Mode (OLED) — single theme, no light mode. Deep warm blacks, high readability, minimal orange glow used only for meaning (isNew, focus, active states).

**Key Effects:** surface-lightness elevation, subtle accent glow for `isNew`, 150–300ms transitions, visible focus rings everywhere.

### Page Pattern — Public Radar (`/`)

1. **Header:** Code.Hub logo + "Tech Radar" title (Fira Code), search input, GitHub/admin link.
2. **Toolbar:** quadrant filter chips + ring filter chips + "New only" toggle — colored to match radar semantics, `aria-pressed` states.
3. **Main split:** radar SVG (left, ~60%) + detail side panel (right, ~40%; slides in on blip select). Desktop ≥1024px.
4. **Below radar:** legend explaining the four rings, then grouped list view (quadrant → ring → entries) — always rendered; it is the accessible/SEO representation of the same data.
5. **Mobile (<768px):** radar becomes compact overview (non-primary), list view is primary; detail panel becomes bottom sheet.

### Page Pattern — Admin (`/admin`)

Data-table CRUD: toolbar (add entry button), sortable/filterable table, row actions (edit, delete + confirm dialog), modal form with inline validation on blur, error messages below fields, loading states on submit buttons.

---

## Anti-Patterns (Do NOT Use)

- ❌ Slate/blue-tinted grays (brand darks are warm neutral)
- ❌ White text on orange buttons (fails contrast — use `#1a1a1a`)
- ❌ Orange for anything other than Adopt/accent semantics (dilutes meaning)
- ❌ Generic design / no immersion
- ❌ **Emojis as icons** — Use SVG icons (Lucide)
- ❌ **Missing cursor:pointer** on clickables
- ❌ **Layout-shifting hovers** — no scale transforms that shift layout
- ❌ **Low contrast text** — 4.5:1 minimum for text, 3:1 for UI glyphs
- ❌ **Instant state changes** — always 150–300ms transitions
- ❌ **Invisible focus states**
- ❌ Hover-only interactions — every blip interaction must work via click/tap/keyboard

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (Lucide SVG only, one stroke width)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150–300ms)
- [ ] Text contrast 4.5:1 minimum on `#1a1a1a`/`#232323` surfaces
- [ ] Focus states visible for keyboard navigation; blips tabbable
- [ ] `prefers-reduced-motion` respected (isNew pulse, panel slide)
- [ ] Responsive: 375px, 768px, 1024px, 1440px — no horizontal scroll
- [ ] Radar has a text/list equivalent (screen-reader + mobile primary)
- [ ] Touch targets ≥44px (blip hit areas extended beyond visual dot)
- [ ] No content hidden behind fixed header
