/* BeadFable Worker — serves static assets and the AI stylize API.
 *
 * POST /api/stylize  { image: dataURL, style: "chibi"|"bighead"|"toon"|"faithful", custom?: string }
 *   → 200 { image: dataURL }        stylized result
 *   → 503 { error: "ai_not_configured" }  when no OPENAI_API_KEY secret is set
 *
 * Setup: npx wrangler secret put OPENAI_API_KEY
 */

const STYLE_PROMPTS = {
  chibi:
    "Redraw the main subject of this photo as an adorable chibi character: " +
    "huge head, tiny body, big sparkly eyes.",
  bighead:
    "Redraw the main subject of this photo as a cute big-head portrait " +
    "caricature: oversized head, small shoulders, friendly expression.",
  toon:
    "Redraw the main subject of this photo as a bold cartoon character with " +
    "thick clean outlines and flat colors.",
  faithful:
    "Simplify this photo into a clean illustrated version of the same subject, " +
    "keeping the likeness recognizable."
};

const STYLE_SUFFIX =
  " Flat colors only, no gradients, no shading, simple shapes, thick outlines, " +
  "plain solid white background, at most 12 distinct colors — it will be turned " +
  "into a fuse-bead pixel pattern.";

const MAX_BODY_BYTES = 6 * 1024 * 1024;

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json" }
  });
}

function dataUrlToBlob(dataUrl) {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: m[1] });
}

async function stylize(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: "ai_not_configured" }, 503);

  const len = parseInt(request.headers.get("content-length") || "0", 10);
  if (len > MAX_BODY_BYTES) return json({ error: "image_too_large" }, 413);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "bad_request" }, 400);
  }

  const prompt = STYLE_PROMPTS[body.style];
  if (!prompt || typeof body.image !== "string") return json({ error: "bad_request" }, 400);
  const blob = dataUrlToBlob(body.image);
  if (!blob) return json({ error: "bad_image" }, 400);

  const custom =
    typeof body.custom === "string" && body.custom.trim()
      ? ` Additional request from the user: ${body.custom.trim().slice(0, 200)}.`
      : "";

  const fd = new FormData();
  fd.append("model", "gpt-image-1");
  fd.append("image", blob, "photo.png");
  fd.append("prompt", prompt + custom + STYLE_SUFFIX);
  fd.append("size", "1024x1024");

  const upstream = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: fd
  });

  if (!upstream.ok) {
    const detail = await upstream.text();
    console.log("stylize upstream error", upstream.status, detail.slice(0, 500));
    return json({ error: "ai_failed" }, 502);
  }

  const result = await upstream.json();
  const b64 = result.data && result.data[0] && result.data[0].b64_json;
  if (!b64) return json({ error: "ai_failed" }, 502);
  return json({ image: `data:image/png;base64,${b64}` });
}

/* ---------- redeem codes (Xiaohongshu virtual-goods unlock) ----------
 * Codes are HMAC-signed, no database needed. Generate with:
 *   node tools/gen-codes.mjs <REDEEM_SECRET> <count> [days]
 * Enable by setting the same secret here:
 *   npx wrangler secret put REDEEM_SECRET
 * Code layout (10 bytes, Crockford base32, BF-XXXX-XXXX-XXXX-XXXX):
 *   [version=1][planDays][issueDay lo][issueDay hi][rand][rand][sig x4]
 * issueDay = days since 2026-01-01; activation window 365 days.
 */
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function normalizeCode(s) {
  s = s.toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1").replace(/[^0-9A-Z]/g, "");
  // strip the "BF" brand prefix (its letters are valid base32 and would
  // otherwise be decoded as data)
  if (s.length === 18 && s.startsWith("BF")) s = s.slice(2);
  return s;
}

function b32decode(s) {
  let bits = 0, value = 0;
  const out = [];
  for (const ch of s) {
    const idx = B32.indexOf(ch);
    if (idx < 0) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

async function redeem(request, env) {
  if (!env.REDEEM_SECRET) return json({ error: "redeem_not_configured" }, 501);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  const bytes = typeof body.code === "string" ? b32decode(normalizeCode(body.code)) : null;
  if (!bytes || bytes.length !== 10 || bytes[0] !== 1) {
    return json({ ok: false, error: "invalid_code" }, 400);
  }

  const payload = bytes.slice(0, 6);
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env.REDEEM_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, payload));
  for (let i = 0; i < 4; i++) {
    if (mac[i] !== bytes[6 + i]) return json({ ok: false, error: "invalid_code" }, 400);
  }

  const issueDay = bytes[2] | (bytes[3] << 8);
  const nowDay = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 86400000);
  if (nowDay - issueDay > 365 || issueDay - nowDay > 2) {
    return json({ ok: false, error: "expired_code" }, 400);
  }

  return json({ ok: true, days: bytes[1] });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/stylize") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      return stylize(request, env);
    }
    if (url.pathname === "/api/redeem") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      return redeem(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
