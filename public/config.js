/* BeadFable launch configuration — the only file to edit before going live.
 * Empty Stripe URLs fall back to email capture (waitlist / pre-order intent).
 */
window.BF_CONFIG = {
  affiliateTag: "beadfable-20",          // Amazon Associates tag (placeholder)
  preorderEmail: "hello@beadfable.com",
  stripeKitUrl: "",                       // Payment Link: $19.9 exact-count kit
  stripePatternUrl: "",                   // Payment Link: $0.99 per-pattern HD
  stripeUnlimitedUrl: "",                 // Payment Link: $4.99/mo Unlimited
  xhsStoreUrl: ""                         // 小红书店铺兑换码商品链接（空 = 显示文字指引）
};
