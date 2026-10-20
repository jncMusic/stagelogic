// SVG → PNG (앱 아이콘 · 문서용 로고 이미지). build.py 다음에 실행.
// 실행: node design/logo/tools/png.mjs   (playwright 필요. 브라우저 위치가 다르면 CHROMIUM 환경 변수로)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../assets') + '/';
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const mark = (w, a) => `<path d="M20 18 8 32l12 14M44 18l12 14-12 14" fill="none" stroke="${w}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M37 12 27 48" fill="none" stroke="${a}" stroke-width="5.5" stroke-linecap="round"/><rect x="14" y="53" width="36" height="4" rx="2" fill="${a}"/>`;
const WINE = '#8e2433', CREAM = '#faf9f6', GOLD = '#c9a24a';
async function shot(html, w, h, out, transparent = true) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`);
  await p.screenshot({ path: out, omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } }); await p.close();
}
// 둥근 아이콘 (안쪽 여백 있음)
const rounded = (s) => `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${WINE}"/><g transform="translate(5.12 4.6) scale(.84)">${mark(CREAM, GOLD)}</g></svg>`;
// 꽉 찬 아이콘 (아이폰 · maskable: 바탕이 꽉 차고, 그림은 가운데 안전 영역)
const full = (s, k) => `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><rect width="64" height="64" fill="${WINE}"/><g transform="translate(${32 - 32 * k} ${32 - 32 * k - 1}) scale(${k})">${mark(CREAM, GOLD)}</g></svg>`;
for (const s of [192, 512]) await shot(rounded(s), s, s, R + `app/work-${s}.png`);
await shot(full(512, .62), 512, 512, R + 'app/work-maskable-512.png', false);
await shot(full(180, .72), 180, 180, R + 'app/work-apple-180.png', false);
await shot(rounded(512), 512, 512, R + 'brand/stagelogic-icon-512.png');
// 문서용 로고 PNG (높이 256px, 투명 배경)
for (const f of ['stagelogic-logo', 'stagelogic-logo-dark', 'stagelogic-logo-serif', 'stagelogic-logo-serif-dark']) {
  const svg = fs.readFileSync(R + `brand/${f}.svg`, 'utf8'); const w = Number(svg.match(/viewBox="0 0 ([\d.]+) 64"/)[1]); const W = Math.ceil(w * 4);
  await shot(svg.replace(/width="[\d.]+" height="64"/, `width="${W}" height="256"`), W, 256, R + `brand/${f}.png`);
}
await b.close(); console.log('ok');
