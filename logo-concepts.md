# Night Lore — Logo & Favicon Concept Proposals

Below are **3 distinct, non-cliché concept directions** for the new Night Lore visual identity. All concepts adhere strictly to the **DESIGN.md** system: Vercel monochrome canvas (`#000000` / `#09090b`), warm ember glow accent (`#ff6b4a`), and crisp geometry that scales down cleanly to a 16x16px favicon.

---

### Concept 1: "The Luminous Aperture" (Observation & Investigation Lens)

> **Design Rationale**: A precision outer aperture ring featuring a warm ember arc (`#ff6b4a`) cradling a glowing central focal point. Evokes scientific observation, field documentation, and bringing light to unexplored darkness without using campy horror tropes.

```xml
<!-- Favicon / Icon Mark (32x32 ViewBox) -->
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="13" stroke="#27272a" stroke-width="2.5"/>
  <path d="M 16 3 A 13 13 0 0 1 29 16" stroke="#ff6b4a" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="4" fill="#ff6b4a"/>
</svg>
```

**Header Lockup Preview**:
- **Icon**: 28x28px Luminous Aperture
- **Wordmark**: `NIGHT LORE` in Geist Sans (Bold, 15px, `#ffffff`, 0.05em tracking)

---

### Concept 2: "The Ecliptic Monogram N" (Letter N + Eclipse Arc)

> **Design Rationale**: A crisp, geometric letter "N" intersected by a sweeping eclipse arc in warm ember (`#ff6b4a`). Combines instant brand recognition (the initial "N") with the astronomical motif of a dark eclipse revealing a hidden light source.

```xml
<!-- Favicon / Icon Mark (32x32 ViewBox) -->
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M 4 25 C 9 9 23 5 28 9" stroke="#ff6b4a" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 7 25 V 7 L 25 25 V 7" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**Header Lockup Preview**:
- **Icon**: 28x28px Ecliptic Monogram N
- **Wordmark**: `NIGHT LORE` in Geist Sans (Bold, 15px, `#ffffff`, 0.05em tracking)

---

### Concept 3: "The Horizon Beacon" (Signal in the Dark / Zenith Compass)

> **Design Rationale**: A minimal 4-axis zenith reticle with ember crosshair ticks (`#ff6b4a`) framing a glowing central beacon. Symbolizes navigation, field investigation, and detecting faint signals in the dark.

```xml
<!-- Favicon / Icon Mark (32x32 ViewBox) -->
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M 16 3 L 29 16 L 16 29 L 3 16 Z" stroke="#27272a" stroke-width="2" stroke-linejoin="round"/>
  <path d="M 16 5 V 10 M 16 22 V 27 M 5 16 H 10 M 22 16 H 27" stroke="#ff6b4a" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="3.5" fill="#ff6b4a"/>
</svg>
```

**Header Lockup Preview**:
- **Icon**: 28x28px Horizon Beacon
- **Wordmark**: `NIGHT LORE` in Geist Sans (Bold, 15px, `#ffffff`, 0.05em tracking)

---

### Favicon 16x16px Readability Benchmark

| Concept | Stroke Thickness at 16px | Visual Contrast against `#000000` | Scalability Rating |
| :--- | :--- | :--- | :--- |
| **Concept 1: Luminous Aperture** | 2.5px ring + 4px solid dot | Exceptional (solid ember core stands out clearly) | 10/10 |
| **Concept 2: Ecliptic Monogram N** | 2.5px white diagonal + ember arc | High (letter N is distinct) | 9/10 |
| **Concept 3: Horizon Beacon** | 2.5px crosshairs + 3.5px core dot | High (4-point crosshair is sharp) | 9.5/10 |

---

### Please Select Your Preferred Direction

Once you review these proposals, let me know which concept you prefer (or if you'd like any adjustment to one of them). 

As soon as you choose:
1. I will generate all full-resolution asset files in `/public/`:
   - `favicon.svg` (primary scalable SVG)
   - `favicon-32x32.png` and `favicon-16x16.png` (raster fallbacks)
   - `apple-touch-icon.png` (180x180 for iOS)
2. I will update `<head>` in [`src/layouts/Layout.astro`](file:///d:/MyWeb/Night%20Lore/src/layouts/Layout.astro) with all proper `rel="icon"` and `apple-touch-icon` links.
3. I will update `SiteHeader` with the new logo mark and lockup.
