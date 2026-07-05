/* Landing Studio UI — conversion logic lives in engine.js (BeadEngine). */
(function () {
  "use strict";

  const CFG = window.BF_CONFIG;

  const els = {
    drop: document.getElementById("drop"),
    file: document.getElementById("file"),
    boardSize: document.getElementById("boardSize"),
    maxColors: document.getElementById("maxColors"),
    maxColorsVal: document.getElementById("maxColorsVal"),
    studioResult: document.getElementById("studioResult"),
    patternCanvas: document.getElementById("patternCanvas"),
    bomBody: document.getElementById("bomBody"),
    bomSummary: document.getElementById("bomSummary"),
    downloadBtn: document.getElementById("downloadBtn"),
    printBtn: document.getElementById("printBtn"),
    shareBtn: document.getElementById("shareBtn"),
    shareUrl: document.getElementById("shareUrl"),
    preorderBtn: document.getElementById("preorderBtn"),
    preorderModal: document.getElementById("preorderModal"),
    preorderClose: document.getElementById("preorderClose"),
    preorderMail: document.getElementById("preorderMail")
  };

  let sourceImage = null;
  let pattern = null;

  function affiliateUrl(p, color) {
    const brand = BeadEngine.getBrand(p.brand).name;
    const q = encodeURIComponent(`${brand} beads ${color.name}`);
    return `https://www.amazon.com/s?k=${q}&tag=${CFG.affiliateTag}`;
  }

  function renderBom(p) {
    els.bomBody.innerHTML = "";
    let total = 0;
    p.used.forEach((u) => {
      total += u.count;
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td class="bom-num">${u.num}</td>` +
        `<td><span class="swatch" style="background:${u.color.hex}"></span></td>` +
        `<td>${u.color.name}<span class="bom-code">${u.color.code}</span></td>` +
        `<td class="bom-count">${u.count}</td>` +
        `<td><a class="buy" target="_blank" rel="noopener sponsored" href="${affiliateUrl(p, u.color)}">Buy on Amazon</a></td>`;
      els.bomBody.appendChild(tr);
    });
    const brand = BeadEngine.getBrand(p.brand).name;
    els.bomSummary.textContent =
      `${p.used.length} colors · ${total.toLocaleString()} beads total · ${p.size}×${p.size} pegboard (${brand} palette)`;
  }

  function downloadSheet() {
    if (!pattern) return;
    const a = document.createElement("a");
    a.download = `beadfable-pattern-${pattern.size}x${pattern.size}.png`;
    a.href = BeadEngine.buildSheet(pattern).toDataURL("image/png");
    a.click();
  }

  function printSheet() {
    if (!pattern) return;
    const url = BeadEngine.buildSheet(pattern).toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<img src="${url}" style="max-width:100%" onload="window.print()">`);
    w.document.close();
  }

  function shareLink() {
    if (!pattern) return;
    const url = `${location.origin}/p/#${BeadEngine.encodeShare(pattern)}`;
    els.shareUrl.value = url;
    els.shareUrl.hidden = false;
    els.shareUrl.select();
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    els.shareBtn.textContent = "Link copied ✓";
    setTimeout(() => { els.shareBtn.textContent = "Copy share link"; }, 2000);
  }

  function updatePreorder() {
    if (!pattern) return;
    if (CFG.stripeKitUrl) {
      els.preorderMail.href = CFG.stripeKitUrl;
      els.preorderMail.textContent = "Pre-order now · $19.9";
      return;
    }
    const lines = pattern.used
      .map((u) => `${u.color.name} (${u.color.code}) x ${u.count}`)
      .join("%0D%0A");
    const subject = encodeURIComponent(
      `Bead Kit pre-order ($19.9) — ${pattern.size}x${pattern.size} pattern`
    );
    els.preorderMail.href =
      `mailto:${CFG.preorderEmail}?subject=${subject}&body=` +
      `Hi BeadFable, I want the exact-count bead kit for my pattern:%0D%0A%0D%0A${lines}` +
      `%0D%0A%0D%0AMy shipping country: `;
  }

  function run() {
    if (!sourceImage) return;
    const size = parseInt(els.boardSize.value, 10);
    const maxColors = parseInt(els.maxColors.value, 10);
    pattern = BeadEngine.convert(sourceImage, size, maxColors);
    const cell = Math.max(10, Math.floor(640 / size));
    BeadEngine.drawPattern(els.patternCanvas, pattern, cell, true);
    renderBom(pattern);
    updatePreorder();
    els.shareUrl.hidden = true;
    els.studioResult.hidden = false;
    els.studioResult.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => { sourceImage = img; run(); };
    img.src = URL.createObjectURL(file);
  }

  els.file.addEventListener("change", (e) => loadFile(e.target.files[0]));
  els.drop.addEventListener("click", () => els.file.click());
  els.drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.drop.classList.add("dragging");
  });
  els.drop.addEventListener("dragleave", () => els.drop.classList.remove("dragging"));
  els.drop.addEventListener("drop", (e) => {
    e.preventDefault();
    els.drop.classList.remove("dragging");
    loadFile(e.dataTransfer.files[0]);
  });

  els.boardSize.addEventListener("change", run);
  els.maxColors.addEventListener("input", () => {
    els.maxColorsVal.textContent = els.maxColors.value;
  });
  els.maxColors.addEventListener("change", run);

  els.downloadBtn.addEventListener("click", downloadSheet);
  els.printBtn.addEventListener("click", printSheet);
  els.shareBtn.addEventListener("click", shareLink);
  els.preorderBtn.addEventListener("click", () => { els.preorderModal.hidden = false; });
  els.preorderClose.addEventListener("click", () => { els.preorderModal.hidden = true; });
  els.preorderModal.addEventListener("click", (e) => {
    if (e.target === els.preorderModal) els.preorderModal.hidden = true;
  });
})();
