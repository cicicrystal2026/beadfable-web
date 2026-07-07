/* 中文移动端 H5 — 复用 BeadEngine，交互为移动端优化：
 * 无联盟链接（国内场景），改为「复制色号清单」；套装为预售登记（¥39.9）。 */
(function () {
  "use strict";

  const CFG = window.BF_CONFIG;
  const $ = (id) => document.getElementById(id);

  let sourceImage = null;
  let pattern = null;

  function drawPreviewWatermark(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 7);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.floor(canvas.width / 9)}px sans-serif`;
    ctx.fillStyle = "rgba(43, 29, 22, 0.13)";
    ctx.fillText("预览 · beadfable.com", 0, 0);
    ctx.restore();
  }

  function run() {
    if (!sourceImage) return;
    const size = parseInt($("boardSize").value, 10);
    const maxColors = parseInt($("maxColors").value, 10);
    pattern = BeadEngine.convert(sourceImage, size, maxColors);
    const cell = Math.max(10, Math.floor(640 / size));
    BeadEngine.drawPattern($("patternCanvas"), pattern, cell, true);
    drawPreviewWatermark($("patternCanvas"));
    renderMeta();
    renderBom();
    updateKitMail();
    renderUnlockState();
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

  // ---------- 兑换码解锁（高清/镜像下载） ----------
  // 未配置 REDEEM_SECRET（接口返回 501/404/网络错误）时自动回退为免费下载，
  // 保证上架兑换码之前线上行为不变。
  const UNLOCK_KEY = "bf_zh_unlock_until";
  let freeMode = false;
  let pendingMirror = false;

  // 探测兑换接口是否已启用：501/404/网络错误 = 未配置 → 全站免费无付费痕迹；
  // 400（空请求被拒）= 已启用 → 下载走兑换码门槛。
  (async function probeRedeem() {
    try {
      const r = await fetch("/api/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (r.status === 501 || r.status === 404 || r.status === 405) freeMode = true;
    } catch (e) {
      freeMode = true;
    }
    renderUnlockState();
  })();

  function unlockedUntil() {
    try { return parseInt(localStorage.getItem(UNLOCK_KEY) || "0", 10); } catch (e) { return 0; }
  }
  function unlocked() { return unlockedUntil() > Date.now(); }

  function renderUnlockState() {
    const el = $("unlockState");
    if (unlocked()) {
      const d = new Date(unlockedUntil());
      el.innerHTML = `<span class="copied">已解锁高清下载 ✓ 有效期至 ${d.getMonth() + 1} 月 ${d.getDate()} 日</span>`;
    } else if (!freeMode) {
      el.textContent = "高清/镜像图纸下载需兑换码（小红书店铺购买，¥9.9 本机 30 天无限下载）";
    } else {
      el.textContent = "";
    }
  }

  function requestDownload(mirrored) {
    if (!pattern) return;
    if (freeMode || unlocked()) { download(mirrored); return; }
    pendingMirror = mirrored;
    $("redeemMsg").textContent = "";
    $("redeemModal").hidden = false;
    $("redeemInput").focus();
  }

  async function submitCode() {
    const code = $("redeemInput").value.trim();
    if (!code) { $("redeemMsg").textContent = "请输入兑换码"; return; }
    $("redeemMsg").textContent = "验证中…";
    try {
      const r = await fetch("/api/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code })
      });
      if (r.status === 501 || r.status === 404 || r.status === 405) {
        freeMode = true;
        $("redeemModal").hidden = true;
        renderUnlockState();
        download(pendingMirror);
        return;
      }
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) {
        try {
          localStorage.setItem(UNLOCK_KEY, String(Date.now() + data.days * 86400000));
        } catch (e) { freeMode = true; /* 隐私模式无法存储，本次放行 */ }
        $("redeemModal").hidden = true;
        renderUnlockState();
        download(pendingMirror);
      } else {
        $("redeemMsg").textContent =
          data.error === "expired_code" ? "这个兑换码已过期，请联系店铺客服" : "兑换码无效，请检查后重试（注意区分数字 0 和字母 O）";
      }
    } catch (e) {
      freeMode = true;
      $("redeemModal").hidden = true;
      renderUnlockState();
      download(pendingMirror);
    }
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

  $("dlBtn").addEventListener("click", () => requestDownload(false));
  $("mirrorBtn").addEventListener("click", () => requestDownload(true));

  $("redeemBtn").addEventListener("click", submitCode);
  $("redeemInput").addEventListener("keydown", (e) => { if (e.key === "Enter") submitCode(); });
  $("redeemClose").addEventListener("click", () => { $("redeemModal").hidden = true; });
  $("redeemModal").addEventListener("click", (e) => {
    if (e.target === $("redeemModal")) $("redeemModal").hidden = true;
  });
  $("redeemBuy").innerHTML = CFG.xhsStoreUrl
    ? `<a href="${CFG.xhsStoreUrl}" target="_blank" rel="noopener" style="color:#b9452c;font-weight:800;">还没有兑换码？去小红书店铺购买 →</a>`
    : "还没有兑换码？小红书搜索「BeadFable 拼豆图纸」购买，自动发货";

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
