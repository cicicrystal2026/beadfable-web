# BeadFable Web 设计规范（Design Spec）

- 版本：1.0 · 2026-07-04
- 依据：docs/PRD.md 2.0（V1 已上线 + V1.1 目标态）
- 高保真原型：`public/design/`（部署后访问 `/design/`，随代码库演进）

---

## 1. 品牌基调

**Cozy craft（温暖手作）**：像一张摆着拼豆板的木桌——奶油纸底、暖棕墨字、
珊瑚橙行动色。语气自信而俏皮（"Made to be finished, not abandoned."），
不用幼稚化的儿童玩具腔——核心用户是 18~34 岁女性，不是小孩。

**核心母题：豆子（bead dot）**——带高光和中孔的圆点。用于 hero 像素画、
favicon、加载动画、列表 bullet。全站唯一的装饰语言，不引入第二套图形母题。

## 2. 设计令牌（Design Tokens）

### 2.1 颜色

| 令牌 | 值 | 用途 |
|---|---|---|
| `--bg` | `#FFF8F1` | 页面底色（奶油纸） |
| `--surface` | `#FFFFFF` | 卡片/面板 |
| `--ink` | `#2B1D16` | 标题、正文主色 |
| `--sub` | `#694F42` | 副文案 |
| `--muted` | `#8A6C5C` | 注释、占位、表头 |
| `--line` | `#F0DDCB` | 边框、分割线 |
| `--primary` | `#E35D3D` | 主行动（转换、下载）珊瑚橙 |
| `--primary-press` | `#B9452C` | 主按钮硬投影/按压 |
| `--commerce` | `#D99A2B` | 商业行动（套装、付费）金 |
| `--commerce-press` | `#A8761D` | 金按钮硬投影 |
| `--commerce-bg` | `#FDF3E0` | 套装/付费区底色 |
| `--ok` | `#199D53` | 成功、勾选 |
| `--warn` | `#C22D33` | 错误、红线提示 |

规则：**珊瑚橙 = 免费/创作动作，金 = 花钱动作**，全站不混用——用户扫一眼
按钮颜色就知道这一步要不要掏钱。

### 2.2 字体与字阶

- V1：系统 Arial/Helvetica（零加载成本）。V1.1 升级提案：标题换自托管
  **Nunito ExtraBold**（圆角无衬线，呼应豆子母题），正文仍系统字体。
- 字阶：H1 `clamp(38px,5.4vw,64px)/1.02/-2.4px` · H2 30 · H3 18~20 ·
  正文 16/1.6 · 辅助 14 · 注释 12。数字（豆数、价格）用 tabular 排版加粗。

### 2.3 形状与投影

- 圆角：按钮/输入 12 · 卡片 16 · 面板 24 · 徽章 999。
- **按钮投影是品牌签名**：`box-shadow: 0 6px 0 <press色>`，按下位移 3px——
  模拟「把豆子按进板子」的手感。禁止用普通弥散投影做按钮。
- 面板投影仅用于强调卡（套装区、选中态）：低透明度暖色弥散。

### 2.4 间距

4px 基数；面板内边距 36（桌面）/24（移动）；区块间距 36。

## 3. 信息架构（V1.1 目标态）

```
/            落地页（Q版叙事 + 拼得完对比 + Studio + 科普）        [已上线]
/#studio     Pattern Studio（免费转换器）                          [已上线]
/ai          AI Chibi Studio（风格化 → 预览 → 付费墙）             [原型 design/ai-studio.html]
/p/{id}      图纸分享页（水印回流落地，病毒环入口）                [原型 design/pattern.html]
/pricing     定价页（免费/单张/订阅 + 套装横幅）                   [原型 design/pricing.html]
/terms /privacy /dmca                                              [W2 文本页]
```

导航（V1.1）：`Studio · AI Chibi · Pricing · Bead Kit`。Footer：法务三件 + 联盟披露。

## 4. 组件清单

