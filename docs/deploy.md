# BeadFable 上线部署手册（Cloudflare Workers + 自有域名）

目标：把本仓库部署到 Cloudflare Workers，并绑定你自己的域名。
全程只需要一台装了 Node.js（≥18）的电脑 + Cloudflare 免费账号，约 30~60 分钟
（域名 DNS 生效时间除外）。

---

## 第 0 步 · 拿到代码

```sh
git clone -b claude/perler-bead-marketplace-k59f9i https://github.com/cicicrystal2026/beadfable-web.git
cd beadfable-web
```

（建议之后把该分支合并进 main，长期从 main 部署。）

## 第 1 步 · 登录 Cloudflare

```sh
npx wrangler login        # 会打开浏览器授权，用你的 Cloudflare 账号确认
npx wrangler whoami       # 确认登录成功
```

没有账号先去 https://dash.cloudflare.com 免费注册。

## 第 2 步 · 先部署到 workers.dev 验证

```sh
npx wrangler deploy
```

- 首次部署如果提示要设置 workers.dev 子域名，按提示起一个（如 `yourname`）。
- 成功后输出类似 `https://beadfable-web.yourname.workers.dev` —— 打开它，
  确认首页、`/ai`、`/pricing` 都正常，Studio 能转换图片。
- 这一步成功 = 产品已经在公网上了，剩下只是换成你的域名。

## 第 3 步 · 把域名接入 Cloudflare（关键路径）

Workers 绑定自定义域名的前提：**这个域名的 DNS 必须托管在你的 Cloudflare 账号里**。

按你的情况二选一：

### 情况 A：域名注册在别处（阿里云/GoDaddy/Namecheap 等）——最常见

1. Cloudflare Dashboard → **Add a site** → 输入你的域名（如 `beadfable.com`）→ 选 **Free** 计划。
2. Cloudflare 会给你 **两个 Nameserver 地址**（形如 `xxx.ns.cloudflare.com`）。
3. 去域名注册商后台，把域名的 **DNS 服务器 / Nameservers** 改成这两个地址。
   - 阿里云：控制台 → 域名 → 管理 → DNS 修改
   - 注意：不是加解析记录，是整体换 NS。
4. 等待生效：通常几分钟到几小时（极端 48h）。Cloudflare 站点状态变成
   **Active** 即可进行下一步（会有邮件通知）。

### 情况 B：域名本来就在 Cloudflare 注册/托管

直接下一步。

## 第 4 步 · 绑定域名到 Worker

两种方式任选（推荐方式 1，进版本库可追溯）：

**方式 1 · 配置文件**：编辑 `wrangler.jsonc`，取消底部注释并替换成你的域名：

```jsonc
,"routes": [
  { "pattern": "beadfable.com", "custom_domain": true },
  { "pattern": "www.beadfable.com", "custom_domain": true }
]
```

然后再次：

```sh
npx wrangler deploy
```

**方式 2 · 控制台**：Dashboard → Workers & Pages → `beadfable-web` →
**Settings → Domains & Routes → Add → Custom domain** → 输入域名确认。

两种方式 Cloudflare 都会**自动创建 DNS 记录和 HTTPS 证书**，无需手动加解析。
几分钟后 `https://你的域名` 即可访问。

## 第 5 步 · 上线开关（有账号了随时做，缺一个也不影响先上线）

| 开关 | 操作 | 效果 |
|---|---|---|
| AI 引擎 | `npx wrangler secret put OPENAI_API_KEY`（粘贴 key 回车）→ 重新 deploy 不需要 | `/ai` 从「即将上线」变为真实生成 |
| 收款 | Stripe 后台建 3 个 Payment Link（$19.9 / $0.99 / $4.99月付），填入 `public/config.js` → `npx wrangler deploy` | 所有付费按钮从邮件留资切换为真实收款 |
| 联盟 | 把 `public/config.js` 的 `affiliateTag` 换成你的 Amazon Associates tag → deploy | BOM 购买链接开始计佣 |
| 收件箱 | 把 `config.js` 里 `preorderEmail` 换成你真实收件邮箱 → deploy | 预售/waitlist 邮件进你的邮箱 |

## 第 6 步 · 上线验收清单

- [ ] `https://你的域名/` 首页正常，上传图片能出图纸和 BOM
- [ ] `/ai`、`/pricing` 可访问（Worker 部署下支持无 .html 的干净路径）
- [ ] Studio 里「Copy share link」→ 新窗口打开链接能还原图纸
- [ ] `curl -X GET https://你的域名/api/stylize` 返回 405（路由活着）
- [ ] 未配 key 时 `/ai` 生成 → 显示「引擎即将上线」+ waitlist（预期行为）
- [ ] 手机打开一遍全部页面

## 常见坑

| 症状 | 原因/解法 |
|---|---|
| `Add custom domain` 报错找不到 zone | 第 3 步没完成，站点还不是 Active 状态 |
| 域名打开还是注册商的停放页 | NS 修改未生效，等待或去 whatsmydns.net 查 NS 传播 |
| deploy 报错 assets 目录 | 确认在仓库根目录执行命令 |
| workers.dev 正常但域名 522/1016 | 等几分钟证书签发；仍不行删掉 custom domain 重加 |
| 想回滚 | Dashboard → Workers → Deployments → 选旧版本 Rollback |
