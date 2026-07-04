# BeadFable

Turn any photo into a chibi-style fuse bead pattern — with an exact,
bead-by-bead shopping list (BOM), affiliate purchase links, and a $19.9
exact-count Bead Kit pre-order to validate demand.

Product requirements: [docs/PRD-V1.md](docs/PRD-V1.md) (中文).

## Stack

Static site served by Cloudflare Workers assets. The photo → pattern engine
runs entirely in the browser (`public/app.js`): cover-crop downscale →
sRGB→Lab → nearest bead color (CIE76) → color-budget merge → numbered grid,
legend and exact bead counts.

## Develop

```sh
npx wrangler dev      # local preview at http://localhost:8787
npx wrangler deploy   # deploy to Cloudflare
```

No build step; edit files under `public/` directly.

## Before launch

- Replace the `beadfable-20` placeholder Amazon Associates tag in
  `public/app.js` and `public/index.html`.
- Calibrate `public/palettes.js` hex values against physical Perler beads
  (PRD §9).
- Swap the pre-order mailto flow for a Stripe Payment Link (PRD milestone W2).