| 组件 | 变体/状态 | 备注 |
|---|---|---|
| Button | primary（珊瑚）/ commerce（金）/ secondary（棕）/ ghost | 均带硬投影按压 |
| Panel | 默认 / 强调（commerce-bg） | 圆角 24 |
| Badge/Chip | Beta、精选、**First one free**、meta 数据（29×29 等） | |
| Drop zone | 默认/悬停/拖入 | 虚线框 + 图标 |
| Style Card | 默认/选中（primary 描边 + 勾角标） | AI 风格选择，含像素缩略图 |
| BOM Table | 行内含色块/颗数/购买链接 | V1 已有 |
| Compare Cards | them（灰调）/ us（金底） | 落地页已有 |
| Modal / Paywall Sheet | 单张购买 vs 订阅 双栏 | 关闭区 + 背景点击关闭 |
| Progress/Loader | 豆子圆点三连跳 | AI 生成中 |
| Toast | 成功（下载开始）/ 错误 | |

## 5. 关键页面规格

### 5.1 AI Chibi Studio（/ai）——V1.1 核心页

四状态机：**idle → generating → result → paywall**

- idle：左列 = 上传区 + 风格卡（Chibi / Big-head / Toon / Faithful，通用命名，
  D9 红线）+ 自定义要求输入（占位示例文案）+ 生成按钮；右列 = 空态示例。
- generating：右列豆子 loader + 文案 "Beading your chibi…"（预计 15~30s）。
- result：右列低清预览 + 半透明 "PREVIEW" 水印；操作行 =
  `Retry (2 free left)`（珊瑚）+ `Download HD pattern + bead list · $0.99`（金）。
  顶部常驻绿色横幅：**Your first pattern is free 🎉**（免费额度可视化，D9）。
- paywall（点金按钮弹出）：双栏——左 = 单张 $0.99（本图纸 HD + BOM 永久），
  右 = 订阅 $4.99/mo（无限生成 + 全部 HD + 无广告位），右栏预选中。
  底部小字：成本披露式信任文案（"Cancel anytime · secure checkout by Stripe"）。

### 5.2 图纸分享页（/p/{id}）——病毒环着陆页

访客视角（从打印图纸水印/分享链接进来）：
- 首屏：图纸大图（渲染成豆子圆点质感，非方格）+ meta chips
  （尺寸/色数/豆数/色卡品牌）+ 作者行 "Made with BeadFable"。
- CTA 优先级（自上而下）：`Get the exact bead kit · $19.9`（金，最大）→
  `Download pattern (PNG)`（珊瑚）→ `Make your own — free`（链接回 /）。
  **访客的第一价值是「我也要做一个」，第二才是复刻这张**——两条路都给。
- 下半屏：BOM 前 6 行 + 「+N more colors」展开；三步科普压缩条。

### 5.3 定价页（/pricing）

三卡：**Free**（无限预览 + 首张 HD 免费 + 精确 BOM）/
**Per pattern $0.99**（单张 HD 买断）/
**Unlimited $4.99/mo**（推荐角标，金描边）。
下方全宽套装横幅：$19.9 exact-count kit（金底，独立于订阅叙事——
实物和数字订阅不捆绑，避免混淆）。FAQ 3 条（豆子品牌、退款、版权）。

## 6. 响应式与可访问性

- 断点 860px：全部双栏转单栏；对比卡、定价卡纵向堆叠。
- 触控目标 ≥ 44px；表单控件原生优先。
- 对比度：ink/sub 在 bg 上均 ≥ AA；金按钮文字用白字加粗 16px+。
- Canvas 图纸提供 aria-label；付费墙可 Esc 关闭；焦点环不隐藏。
- 图纸打印页保持纯白底 + 黑网格（省墨、复印友好）。

## 7. 文案语调速查

- 标题：短、断言式（"Made to be finished."）
- 按钮：动词开头 + 价格透明（"Download HD · $0.99"，不藏价）
- 免费永远标注 free；花钱按钮永远是金色——颜色即合同。
- 禁用词：品牌 IP 词（Disney 等）、"cheap"、儿童玩具腔。
