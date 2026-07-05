/* 中文移动端 H5 — 复用 BeadEngine，交互为移动端优化：
 * 无联盟链接（国内场景），改为「复制色号清单」；套装为预售登记（¥39.9）。 */
(function () {
  "use strict";

  const CFG = window.BF_CONFIG;
  const $ = (id) => document.getElementById(id);

  let sourceImage = null;
  let pattern = null;

  function run() {
    if (!sourceImage) return;
    const size = parseInt($("boardSize").value, 10);
    const maxColors = parseInt($("maxColors").value, 10);
    pattern = BeadEngine.convert(sourceImage, size, maxColors);
    const cell = Math.max(10, Math.floor(640 / size));
    BeadEngine.drawPattern($("patternCanvas"), pattern, cell, true);
    renderMeta();
    renderBom();
    updateKitMail();
    $("result").hidden = false;
    $("kitbar").classList.add("show");
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function total() {
    return pattern.used.reduce((s, u) => s + u.count, 0);
  }

  function renderMeta() {
    const hours = Math.max(1, Math.round(total() / 300));
    $("metaRow").innerHTML =
      `<span class="chip">${pattern.size}×${pattern.size} 板</span>` +
      `<span class="chip">${pattern.used.length} 个色号</span>` +
      `<span class="chip">共 ${total().toLocaleString()} 颗</span>` +
      `<span class="chip">约 ${hours} 小时拼完</span>`;
  }

  function renderBom() {
    const body = $("bomBody");
    body.innerHTML = "";
    pattern.used.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td class="bom-num">${u.num}</td>` +
        `<td><span class="swatch" style="background:${u.color.hex}"></span></td>` +
        `<td>${u.color.name} <span class="bom-code">${u.color.code}</span></td>` +
        `<td class="bom-count">${u.count}</td>`;
      body.appendChild(tr);
    });
    const brand = BeadEngine.getBrand(pattern.brand).name;
    $("bomSummary").textContent =
      `${brand} 色卡 · 屏幕色仅供参考，按色号购买最准`;
  }

  function listText() {
    const lines = pattern.used.map(
      (u) => `${u.num}. ${u.color.name}（${u.color.code}）× ${u.count} 颗`
    );
    return (
      `【拼豆物语 BeadFable 色号清单】\n` +
      `${pattern.size}×${pattern.size} · ${pattern.used.length} 色 · 共 ${total()} 颗\n` +
      lines.join("\n") +
      `\n—— 图纸生成自 beadfable.com/zh/`
    );
  }

  function updateKitMail() {
    const subject = encodeURIComponent(`按图配豆套装预售登记（¥39.9）— ${pattern.size}x${pattern.size} 图纸`);
    const body = encodeURIComponent(`你好，我想登记这张图纸的配豆套装：\n\n${listText()}\n\n收货省市：`);
    $("kitMail").href = `mailto:${CFG.preorderEmail}?subject=${subject}&body=${body}`;
  }

  function download(mirrored) {
    if (!pattern) return;
    const p = mirrored ? BeadEngine.mirror(pattern) : pattern;
    const a = document.createElement("a");
    a.download = `beadfable-${pattern.size}x${pattern.size}${mirrored ? "-mirrored" : ""}.png`;
    a.href = BeadEngine.buildSheet(p).toDataURL("image/png");
    a.click();
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => { sourceImage = img; run(); };
    img.src = URL.createObjectURL(file);
  }

  $("drop").addEventListener("click", () => $("file").click());
  $("file").addEventListener("change", (e) => loadFile(e.target.files[0]));
  $("boardSize").addEventListener("change", run);
  $("maxColors").addEventListener("input", () => { $("maxColorsVal").textContent = $("maxColors").value; });
  $("maxColors").addEventListener("change", run);

  $("dlBtn").addEventListener("click", () => download(false));
  $("mirrorBtn").addEventListener("click", () => download(true));

  $("copyBtn").addEventListener("click", () => {
    const text = listText();
    const done = () => {
      $("copyNote").innerHTML = '<span class="copied">已复制 ✓ 去淘宝按色号搜「拼豆 + 色号」即可</span>';
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  });

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  $("kitBtn").addEventListener("click", () => { $("kitModal").hidden = false; });
  $("kitClose").addEventListener("click", () => { $("kitModal").hidden = true; });
  $("kitModal").addEventListener("click", (e) => {
    if (e.target === $("kitModal")) $("kitModal").hidden = true;
  });
})();
