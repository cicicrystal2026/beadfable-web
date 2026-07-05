/* BeadEngine — shared photo → bead pattern engine.
 * Used by the landing Studio (app.js), AI Chibi Studio (ai.js) and the
 * shared-pattern page (p/p.js).
 *
 * Pattern object: { size, cells: Int16Array (palette idx | -1), brand,
 *                   used: [{ idx, count, num, color }] (sorted by count desc) }
 *
 * Share codec: URL-fragment encoding so patterns are shareable with zero
 * backend — bytes [version=1, size, brandId, ...RLE(run 1-255, value)] where
 * value 0 = empty peg, else paletteIndex + 1; base64url-encoded.
 */
window.BeadEngine = (function () {
  "use strict";

  const BRAND_IDS = ["perler"]; // index = brandId in the share codec

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function srgbToLab(r, g, b) {
    const lin = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    const x = lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805;
    const y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722;
    const z = lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(x / 0.95047), fy = f(y), fz = f(z / 1.08883);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  function labDist2(a, b) {
    const dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
    return dl * dl + da * da + db * db;
  }

  const brandCache = {};
  function getBrand(key) {
    if (!brandCache[key]) {
      const def = PALETTES[key];
      const rgb = def.colors.map((c) => hexToRgb(c.hex));
      brandCache[key] = {
        key,
        name: def.name,
        colors: def.colors,
        rgb,
        lab: rgb.map((v) => srgbToLab(v[0], v[1], v[2]))
      };
    }
    return brandCache[key];
  }

  function nearestIndex(lab, brand, allowed) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < brand.lab.length; i++) {
      if (allowed && !allowed.has(i)) continue;
      const d = labDist2(lab, brand.lab[i]);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function tally(cells) {
    const counts = new Map();
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] < 0) continue;
      counts.set(cells[i], (counts.get(cells[i]) || 0) + 1);
    }
    return counts;
  }

  function buildUsed(cells, brand) {
    return [...tally(cells).entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([idx, count], i) => ({ idx, count, num: i + 1, color: brand.colors[idx] }));
  }

  function convert(img, size, maxColors, brandKey) {
    const brand = getBrand(brandKey || "perler");
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const ctx = off.getContext("2d", { willReadFrequently: true });

    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.min(iw, ih);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (iw - s) / 2, (ih - s) / 2, s, s, 0, 0, size, size);

    const data = ctx.getImageData(0, 0, size, size).data;
    const cells = new Int16Array(size * size);
    for (let i = 0; i < size * size; i++) {
      const a = data[i * 4 + 3];
      if (a < 128) { cells[i] = -1; continue; }
      cells[i] = nearestIndex(
        srgbToLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]), brand, null
      );
    }

    let counts = tally(cells);
    while (counts.size > maxColors) {
      let least = -1, leastN = Infinity;
      counts.forEach((n, idx) => { if (n < leastN) { leastN = n; least = idx; } });
      const kept = new Set(counts.keys());
      kept.delete(least);
      const target = nearestIndex(brand.lab[least], brand, kept);
      for (let i = 0; i < cells.length; i++) if (cells[i] === least) cells[i] = target;
      counts = tally(cells);
    }

    return { size, cells, brand: brand.key, used: buildUsed(cells, brand) };
  }

  function luminance(rgb) {
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  }

  function drawPattern(canvas, p, cell, withNumbers) {
    const brand = getBrand(p.brand);
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
        ctx.fillStyle = brand.colors[idx].hex;
        ctx.fillRect(x * cell + 1, y * cell + 1, cell - 1, cell - 1);
        if (withNumbers && cell >= 14) {
          ctx.fillStyle = luminance(brand.rgb[idx]) > 140 ? "rgba(0,0,0,.72)" : "rgba(255,255,255,.85)";
          ctx.fillText(String(numOf.get(idx)), x * cell + cell / 2, y * cell + cell / 2 + 1);
        }
      }
    }

    for (let i = 0; i <= size; i++) {
      ctx.strokeStyle = i % 10 === 0 ? "rgba(0,0,0,.4)" : "rgba(0,0,0,.12)";
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

  /* Bead-ring rendering (fused-bead look) for previews and the share page. */
  function drawBeads(canvas, p, cell) {
    const brand = getBrand(p.brand);
    const size = p.size;
    canvas.width = size * cell;
    canvas.height = size * cell;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fffdf9";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = p.cells[y * size + x];
        if (idx < 0) continue;
        const cx = x * cell + cell / 2, cy = y * cell + cell / 2, r = cell / 2 - 1;
        ctx.fillStyle = brand.colors[idx].hex;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        if (cell >= 8) {
          ctx.fillStyle = "rgba(255,255,255,.3)";
          ctx.beginPath(); ctx.arc(cx - r * .3, cy - r * .35, r * .28, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,.16)";
          ctx.beginPath(); ctx.arc(cx, cy, r * .3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#fffdf9";
          ctx.beginPath(); ctx.arc(cx, cy, r * .18, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  function buildSheet(p) {
    const brand = getBrand(p.brand);
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
    ctx.fillText(p.mirrored ? "BeadFable Pattern (MIRRORED)" : "BeadFable Pattern", pad, pad + 10);
    ctx.font = "16px Arial";
    ctx.fillStyle = "#694f42";
    ctx.fillText(
      `${p.size}×${p.size} · ${brand.name} palette · beadfable.com` +
        (p.mirrored ? " · iron the back, front will match the original" : ""),
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

  /* Horizontal mirror — print this and iron the back so the finished
   * front matches the original orientation. */
  function mirror(p) {
    const size = p.size;
    const cells = new Int16Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        cells[y * size + x] = p.cells[y * size + (size - 1 - x)];
      }
    }
    return { size, cells, brand: p.brand, used: p.used, mirrored: true };
  }

  /* Build a pattern directly from a character map (featured gallery). */
  function fromMap(map, legend, boardSize, brandKey) {
    const brand = getBrand(brandKey || "perler");
    const h = map.length, w = map[0].length;
    const size = boardSize || Math.max(h, w);
    const cells = new Int16Array(size * size).fill(-1);
    const ox = Math.floor((size - w) / 2), oy = Math.floor((size - h) / 2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = map[y][x];
        if (ch === ".") continue;
        cells[(y + oy) * size + (x + ox)] = legend[ch];
      }
    }
    return { size, cells, brand: brand.key, used: buildUsed(cells, brand) };
  }

  // ---------- share codec ----------

  function encodeShare(p) {
    const bytes = [1, p.size, BRAND_IDS.indexOf(p.brand)];
    let i = 0;
    while (i < p.cells.length) {
      const v = p.cells[i] + 1; // 0 = empty
      let run = 1;
      while (i + run < p.cells.length && p.cells[i + run] + 1 === v && run < 255) run++;
      bytes.push(run, v);
      i += run;
    }
    let bin = "";
    for (let j = 0; j < bytes.length; j += 4096) {
      bin += String.fromCharCode.apply(null, bytes.slice(j, j + 4096));
    }
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeShare(hash) {
    try {
      const b64 = hash.replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (bytes[0] !== 1) return null;
      const size = bytes[1];
      const brandKey = BRAND_IDS[bytes[2]];
      if (!brandKey || size < 8 || size > 128) return null;
      const cells = new Int16Array(size * size);
      let ci = 0;
      for (let i = 3; i + 1 < bytes.length && ci < cells.length; i += 2) {
        const run = bytes[i], v = bytes[i + 1] - 1;
        for (let r = 0; r < run && ci < cells.length; r++) cells[ci++] = v;
      }
      if (ci !== cells.length) return null;
      const brand = getBrand(brandKey);
      return { size, cells, brand: brandKey, used: buildUsed(cells, brand) };
    } catch (e) {
      return null;
    }
  }

  return { convert, drawPattern, drawBeads, buildSheet, encodeShare, decodeShare, getBrand, mirror, fromMap };
})();
