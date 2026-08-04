# Night Lore — Researched Paranormal Archive

**Night Lore** (`mynightlore.com`) is an independent, non-fictional paranormal storytelling platform and case file repository built for high-performance organic SEO and Google AdSense trust.

---

## 🛠️ Technology Stack
- **Framework:** Astro v7 (Static prerendering by default, SSR for Cloudflare Pages/Workers API routes)
- **Deployment Adapter:** `@astrojs/cloudflare`
- **Styling:** Tailwind CSS v4 + Vercel SaaS Design Tokens (`@DESIGN.md`)
- **Database:** Cloudflare D1 (`submissions` moderation table)
- **Typography:** Geist Sans (UI/Body) & Geist Mono (Case Metadata/Status Badges)

---

## ⚡ Development & Scripts

| Command | Action | Description |
| :--- | :--- | :--- |
| `npm run dev` | `astro build && astro preview` | **Recommended Local Dev.** Pre-builds static pages and runs Cloudflare's native `workerd` runtime server locally at `http://localhost:4321/`. |
| `npm run dev:hot` | `astro dev` | Runs Vite dev server with Hot Module Replacement (HMR). See Windows dev note below. |
| `npm run build` | `astro build` | Generates static HTML output for all 19 content pages and compiles the `/api/submit` Worker entrypoint. |
| `npm run preview` | `astro preview` | Runs Cloudflare `workerd` local preview server. |

---

## ⚠️ Important Note on Windows Development (`npm run dev` vs `npm run dev:hot`)

### Known Upstream Issue (`@cloudflare/vite-plugin`)
When using `@astrojs/cloudflare` on Windows OS, Vite's dev server integration (`@cloudflare/vite-plugin` v1.50.0) routes dev-mode HTTP requests through Miniflare's `toMiniflareRequest -> _Miniflare.dispatchFetch` IPC wrapper. On Windows Node.js runtimes, IPC/socket loopback dispatch can fail with an internal `fetch failed` error inside `undici`.

### Recommended Solution
- **Default (`npm run dev`)**: We set `npm run dev` to execute `astro build && astro preview`. This uses Cloudflare's production `workerd` binary directly, bypassing the Vite Miniflare middleware and guaranteeing 100% reliable page rendering on Windows.
- **HMR Development (`npm run dev:hot`)**: Use `npm run dev:hot` (`astro dev`) if you specifically require active hot-module reloading during CSS or layout adjustments.

---

## 📂 Content Collections Schema (`src/content.config.ts`)
Each story in `src/content/stories/*.md` contains:
- `title` (string)
- `dek` (one-line summary)
- `category` (*Real Paranormal Cases*, *Country Stories*, *Haunted Places*, *Unsolved Mysteries*, *Urban Legends*, *First-Person Accounts*, *Movie Inspiration*, *Psychology of Fear*)
- `status` (*unresolved*, *witnessed*, *disputed*, *debunked*, *ongoing*)
- `location` (string)
- `eventDate` (string)
- `pubDate` (date)
- `audioUrl` & `audioDuration` (optional ElevenLabs MP3 narration)
- `sources` (array of `{ label, url }` citations)
- `tags` (array of strings)
- `draft` (boolean)
