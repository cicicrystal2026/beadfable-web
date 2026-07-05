/* AI Chibi Studio — upload → /api/stylize → pattern preview → HD gate.
 * First HD download is free (soft local gate, PRD D9); afterwards the
 * paywall offers per-pattern or Unlimited via BF_CONFIG Stripe links,
 * falling back to email capture while Stripe isn't wired.
 */
(function () {
  "use strict";

  const CFG = window.BF_CONFIG;
  const FREE_FLAG = "bf_first_hd_used";
  const BOARD = 29, MAX_COLORS = 12, RETRIES = 2;

  const $ = (id) => document.getElementById(id);
  const states = {
    empty: $("stateEmpty"), loading: $("stateLoading"),
    down: $("stateDown"), ready: $("stateReady")
  };

  let photo = null;        // { dataUrl, name }
  let stylized = null;     // HTMLImageElement
  let pattern = null;
  let retriesLeft = RETRIES;

  function setState(name) {
    Object.keys(states).forEach((k) => states[k].classList.toggle("active", k === name));
  }

  // ---------- style thumbnails ----------
  const CAT = [
    "..K......K..", ".KOK....KOK.", ".KOOKKKKOOK.", ".KOOOOOOOOK.",
    "KOOWKOOWKOOK", "KOOKKOOKKOOK", "KOOOOOOOOOOK", "KOOPKOOKPOOK",
    ".KOOKKKKOOK.", ".KOOOOOOOOK.", "..KKKKKKKK..", "....K..K...."
  ];
  const PALS = {
    chibi:    { K: "#362f2d", O: "#f2b658", W: "#ffffff", P: "#ff6ea2" },
    bighead:  { K: "#5a3b31", O: "#fedcb9", W: "#362f2d", P: "#ff9e8d" },
    toon:     { K: "#2a3b7f", O: "#f6df35", W: "#ffffff", P: "#ff4a54" },
    faithful: { K: "#57595b", O: "#d8a373", W: "#f8f8f8", P: "#c22d33" }
  };
  document.querySelectorAll(".stylecard").forEach((card) => {
    const cv = card.querySelector("canvas"), ctx = cv.getContext("2d");
    const pal = PALS[card.dataset.style], cell = cv.width / CAT.length;
    CAT.forEach((row, y) => row.split("").forEach((ch, x) => {
      if (ch === ".") return;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
    }));
    card.addEventListener("click", () => {
      document.querySelectorAll(".stylecard").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
    });
  });

  function selectedStyle() {
    return document.querySelector(".stylecard.selected").dataset.style;
  }

  // ---------- upload ----------
  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => {
      // downscale to ≤768px before sending to the API
      const s = Math.min(1, 768 / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.naturalWidth * s);
      cv.height = Math.round(img.naturalHeight * s);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      photo = { dataUrl: cv.toDataURL("image/png"), name: file.name };
      $("photoThumb").src = photo.dataUrl;
      $("photoName").textContent = file.name;
      $("aiDrop").hidden = true;
      $("photoRow").hidden = false;
      $("genBtn").disabled = false;
      retriesLeft = RETRIES;
      updateRetry();
    };
    img.src = URL.createObjectURL(file);
  }

  $("aiFile").addEventListener("change", (e) => loadFile(e.target.files[0]));
  $("aiDrop").addEventListener("click", () => $("aiFile").click());
  $("aiDrop").addEventListener("dragover", (e) => { e.preventDefault(); $("aiDrop").classList.add("dragging"); });
  $("aiDrop").addEventListener("dragleave", () => $("aiDrop").classList.remove("dragging"));
  $("aiDrop").addEventListener("drop", (e) => {
    e.preventDefault();
    $("aiDrop").classList.remove("dragging");
    loadFile(e.dataTransfer.files[0]);
  });
  $("swapBtn").addEventListener("click", () => {
    $("photoRow").hidden = true;
    $("aiDrop").hidden = false;
    $("genBtn").disabled = true;
    photo = null;
  });

  // ---------- generate ----------
  async function generate() {
    if (!photo) return;
    setState("loading");
    $("genBtn").disabled = true;
    try {
      const r = await fetch("/api/stylize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          image: photo.dataUrl,
          style: selectedStyle(),
          custom: $("customReq").value
        })
      });
      if (!r.ok) throw new Error("stylize_" + r.status);
      const data = await r.json();
      stylized = await loadImage(data.image);
      pattern = BeadEngine.convert(stylized, BOARD, MAX_COLORS);
      const cell = Math.max(8, Math.floor(560 / pattern.size));
      BeadEngine.drawBeads($("resultPreview"), pattern, cell);
      renderMeta(pattern);
      updateHdHint();
      setState("ready");
    } catch (e) {
      setState("down");
    } finally {
      $("genBtn").disabled = !photo;
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function renderMeta(p) {
    const total = p.used.reduce((s, u) => s + u.count, 0);
    const brand = BeadEngine.getBrand(p.brand).name;
    $("resultMeta").innerHTML =
      `<span class="meta-chip">${p.size}×${p.size} board</span>` +
      `<span class="meta-chip">${p.used.length} colors</span>` +
      `<span class="meta-chip">${total.toLocaleString()} beads</span>` +
      `<span class="meta-chip">${brand} palette</span>`;
  }

  function updateRetry() {
    const btn = $("retryBtn");
    btn.textContent = retriesLeft > 0
      ? `↻ Retry — ${retriesLeft} free ${retriesLeft === 1 ? "retry" : "retries"} left`
      : "↻ No free retries left for this photo";
    btn.disabled = retriesLeft <= 0;
  }

  $("genBtn").addEventListener("click", generate);
  $("retryBtn").addEventListener("click", () => {
    if (retriesLeft <= 0) return;
    retriesLeft--;
    updateRetry();
    generate();
  });

  // ---------- HD gate (D9: first one free, then paywall) ----------
  function firstFreeAvailable() {
    try { return localStorage.getItem(FREE_FLAG) !== "1"; } catch (e) { return true; }
  }

  function updateHdHint() {
    $("hdHint").textContent = firstFreeAvailable()
      ? "This one's on us — your first HD download is free 🎉"
      : "HD download · $0.99 or go Unlimited";
  }

  $("hdBtn").addEventListener("click", () => {
    if (!pattern) return;
    if (firstFreeAvailable()) {
      const a = document.createElement("a");
      a.download = `beadfable-chibi-${pattern.size}x${pattern.size}.png`;
      a.href = BeadEngine.buildSheet(pattern).toDataURL("image/png");
      a.click();
      try { localStorage.setItem(FREE_FLAG, "1"); } catch (e) { /* private mode */ }
      updateHdHint();
      return;
    }
    $("paywall").hidden = false;
  });

  // ---------- paywall & waitlist ----------
  const mailto = (subject) =>
    `mailto:${CFG.preorderEmail}?subject=${encodeURIComponent(subject)}`;

  $("payPattern").href = CFG.stripePatternUrl || mailto("Per-pattern HD ($0.99) — notify me at launch");
  $("payUnlimited").href = CFG.stripeUnlimitedUrl || mailto("Unlimited plan ($4.99/mo) — notify me at launch");
  $("waitlistBtn").href = mailto("AI Chibi Studio waitlist");

  $("payClose").addEventListener("click", () => { $("paywall").hidden = true; });
  $("paywall").addEventListener("click", (e) => {
    if (e.target === $("paywall")) $("paywall").hidden = true;
  });

  updateRetry();
})();
