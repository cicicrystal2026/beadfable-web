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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/stylize") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      return stylize(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
