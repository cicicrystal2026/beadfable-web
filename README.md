# BeadFable

Turn any photo into a chibi-style fuse bead pattern — with an exact,
bead-by-bead shopping list (BOM), affiliate purchase links, and a $19.9
exact-count Bead Kit pre-order to validate demand.

Product requirements: [docs/PRD.md](docs/PRD.md) (中文) ·
Design spec: [docs/design-spec.md](docs/design-spec.md) ·
Competitor teardown: [docs/competitor-pindou-planet.md](docs/competitor-pindou-planet.md)

## Routes

| Route | What |
|---|---|
| `/` | Landing + free Pattern Studio |
| `/ai` | AI Chibi Studio (stylize → preview → HD gate, first one free) |
| `/p/#<data>` | Shared pattern page — pattern is encoded in the URL fragment, zero backend |
| `/pricing` | Free / $0.99 per pattern / $4.99 Unlimited + kit banner |
| `/design/` | V1.1 hi-fi design previews (internal) |
| `POST /api/stylize` | Worker proxy to the image-AI provider |

## Stack

Cloudflare Worker (`src/worker.js`) serving static assets from `public/`
plus the `/api/stylize` route. The photo → pattern engine
(`public/engine.js`, exposed as `BeadEngine`) runs entirely in the browser:
cover-crop downscale → sRGB→Lab → nearest bead color (CIE76) →
color-budget merge → numbered grid / bead-ring rendering, exact bead
counts, PNG sheet export, and a URL-fragment share codec (RLE + base64url).

## Develop

```sh
npx wrangler dev      # local preview at http://localhost:8787
npx wrangler deploy   # deploy to Cloudflare
```

No build step; edit files under `public/` directly.
(Static-only smoke testing also works: `python3 -m http.server -d public` —
`/api/stylize` will 404, which the AI page treats as "engine not live".)

## Configuration

- `public/config.js` — the only file to edit before launch:
  - `affiliateTag`: real Amazon Associates tag (placeholder `beadfable-20`)
  - `stripeKitUrl` / `stripePatternUrl` / `stripeUnlimitedUrl`: Stripe
    Payment Links; while empty, all paid buttons fall back to email capture
- AI provider key (enables `/api/stylize`):
  `npx wrangler secret put OPENAI_API_KEY`
- Redeem codes for /zh/ HD downloads (Xiaohongshu virtual goods):
  `npx wrangler secret put REDEEM_SECRET`, then generate codes with
  `node tools/gen-codes.mjs <same-secret> <count> [days=30]` and paste
  them into the store's auto-delivery. Until the secret is set, /zh/
  downloads stay free with no paywall traces.

## Before launch

- Replace the placeholder affiliate tag in `public/config.js`.
- Create Stripe Payment Links and fill them into `public/config.js`.
- Set the `OPENAI_API_KEY` secret to turn on the AI Chibi Studio.
- Calibrate `public/palettes.js` hex values against physical Perler beads
  (PRD §10.3).
- Add `/terms`, `/privacy`, `/dmca` text pages (PRD W2).
