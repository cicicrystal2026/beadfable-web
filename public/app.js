/* BeadFable Studio — client-side photo → bead pattern engine.
 * Pipeline: cover-crop downscale → sRGB→Lab → nearest palette color (CIE76)
 * → merge least-used colors until within the max-colors budget → render grid,
 * legend and exact bead counts (BOM).
 */
(function () {
  "use strict";

  // Replace with the real Amazon Associates tag before launch.
  const AFFILIATE_TAG = "beadfable-20";
  const PREORDER_EMAIL = "hello@beadfable.com";

  const palette = PALETTES.perler;

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
    preorderBtn: document.getElementById("preorderBtn"),
    preorderModal: document.getElementById("preorderModal"),
    preorderClose: document.getElementById("preorderClose"),
    preorderMail: document.getElementById("preorderMail")
  };

  let sourceImage = null; // HTMLImageElement of the last upload
  let pattern = null;     // { size, cells: Int16Array (palette idx | -1), used: [{color, count, num}] }

  // ---------- color math ----------

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function srgbToLab(r, g, b) {
    // sRGB → linear
    const lin = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    // linear → XYZ (D65)
    const x = lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805;
    const y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722;
    const z = lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505;
    // XYZ → Lab
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(x / 0.95047), fy = f(y), fz = f(z / 1.08883);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function labDist2(a, b) {
    const dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
    return dl * dl + da * da + db * db;
  }

  const paletteRgb = palette.colors.map((c) => hexToRgb(c.hex));
  const paletteLab = paletteRgb.map((rgb) => srgbToLab(rgb[0], rgb[1], rgb[2]));

  function nearestPaletteIndex(lab, allowed) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < paletteLab.length; i++) {
      if (allowed && !allowed.has(i)) continue;
      const d = labDist2(lab, paletteLab[i]);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  // ---------- conversion ----------

  function convert(img, size, maxColors) {
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const ctx = off.getContext("2d", { willReadFrequently: true });

    // cover-crop the source to a square, then downscale to the board grid
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - s) / 2;
    const sy = (img.naturalHeight - s) / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);

    const data = ctx.getImageData(0, 0, size, size).data;
    const cells = new Int16Array(size * size);
    for (let i = 0; i < size * size; i++) {
      const a = data[i * 4 + 3];
      if (a < 128) { cells[i] = -1; continue; } // transparent → empty peg
      const lab = srgbToLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      cells[i] = nearestPaletteIndex(lab, null);
    }

    // merge least-used colors into their nearest kept neighbor until within budget
    let counts = tally(cells);
    while (counts.size > maxColors) {
      let least = -1, leastN = Infinity;
      counts.forEach((n, idx) => { if (n < leastN) { leastN = n; least = idx; } });
      const kept = new Set(counts.keys());
      kept.delete(least);
      const target = nearestPaletteIndex(paletteLab[least], kept);
      for (let i = 0; i < cells.length; i++) if (cells[i] === least) cells[i] = target;
      counts = tally(cells);
    }

    const used = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([idx, count], i) => ({ idx, count, num: i + 1, color: palette.colors[idx] }));
    return { size, cells, used };
  }

  function tally(cells) {
    const counts = new Map();
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] < 0) continue;
      counts.set(cells[i], (counts.get(cells[i]) || 0) + 1);
    }
    return counts;
  }

  // ---------- rendering ----------

  function luminance(rgb) {
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  }

  function drawPattern(canvas, p, cell, withNumbers) {
    const size = p.size;
    canvas.width = size * cell + 1;
    canvas.height = size * cell + 1;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const numOf = new Map(p.used.map((u) => [u.idx, u.num]));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.floor(cell * 0.42)}px Arial`;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = p.cells[y * size + x];
        if (idx < 0) continue;
        const rgb = paletteRgb[idx];
        ctx.fillStyle = palette.colors[idx].hex;
        ctx.fillRect(x * cell + 1, y * cell + 1, cell - 1, cell - 1);
        if (withNumbers && cell >= 14) {
          ctx.fillStyle = luminance(rgb) > 140 ? "rgba(0,0,0,.72)" : "rgba(255,255,255,.85)";
          ctx.fillText(String(numOf.get(idx)), x * cell + cell / 2, y * cell + cell / 2 + 1);
        }
      }
    }

    // grid lines, heavier every 10 beads to match pegboard counting habits
    for (let i = 0; i <= size; i++) {
      const major = i % 10 === 0;
      ctx.strokeStyle = major ? "rgba(0,0,0,.4)" : "rgba(0,0,0,.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i * cell + 0.5, 0);
      ctx.lineTo(i * cell + 0.5, size * cell);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell + 0.5);
      ctx.lineTo(size * cell, i * cell + 0.5);
      ctx.stroke();
    }
  }

  function affiliateUrl(color) {
    const q = encodeURIComponent(`${palette.name} beads ${color.name}`);
    return `https://www.amazon.com/s?k=${q}&tag=${AFFILIATE_TAG}`;
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
        `<td><a class="buy" target="_blank" rel="noopener sponsored" href="${affiliateUrl(u.color)}">Buy on Amazon</a></td>`;
      els.bomBody.appendChild(tr);
    });
    els.bomSummary.textContent =
      `${p.used.length} colors · ${total.toLocaleString()} beads total · ${p.size}×${p.size} pegboard (${palette.name} palette)`;
  }

  // ---------- export ----------

  function buildSheet(p) {
    const cell = 24, pad = 40, legendRow = 34;
    const gridPx = p.size * cell;
    const legendH = p.used.length * legendRow + 70;
    const canvas = document.createElement("canvas");
    canvas.width = gridPx + pad * 2;
    canvas.height = pad + 70 + gridPx + 30 + legendH + pad;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#2b1d16";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "left";
    ctx.fillText("BeadFable Pattern", pad, pad + 10);
    ctx.font = "16px Arial";
    ctx.fillStyle = "#694f42";
    ctx.fillText(
      `${p.size}×${p.size} · ${palette.name} palette · beadfable.com`,
      pad, pad + 40
    );

    const grid = document.createElement("canvas");
    drawPattern(grid, p, cell, true);
    ctx.drawImage(grid, pad, pad + 70);

    // row/column coordinates every 5 beads, for locating positions on big boards
    const gy = pad + 70;
    ctx.font = "11px Arial";
    ctx.fillStyle = "#8a6c5c";
    for (let i = 1; i <= p.size; i++) {
      if (i !== 1 && i % 5 !== 0) continue;
      ctx.textAlign = "center";
      ctx.fillText(String(i), pad + (i - 0.5) * cell, gy - 8);
      ctx.textAlign = "right";
      ctx.fillText(String(i), pad - 6, gy + (i - 0.5) * cell + 4);
    }
    ctx.textAlign = "left";

    let y = pad + 70 + gridPx + 60;
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "#2b1d16";
    ctx.fillText("Bead list (exact counts)", pad, y - 26);
    let total = 0;
    ctx.font = "16px Arial";
    p.used.forEach((u) => {
      total += u.count;
      ctx.fillStyle = u.color.hex;
      ctx.fillRect(pad + 34, y - 15, 22, 22);
      ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.strokeRect(pad + 34.5, y - 14.5, 21, 21);
      ctx.fillStyle = "#2b1d16";
      ctx.textAlign = "right";
      ctx.fillText(String(u.num), pad + 24, y);
      ctx.textAlign = "left";
      ctx.fillText(`${u.color.name} (${u.color.code})`, pad + 68, y);
      ctx.textAlign = "right";
      ctx.fillText(`${u.count} beads`, canvas.width - pad, y);
      ctx.textAlign = "left";
      y += legendRow;
    });
    ctx.font = "bold 16px Arial";
    ctx.fillText(`Total: ${total.toLocaleString()} beads · ${p.used.length} colors`, pad, y + 6);
    return canvas;
  }

  function downloadSheet() {
    if (!pattern) return;
    const a = document.createElement("a");
    a.download = `beadfable-pattern-${pattern.size}x${pattern.size}.png`;
    a.href = buildSheet(pattern).toDataURL("image/png");
    a.click();
  }

  function printSheet() {
    if (!pattern) return;
    const url = buildSheet(pattern).toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<img src="${url}" style="max-width:100%" onload="window.print()">`
    );
    w.document.close();
  }

  // ---------- pre-order ----------

  function updatePreorderMail() {
    if (!pattern) return;
    const lines = pattern.used
      .map((u) => `${u.color.name} (${u.color.code}) x ${u.count}`)
      .join("%0D%0A");
    const subject = encodeURIComponent(
      `Bead Kit pre-order ($19.9) — ${pattern.size}x${pattern.size} pattern`
    );
    els.preorderMail.href =
      `mailto:${PREORDER_EMAIL}?subject=${subject}&body=` +
      `Hi BeadFable, I want the exact-count bead kit for my pattern:%0D%0A%0D%0A${lines}` +
      `%0D%0A%0D%0AMy shipping country: `;
  }

  // ---------- wiring ----------

  function run() {
    if (!sourceImage) return;
    const size = parseInt(els.boardSize.value, 10);
    const maxColors = parseInt(els.maxColors.value, 10);
    pattern = convert(sourceImage, size, maxColors);
    const cell = Math.max(10, Math.floor(640 / size));
    drawPattern(els.patternCanvas, pattern, cell, true);
    renderBom(pattern);
    updatePreorderMail();
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
  els.preorderBtn.addEventListener("click", () => { els.preorderModal.hidden = false; });
  els.preorderClose.addEventListener("click", () => { els.preorderModal.hidden = true; });
  els.preorderModal.addEventListener("click", (e) => {
    if (e.target === els.preorderModal) els.preorderModal.hidden = true;
  });
})();
