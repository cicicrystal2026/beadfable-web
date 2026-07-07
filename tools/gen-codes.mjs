#!/usr/bin/env node
/* 兑换码生成器 — 生成的码可直接粘贴到小红书店铺「自动发货」内容里。
 *
 * 用法:
 *   node tools/gen-codes.mjs <REDEEM_SECRET> [数量=10] [解锁天数=30]
 *
 * <REDEEM_SECRET> 必须与线上一致（npx wrangler secret put REDEEM_SECRET）。
 * 码为 HMAC 签名自校验，无需数据库；同一个码可重复使用（v1 取舍），
 * 激活窗口自签发起 365 天。
 */
import crypto from "node:crypto";

const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function b32encode(bytes) {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

const [, , secret, countArg, daysArg] = process.argv;
if (!secret) {
  console.error("用法: node tools/gen-codes.mjs <REDEEM_SECRET> [数量=10] [解锁天数=30]");
  process.exit(1);
}
const count = parseInt(countArg || "10", 10);
const days = parseInt(daysArg || "30", 10);
if (!(count > 0) || !(days > 0 && days < 256)) {
  console.error("数量需 > 0，天数需 1~255");
  process.exit(1);
}

const issueDay = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 86400000);
for (let i = 0; i < count; i++) {
  const rand = crypto.randomBytes(2);
  const payload = Buffer.from([1, days, issueDay & 255, (issueDay >> 8) & 255, rand[0], rand[1]]);
  const sig = crypto.createHmac("sha256", secret).update(payload).digest().subarray(0, 4);
  const code = b32encode(Buffer.concat([payload, sig]));
  console.log(`BF-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`);
}
