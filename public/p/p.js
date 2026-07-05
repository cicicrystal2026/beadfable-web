/* Shared-pattern page — decodes the pattern from the URL fragment
 * (zero-backend sharing; see BeadEngine.encodeShare/decodeShare). */
(function () {
  "use strict";

  const CFG = window.BF_CONFIG;
  const $ = (id) => document.getElementById(id);

  const pattern = BeadEngine.decodeShare(location.hash.slice(1));
  if (!pattern) {
    $("notFound").hidden = false;
    return;
  }

  $("found").hidden = false;
  $("howStrip").hidden = false;

  const brand = BeadEngine.getBrand(pattern.brand);
  const total = pattern.used.reduce((s, u) => s + u.count, 0);

  const cell = Math.max(8, Math.floor(560 / pattern.size));
  BeadEngine.drawBeads($("beadArt"), pattern, cell);

  const hours = Math.max(1, Math.round(total / 300));
  $("metaRow").innerHTML =
    `<span class="meta-chip">${pattern.size}×${pattern.size} board</span>` +
    `<span class="meta-chip">${pattern.used.length} colors</span>` +
    `<span class="meta-chip">${total.toLocaleString()} beads</span>` +
    `<span class="meta-chip">${brand.name} palette</span>` +
    `<span class="meta-chip">~${hours}h to finish</span>`;

  $("bomSummary").textContent = "Exact counts — buy only what this pattern needs.";
  pattern.used.forEach((u) => {
    const q = encodeURIComponent(`${brand.name} beads ${u.color.name}`);
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td class="bom-num">${u.num}</td>` +
      `<td><span class="swatch" style="background:${u.color.hex}"></span></td>` +
      `<td>${u.color.name}<span class="bom-code">${u.color.code}</span></td>` +
      `<td class="bom-count">${u.count}</td>` +
      `<td><a class="buy" target="_blank" rel="noopener sponsored" href="https://www.amazon.com/s?k=${q}&tag=${CFG.affiliateTag}">Buy on Amazon</a></td>`;
    $("bomBody").appendChild(tr);
  });

  $("kitLines").innerHTML =
    `<div class="kit-line"><span>${pattern.used.length} colors, counted to the bead (+5% spares)</span><b>${total.toLocaleString()}+</b></div>` +
    `<div class="kit-line"><span>${pattern.size}×${pattern.size} pegboard</span><b>${pattern.size <= 29 ? 1 : 4}</b></div>` +
    `<div class="kit-line"><span>Ironing paper + printed pattern</span><b>✓</b></div>`;

  if (CFG.stripeKitUrl) {
    $("kitBtn").href = CFG.stripeKitUrl;
  } else {
    const lines = pattern.used
      .map((u) => `${u.color.name} (${u.color.code}) x ${u.count}`)
      .join("%0D%0A");
    $("kitBtn").href =
      `mailto:${CFG.preorderEmail}?subject=${encodeURIComponent(
        `Bead Kit pre-order ($19.9) — shared ${pattern.size}x${pattern.size} pattern`
      )}&body=Hi BeadFable, I want the exact-count bead kit for this shared pattern:%0D%0A%0D%0A${lines}%0D%0A%0D%0AMy shipping country: `;
  }

  $("dlBtn").addEventListener("click", () => {
    const a = document.createElement("a");
    a.download = `beadfable-pattern-${pattern.size}x${pattern.size}.png`;
    a.href = BeadEngine.buildSheet(pattern).toDataURL("image/png");
    a.click();
  });

  const pageUrl = location.href;
  $("pinBtn").addEventListener("click", () => {
    window.open(
      `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(pageUrl)}&description=${encodeURIComponent("Fuse bead pattern with exact bead counts — BeadFable")}`,
      "_blank"
    );
  });
  $("xBtn").addEventListener("click", () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent("Look at this bead pattern — it comes with its exact shopping list 🧸")}`,
      "_blank"
    );
  });
  $("copyBtn").addEventListener("click", () => {
    if (navigator.clipboard) navigator.clipboard.writeText(pageUrl).catch(() => {});
    $("copyBtn").textContent = "Copied ✓";
    setTimeout(() => { $("copyBtn").textContent = "🔗 Copy link"; }, 2000);
  });
})();
